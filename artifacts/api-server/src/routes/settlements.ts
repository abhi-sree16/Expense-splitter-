import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { groupsTable, settlementsTable, membersTable } from "@workspace/db";
import {
  ListSettlementsParams,
  CreateSettlementParams,
  CreateSettlementBody,
  DeleteSettlementParams,
  ListSettlementsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/groups/:groupId/settlements", async (req, res): Promise<void> => {
  const params = ListSettlementsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [group] = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, params.data.groupId));
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const settlements = await db
    .select()
    .from(settlementsTable)
    .where(eq(settlementsTable.groupId, params.data.groupId))
    .orderBy(settlementsTable.settledAt);

  res.json(ListSettlementsResponse.parse(settlements));
});

router.post("/groups/:groupId/settlements", async (req, res): Promise<void> => {
  const params = CreateSettlementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [group] = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, params.data.groupId));
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const parsed = CreateSettlementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [fromMember] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, parsed.data.fromMemberId));
  if (!fromMember) {
    res.status(404).json({ error: "From member not found" });
    return;
  }

  const [toMember] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, parsed.data.toMemberId));
  if (!toMember) {
    res.status(404).json({ error: "To member not found" });
    return;
  }

  const [settlement] = await db
    .insert(settlementsTable)
    .values({
      groupId: params.data.groupId,
      fromMemberId: parsed.data.fromMemberId,
      toMemberId: parsed.data.toMemberId,
      amount: String(parsed.data.amount),
      note: parsed.data.note,
    })
    .returning();

  res.status(201).json(settlement);
});

router.delete("/groups/:groupId/settlements/:id", async (req, res): Promise<void> => {
  const params = DeleteSettlementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [settlement] = await db
    .delete(settlementsTable)
    .where(
      and(
        eq(settlementsTable.id, params.data.id),
        eq(settlementsTable.groupId, params.data.groupId)
      )
    )
    .returning();

  if (!settlement) {
    res.status(404).json({ error: "Settlement not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
