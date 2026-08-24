import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, balanceSnapshots, plaidItems } from "@/lib/db/schema";

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

export interface AssetDistributionEntry {
  institutionName: string;
  value: number;
  percent: number;
}

export async function getAssetDistribution(): Promise<AssetDistributionEntry[]> {
  const rows = await db
    .select({
      accountId: accounts.id,
      type: accounts.type,
      institutionName: plaidItems.institutionName,
      date: balanceSnapshots.date,
      balance: balanceSnapshots.currentBalance,
    })
    .from(balanceSnapshots)
    .innerJoin(accounts, eq(balanceSnapshots.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id));

  const latestByAccount = new Map<
    number,
    { date: string; balance: number; type: string; institutionName: string }
  >();

  for (const row of rows) {
    const existing = latestByAccount.get(row.accountId);
    if (!existing || row.date > existing.date) {
      latestByAccount.set(row.accountId, {
        date: row.date,
        balance: Number(row.balance),
        type: row.type,
        institutionName: row.institutionName,
      });
    }
  }

  const totalsByInstitution = new Map<string, number>();
  for (const entry of latestByAccount.values()) {
    if (LIABILITY_TYPES.has(entry.type)) continue;
    totalsByInstitution.set(
      entry.institutionName,
      (totalsByInstitution.get(entry.institutionName) ?? 0) + entry.balance,
    );
  }

  const total = Array.from(totalsByInstitution.values()).reduce(
    (sum, value) => sum + value,
    0,
  );

  if (total <= 0) {
    return [];
  }

  return Array.from(totalsByInstitution.entries())
    .map(([institutionName, value]) => ({
      institutionName,
      value,
      percent: (value / total) * 100,
    }))
    .sort((a, b) => b.value - a.value);
}
