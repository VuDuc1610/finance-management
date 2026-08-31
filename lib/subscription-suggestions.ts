import { and, eq, gt, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  accounts,
  dismissedSubscriptionSuggestions,
  plaidItems,
  transactions,
} from "@/lib/db/schema";
import { isSpendingCategory, labelForCategory } from "@/lib/plaid/categories";

const MIN_MONTHS = 2;
const AMOUNT_TOLERANCE = 0.08;
const NOISE_PREFIXES = [
  "POS DEBIT ",
  "DEBIT CARD PURCHASE ",
  "RECURRING PAYMENT ",
  "ACH DEBIT ",
  "ONLINE PAYMENT ",
  "PURCHASE ",
];
const FUZZY_MIN_PREFIX = 10;
const FUZZY_MIN_RATIO = 0.4;

export interface SubscriptionSuggestion {
  groupKey: string;
  name: string;
  category: string;
  monthsSeen: number;
  suggestedAmount: number;
  latestTransactionId: number;
  latestDate: string;
}

/**
 * Merchant descriptors drift slightly between statements (embedded dates,
 * random confirmation codes, POS/ACH prefixes, truncated merchant names),
 * so recurring charges rarely share an exact name — normalize away that
 * noise before grouping.
 */
function normalizeName(raw: string): string {
  let value = raw.toUpperCase();

  for (const prefix of NOISE_PREFIXES) {
    if (value.startsWith(prefix)) {
      value = value.slice(prefix.length);
      break;
    }
  }

  value = value.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, "");
  value = value.replace(/\s+[A-Z]{2}\s*$/, "");
  value = value.replace(/\b(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*[0-9])[A-Z0-9]{4,10}\b/g, "");
  value = value.replace(/[#.:]+$/g, "");
  value = value.replace(/\s+/g, " ").trim();

  return value;
}

function longestCommonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
}

function isFuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const lcp = longestCommonPrefixLength(a, b);
  if (lcp < FUZZY_MIN_PREFIX) return false;
  return lcp / Math.min(a.length, b.length) >= FUZZY_MIN_RATIO;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

interface TransactionRow {
  id: number;
  name: string;
  amount: string;
  date: string;
  category: string | null;
}

function clusterByNormalizedName(
  rows: TransactionRow[],
): Map<string, TransactionRow[]> {
  const byNormalized = new Map<string, TransactionRow[]>();
  for (const row of rows) {
    const key = normalizeName(row.name);
    const existing = byNormalized.get(key);
    if (existing) {
      existing.push(row);
    } else {
      byNormalized.set(key, [row]);
    }
  }

  const keys = [...byNormalized.keys()];
  const parent = new Map(keys.map((key) => [key, key]));

  function find(key: string): string {
    let root = key;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  }

  function union(a: string, b: string) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  }

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      if (isFuzzyMatch(keys[i], keys[j])) union(keys[i], keys[j]);
    }
  }

  const clusters = new Map<string, TransactionRow[]>();
  for (const key of keys) {
    const root = find(key);
    const group = clusters.get(root);
    if (group) {
      group.push(...byNormalized.get(key)!);
    } else {
      clusters.set(root, [...byNormalized.get(key)!]);
    }
  }

  return clusters;
}

export async function getSubscriptionSuggestions(
  userId: string,
): Promise<SubscriptionSuggestion[]> {
  const dismissed = await db
    .select({ name: dismissedSubscriptionSuggestions.name })
    .from(dismissedSubscriptionSuggestions)
    .where(eq(dismissedSubscriptionSuggestions.userId, userId));
  const dismissedKeys = new Set(dismissed.map((row) => row.name));

  const alreadyTagged = await db
    .select({ name: transactions.name })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(and(isNotNull(transactions.billKind), eq(plaidItems.userId, userId)));
  const taggedKeys = new Set(
    alreadyTagged.map((row) => normalizeName(row.name)),
  );

  const rows = await db
    .select({
      id: transactions.id,
      name: transactions.name,
      amount: transactions.amount,
      date: transactions.date,
      category: transactions.personalFinanceCategoryPrimary,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(and(gt(transactions.amount, "0"), eq(plaidItems.userId, userId)));

  const spendingRows = rows.filter((row) => isSpendingCategory(row.category));
  const clusters = clusterByNormalizedName(spendingRows);

  const suggestions: SubscriptionSuggestion[] = [];

  for (const [groupKey, group] of clusters) {
    if (dismissedKeys.has(groupKey) || taggedKeys.has(groupKey)) continue;

    const months = new Set(group.map((row) => row.date.slice(0, 7)));
    if (months.size < MIN_MONTHS) continue;

    const amounts = group.map((row) => Number(row.amount));
    const med = median(amounts);
    if (med === 0) continue;

    const isConsistent = amounts.every(
      (amount) => Math.abs(amount - med) / med <= AMOUNT_TOLERANCE,
    );
    if (!isConsistent) continue;

    const latest = [...group].sort((a, b) => b.date.localeCompare(a.date))[0];

    suggestions.push({
      groupKey,
      name: latest.name,
      category: labelForCategory(latest.category),
      monthsSeen: months.size,
      suggestedAmount: Math.abs(Number(latest.amount)),
      latestTransactionId: latest.id,
      latestDate: latest.date,
    });
  }

  return suggestions.sort((a, b) => b.monthsSeen - a.monthsSeen);
}

export async function dismissSubscriptionSuggestion(
  userId: string,
  groupKey: string,
): Promise<void> {
  await db
    .insert(dismissedSubscriptionSuggestions)
    .values({ userId, name: groupKey })
    .onConflictDoNothing({
      target: [dismissedSubscriptionSuggestions.userId, dismissedSubscriptionSuggestions.name],
    });
}
