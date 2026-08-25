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

export interface AccountBalanceDetail {
  id: number;
  name: string;
  subtype: string | null;
  balance: number;
  lastUpdated: string;
}

export interface AccountGroup {
  type: string;
  label: string;
  total: number;
  changeAmount: number;
  changePercent: number;
  accounts: AccountBalanceDetail[];
}

const TYPE_LABELS: Record<string, string> = {
  depository: "Cash",
  credit: "Credit Cards",
  investment: "Investments",
  loan: "Loans",
};

const TYPE_ORDER = ["depository", "investment", "credit", "loan"];

function labelForType(type: string): string {
  return TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

export async function getAccountsBreakdown(): Promise<AccountGroup[]> {
  const rows = await db
    .select({
      accountId: accounts.id,
      name: accounts.name,
      subtype: accounts.subtype,
      type: accounts.type,
      date: balanceSnapshots.date,
      balance: balanceSnapshots.currentBalance,
      createdAt: balanceSnapshots.createdAt,
    })
    .from(balanceSnapshots)
    .innerJoin(accounts, eq(balanceSnapshots.accountId, accounts.id));

  if (rows.length === 0) {
    return [];
  }

  const latestByAccount = new Map<
    number,
    {
      date: string;
      balance: number;
      name: string;
      subtype: string | null;
      type: string;
      createdAt: Date;
    }
  >();
  const historyByAccount = new Map<number, { date: string; balance: number }[]>();

  for (const row of rows) {
    const balance = Number(row.balance);
    const existing = latestByAccount.get(row.accountId);
    if (!existing || row.date > existing.date) {
      latestByAccount.set(row.accountId, {
        date: row.date,
        balance,
        name: row.name,
        subtype: row.subtype,
        type: row.type,
        createdAt: row.createdAt,
      });
    }
    const history = historyByAccount.get(row.accountId) ?? [];
    history.push({ date: row.date, balance });
    historyByAccount.set(row.accountId, history);
  }

  const latestDateOverall = Array.from(latestByAccount.values()).reduce(
    (max, entry) => (entry.date > max ? entry.date : max),
    "",
  );
  const thirtyDaysAgoTarget = new Date(latestDateOverall);
  thirtyDaysAgoTarget.setDate(thirtyDaysAgoTarget.getDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgoTarget.toISOString().slice(0, 10);

  const comparisonByAccount = new Map<number, number>();
  for (const [accountId, history] of historyByAccount) {
    const sorted = history.sort((a, b) => a.date.localeCompare(b.date));
    const comparison =
      sorted.find((point) => point.date >= thirtyDaysAgoIso) ?? sorted[0];
    comparisonByAccount.set(accountId, comparison.balance);
  }

  const groups = new Map<string, AccountGroup>();
  for (const [accountId, entry] of latestByAccount) {
    const group = groups.get(entry.type) ?? {
      type: entry.type,
      label: labelForType(entry.type),
      total: 0,
      changeAmount: 0,
      changePercent: 0,
      accounts: [],
    };
    const comparisonBalance = comparisonByAccount.get(accountId) ?? entry.balance;
    group.total += entry.balance;
    group.changeAmount += entry.balance - comparisonBalance;
    group.accounts.push({
      id: accountId,
      name: entry.name,
      subtype: entry.subtype,
      balance: entry.balance,
      lastUpdated: entry.createdAt.toISOString(),
    });
    groups.set(entry.type, group);
  }

  const result = Array.from(groups.values());
  for (const group of result) {
    const comparisonTotal = group.total - group.changeAmount;
    group.changePercent =
      comparisonTotal !== 0
        ? (group.changeAmount / Math.abs(comparisonTotal)) * 100
        : 0;
    group.accounts.sort((a, b) => b.balance - a.balance);
  }

  result.sort((a, b) => {
    const aIndex = TYPE_ORDER.indexOf(a.type);
    const bIndex = TYPE_ORDER.indexOf(b.type);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });

  return result;
}

export interface LinkedInstitution {
  itemId: number;
  institutionName: string;
}

export async function getLinkedInstitutions(): Promise<LinkedInstitution[]> {
  const rows = await db
    .select({
      id: plaidItems.id,
      institutionName: plaidItems.institutionName,
    })
    .from(plaidItems);

  return rows.map((row) => ({
    itemId: row.id,
    institutionName: row.institutionName,
  }));
}
