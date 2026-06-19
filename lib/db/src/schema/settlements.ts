import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { groupsTable } from "./groups";
import { membersTable } from "./members";

export const settlementsTable = pgTable("settlements", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  fromMemberId: integer("from_member_id").notNull().references(() => membersTable.id),
  toMemberId: integer("to_member_id").notNull().references(() => membersTable.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  settledAt: timestamp("settled_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSettlementSchema = createInsertSchema(settlementsTable).omit({ id: true, settledAt: true });
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
export type Settlement = typeof settlementsTable.$inferSelect;
