import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  groupsTable,
  membersTable,
  expensesTable,
  expenseSplitsTable,
  settlementsTable,
} from "@workspace/db";
import {
  CreateGroupBody,
  UpdateGroupBody,
  GetGroupParams,
  UpdateGroupParams,
  DeleteGroupParams,
  GetGroupSummaryParams,
  GetGroupBalancesParams,
  GetOptimalSettlementsParams,
  ListGroupsResponse,
  GetGroupResponse,
  UpdateGroupResponse,
  GetGroupSummaryResponse,
  GetGroupBalancesResponse,
  GetOptimalSettlementsResponse,
} from "@workspace/api-zod";
import { computeOptimalSettlements } from "../lib/settlement-optimizer";

const router: IRouter = Router();

router.get("/groups", async (req, res): Promise<void> => {
  const groups = await db
    .select()
    .from(groupsTable)
    .orderBy(groupsTable.createdAt);
  res.json(ListGroupsResponse.parse(groups));
});

router.post("/groups", async (req, res): Promise<void> => {
  const parsed = CreateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [group] = await db.insert(groupsTable).values(parsed.data).returning();
  res.status(201).json(group);
});

router.get("/groups/:id", async (req, res): Promise<void> => {
  const params = GetGroupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [group] = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, params.data.id));
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  res.json(GetGroupResponse.parse(group));
});

router.patch("/groups/:id", async (req, res): Promise<void> => {
  const params = UpdateGroupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [group] = await db
    .update(groupsTable)
    .set(parsed.data)
    .where(eq(groupsTable.id, params.data.id))
    .returning();
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  res.json(UpdateGroupResponse.parse(group));
});

router.delete("/groups/:id", async (req, res): Promise<void> => {
  const params = DeleteGroupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [group] = await db
    .delete(groupsTable)
    .where(eq(groupsTable.id, params.data.id))
    .returning();
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/groups/:id/summary", async (req, res): Promise<void> => {
  const params = GetGroupSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const groupId = params.data.id;

  const [group] = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId));
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.groupId, groupId));

  const memberCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(membersTable)
    .where(eq(membersTable.groupId, groupId));

  const totalSpent = expenses.reduce(
    (sum, e) => sum + parseFloat(e.amount),
    0
  );

  const categoryMap: Record<string, { total: number; count: number }> = {};
  for (const e of expenses) {
    const cat = e.category;
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
    categoryMap[cat].total += parseFloat(e.amount);
    categoryMap[cat].count += 1;
  }

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, stats]) => ({
      category,
      total: Math.round(stats.total * 100) / 100,
      count: stats.count,
    }))
    .sort((a, b) => b.total - a.total);

  const mostExpensiveCategory =
    categoryBreakdown.length > 0 ? categoryBreakdown[0].category : null;

  const payerMap: Record<number, number> = {};
  for (const e of expenses) {
    payerMap[e.paidById] = (payerMap[e.paidById] ?? 0) + parseFloat(e.amount);
  }

  let topSpenderName: string | null = null;
  if (Object.keys(payerMap).length > 0) {
    const topPayerId = parseInt(
      Object.entries(payerMap).sort((a, b) => b[1] - a[1])[0][0],
      10
    );
    const [topMember] = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.id, topPayerId));
    topSpenderName = topMember?.name ?? null;
  }

  const summary = {
    groupId,
    totalSpent: Math.round(totalSpent * 100) / 100,
    expenseCount: expenses.length,
    memberCount: memberCount[0]?.count ?? 0,
    categoryBreakdown,
    topSpender: topSpenderName,
    mostExpensiveCategory,
  };

  res.json(GetGroupSummaryResponse.parse(summary));
});

router.get("/groups/:id/balances", async (req, res): Promise<void> => {
  const params = GetGroupBalancesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const groupId = params.data.id;

  const [group] = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId));
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const members = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.groupId, groupId));

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.groupId, groupId));

  const splits = await db
    .select()
    .from(expenseSplitsTable)
    .where(
      sql`${expenseSplitsTable.expenseId} IN (
        SELECT id FROM expenses WHERE group_id = ${groupId}
      )`
    );

  const settlements = await db
    .select()
    .from(settlementsTable)
    .where(eq(settlementsTable.groupId, groupId));

  const paid: Record<number, number> = {};
  const owes: Record<number, number> = {};

  for (const m of members) {
    paid[m.id] = 0;
    owes[m.id] = 0;
  }

  for (const e of expenses) {
    paid[e.paidById] = (paid[e.paidById] ?? 0) + parseFloat(e.amount);
  }

  for (const s of splits) {
    owes[s.memberId] = (owes[s.memberId] ?? 0) + parseFloat(s.amount);
  }

  for (const s of settlements) {
    owes[s.fromMemberId] = (owes[s.fromMemberId] ?? 0) - parseFloat(s.amount);
    paid[s.toMemberId] = (paid[s.toMemberId] ?? 0) - parseFloat(s.amount);
  }

  const balances = members.map((m) => ({
    memberId: m.id,
    memberName: m.name,
    avatarColor: m.avatarColor,
    paid: Math.round((paid[m.id] ?? 0) * 100) / 100,
    owes: Math.round((owes[m.id] ?? 0) * 100) / 100,
    netBalance:
      Math.round(((paid[m.id] ?? 0) - (owes[m.id] ?? 0)) * 100) / 100,
  }));

  res.json(GetGroupBalancesResponse.parse(balances));
});

router.get("/groups/:id/optimal-settlements", async (req, res): Promise<void> => {
  const params = GetOptimalSettlementsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const groupId = params.data.id;

  const [group] = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId));
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const members = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.groupId, groupId));

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.groupId, groupId));

  const splits = await db
    .select()
    .from(expenseSplitsTable)
    .where(
      sql`${expenseSplitsTable.expenseId} IN (
        SELECT id FROM expenses WHERE group_id = ${groupId}
      )`
    );

  const settlements = await db
    .select()
    .from(settlementsTable)
    .where(eq(settlementsTable.groupId, groupId));

  const paid: Record<number, number> = {};
  const owes: Record<number, number> = {};

  for (const m of members) {
    paid[m.id] = 0;
    owes[m.id] = 0;
  }

  for (const e of expenses) {
    paid[e.paidById] = (paid[e.paidById] ?? 0) + parseFloat(e.amount);
  }

  for (const s of splits) {
    owes[s.memberId] = (owes[s.memberId] ?? 0) + parseFloat(s.amount);
  }

  for (const s of settlements) {
    owes[s.fromMemberId] = (owes[s.fromMemberId] ?? 0) - parseFloat(s.amount);
    paid[s.toMemberId] = (paid[s.toMemberId] ?? 0) - parseFloat(s.amount);
  }

  const netBalances = members.map((m) => ({
    memberId: m.id,
    memberName: m.name,
    avatarColor: m.avatarColor,
    netBalance:
      Math.round(((paid[m.id] ?? 0) - (owes[m.id] ?? 0)) * 100) / 100,
  }));

  const optimal = computeOptimalSettlements(netBalances);
  res.json(GetOptimalSettlementsResponse.parse(optimal));
});

export default router;
