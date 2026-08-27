import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { plaidItems, transactions } from "@/lib/db/schema";
import {
  dyeHueForIndex,
  isSpendingCategory,
  labelForCategory,
} from "@/lib/plaid/categories";

export interface SpendingMonth {
  year: number;
  month: number;
}

export interface ItemNeedingReconnect {
  itemId: number;
  institutionName: string;
}

export async function getItemsNeedingReconnect(): Promise<
  ItemNeedingReconnect[]
> {
  const rows = await db
    .select({
      id: plaidItems.id,
      institutionName: plaidItems.institutionName,
    })
    .from(plaidItems)
    .where(eq(plaidItems.transactionsConsentMissing, true));

  return rows.map((row) => ({
    itemId: row.id,
    institutionName: row.institutionName,
  }));
}

export interface SpendingCategory {
  key: string;
  name: string;
  amount: number;
  percent: number;
  color: string;
}

export interface SpendingSummary {
  categories: SpendingCategory[];
  total: number;
  monthLabel: string;
}

export type BillKind = "subscription" | "bill" | null;

export interface CategoryTransaction {
  id: number;
  name: string;
  amount: number;
  originalAmount: number;
  personalAmount: number | null;
  date: string;
  pending: boolean;
  billKind: BillKind;
}

export interface CategoryTransactionsResult {
  transactions: CategoryTransaction[];
  categoryLabel: string;
  monthLabel: string;
}

export interface DailyTotal {
  day: number;
  amount: number;
}

export interface DayTransaction extends CategoryTransaction {
  categoryLabel: string;
  color: string;
}

export interface DayTransactionsResult {
  transactions: DayTransaction[];
  total: number;
  dateLabel: string;
}

const OTHER_KEY = "OTHER";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${pad2(month)}-01`;
  const end =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${pad2(month + 1)}-01`;
  return { start, end };
}

interface SpendingRow {
  id: number;
  name: string;
  amount: number;
  originalAmount: number;
  personalAmount: number | null;
  date: string;
  pending: boolean;
  category: string | null;
  billKind: string | null;
}

async function getMonthSpendingRows(
  year: number,
  month: number,
): Promise<SpendingRow[]> {
  const { start, end } = monthRange(year, month);

  const rows = await db
    .select({
      id: transactions.id,
      name: transactions.name,
      amount: transactions.amount,
      personalAmount: transactions.personalAmount,
      date: transactions.date,
      pending: transactions.pending,
      category: transactions.personalFinanceCategoryPrimary,
      billKind: transactions.billKind,
    })
    .from(transactions)
    .where(and(gte(transactions.date, start), lt(transactions.date, end)));

  return rows
    .map((row) => {
      const originalAmount = Number(row.amount);
      const personalAmount = row.personalAmount === null ? null : Number(row.personalAmount);
      return {
        ...row,
        originalAmount,
        personalAmount,
        amount: personalAmount ?? originalAmount,
      };
    })
    .filter((row) => row.originalAmount > 0 && isSpendingCategory(row.category));
}

function getTopCategoryKeys(rows: SpendingRow[], limit: number): string[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = row.category ?? OTHER_KEY;
    totals.set(key, (totals.get(key) ?? 0) + row.amount);
  }
  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

export async function getAvailableMonths(): Promise<SpendingMonth[]> {
  const rows = await db.select({ date: transactions.date }).from(transactions);

  const seen = new Set<string>();
  for (const row of rows) {
    seen.add(row.date.slice(0, 7));
  }

  return Array.from(seen)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const [year, month] = key.split("-").map(Number);
      return { year, month };
    });
}

