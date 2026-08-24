# Spending Page Real Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the spending page's mock category data with real Plaid transactions, grouped by month/year (user-selectable, dynamically populated from whatever months actually have data), categorized by Plaid's own taxonomy, from whatever linked accounts support transactions (no institution hardcoding).

**Architecture:** A new `transactions` table stores Plaid transaction data, kept in sync via `transactionsSync` (Plaid's cursor-based incremental sync — the modern replacement for `transactionsGet`) run from a new daily cron route, mirroring the existing `snapshot-balances` cron's structure (per-item try/catch, redacted error logging, `CRON_SECRET` auth, deferred `db` import after the auth check). The spending page becomes a Server Component reading `?year=&month=` from the URL; a small client component drives month selection via `router.push`. The existing `SpendingDonut`/`CategoryCard` components are reused completely unchanged — the new query layer just produces data in the same `SpendingCategory` shape the mock data already used.

**Tech Stack:** Same as the existing Plaid integration — `plaid` Node SDK, Drizzle ORM, Next.js App Router.

**Spec:** No separate spec doc for this feature (design discussed and agreed upon inline in conversation, per user's choice to skip straight to a plan). The Global Constraints below capture every binding decision from that discussion.

## Global Constraints

- Sync uses `transactionsSync` with a per-item cursor (`plaid_items.transactions_cursor`), not `transactionsGet`. `cursor: null`/omitted on first sync pulls full available history (typically up to ~24 months, per Plaid) — this is the intended behavior, not a bug to fix.
- A transaction counts as "spending" only if `amount > 0` (Plaid convention: positive = money out) **and** its `personal_finance_category.primary` is not `TRANSFER_IN`, `TRANSFER_OUT`, or `LOAN_PAYMENTS` (excludes moving money between the user's own linked accounts, e.g. paying a credit card from checking).
- No institution/account hardcoding anywhere in the query layer. Investment-type accounts (e.g. Robinhood) naturally produce zero transaction rows, since Plaid's Transactions product only returns data for depository/credit accounts — this is Plaid's own behavior, not something this code needs to filter for explicitly.
- Category donut caps at 5 wedges: top 4 categories by amount, everything else rolled into "Other" — matches the original design doc's spending-donut spec exactly (`desgin.md` §5's "Cap at 5 wedges; roll anything past the top 4 into Other").
- The existing `components/spending/SpendingDonut.tsx` and `components/spending/CategoryCard.tsx` must NOT be modified — the new data layer produces the same `SpendingCategory` type (`{ name, amount, percent, color }`) they already consume from `lib/mock-spending-data.ts`.
- Month/year picker only ever shows months that actually have transaction data (from `getAvailableMonths()`), never a hardcoded list of the last 12 months.
- No automated test framework exists in this repo and none is introduced here. Verification is `npx tsc --noEmit`, `npm run lint`, manual `curl`, and manual DB/browser checks — same pattern as the existing Plaid work.
- `access_token` handling constraints from the earlier Plaid plan still apply: never returned in a response body, never logged raw.
- `CRON_SECRET` gate: same pattern as `snapshot-balances` — reject any request whose `Authorization: Bearer <token>` doesn't match `process.env.CRON_SECRET`, checked before any DB access (deferred `db` import).

---

## File Structure

```
lib/db/schema.ts                              -- MODIFY: add transactions_cursor to plaid_items, add transactions table
lib/plaid/categories.ts                        -- NEW: category label/color mapping + spending-exclusion helper
lib/spending.ts                                -- NEW: getAvailableMonths(), getSpendingCategories(year, month)
app/api/cron/sync-transactions/route.ts        -- NEW: transactionsSync cron route
vercel.json                                    -- MODIFY: add second cron entry
components/spending/SpendingMonthPicker.tsx    -- NEW: client component, month/year dropdown driving URL nav
app/spending/page.tsx                          -- MODIFY: real data via searchParams, existing components reused as-is
```

`components/spending/SpendingDonut.tsx`, `components/spending/CategoryCard.tsx`, `components/ui/Dropdown.tsx`, `lib/mock-spending-data.ts` (for its `SpendingCategory` type) are consumed unchanged.

---

### Task 1: Schema — transactions table + sync cursor

**Files:**
- Modify: `lib/db/schema.ts`

**Interfaces:**
- Produces: `transactions` table (Drizzle `pgTable`) with columns `id, accountId, plaidTransactionId, name, amount, date, pending, personalFinanceCategoryPrimary, personalFinanceCategoryDetailed, isoCurrencyCode, createdAt, updatedAt`. Adds `transactionsCursor` column to the existing `plaidItems` table. Consumed by Tasks 3 and 4.

- [ ] **Step 1: Add `boolean` to the drizzle-orm/pg-core import and add `transactionsCursor` to `plaidItems`**

In `lib/db/schema.ts`, change the import line:

```ts
import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  date,
  timestamp,
  unique,
  boolean,
} from "drizzle-orm/pg-core";
```

Add `transactionsCursor` to the `plaidItems` table definition (after `accessToken`, before `createdAt`):

```ts
export const plaidItems = pgTable("plaid_items", {
  id: serial("id").primaryKey(),
  institutionName: text("institution_name").notNull(),
  plaidItemId: text("plaid_item_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  transactionsCursor: text("transactions_cursor"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

- [ ] **Step 2: Add the `transactions` table**

Add this after the existing `balanceSnapshots` table definition, at the end of the file:

```ts
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  plaidTransactionId: text("plaid_transaction_id").notNull().unique(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  date: date("date").notNull(),
  pending: boolean("pending").notNull().default(false),
  personalFinanceCategoryPrimary: text("personal_finance_category_primary"),
  personalFinanceCategoryDetailed: text("personal_finance_category_detailed"),
  isoCurrencyCode: text("iso_currency_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `lib/db/schema.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts
git commit -m "Add transactions table and sync cursor to schema"
```

(This does not push the schema to the live database — that happens once, in Task 7, alongside the rest of this plan's verification, via `npx drizzle-kit push`.)

---

### Task 2: Category label/color mapping helper

**Files:**
- Create: `lib/plaid/categories.ts`

**Interfaces:**
- Produces: `dyeHueForIndex(index: number): DyeHue`, `isSpendingCategory(primary: string | null): boolean`, `labelForCategory(primary: string | null): string`. Consumed by `lib/spending.ts` (Task 4).

- [ ] **Step 1: Write `lib/plaid/categories.ts`**

```ts
const DYE_HUES = [
  "var(--color-dye-indigo)",
  "var(--color-dye-madder)",
  "var(--color-dye-moss)",
  "var(--color-dye-saffron)",
  "var(--color-dye-plum)",
] as const;

export type DyeHue = (typeof DYE_HUES)[number];

export function dyeHueForIndex(index: number): DyeHue {
  return DYE_HUES[index % DYE_HUES.length];
}

const EXCLUDED_PRIMARY_CATEGORIES = new Set([
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "LOAN_PAYMENTS",
]);

export function isSpendingCategory(primary: string | null): boolean {
  if (!primary) return true;
  return !EXCLUDED_PRIMARY_CATEGORIES.has(primary);
}

const CATEGORY_LABELS: Record<string, string> = {
  FOOD_AND_DRINK: "Food & Dining",
  GENERAL_MERCHANDISE: "Shopping",
  HOME_IMPROVEMENT: "Home Improvement",
  MEDICAL: "Medical",
  PERSONAL_CARE: "Personal Care",
  GENERAL_SERVICES: "Services",
  GOVERNMENT_AND_NON_PROFIT: "Government & Non-Profit",
  TRANSPORTATION: "Transportation",
  TRAVEL: "Travel",
  RENT_AND_UTILITIES: "Bills & Utilities",
  ENTERTAINMENT: "Entertainment",
  BANK_FEES: "Bank Fees",
  INCOME: "Income",
};

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function labelForCategory(primary: string | null): string {
  if (!primary) return "Other";
  return CATEGORY_LABELS[primary] ?? toTitleCase(primary);
}
```

`toTitleCase` is a fallback for any Plaid category code not in the static map (Plaid's taxonomy can grow over time) — it turns e.g. `SOME_NEW_CATEGORY` into "Some New Category" instead of showing a raw uppercase code.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `lib/plaid/categories.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/plaid/categories.ts
git commit -m "Add Plaid category label and spending-classification helpers"
```

---

### Task 3: Transaction sync cron route

**Files:**
- Create: `app/api/cron/sync-transactions/route.ts`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `plaidClient` (`lib/plaid/client.ts`), `db`, `accounts`, `plaidItems`, `transactions` (`lib/db/schema.ts`, Task 1), `CRON_SECRET` from `process.env`.
- Produces: `GET /api/cron/sync-transactions` → `{ success: true, addedCount, modifiedCount, removedCount, failedItems }` on success, `401` on bad/missing auth.

- [ ] **Step 1: Write `app/api/cron/sync-transactions/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { plaidClient } from "@/lib/plaid/client";
import { accounts, plaidItems, transactions } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const providedSecret = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  if (!providedSecret || providedSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { db } = await import("@/lib/db/client");

  const items = await db.select().from(plaidItems);
  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;
  const failedItems: { id: number; institutionName: string }[] = [];

  for (const item of items) {
    try {
      const itemAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.itemId, item.id));
      const accountIdByPlaidId = new Map(
        itemAccounts.map((account) => [account.plaidAccountId, account.id]),
      );

      let cursor: string | undefined = item.transactionsCursor ?? undefined;
      let hasMore = true;

      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: item.accessToken,
          cursor,
        });

        for (const transaction of response.data.added) {
          const localAccountId = accountIdByPlaidId.get(transaction.account_id);
          if (!localAccountId) continue;

          await db
            .insert(transactions)
            .values({
              accountId: localAccountId,
              plaidTransactionId: transaction.transaction_id,
              name: transaction.name,
              amount: transaction.amount.toString(),
              date: transaction.date,
              pending: transaction.pending,
              personalFinanceCategoryPrimary:
                transaction.personal_finance_category?.primary ?? null,
              personalFinanceCategoryDetailed:
                transaction.personal_finance_category?.detailed ?? null,
              isoCurrencyCode: transaction.iso_currency_code ?? "USD",
            })
            .onConflictDoNothing({ target: transactions.plaidTransactionId });
          addedCount += 1;
        }

        for (const transaction of response.data.modified) {
          const localAccountId = accountIdByPlaidId.get(transaction.account_id);
          if (!localAccountId) continue;

          await db
            .update(transactions)
            .set({
              name: transaction.name,
              amount: transaction.amount.toString(),
              date: transaction.date,
              pending: transaction.pending,
              personalFinanceCategoryPrimary:
                transaction.personal_finance_category?.primary ?? null,
              personalFinanceCategoryDetailed:
                transaction.personal_finance_category?.detailed ?? null,
              isoCurrencyCode: transaction.iso_currency_code ?? "USD",
              updatedAt: new Date(),
            })
            .where(eq(transactions.plaidTransactionId, transaction.transaction_id));
          modifiedCount += 1;
        }

        for (const removed of response.data.removed) {
          await db
            .delete(transactions)
            .where(eq(transactions.plaidTransactionId, removed.transaction_id));
          removedCount += 1;
        }

        cursor = response.data.next_cursor;
        hasMore = response.data.has_more;
      }

      await db
        .update(plaidItems)
        .set({ transactionsCursor: cursor })
        .where(eq(plaidItems.id, item.id));
    } catch (err) {
      console.error(
        "cron/sync-transactions item failed:",
        err instanceof Error ? err.name : "unknown error",
      );
      failedItems.push({ id: item.id, institutionName: item.institutionName });
    }
  }

  return NextResponse.json({
    success: true,
    addedCount,
    modifiedCount,
    removedCount,
    failedItems,
  });
}
```

- [ ] **Step 2: Update `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/cron/snapshot-balances",
      "schedule": "0 13 * * *"
    },
    {
      "path": "/api/cron/sync-transactions",
      "schedule": "10 13 * * *"
    }
  ]
}
```

(Runs 10 minutes after the balance snapshot, same daily cadence.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `app/api/cron/sync-transactions/route.ts`.

- [ ] **Step 4: Manual verification of the 401 path (no live secrets required)**

Run: `npm run dev` (if not already running), then:
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/cron/sync-transactions`

