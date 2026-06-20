import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  groupsTable,
  membersTable,
  expensesTable,
  expenseSplitsTable,
} from "@workspace/db";
import {
  ListExpensesParams,
  ListExpensesResponse,
  CreateExpenseParams,
  CreateExpenseBody,
  GetExpenseParams,
  GetExpenseResponse,
  UpdateExpenseParams,
  UpdateExpenseBody,
  UpdateExpenseResponse,
  DeleteExpenseParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/groups/:groupId/expenses", async (req, res): Promise<void> => {
  const params = ListExpensesParams.safeParse(req.params);
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

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.groupId, params.data.groupId))
    .orderBy(expensesTable.date);

  const coerced = expenses.map((e) => ({ ...e, amount: parseFloat(e.amount) }));
  res.json(ListExpensesResponse.parse(coerced));
});

router.post("/groups/:groupId/expenses", async (req, res): Promise<void> => {
  const params = CreateExpenseParams.safeParse(req.params);
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

  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [paidByMember] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, parsed.data.paidById));
  if (!paidByMember) {
    res.status(400).json({ error: "paidById member not found" });
    return;
  }

  const members = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.groupId, params.data.groupId));

  if (members.length === 0) {
    res.status(400).json({ error: "Group has no members to split with" });
    return;
  }

  const [expense] = await db
    .insert(expensesTable)
    .values({
      groupId: params.data.groupId,
      paidById: parsed.data.paidById,
      title: parsed.data.title,
      amount: String(parsed.data.amount),
      category: parsed.data.category ?? "other",
      splitType: parsed.data.splitType ?? "equal",
      notes: parsed.data.notes,
      date: parsed.data.date,
    })
    .returning();

  const splitType = expense.splitType;
  const totalAmount = parseFloat(expense.amount);

  const splitsToInsert = computeSplits(
    expense.id,
    totalAmount,
    splitType,
    members.map((m) => m.id),
    parsed.data.splits
  );

  if (splitsToInsert.length > 0) {
    await db.insert(expenseSplitsTable).values(splitsToInsert);
  }

  res.status(201).json({ ...expense, amount: parseFloat(expense.amount) });
});

router.get(
  "/groups/:groupId/expenses/:id",
  async (req, res): Promise<void> => {
    const params = GetExpenseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [expense] = await db
      .select()
      .from(expensesTable)
      .where(
        and(
          eq(expensesTable.id, params.data.id),
          eq(expensesTable.groupId, params.data.groupId)
        )
      );

    if (!expense) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    const splits = await db
      .select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expenseId, expense.id));

    const coercedSplits = splits.map((s) => ({ ...s, amount: parseFloat(s.amount), percentage: s.percentage ? parseFloat(s.percentage) : null }));
    res.json(GetExpenseResponse.parse({ ...expense, amount: parseFloat(expense.amount), splits: coercedSplits }));
  }
);

router.patch(
  "/groups/:groupId/expenses/:id",
  async (req, res): Promise<void> => {
    const params = UpdateExpenseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateExpenseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.paidById !== undefined)
      updateData.paidById = parsed.data.paidById;
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.amount !== undefined)
      updateData.amount = String(parsed.data.amount);
    if (parsed.data.category !== undefined)
      updateData.category = parsed.data.category;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
    if (parsed.data.date !== undefined) updateData.date = parsed.data.date;

    const [expense] = await db
      .update(expensesTable)
      .set(updateData)
      .where(
        and(
          eq(expensesTable.id, params.data.id),
          eq(expensesTable.groupId, params.data.groupId)
        )
      )
      .returning();

    if (!expense) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    res.json(UpdateExpenseResponse.parse(expense));
  }
);

router.delete(
  "/groups/:groupId/expenses/:id",
  async (req, res): Promise<void> => {
    const params = DeleteExpenseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [expense] = await db
      .delete(expensesTable)
      .where(
        and(
          eq(expensesTable.id, params.data.id),
          eq(expensesTable.groupId, params.data.groupId)
        )
      )
      .returning();

    if (!expense) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    res.sendStatus(204);
  }
);

// ── Split computation helper ──────────────────────────────────────────────────

type SplitInputItem = {
  memberId: number;
  amount?: number;
  percentage?: number;
};

function computeSplits(
  expenseId: number,
  totalAmount: number,
  splitType: string,
  memberIds: number[],
  customSplits?: SplitInputItem[]
): Array<{ expenseId: number; memberId: number; amount: string; percentage?: string }> {
  if (splitType === "equal") {
    const perPerson = totalAmount / memberIds.length;
    return memberIds.map((memberId) => ({
      expenseId,
      memberId,
      amount: String(Math.round(perPerson * 100) / 100),
    }));
  }

  if (splitType === "percentage" && customSplits && customSplits.length > 0) {
    return customSplits.map((s) => {
      const pct = s.percentage ?? 0;
      const amt = (totalAmount * pct) / 100;
      return {
        expenseId,
        memberId: s.memberId,
        amount: String(Math.round(amt * 100) / 100),
        percentage: String(pct),
      };
    });
  }

  if (splitType === "exact" && customSplits && customSplits.length > 0) {
    return customSplits.map((s) => ({
      expenseId,
      memberId: s.memberId,
      amount: String(s.amount ?? 0),
    }));
  }

  // Fallback: equal split
  const perPerson = totalAmount / memberIds.length;
  return memberIds.map((memberId) => ({
    expenseId,
    memberId,
    amount: String(Math.round(perPerson * 100) / 100),
  }));
}

export default router;