export async function getSpendingCategories(
  year: number,
  month: number,
): Promise<SpendingSummary> {
  const rows = await getMonthSpendingRows(year, month);

  const totalsByCategory = new Map<string, number>();
  for (const row of rows) {
    const key = row.category ?? OTHER_KEY;
    totalsByCategory.set(key, (totalsByCategory.get(key) ?? 0) + row.amount);
  }

  const sorted = Array.from(totalsByCategory.entries()).sort((a, b) => b[1] - a[1]);

  const top = sorted.slice(0, 4);
  const rest = sorted.slice(4);
  const otherTotal = rest.reduce((sum, [, amount]) => sum + amount, 0);

  const buckets: { key: string; amount: number }[] = top.map(([key, amount]) => ({
    key,
    amount,
  }));
  if (otherTotal > 0) {
    buckets.push({ key: OTHER_KEY, amount: otherTotal });
  }

  const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);

  const categories: SpendingCategory[] = buckets.map((bucket, index) => ({
    key: bucket.key,
    name: bucket.key === OTHER_KEY ? "Other" : labelForCategory(bucket.key),
    amount: bucket.amount,
    percent: total > 0 ? Math.round((bucket.amount / total) * 1000) / 10 : 0,
    color: dyeHueForIndex(index),
  }));

  return {
    categories,
    total,
    monthLabel: MONTH_NAMES[month - 1],
  };
}

export async function getCategoryTransactions(
  year: number,
  month: number,
  categoryKey: string,
): Promise<CategoryTransactionsResult> {
  const rows = await getMonthSpendingRows(year, month);

  let matched: SpendingRow[];
  let categoryLabel: string;

  if (categoryKey === OTHER_KEY) {
    const topKeys = new Set(getTopCategoryKeys(rows, 4));
    matched = rows.filter((row) => !topKeys.has(row.category ?? OTHER_KEY));
    categoryLabel = "Other";
  } else {
    matched = rows.filter((row) => row.category === categoryKey);
    categoryLabel = labelForCategory(categoryKey);
  }

  const sortedTransactions: CategoryTransaction[] = matched
    .map((row) => ({
      id: row.id,
      name: row.name,
      amount: row.amount,
      originalAmount: row.originalAmount,
      personalAmount: row.personalAmount,
      date: row.date,
      pending: row.pending,
      billKind: row.billKind as BillKind,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    transactions: sortedTransactions,
    categoryLabel,
    monthLabel: MONTH_NAMES[month - 1],
  };
}

export async function getDailyTotals(
  year: number,
  month: number,
): Promise<DailyTotal[]> {
  const rows = await getMonthSpendingRows(year, month);

  const totalsByDay = new Map<number, number>();
  for (const row of rows) {
    const day = Number(row.date.slice(8, 10));
    totalsByDay.set(day, (totalsByDay.get(day) ?? 0) + row.amount);
  }

  return Array.from(totalsByDay.entries())
    .map(([day, amount]) => ({ day, amount }))
    .sort((a, b) => a.day - b.day);
}

export async function getDayTransactions(
  date: string,
): Promise<DayTransactionsResult> {
  const rows = await db
    .select({
      id: transactions.id,
      name: transactions.name,
      amount: transactions.amount,
      personalAmount: transactions.personalAmount,
      date: transactions.date,
      pending: transactions.pending,
      category: transactions.personalFinanceCategoryPrimary,
      billKind: transactions.billKind,
    })
    .from(transactions)
    .where(eq(transactions.date, date));

  const spendingRows = rows
    .map((row) => {
      const originalAmount = Number(row.amount);
      const personalAmount = row.personalAmount === null ? null : Number(row.personalAmount);
      return {
        ...row,
        originalAmount,
        personalAmount,
        amount: personalAmount ?? originalAmount,
      };
    })
    .filter((row) => row.originalAmount > 0 && isSpendingCategory(row.category));

  const categoryKeysByCount = new Map<string, number>();
  for (const row of spendingRows) {
    const key = row.category ?? OTHER_KEY;
    categoryKeysByCount.set(key, (categoryKeysByCount.get(key) ?? 0) + 1);
  }
  const keyOrder = Array.from(categoryKeysByCount.keys());

  const dayTransactions: DayTransaction[] = spendingRows
    .map((row) => {
      const key = row.category ?? OTHER_KEY;
      const index = keyOrder.indexOf(key);
      return {
        id: row.id,
        name: row.name,
        amount: row.amount,
        originalAmount: row.originalAmount,
        personalAmount: row.personalAmount,
        date: row.date,
        pending: row.pending,
        billKind: row.billKind as BillKind,
        categoryLabel: row.category ? labelForCategory(row.category) : "Other",
        color: dyeHueForIndex(index),
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const total = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
  const [year, month, day] = date.split("-").map(Number);

  return {
    transactions: dayTransactions,
    total,
    dateLabel: `${MONTH_NAMES[month - 1]} ${day}, ${year}`,
  };
}
