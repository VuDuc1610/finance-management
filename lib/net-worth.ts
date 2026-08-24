import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, balanceSnapshots } from "@/lib/db/schema";

export interface NetWorthPoint {
  date: string;
  value: number;
}

export interface NetWorthSummary {
  series: NetWorthPoint[];
  currentValue: number;
  changeAmount: number;
  changePercent: number;
  rangeLabel: string;
}

const LIABILITY_TYPES = new Set(["credit", "loan"]);

export async function getNetWorthSeries(): Promise<NetWorthPoint[]> {
  const rows = await db
    .select({
      date: balanceSnapshots.date,
      type: accounts.type,
      balance: balanceSnapshots.currentBalance,
    })
    .from(balanceSnapshots)
    .innerJoin(accounts, eq(balanceSnapshots.accountId, accounts.id));

  const totalsByDate = new Map<string, number>();

  for (const row of rows) {
    const signedBalance = LIABILITY_TYPES.has(row.type)
      ? -Number(row.balance)
      : Number(row.balance);
    totalsByDate.set(
      row.date,
      (totalsByDate.get(row.date) ?? 0) + signedBalance,
    );
  }

  return Array.from(totalsByDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getNetWorthSummary(): Promise<NetWorthSummary | null> {
  const series = await getNetWorthSeries();

  if (series.length === 0) {
    return null;
  }

  const current = series[series.length - 1];
  const thirtyDaysAgoTarget = new Date(current.date);
  thirtyDaysAgoTarget.setDate(thirtyDaysAgoTarget.getDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgoTarget.toISOString().slice(0, 10);

  const comparisonPoint =
    series.find((point) => point.date >= thirtyDaysAgoIso) ?? series[0];

  const changeAmount = current.value - comparisonPoint.value;
  const changePercent =
    comparisonPoint.value !== 0
      ? (changeAmount / Math.abs(comparisonPoint.value)) * 100
      : 0;

  return {
    series,
    currentValue: current.value,
    changeAmount,
    changePercent,
    rangeLabel: "1 month",
  };
}