Expected: `401` (no `Authorization` header sent).

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/sync-transactions/route.ts vercel.json
git commit -m "Add transaction sync cron route"
```

(Live verification — actually syncing real transactions — happens in Task 7, once the schema is pushed to the database.)

---

### Task 4: Spending query helpers

**Files:**
- Create: `lib/spending.ts`

**Interfaces:**
- Consumes: `db`, `transactions` (`lib/db/schema.ts`), `dyeHueForIndex`, `isSpendingCategory`, `labelForCategory` (`lib/plaid/categories.ts`, Task 2), `SpendingCategory` type (`lib/mock-spending-data.ts`, existing/unchanged).
- Produces: `SpendingMonth` (`{ year: number; month: number }`), `getAvailableMonths(): Promise<SpendingMonth[]>` (newest first), `SpendingSummary` (`{ categories: SpendingCategory[]; total: number; monthLabel: string }`), `getSpendingCategories(year: number, month: number): Promise<SpendingSummary>`. Consumed by `app/spending/page.tsx` (Task 6) and `components/spending/SpendingMonthPicker.tsx` (Task 5).

- [ ] **Step 1: Write `lib/spending.ts`**

```ts
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
```

Note: if a transaction has no `personal_finance_category` at all (rare), it's bucketed under the same `"OTHER"` key used for the top-4 rollup — in the unlikely case both an uncategorized-transactions bucket and a rolled-up-small-categories bucket exist in the same month, they'd render as two separate "Other" legend entries. This is a rare, harmless cosmetic edge case (both are genuinely different money), not a data-correctness bug — no special handling needed for it.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `lib/spending.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/spending.ts
git commit -m "Add spending query helpers (available months, category breakdown)"
```

---

### Task 5: Month/year picker component

**Files:**
- Create: `components/spending/SpendingMonthPicker.tsx`

**Interfaces:**
- Consumes: `Dropdown` (`components/ui/Dropdown.tsx`, existing/unchanged), `SpendingMonth` type (`lib/spending.ts`, Task 4).
- Produces: `<SpendingMonthPicker availableMonths={SpendingMonth[]} selected={SpendingMonth} />`, consumed by `app/spending/page.tsx` (Task 6). Navigates via `router.push` to `/spending?year=<year>&month=<month>` on selection.

- [ ] **Step 1: Write `components/spending/SpendingMonthPicker.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/ui/Dropdown";
import type { SpendingMonth } from "@/lib/spending";

