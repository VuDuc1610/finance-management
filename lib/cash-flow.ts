import { and, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { transactions } from "@/lib/db/schema";
import { dyeHueForIndex, isSpendingCategory, labelForCategory } from "@/lib/plaid/categories";

export interface CashFlowMonth {
  year: number;
  month: number;
}

export interface CashFlowNode {
  name: string;
  color: string;
  href?: string;
}

export interface CashFlowLink {
  source: number;
  target: number;
  value: number;
}

export interface CashFlowSankeyResult {
  nodes: CashFlowNode[];
  links: CashFlowLink[];
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  savingsRate: number;
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

const INDIGO = "var(--color-dye-indigo)";
const MOSS = "var(--color-dye-moss)";
const SUBCATEGORY_LIMIT = 3;

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${pad2(month)}-01`;
  const end = month === 12 ? `${year + 1}-01-01` : `${year}-${pad2(month + 1)}-01`;
  return { start, end };
}

export async function getAvailableCashFlowMonths(): Promise<CashFlowMonth[]> {
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

function incomeSourceLabel(primary: string | null, detailed: string | null): string | null {
  if (primary === "INCOME") return detailLabel("INCOME", detailed);
  if (primary === "TRANSFER_IN" && detailed === "TRANSFER_IN_TRANSFER_IN_FROM_APPS") {
    return "From Friends & Family";
  }
  return null;
}

function detailLabel(primary: string, detailed: string | null): string {
  if (!detailed) return "Other";
  const prefix = `${primary}_`;
  const rest = detailed.startsWith(prefix) ? detailed.slice(prefix.length) : detailed;
  return rest
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function getCashFlowSankey(
  year: number,
  month: number,
): Promise<CashFlowSankeyResult> {
  const { start, end } = monthRange(year, month);
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const rows = await db
    .select({
      amount: transactions.amount,
      personalAmount: transactions.personalAmount,
      primary: transactions.personalFinanceCategoryPrimary,
      detailed: transactions.personalFinanceCategoryDetailed,
    })
    .from(transactions)
    .where(and(gte(transactions.date, start), lt(transactions.date, end)));

  const parsed = rows.map((row) => ({
    amount:
      row.personalAmount === null ? Number(row.amount) : Number(row.personalAmount),
    primary: row.primary,
    detailed: row.detailed,
  }));

  const incomeRows = parsed.filter(
    (row) =>
      row.amount < 0 &&
      (row.primary === "INCOME" ||
        (row.primary === "TRANSFER_IN" &&
          row.detailed === "TRANSFER_IN_TRANSFER_IN_FROM_APPS")),
  );
  const spendingRows = parsed.filter((row) => row.amount > 0 && isSpendingCategory(row.primary));

  const totalIncome = incomeRows.reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const totalSpending = spendingRows.reduce((sum, row) => sum + row.amount, 0);

  if (totalIncome <= 0) {
    return {
      nodes: [],
      links: [],
      totalIncome: 0,
      totalExpenses: totalSpending,
      netIncome: -totalSpending,
      savingsRate: 0,
      monthLabel,
    };
  }

  const nodes: CashFlowNode[] = [];
  const links: CashFlowLink[] = [];
  const nodeIndex = new Map<string, number>();

  function nodeFor(key: string, name: string, color: string, href?: string): number {
    const existing = nodeIndex.get(key);
    if (existing !== undefined) return existing;
    const idx = nodes.length;
    nodes.push({ name, color, href });
    nodeIndex.set(key, idx);
    return idx;
  }

  const incomeNodeIdx = nodeFor("income", "Income", INDIGO);

  const incomeBySource = new Map<string, number>();
  for (const row of incomeRows) {
    const label = incomeSourceLabel(row.primary, row.detailed) ?? "Other Income";
    incomeBySource.set(label, (incomeBySource.get(label) ?? 0) + Math.abs(row.amount));
  }
  for (const [label, amount] of Array.from(incomeBySource.entries()).sort(
    (a, b) => b[1] - a[1],
  )) {
    const href = `/cash-flow/income/${encodeURIComponent(label)}?year=${year}&month=${month}`;
    const idx = nodeFor(`income-source:${label}`, label, INDIGO, href);
    links.push({ source: idx, target: incomeNodeIdx, value: amount });
  }

  const spendingByPrimary = new Map<
    string,
    { amount: number; rows: typeof spendingRows }
  >();
  for (const row of spendingRows) {
    const key = row.primary ?? "OTHER";
    const bucket = spendingByPrimary.get(key) ?? { amount: 0, rows: [] };
    bucket.amount += row.amount;
    bucket.rows.push(row);
    spendingByPrimary.set(key, bucket);
  }

  const leftover = totalIncome - totalSpending;

  type Group = { key: string; label: string; amount: number; isNetIncome: boolean };
  const groups: Group[] = Array.from(spendingByPrimary.entries()).map(
    ([key, bucket]) => ({
      key,
      label: labelForCategory(key),
      amount: bucket.amount,
      isNetIncome: false,
    }),
  );
  if (leftover > 0) {
    groups.push({ key: "NET_INCOME", label: "Savings", amount: leftover, isNetIncome: true });
  }
  groups.sort((a, b) => b.amount - a.amount);

  let colorCursor = 0;
  for (const group of groups) {
    const color = group.isNetIncome ? MOSS : dyeHueForIndex(colorCursor++);
    const groupIdx = nodeFor(`group:${group.key}`, group.label, color);
    links.push({ source: incomeNodeIdx, target: groupIdx, value: group.amount });

    if (group.isNetIncome) continue;

    const bucket = spendingByPrimary.get(group.key);
    if (!bucket) continue;

    const byDetailed = new Map<string, number>();
    for (const row of bucket.rows) {
      const label = detailLabel(group.key, row.detailed);
      byDetailed.set(label, (byDetailed.get(label) ?? 0) + row.amount);
    }

    const sortedDetailed = Array.from(byDetailed.entries()).sort((a, b) => b[1] - a[1]);
    const topDetailed = sortedDetailed.slice(0, SUBCATEGORY_LIMIT);
    const restDetailed = sortedDetailed.slice(SUBCATEGORY_LIMIT);
    const otherAmount = restDetailed.reduce((sum, [, amount]) => sum + amount, 0);

    for (const [label, amount] of topDetailed) {
      const subIdx = nodeFor(`sub:${group.key}:${label}`, label, color);
      links.push({ source: groupIdx, target: subIdx, value: amount });
    }
    if (otherAmount > 0) {
      const subIdx = nodeFor(`sub:${group.key}:Other`, "Other", color);
      links.push({ source: groupIdx, target: subIdx, value: otherAmount });
    }
  }

  return {
    nodes,
    links,
    totalIncome,
    totalExpenses: totalSpending,
    netIncome: leftover,
    savingsRate: (leftover / totalIncome) * 100,
    monthLabel,
  };
}

export interface IncomeSourceTransaction {
  id: number;
  name: string;
  amount: number;
  originalAmount: number;
  personalAmount: number | null;
  date: string;
  pending: boolean;
}

export interface IncomeSourceTransactionsResult {
  transactions: IncomeSourceTransaction[];
  sourceLabel: string;
  monthLabel: string;
}

export async function getIncomeSourceTransactions(
  year: number,
  month: number,
  sourceLabel: string,
): Promise<IncomeSourceTransactionsResult> {
  const { start, end } = monthRange(year, month);
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const rows = await db
    .select({
      id: transactions.id,
      name: transactions.name,
      amount: transactions.amount,
      personalAmount: transactions.personalAmount,
      date: transactions.date,
      pending: transactions.pending,
      primary: transactions.personalFinanceCategoryPrimary,
      detailed: transactions.personalFinanceCategoryDetailed,
    })
    .from(transactions)
    .where(and(gte(transactions.date, start), lt(transactions.date, end)));

  const matched = rows.filter(
    (row) => incomeSourceLabel(row.primary, row.detailed) === sourceLabel,
  );

  const list: IncomeSourceTransaction[] = matched
    .map((row) => {
      const originalAmount = Number(row.amount);
      const personalAmount = row.personalAmount === null ? null : Number(row.personalAmount);
      const effective = personalAmount ?? originalAmount;
      return {
        id: row.id,
        name: row.name,
        amount: Math.abs(effective),
        originalAmount: Math.abs(originalAmount),
        personalAmount,
        date: row.date,
        pending: row.pending,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return { transactions: list, sourceLabel, monthLabel };
}
