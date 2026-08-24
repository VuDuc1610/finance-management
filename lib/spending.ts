import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { transactions } from "@/lib/db/schema";
import {
  dyeHueForIndex,
  isSpendingCategory,
  labelForCategory,
} from "@/lib/plaid/categories";
import type { SpendingCategory } from "@/lib/mock-spending-data";

export interface SpendingMonth {
  year: number;
  month: number;
}

export interface SpendingSummary {
  categories: SpendingCategory[];
  total: number;
  monthLabel: string;
}

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
  const endDate =
    month === 12 ? new Date(year + 1, 0, 1) : new Date(year, month, 1);
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
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
  const { start, end } = monthRange(year, month);

  const rows = await db
    .select({
      amount: transactions.amount,
      category: transactions.personalFinanceCategoryPrimary,
    })
    .from(transactions)
    .where(and(gte(transactions.date, start), lt(transactions.date, end)));

  const totalsByCategory = new Map<string, number>();

  for (const row of rows) {
    const amount = Number(row.amount);
    if (amount <= 0) continue;
    if (!isSpendingCategory(row.category)) continue;

    const key = row.category ?? "OTHER";
    totalsByCategory.set(key, (totalsByCategory.get(key) ?? 0) + amount);
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
    buckets.push({ key: "OTHER", amount: otherTotal });
  }

  const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);

  const categories: SpendingCategory[] = buckets.map((bucket, index) => ({
    name: bucket.key === "OTHER" ? "Other" : labelForCategory(bucket.key),
    amount: bucket.amount,
    percent: total > 0 ? (bucket.amount / total) * 100 : 0,
    color: dyeHueForIndex(index),
  }));

  return {
    categories,
    total,
    monthLabel: MONTH_NAMES[month - 1],
  };
}