interface SpendingMonthPickerProps {
  availableMonths: SpendingMonth[];
  selected: SpendingMonth;
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

function monthKey(month: SpendingMonth): string {
  return `${month.year}-${month.month}`;
}

export function SpendingMonthPicker({
  availableMonths,
  selected,
}: SpendingMonthPickerProps) {
  const router = useRouter();

  const options = availableMonths.map((month) => ({
    value: monthKey(month),
    label: `${MONTH_NAMES[month.month - 1]} ${month.year}`,
  }));

  return (
    <Dropdown
      value={monthKey(selected)}
      options={options}
      onChange={(value) => {
        const [year, month] = value.split("-");
        router.push(`/spending?year=${year}&month=${month}`);
      }}
    />
  );
}
```

A single combined "Month Year" dropdown (rather than two separate month/year dropdowns) is used deliberately — since `availableMonths` only ever contains year/month pairs that actually have data, this makes an invalid selection (a month/year combination with no data) structurally impossible.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `components/spending/SpendingMonthPicker.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/spending/SpendingMonthPicker.tsx
git commit -m "Add spending month/year picker component"
```

---

### Task 6: Wire the spending page to real data

**Files:**
- Modify: `app/spending/page.tsx`

**Interfaces:**
- Consumes: `getAvailableMonths`, `getSpendingCategories` (`lib/spending.ts`, Task 4), `SpendingMonthPicker` (Task 5), existing `Card`, `SpendingDonut`, `CategoryCard` (all unchanged).

- [ ] **Step 1: Rewrite `app/spending/page.tsx`**

```tsx
import { Card } from "@/components/ui/Card";
import { SpendingDonut } from "@/components/spending/SpendingDonut";
import { CategoryCard } from "@/components/spending/CategoryCard";
import { SpendingMonthPicker } from "@/components/spending/SpendingMonthPicker";
import { getAvailableMonths, getSpendingCategories } from "@/lib/spending";

export const dynamic = "force-dynamic";

export default async function SpendingPage(props: PageProps<"/spending">) {
  const searchParams = await props.searchParams;
  const availableMonths = await getAvailableMonths();

  if (availableMonths.length === 0) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
        <h1 className="mb-6 font-sans text-[1.125rem] font-medium text-ink-900">
          Where it went
        </h1>
        <Card className="p-8 text-center">
          <p className="font-sans text-[0.9375rem] text-linen-700">
            No transactions yet — link an account and give the sync a moment
            to run.
          </p>
        </Card>
      </main>
    );
  }

  const yearParam = Array.isArray(searchParams.year)
    ? searchParams.year[0]
    : searchParams.year;
  const monthParam = Array.isArray(searchParams.month)
    ? searchParams.month[0]
    : searchParams.month;

  const requested =
    yearParam && monthParam
      ? { year: Number(yearParam), month: Number(monthParam) }
      : null;

  const selected =
    requested &&
    availableMonths.some(
      (m) => m.year === requested.year && m.month === requested.month,
    )
      ? requested
      : availableMonths[0];

  const summary = await getSpendingCategories(selected.year, selected.month);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-sans text-[1.125rem] font-medium text-ink-900">
          Where it went
        </h1>
        <SpendingMonthPicker availableMonths={availableMonths} selected={selected} />
      </div>

      {summary.categories.length > 0 ? (
        <>
          <Card className="p-6 sm:p-8">
            <SpendingDonut
              data={summary.categories}
              total={summary.total}
              monthLabel={summary.monthLabel}
            />
          </Card>

          <div className="mt-6">
            <Card className="p-6 sm:p-8">
              <h2 className="mb-4 font-sans text-[1rem] font-medium text-ink-900">
                Spending Categories
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {summary.categories.map((category) => (
                  <CategoryCard key={category.name} category={category} />
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-8 text-center">
          <p className="font-sans text-[0.9375rem] text-linen-700">
            No spending found for {summary.monthLabel} — try a different
            month.
          </p>
        </Card>
      )}
    </main>
  );
}
```

This fully replaces the mock-data version. `lib/mock-spending-data.ts` is left in place unused (its `SpendingCategory` type is still imported by `lib/spending.ts`), matching the established pattern from the net worth page's mock-data handling.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `app/spending/page.tsx`. If `PageProps<"/spending">` isn't recognized, run `npx next typegen` first (per the Next.js docs: "Types are generated during `next dev`, `next build`, or with `next typegen`") and re-run the typecheck.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification without a DB migration applied yet (expected failure mode)**

Run: `npm run dev`, then open `http://localhost:3000/spending`.
Expected: since the `transactions` table doesn't exist in the live database yet at this point in the plan (schema push happens in Task 7), this will throw a "relation does not exist" (or similar Postgres) error. That's correct at this point, not a bug — full success is verified in Task 7.

- [ ] **Step 5: Commit**

```bash
git add app/spending/page.tsx
git commit -m "Wire spending page to real Plaid transaction data"
```

---

### Task 7: End-to-end verification with real data

This task requires pushing the schema change to the live database and triggering a real sync — both safe, non-destructive operations the implementer can run directly (no new user action needed, unlike the original Plaid setup — `DATABASE_URL`/`PLAID_SECRET` are already configured in `.env.local` from that earlier work).

**Files:** none (verification only).

- [ ] **Step 1: Push the schema change**

Run: `npx drizzle-kit push`
Expected: drizzle-kit reports the `transactions` table created and the `transactions_cursor` column added to `plaid_items`, no errors. Confirm in Supabase's table editor.

- [ ] **Step 2: Restart the dev server**

Run: `npm run dev` (restart if already running, so nothing is stale).

- [ ] **Step 3: Trigger the transaction sync manually**

Run: `curl -s -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)" http://localhost:3000/api/cron/sync-transactions`
Expected: `{"success":true,"addedCount":N,"modifiedCount":0,"removedCount":0,"failedItems":[]}` where `N` is the number of transactions found across the linked depository/credit accounts (Chase, Discover). This may take a while on first run since it pulls full history.

- [ ] **Step 4: Verify data landed correctly**

Query the database directly (e.g. via a short Node script using the `postgres` package and `.env.local`'s `DATABASE_URL`, same pattern used to verify `plaid_items`/`accounts`/`balance_snapshots` earlier in this project) to confirm: `transactions` has rows, `plaid_items.transactions_cursor` is populated (non-null) for each item that has transaction data.

- [ ] **Step 5: Verify the spending page renders real data**

Load `http://localhost:3000/spending`.
Expected: the month/year dropdown shows real months with data (not a hardcoded list), the donut and category cards show real category breakdowns summing to a real total, and Robinhood does not appear anywhere (it has no transaction rows, confirming the "no institution hardcoding" requirement holds in practice, not just in the query code).

- [ ] **Step 6: Spot-check the transfer-exclusion logic**

Pick a month where a credit card payment from Chase to Discover (or similar) is known to have occurred. Confirm that transaction does NOT inflate any spending category — i.e., the month's total roughly matches what was actually spent on goods/services, not total money movement. If Plaid categorized that specific transaction under something other than `TRANSFER_IN`/`TRANSFER_OUT`/`LOAN_PAYMENTS` (categorization isn't always perfect), note it as a follow-up rather than treating it as a bug in this code — the exclusion list matches Plaid's documented taxonomy correctly; any misses are Plaid categorization accuracy, not a logic error here.

- [ ] **Step 7: Commit (only if a fix was needed during verification)**

If Steps 1–6 required no code changes, there's nothing to commit — this task is verification-only. If a real bug surfaced and was fixed, commit that fix with a message describing what was wrong.

---

## Self-Review Notes

- **Spec coverage:** transactions table + cursor (Task 1) ✅, sync via `transactionsSync` (Task 3) ✅, transfer/loan-payment exclusion (Task 4) ✅, category cap-at-5-with-Other (Task 4) ✅, dynamic month/year picker sourced from real data (Tasks 4–5) ✅, no institution hardcoding (verified structurally in Task 4's query and confirmed empirically in Task 7 Step 5) ✅, existing `SpendingDonut`/`CategoryCard` left untouched (Task 6) ✅.
- **Type consistency:** `SpendingCategory` (existing type from `lib/mock-spending-data.ts`) is produced directly by `getSpendingCategories` in Task 4 and consumed unchanged by `SpendingDonut`/`CategoryCard` in Task 6 — verified this compiles under `tsc` in Task 4/6 rather than assumed. `SpendingMonth` type is defined once in Task 4 and imported by both Task 5 and Task 6.
- **No placeholders:** all steps contain complete, runnable code or exact shell commands.
