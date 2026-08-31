import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, plaidItems, transactions } from "@/lib/db/schema";
import { dyeHueForIndex, labelForCategory } from "@/lib/plaid/categories";
import { nextOccurrenceDate, daysUntil } from "@/lib/recurring-date";

export type BillKind = "subscription" | "bill";

export interface BillItem {
  id: number;
  name: string;
  kind: BillKind;
  category: string;
  amount: number;
  dueDate: string | null;
  color: string;
}

export interface BillsSummary {
  monthlyTotal: number;
  subscriptionMonthlyTotal: number;
  billMonthlyTotal: number;
  subscriptionCount: number;
  billCount: number;
  dueSoonCount: number;
}

export interface BillsResult {
  items: BillItem[];
  summary: BillsSummary;
}

export async function getSubscriptionsAndBills(userId: string): Promise<BillsResult> {
  const rows = await db
    .select({
      id: transactions.id,
      name: transactions.name,
      amount: transactions.amount,
      personalAmount: transactions.personalAmount,
      category: transactions.personalFinanceCategoryPrimary,
      billKind: transactions.billKind,
      dueDate: transactions.dueDate,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(and(isNotNull(transactions.billKind), eq(plaidItems.userId, userId)));

  const sorted = rows
    .map((row) => ({
      ...row,
      amount: Math.abs(Number(row.personalAmount ?? row.amount)),
      nextDue: row.dueDate ? nextOccurrenceDate(row.dueDate) : null,
    }))
    .sort((a, b) => (a.nextDue ?? "9999-99-99").localeCompare(b.nextDue ?? "9999-99-99"));

  const items: BillItem[] = sorted.map((row, index) => ({
    id: row.id,
    name: row.name,
    kind: row.billKind as BillKind,
    category: labelForCategory(row.category),
    amount: row.amount,
    dueDate: row.dueDate,
    color: dyeHueForIndex(index),
  }));

  const subscriptionMonthlyTotal = items
    .filter((item) => item.kind === "subscription")
    .reduce((sum, item) => sum + item.amount, 0);
  const billMonthlyTotal = items
    .filter((item) => item.kind === "bill")
    .reduce((sum, item) => sum + item.amount, 0);

  const summary: BillsSummary = {
    monthlyTotal: subscriptionMonthlyTotal + billMonthlyTotal,
    subscriptionMonthlyTotal,
    billMonthlyTotal,
    subscriptionCount: items.filter((item) => item.kind === "subscription").length,
    billCount: items.filter((item) => item.kind === "bill").length,
    dueSoonCount: items.filter(
      (item) => item.dueDate !== null && daysUntil(nextOccurrenceDate(item.dueDate)) < 5,
    ).length,
  };

  return { items, summary };
}
