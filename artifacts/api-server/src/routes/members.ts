import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { groupsTable, membersTable } from "@workspace/db";
import {
  AddMemberBody,
  AddMemberParams,
  ListMembersParams,
  UpdateMemberBody,
  UpdateMemberParams,
  DeleteMemberParams,
  ListMembersResponse,
  UpdateMemberResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const AVATAR_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6",
  "#f97316", "#06b6d4",
];

router.get("/groups/:groupId/members", async (req, res): Promise<void> => {
  const params = ListMembersParams.safeParse(req.params);
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

  const members = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.groupId, params.data.groupId))
    .orderBy(membersTable.createdAt);

  res.json(ListMembersResponse.parse(members));
});

router.post("/groups/:groupId/members", async (req, res): Promise<void> => {
  const params = AddMemberParams.safeParse(req.params);
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

  const parsed = AddMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existingCount = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.groupId, params.data.groupId));

  const avatarColor =
    parsed.data.avatarColor ??
    AVATAR_COLORS[existingCount.length % AVATAR_COLORS.length];

  const [member] = await db
    .insert(membersTable)
    .values({
      groupId: params.data.groupId,
      name: parsed.data.name,
      email: parsed.data.email,
      avatarColor,
    })
    .returning();

  res.status(201).json(member);
});

router.patch("/groups/:groupId/members/:id", async (req, res): Promise<void> => {
  const params = UpdateMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [member] = await db
    .update(membersTable)
    .set(parsed.data)
    .where(
      and(
        eq(membersTable.id, params.data.id),
        eq(membersTable.groupId, params.data.groupId)
      )
    )
    .returning();

  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  res.json(UpdateMemberResponse.parse(member));
});

router.delete("/groups/:groupId/members/:id", async (req, res): Promise<void> => {
  const params = DeleteMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [member] = await db
    .delete(membersTable)
    .where(
      and(
        eq(membersTable.id, params.data.id),
        eq(membersTable.groupId, params.data.groupId)
      )
    )
    .returning();

  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
