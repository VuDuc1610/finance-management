import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, balanceSnapshots, plaidItems } from "@/lib/db/schema";

export interface NetWorthBreakdownPoint {
  date: string;
  net: number;
  assets: number;
  liabilities: number;
}

const LIABILITY_TYPES = new Set(["credit", "loan"]);

export async function getNetWorthBreakdownSeries(): Promise<
  NetWorthBreakdownPoint[]
> {
  const rows = await db
    .select({
      date: balanceSnapshots.date,
      type: accounts.type,
      balance: balanceSnapshots.currentBalance,
    })
    .from(balanceSnapshots)
    .innerJoin(accounts, eq(balanceSnapshots.accountId, accounts.id));

  const byDate = new Map<string, { assets: number; liabilities: number }>();

  for (const row of rows) {
    const bucket = byDate.get(row.date) ?? { assets: 0, liabilities: 0 };
    if (LIABILITY_TYPES.has(row.type)) {
      bucket.liabilities += Number(row.balance);
    } else {
      bucket.assets += Number(row.balance);
    }
    byDate.set(row.date, bucket);
  }

  return Array.from(byDate.entries())
    .map(([date, { assets, liabilities }]) => ({
      date,
      assets,
      liabilities,
      net: assets - liabilities,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
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
