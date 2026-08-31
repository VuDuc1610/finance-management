# Multi-tenancy (per-user data isolation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every logged-in user sees only their own linked accounts, transactions, subscriptions, and advisor chat history — no more globally shared financial data.

**Architecture:** Add a `userId` column to the three tables that currently have no ownership (`plaid_items`, `dismissed_subscription_suggestions`, `chat_messages`); `accounts` and `balance_snapshots` inherit ownership through their existing foreign keys. Every `lib/*.ts` query function that reads or writes owned data takes `userId` as its first parameter and filters through to `plaidItems.userId` (via a join where the table doesn't already join through `accounts`/`plaidItems`). Every page and API route resolves `userId` from `supabase.auth.getUser()` and passes it down. Enforcement is entirely at the application query layer — this app talks to Postgres directly via Drizzle, not through Supabase's RLS-enforcing PostgREST layer.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM (`drizzle-orm/postgres-js`), Supabase Auth (`@supabase/ssr`), `drizzle-kit` push-based schema sync (no `drizzle/` migrations directory exists yet — this repo pushes schema changes directly).

**Spec:** `docs/superpowers/specs/2026-08-30-multi-tenancy-design.md`

## Global Constraints

- No FK constraint from `userId` columns to `auth.users` — that table lives in Supabase's own `auth` schema, which Drizzle doesn't manage here.
- No shared request-scoped auth helper — every page/route calls `supabase.auth.getUser()` itself and passes `userId: string` as the explicit first parameter into `lib/*.ts` functions, per the spec's chosen scoping pattern.
- No test framework exists in this repo (no test script in `package.json`, no `*.test.ts` files). Verification is `npx tsc --noEmit` for type correctness plus manual smoke testing — never skip either.
- `app/api/cron/sync-transactions/route.ts` and `app/api/cron/snapshot-balances/route.ts` are explicitly **out of scope** — they iterate every `plaidItems` row system-wide by design and need no `userId` param.
- **Prerequisite — read before starting Task 1:** This worktree was branched from `origin/main`, but the primary checkout (`/Users/ducvu/code/finance-prj/finance-management`, no `.claude/worktrees/` suffix) has substantial **uncommitted** work not yet on `main`: the `dismissedSubscriptionSuggestions` table, `lib/subscription-suggestions.ts`, the `dashboard`→`networth` page rename, `lib/cash-flow.ts`, `components/cash-flow/*`, and others (run `git status` in the primary checkout to see the full list). Every task below assumes that pending work is already committed to `main` and this worktree's branch has been rebased onto it, so files like `lib/subscription-suggestions.ts` and the `dismissed_subscription_suggestions` table actually exist. **Before Task 1, merge/commit that pending work to `main` and rebase this branch on it** — otherwise Tasks 7 and later will fail immediately because the files they modify don't exist yet.

---

## Task 1: Add nullable `userId` columns to the schema

**Files:**
- Modify: `lib/db/schema.ts`

**Interfaces:**
- Produces: `plaidItems.userId`, `dismissedSubscriptionSuggestions.userId`, `chatMessages.userId` — all `text`, nullable in this task (made `NOT NULL` in Task 3 after the backfill in Task 2).

- [ ] **Step 1: Add the nullable columns**

In `lib/db/schema.ts`, add `userId` to `plaidItems` (after `id`):

```ts
export const plaidItems = pgTable("plaid_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  institutionName: text("institution_name").notNull(),
  plaidItemId: text("plaid_item_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  transactionsCursor: text("transactions_cursor"),
  transactionsConsentMissing: boolean("transactions_consent_missing")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

Add `userId` to `dismissedSubscriptionSuggestions`:

```ts
export const dismissedSubscriptionSuggestions = pgTable(
  "dismissed_subscription_suggestions",
  {
    userId: text("user_id"),
    name: text("name").notNull(),
    dismissedAt: timestamp("dismissed_at").notNull().defaultNow(),
  },
);
```

(This drops the old `name`-only primary key for now — Task 3 adds the composite `(userId, name)` primary key once `userId` is populated and `NOT NULL`. Drizzle requires at least one key config; leaving the table with no primary key for one task is fine since nothing depends on it during this window.)

Add `userId` to `chatMessages` (after `id`):

```ts
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  role: text("role").notNull(), // "user" | "model" | "tool"
  content: text("content").notNull(),
  toolName: text("tool_name"),
  toolArgs: text("tool_args"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

- [ ] **Step 2: Push the schema change**

Run: `npx drizzle-kit push`

Follow the interactive prompts — accept adding the three nullable `user_id` columns and accept dropping the old primary key on `dismissed_subscription_suggestions` (it will be recreated as nullable-safe in this step, composite in Task 3).

Expected: drizzle-kit reports the columns were added successfully with no errors.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`

Expected: no new errors (existing code doesn't reference `userId` yet, so this should be a clean pass).

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts
git commit -m "Add nullable userId columns to plaid_items, dismissed_subscription_suggestions, chat_messages"
```

---

## Task 2: Backfill `userId` on existing rows

**Files:**
- Create: `scripts/backfill-user-id.mjs`

**Interfaces:**
- Consumes: `DATABASE_URL` from `.env.local`, the `postgres` package (already a dependency — no new install needed).
- Produces: every existing row in `plaid_items`, `dismissed_subscription_suggestions`, `chat_messages` gets `user_id` set to the Supabase user with email `ducvuminh6983@gmail.com`.

- [ ] **Step 1: Write the backfill script**

Create `scripts/backfill-user-id.mjs`:

```js
import { readFileSync } from "node:fs";
import postgres from "postgres";

const OWNER_EMAIL = "ducvuminh6983@gmail.com";

function loadEnvLocal() {
  if (process.env.DATABASE_URL) return;
  let raw;
  try {
    raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set (checked env and .env.local)");
}

const sql = postgres(connectionString, { prepare: false });

async function main() {
  const [owner] = await sql`select id from auth.users where email = ${OWNER_EMAIL}`;
  if (!owner) {
    throw new Error(`No auth.users row found for email ${OWNER_EMAIL}`);
  }
  const ownerId = owner.id;
  console.log(`Backfilling user_id = ${ownerId} (${OWNER_EMAIL})`);

  const items = await sql`
    update plaid_items set user_id = ${ownerId} where user_id is null returning id
  `;
  console.log(`plaid_items: backfilled ${items.length} row(s)`);

  const dismissed = await sql`
    update dismissed_subscription_suggestions set user_id = ${ownerId} where user_id is null returning name
  `;
  console.log(`dismissed_subscription_suggestions: backfilled ${dismissed.length} row(s)`);

  const chats = await sql`
    update chat_messages set user_id = ${ownerId} where user_id is null returning id
  `;
  console.log(`chat_messages: backfilled ${chats.length} row(s)`);
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error(err);
    await sql.end();
    process.exit(1);
  });
```

- [ ] **Step 2: Run the backfill against your database**

Run: `node scripts/backfill-user-id.mjs`

Expected output: three `backfilled N row(s)` lines with `N` matching your current row counts (not 0, unless you have no data yet — if all three print `0` on a database you know has data, stop and check `DATABASE_URL` before continuing).

- [ ] **Step 3: Verify no rows were missed**

Run this ad-hoc check (reuses the same script's connection pattern) — add a temporary verification block or run via `psql`:

```bash
node -e "
import('./scripts/backfill-user-id.mjs').catch(() => {});
" 2>/dev/null || true
```

Simpler: just re-run `node scripts/backfill-user-id.mjs` a second time — expected output is `0` for all three tables (nothing left to backfill, confirming the first run caught everything and the script is idempotent).

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-user-id.mjs
git commit -m "Add one-off script to backfill userId on existing owned rows"
```

---

## Task 3: Enforce `NOT NULL` and the composite primary key

**Files:**
- Modify: `lib/db/schema.ts`

**Interfaces:**
- Consumes: Task 1's nullable columns, now fully populated by Task 2's backfill.
- Produces: `plaidItems.userId`, `chatMessages.userId` as `notNull()`; `dismissedSubscriptionSuggestions` with composite primary key `(userId, name)`.

- [ ] **Step 1: Tighten the schema**

In `lib/db/schema.ts`, change `plaidItems.userId` to:

```ts
  userId: text("user_id").notNull(),
```

Change `chatMessages.userId` to:

```ts
  userId: text("user_id").notNull(),
```

Change `dismissedSubscriptionSuggestions` to use a composite primary key (needs the `primaryKey` helper alongside the existing `unique` import):

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
  primaryKey,
} from "drizzle-orm/pg-core";
```

```ts
export const dismissedSubscriptionSuggestions = pgTable(
  "dismissed_subscription_suggestions",
  {
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    dismissedAt: timestamp("dismissed_at").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.name] }),
  }),
);
```

- [ ] **Step 2: Push the schema change**

Run: `npx drizzle-kit push`

Follow the interactive prompts and accept the `NOT NULL` constraints and the new composite primary key. If drizzle-kit reports it cannot add `NOT NULL` because of remaining null rows, stop — Task 2's backfill didn't fully complete; re-run `node scripts/backfill-user-id.mjs` and investigate before retrying this push.

Expected: push succeeds with no errors.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts
git commit -m "Make userId NOT NULL and give dismissed_subscription_suggestions a composite primary key"
```

---

## Task 4: Scope `lib/spending.ts` by `userId`

**Files:**
- Modify: `lib/spending.ts`

**Interfaces:**
- Consumes: `plaidItems.userId`, `accounts`, `transactions` from `lib/db/schema.ts` (Task 3).
- Produces: `getItemsNeedingReconnect(userId: string)`, `getAvailableMonths(userId: string)`, `getSpendingCategories(userId: string, year: number, month: number)`, `getCategoryTransactions(userId: string, year: number, month: number, categoryKey: string)`, `getDailyTotals(userId: string, year: number, month: number)`, `getDayTransactions(userId: string, date: string)`, `getMonthTransactions(userId: string, year: number, month: number)` — `userId` is always the first parameter, per the spec.

- [ ] **Step 1: Update imports and `getItemsNeedingReconnect`**

```ts
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, plaidItems, transactions } from "@/lib/db/schema";
import {
  dyeHueForIndex,
  isSpendingCategory,
  labelForCategory,
} from "@/lib/plaid/categories";
```

(unchanged — `and`/`eq` are already imported)

```ts
export async function getItemsNeedingReconnect(
  userId: string,
): Promise<ItemNeedingReconnect[]> {
  const rows = await db
    .select({
      id: plaidItems.id,
      institutionName: plaidItems.institutionName,
    })
    .from(plaidItems)
    .where(
      and(
        eq(plaidItems.transactionsConsentMissing, true),
        eq(plaidItems.userId, userId),
      ),
    );

  return rows.map((row) => ({
    itemId: row.id,
    institutionName: row.institutionName,
  }));
}
```

- [ ] **Step 2: Scope `getMonthSpendingRows` (the shared private helper)**

```ts
async function getMonthSpendingRows(
  userId: string,
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
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(
      and(
        gte(transactions.date, start),
        lt(transactions.date, end),
        eq(plaidItems.userId, userId),
      ),
    );

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
```

- [ ] **Step 3: Scope `getAvailableMonths`**

```ts
export async function getAvailableMonths(userId: string): Promise<SpendingMonth[]> {
  const rows = await db
    .select({ date: transactions.date })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(eq(plaidItems.userId, userId));

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
```

- [ ] **Step 4: Scope `getSpendingCategories` and `getCategoryTransactions`**

```ts
export async function getSpendingCategories(
  userId: string,
  year: number,
  month: number,
): Promise<SpendingSummary> {
  const rows = await getMonthSpendingRows(userId, year, month);
  // ...rest of the function body is unchanged...
```

(Only the signature and the `getMonthSpendingRows` call change — everything below that line in the existing function body stays exactly as-is.)

```ts
export async function getCategoryTransactions(
  userId: string,
  year: number,
  month: number,
  categoryKey: string,
): Promise<CategoryTransactionsResult> {
  const rows = await getMonthSpendingRows(userId, year, month);
  // ...rest of the function body is unchanged...
```

- [ ] **Step 5: Scope `getDailyTotals`**

```ts
export async function getDailyTotals(
  userId: string,
  year: number,
  month: number,
): Promise<DailyTotal[]> {
  const rows = await getMonthSpendingRows(userId, year, month);
  // ...rest of the function body is unchanged...
```

- [ ] **Step 6: Scope `getDayTransactions`**

```ts
export async function getDayTransactions(
  userId: string,
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
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(and(eq(transactions.date, date), eq(plaidItems.userId, userId)));

  // ...rest of the function body is unchanged...
```

- [ ] **Step 7: Scope `getMonthTransactions`**

```ts
export async function getMonthTransactions(
  userId: string,
  year: number,
  month: number,
): Promise<MonthTransactionsResult> {
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
      accountName: accounts.name,
      accountMask: accounts.mask,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(
      and(
        gte(transactions.date, start),
        lt(transactions.date, end),
        eq(plaidItems.userId, userId),
      ),
    );

  // ...rest of the function body is unchanged...
```

- [ ] **Step 8: Verify types compile**

Run: `npx tsc --noEmit`

Expected: errors at every call site of these functions (`app/home/page.tsx`, `app/spending/page.tsx`, etc.) since they don't pass `userId` yet — Task 10 fixes those. Confirm the errors are only "expected argument" / "missing argument" errors in caller files, not inside `lib/spending.ts` itself.

- [ ] **Step 9: Commit**

```bash
git add lib/spending.ts
git commit -m "Scope lib/spending.ts queries by userId"
```

---

## Task 5: Scope `lib/net-worth.ts` by `userId`

**Files:**
- Modify: `lib/net-worth.ts`

**Interfaces:**
- Produces: `getNetWorthBreakdownSeries(userId: string)`, `getAssetDistribution(userId: string)`, `getAccountsBreakdown(userId: string)`, `getLinkedInstitutions(userId: string)`.

- [ ] **Step 1: Scope `getNetWorthBreakdownSeries`**

```ts
export async function getNetWorthBreakdownSeries(
  userId: string,
): Promise<NetWorthBreakdownPoint[]> {
  const rows = await db
    .select({
      date: balanceSnapshots.date,
      type: accounts.type,
      balance: balanceSnapshots.currentBalance,
    })
    .from(balanceSnapshots)
    .innerJoin(accounts, eq(balanceSnapshots.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(eq(plaidItems.userId, userId));

  // ...rest of the function body is unchanged...
```

- [ ] **Step 2: Scope `getAssetDistribution`** (already joins `plaidItems` — just add the filter)

```ts
export async function getAssetDistribution(
  userId: string,
): Promise<AssetDistributionEntry[]> {
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
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(eq(plaidItems.userId, userId));

  // ...rest of the function body is unchanged...
```

- [ ] **Step 3: Scope `getAccountsBreakdown`**

```ts
export async function getAccountsBreakdown(userId: string): Promise<AccountGroup[]> {
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
    .innerJoin(accounts, eq(balanceSnapshots.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(eq(plaidItems.userId, userId));

  // ...rest of the function body is unchanged...
```

- [ ] **Step 4: Scope `getLinkedInstitutions`**

```ts
export async function getLinkedInstitutions(
  userId: string,
): Promise<LinkedInstitution[]> {
  const rows = await db
    .select({
      id: plaidItems.id,
      institutionName: plaidItems.institutionName,
    })
    .from(plaidItems)
    .where(eq(plaidItems.userId, userId));

  return rows.map((row) => ({
    itemId: row.id,
    institutionName: row.institutionName,
  }));
}
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`

Expected: new "missing argument" errors only at call sites (fixed in Task 10).

- [ ] **Step 6: Commit**

```bash
git add lib/net-worth.ts
git commit -m "Scope lib/net-worth.ts queries by userId"
```

---

## Task 6: Scope `lib/cash-flow.ts` by `userId`

**Files:**
- Modify: `lib/cash-flow.ts`

**Interfaces:**
- Produces: `getAvailableCashFlowMonths(userId: string)`, `getCashFlowSankey(userId: string, year: number, month: number)`, `getIncomeSourceTransactions(userId: string, year: number, month: number, sourceLabel: string)`, `getCashFlowTrend(userId: string, year: number, month: number, count?: number)`.

- [ ] **Step 1: Update imports and scope `getAvailableCashFlowMonths`**

```ts
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, plaidItems, transactions } from "@/lib/db/schema";
import { dyeHueForIndex, isSpendingCategory, labelForCategory } from "@/lib/plaid/categories";
```

```ts
export async function getAvailableCashFlowMonths(userId: string): Promise<CashFlowMonth[]> {
  const rows = await db
    .select({ date: transactions.date })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(eq(plaidItems.userId, userId));

  // ...rest of the function body is unchanged...
```

- [ ] **Step 2: Scope `getCashFlowSankey`**

```ts
export async function getCashFlowSankey(
  userId: string,
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
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(
      and(
        gte(transactions.date, start),
        lt(transactions.date, end),
        eq(plaidItems.userId, userId),
      ),
    );

  // ...rest of the function body is unchanged...
```

- [ ] **Step 3: Scope `getIncomeSourceTransactions`**

```ts
export async function getIncomeSourceTransactions(
  userId: string,
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
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(
      and(
        gte(transactions.date, start),
        lt(transactions.date, end),
        eq(plaidItems.userId, userId),
      ),
    );

  // ...rest of the function body is unchanged...
```

- [ ] **Step 4: Scope `getCashFlowTrend`**

```ts
export async function getCashFlowTrend(
  userId: string,
  year: number,
  month: number,
  count = 6,
): Promise<CashFlowTrendResult> {
  const first = shiftMonth(year, month, -(count - 1));
  const { start } = monthRange(first.year, first.month);
  const { end } = monthRange(year, month);

  const rows = await db
    .select({
      date: transactions.date,
      amount: transactions.amount,
      personalAmount: transactions.personalAmount,
      primary: transactions.personalFinanceCategoryPrimary,
      detailed: transactions.personalFinanceCategoryDetailed,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(
      and(
        gte(transactions.date, start),
        lt(transactions.date, end),
        eq(plaidItems.userId, userId),
      ),
    );

  // ...rest of the function body is unchanged...
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`

Expected: new "missing argument" errors only at call sites (fixed in Task 10).

- [ ] **Step 6: Commit**

```bash
git add lib/cash-flow.ts
git commit -m "Scope lib/cash-flow.ts queries by userId"
```

---

## Task 7: Scope `lib/subscriptions.ts` and `lib/subscription-suggestions.ts` by `userId`

**Files:**
- Modify: `lib/subscriptions.ts`
- Modify: `lib/subscription-suggestions.ts`

**Interfaces:**
- Produces: `getSubscriptionsAndBills(userId: string)`, `getSubscriptionSuggestions(userId: string)`, `dismissSubscriptionSuggestion(userId: string, groupKey: string)`.

- [ ] **Step 1: Scope `getSubscriptionsAndBills`**

```ts
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, plaidItems, transactions } from "@/lib/db/schema";
import { dyeHueForIndex, labelForCategory } from "@/lib/plaid/categories";
import { nextOccurrenceDate, daysUntil } from "@/lib/recurring-date";
```

```ts
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

  // ...rest of the function body is unchanged...
```

- [ ] **Step 2: Scope `getSubscriptionSuggestions`**

```ts
import { and, eq, gt, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  accounts,
  dismissedSubscriptionSuggestions,
  plaidItems,
  transactions,
} from "@/lib/db/schema";
import { isSpendingCategory, labelForCategory } from "@/lib/plaid/categories";
```

```ts
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

  // ...rest of the function body is unchanged...
```

- [ ] **Step 3: Scope `dismissSubscriptionSuggestion`**

```ts
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
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`

Expected: new "missing argument" errors only at call sites (fixed in Task 9 and Task 10).

- [ ] **Step 5: Commit**

```bash
git add lib/subscriptions.ts lib/subscription-suggestions.ts
git commit -m "Scope lib/subscriptions.ts and lib/subscription-suggestions.ts queries by userId"
```

---

## Task 8: Scope `lib/ai/gemini.ts` and `lib/ai/tools.ts` by `userId`

**Files:**
- Modify: `lib/ai/gemini.ts`
- Modify: `lib/ai/tools.ts`

**Interfaces:**
- Consumes: `getAvailableMonths(userId, ...)`, `getSpendingCategories(userId, ...)`, `getCategoryTransactions(userId, ...)`, `getSubscriptionsAndBills(userId)`, `getCashFlowSankey(userId, ...)`, `getNetWorthBreakdownSeries(userId)`, `getAccountsBreakdown(userId)` from Tasks 4-7.
- Produces: `loadVisibleHistory(userId: string)`, `runChat(userMessage: string, userId: string)`, `executeTool(name: string, args: ToolArgs, userId: string)`.

This is not explicitly called out by name in the spec's function list, but it's required: the spec says chat history functions in `lib/ai/gemini.ts` gain `userId`, and `lib/ai/tools.ts`'s `executeTool` is the thing that actually calls the now-`userId`-scoped functions from Tasks 4-7 on the advisor's behalf — without this task the advisor chat won't compile and would otherwise leak cross-user data through tool calls.

- [ ] **Step 1: Scope `loadVisibleHistory` and `loadGeminiHistory` in `lib/ai/gemini.ts`**

```ts
import { GoogleGenAI } from "@google/genai";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chatMessages } from "@/lib/db/schema";
import { toolDeclarations, executeTool } from "@/lib/ai/tools";
```

```ts
export async function loadVisibleHistory(
  userId: string,
): Promise<
  { id: number; role: "user" | "model"; content: string; createdAt: Date }[]
> {
  const rows: DbChatRow[] = await db
    .select()
    .from(chatMessages)
    .where(and(inArray(chatMessages.role, ["user", "model"]), eq(chatMessages.userId, userId)))
    .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
    .limit(40);

  return rows
    .map((row) => ({
      id: row.id,
      role: row.role as "user" | "model",
      content: row.content,
      createdAt: row.createdAt,
    }))
    .reverse();
}

async function loadGeminiHistory(userId: string) {
  const visible = await loadVisibleHistory(userId);
  return visible.map((row) => ({
    role: row.role,
    parts: [{ text: row.content }],
  }));
}
```

- [ ] **Step 2: Scope `runChat`**

```ts
export async function runChat(userMessage: string, userId: string): Promise<string> {
  const callId = Math.random().toString(36).slice(2, 8);
  const t0 = Date.now();
  console.log(`[chat ${callId}] start, message="${userMessage.slice(0, 80)}"`);

  const history = await loadGeminiHistory(userId);
  console.log(`[chat ${callId}] loaded history: ${history.length} turns`);

  const chat = ai.chats.create({
    model: MODEL,
    config: {
      systemInstruction: buildSystemInstruction(),
      tools: [{ functionDeclarations: toolDeclarations }],
    },
    history,
  });

  const [insertedUserRow] = await db
    .insert(chatMessages)
    .values({ userId, role: "user", content: userMessage })
    .returning({ id: chatMessages.id });

  try {
    console.log(`[chat ${callId}] sending initial message to Gemini (model=${MODEL})...`);
    let sendT0 = Date.now();
    let response = await chat.sendMessage({ message: userMessage });
    console.log(
      `[chat ${callId}] initial response in ${Date.now() - sendT0}ms, functionCalls=${response.functionCalls?.length ?? 0}`,
    );
    let iterations = 0;

    while (
      response.functionCalls &&
      response.functionCalls.length > 0 &&
      iterations < MAX_TOOL_ITERATIONS
    ) {
      const functionResponseParts = [];

      for (const call of response.functionCalls) {
        const name = call.name ?? "unknown";
        const args = (call.args ?? {}) as Record<string, unknown>;

        console.log(`[chat ${callId}] iter ${iterations}: executing tool "${name}" args=${JSON.stringify(args)}`);
        const toolT0 = Date.now();
        let result: unknown;
        try {
          result = await executeTool(name, args, userId);
          console.log(`[chat ${callId}] iter ${iterations}: tool "${name}" succeeded in ${Date.now() - toolT0}ms`);
        } catch (error) {
          result = {
            error: String(error instanceof Error ? error.message : error),
          };
          console.log(
            `[chat ${callId}] iter ${iterations}: tool "${name}" FAILED in ${Date.now() - toolT0}ms: ${String(error)}`,
          );
        }

        await db.insert(chatMessages).values({
          userId,
          role: "tool",
          content: JSON.stringify(result),
          toolName: name,
          toolArgs: JSON.stringify(args),
        });

        functionResponseParts.push({
          functionResponse: { id: call.id, name, response: { result } },
        });
      }

      console.log(`[chat ${callId}] iter ${iterations}: sending tool results back to Gemini...`);
      sendT0 = Date.now();
      response = await chat.sendMessage({ message: functionResponseParts });
      console.log(
        `[chat ${callId}] iter ${iterations}: follow-up response in ${Date.now() - sendT0}ms, functionCalls=${response.functionCalls?.length ?? 0}`,
      );
      iterations += 1;
    }

    if (iterations >= MAX_TOOL_ITERATIONS) {
      console.log(`[chat ${callId}] hit MAX_TOOL_ITERATIONS (${MAX_TOOL_ITERATIONS}) without a final text reply`);
    }

    const replyText = response.text ?? "I couldn't come up with an answer for that.";
    await db.insert(chatMessages).values({ userId, role: "model", content: replyText });

    console.log(`[chat ${callId}] done in ${Date.now() - t0}ms total, ${iterations} tool iteration(s)`);

    return replyText;
  } catch (error) {
    console.log(`[chat ${callId}] FAILED, cleaning up orphaned user row id=${insertedUserRow.id}: ${String(error)}`);
    await db.delete(chatMessages).where(eq(chatMessages.id, insertedUserRow.id));
    throw error;
  }
}
```

- [ ] **Step 3: Thread `userId` through `lib/ai/tools.ts`**

```ts
export async function executeTool(
  name: string,
  args: ToolArgs,
  userId: string,
): Promise<unknown> {
  switch (name) {
    case "getAvailableMonths":
      return getAvailableMonths(userId);
    case "getSpendingSummary": {
      const { year, month } = asYearMonth(args);
      return getSpendingCategories(userId, year, month);
    }
    case "getRecentTransactions": {
      const { year, month } = asYearMonth(args);
      const categoryKey = String(args.categoryKey ?? "").trim();
      if (!categoryKey) {
        throw new Error(`Invalid categoryKey: must be a non-empty string, got ${JSON.stringify(args.categoryKey)}`);
      }
      return getCategoryTransactions(userId, year, month, categoryKey);
    }
    case "getSubscriptions":
      return getSubscriptionsAndBills(userId);
    case "getCashFlow": {
      const { year, month } = asYearMonth(args);
      return getCashFlowSankey(userId, year, month);
    }
    case "getNetWorth":
      return getNetWorthBreakdownSeries(userId);
    case "getAccounts":
      return getAccountsBreakdown(userId);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

(The imports at the top of `lib/ai/tools.ts` are unchanged — same function names, just called with an extra leading argument now.)

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`

Expected: new "missing argument" errors only in `app/api/chat/route.ts` (fixed in Task 9).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/gemini.ts lib/ai/tools.ts
git commit -m "Scope advisor chat history and tool calls by userId"
```

---

## Task 9: Update API routes to resolve and pass `userId`

**Files:**
- Modify: `app/api/plaid/link-token/route.ts`
- Modify: `app/api/plaid/exchange-token/route.ts`
- Modify: `app/api/transactions/[id]/route.ts`
- Modify: `app/api/chat/route.ts`
- Modify: `app/api/subscriptions/suggestions/route.ts`
- Modify: `app/api/subscriptions/suggestions/dismiss/route.ts`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`, `userId`-scoped functions from Tasks 4-8.

- [ ] **Step 1: `app/api/plaid/link-token/route.ts`** — resolve the real user, scope the reconnect-item lookup, and stop hardcoding `client_user_id`

```ts
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { CountryCode, Products } from "plaid";
import { plaidClient } from "@/lib/plaid/client";
import { plaidItems } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const itemId = typeof body.itemId === "number" ? body.itemId : undefined;

    let accessToken: string | undefined;
    if (itemId !== undefined) {
      const { db } = await import("@/lib/db/client");
      const [item] = await db
        .select()
        .from(plaidItems)
        .where(and(eq(plaidItems.id, itemId), eq(plaidItems.userId, user.id)));
      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
      accessToken = item.accessToken;
    }

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "Zen Linen",
      products: [Products.Transactions],
      optional_products: [Products.Investments, Products.Liabilities, Products.Identity],
      country_codes: [CountryCode.Us],
      language: "en",
      ...(accessToken ? { access_token: accessToken } : {}),
    });

    return NextResponse.json({ linkToken: response.data.link_token });
  } catch (err) {
    console.error(
      "plaid/link-token failed:",
      err instanceof Error ? err.name : "unknown error",
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: `app/api/plaid/exchange-token/route.ts`** — stamp `userId` on the new `plaidItems` row

```ts
import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid/client";
import { db } from "@/lib/db/client";
import { accounts, plaidItems } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const publicToken = body.publicToken;
  const institutionName = body.institutionName;

  if (typeof publicToken !== "string" || publicToken.length === 0) {
    return NextResponse.json(
      { error: "publicToken is required" },
      { status: 400 },
    );
  }

  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const resolvedInstitutionName =
      typeof institutionName === "string" && institutionName.length > 0
        ? institutionName
        : "Unknown institution";

    const accountCount = await db.transaction(async (tx) => {
      const [item] = await tx
        .insert(plaidItems)
        .values({
          userId: user.id,
          institutionName: resolvedInstitutionName,
          plaidItemId: itemId,
          accessToken,
        })
        .onConflictDoUpdate({
          target: plaidItems.plaidItemId,
          set: {
            userId: user.id,
            accessToken,
            institutionName: resolvedInstitutionName,
          },
        })
        .returning({ id: plaidItems.id });

      const accountRows = accountsResponse.data.accounts.map((account) => ({
        itemId: item.id,
        plaidAccountId: account.account_id,
        name: account.name,
        officialName: account.official_name ?? null,
        type: account.type,
        subtype: account.subtype ?? null,
        mask: account.mask ?? null,
      }));

      if (accountRows.length > 0) {
        await tx
          .insert(accounts)
          .values(accountRows)
          .onConflictDoNothing({ target: accounts.plaidAccountId });
      }

      return accountRows.length;
    });

    return NextResponse.json({ success: true, accountCount });
  } catch (err) {
    console.error(
      "plaid/exchange-token failed:",
      err instanceof Error ? err.name : "unknown error",
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: `app/api/transactions/[id]/route.ts`** — verify ownership before allowing any update, and scope the cross-transaction `billKind` clear to the same owner

Note before writing this one: the `billKind`-clear query needs to restrict `transactions.accountId` to the current user's own accounts. `eq()` can't compare a column against a subquery that returns multiple rows, so this uses `inArray` with a list of owned account ids fetched first — not a direct subquery.

```ts
import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, plaidItems, transactions } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/transactions/[id]">,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const transactionId = Number(id);

  if (!Number.isInteger(transactionId)) {
    return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 });
  }

  const [owned] = await db
    .select({ id: transactions.id, name: transactions.name })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(and(eq(transactions.id, transactionId), eq(plaidItems.userId, user.id)));

  if (!owned) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const body = await request.json();
  const { personalAmount, billKind, dueDate } = body as {
    personalAmount?: number | null;
    billKind?: "subscription" | "bill" | null;
    dueDate?: string | null;
  };

  const update: Record<string, unknown> = { updatedAt: new Date() };

  if ("personalAmount" in body) {
    if (personalAmount !== null && typeof personalAmount !== "number") {
      return NextResponse.json({ error: "Invalid personalAmount" }, { status: 400 });
    }
    update.personalAmount = personalAmount === null ? null : personalAmount.toString();
  }

  if ("billKind" in body) {
    if (billKind !== null && billKind !== "subscription" && billKind !== "bill") {
      return NextResponse.json({ error: "Invalid billKind" }, { status: 400 });
    }
    update.billKind = billKind;

    if (billKind !== null) {
      const ownedAccountIds = await db
        .select({ id: accounts.id })
        .from(accounts)
        .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
        .where(eq(plaidItems.userId, user.id));
      const ownedAccountIdList = ownedAccountIds.map((row) => row.id);

      await db
        .update(transactions)
        .set({ billKind: null, updatedAt: new Date() })
        .where(
          and(
            eq(transactions.name, owned.name),
            ne(transactions.id, transactionId),
            inArray(transactions.accountId, ownedAccountIdList),
          ),
        );
    }
  }

  if ("dueDate" in body) {
    if (dueDate !== null && typeof dueDate !== "string") {
      return NextResponse.json({ error: "Invalid dueDate" }, { status: 400 });
    }
    update.dueDate = dueDate;
  }

  await db.update(transactions).set(update).where(eq(transactions.id, transactionId));

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: `app/api/chat/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { loadVisibleHistory, runChat } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await loadVisibleHistory(user.id);
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const message = body.message;

  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const reply = await runChat(message, user.id);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);

    const isOverloaded =
      error instanceof Error &&
      (error.message.includes('"code":503') || error.message.includes("UNAVAILABLE"));

    if (isOverloaded) {
      return NextResponse.json(
        { error: "The advisor is experiencing high demand right now. Please try again in a moment." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to get a response from the advisor" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 5: `app/api/subscriptions/suggestions/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getSubscriptionSuggestions } from "@/lib/subscription-suggestions";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suggestions = await getSubscriptionSuggestions(user.id);
  return NextResponse.json({ suggestions });
}
```

- [ ] **Step 6: `app/api/subscriptions/suggestions/dismiss/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { dismissSubscriptionSuggestion } from "@/lib/subscription-suggestions";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { groupKey } = body as { groupKey?: string };

  if (typeof groupKey !== "string" || groupKey.length === 0) {
    return NextResponse.json({ error: "Invalid groupKey" }, { status: 400 });
  }

  await dismissSubscriptionSuggestion(user.id, groupKey);

  return NextResponse.json({ success: true });
}
```

Note: these routes already return 401 via `proxy.ts` before reaching the handler, so the `if (!user)` checks here are defense-in-depth, not the primary gate — keep them anyway since a route handler shouldn't trust an upstream gate alone.

- [ ] **Step 7: Verify types compile**

Run: `npx tsc --noEmit`

Expected: remaining "missing argument" errors only in the page/component files touched by Task 10.

- [ ] **Step 8: Commit**

```bash
git add app/api/plaid/link-token/route.ts app/api/plaid/exchange-token/route.ts app/api/transactions/[id]/route.ts app/api/chat/route.ts app/api/subscriptions/suggestions/route.ts app/api/subscriptions/suggestions/dismiss/route.ts
git commit -m "Resolve and pass userId through API routes"
```

---

## Task 10: Update pages to resolve and pass `userId`

**Files:**
- Modify: `app/home/page.tsx`
- Modify: `app/spending/page.tsx`
- Modify: `app/spending/[category]/page.tsx`
- Modify: `app/spending/day/[date]/page.tsx`
- Modify: `app/networth/page.tsx`
- Modify: `app/cash-flow/page.tsx`
- Modify: `app/cash-flow/income/[source]/page.tsx`
- Modify: `app/subscriptions/page.tsx`
- Modify: `app/manage-accounts/page.tsx`
- Modify: `app/transactions/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`, `userId`-scoped functions from Tasks 4-7.

Note: `app/manage-accounts/page.tsx` (calls `getLinkedInstitutions()`) and `app/transactions/page.tsx` (calls `getAvailableMonths()` and `getMonthTransactions()`) weren't named in the spec's file list — the spec's list of call sites wasn't exhaustive. A repo-wide grep for every scoped function name confirmed these are the only two additional callers, so Steps 9-10 below close that gap.

- [ ] **Step 1: `app/home/page.tsx`** — already calls `supabase.auth.getUser()` for `displayName`; reuse `user.id`

```ts
import { HomeBoard } from "@/components/home/HomeBoard";
import { getNetWorthBreakdownSeries } from "@/lib/net-worth";
import {
  getAvailableMonths,
  getDailyTotals,
  getMonthTransactions,
  getSpendingCategories,
} from "@/lib/spending";
import { getSubscriptionsAndBills } from "@/lib/subscriptions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const displayName = user?.user_metadata?.full_name || user?.email || "there";
  const userId = user!.id;

  const [netWorthSeries, availableMonths, subscriptions] = await Promise.all([
    getNetWorthBreakdownSeries(userId),
    getAvailableMonths(userId),
    getSubscriptionsAndBills(userId),
  ]);

  const latestMonth = availableMonths[0] ?? null;
  const [spendingSummary, dailyTotals, monthTransactions] = latestMonth
    ? await Promise.all([
        getSpendingCategories(userId, latestMonth.year, latestMonth.month),
        getDailyTotals(userId, latestMonth.year, latestMonth.month),
        getMonthTransactions(userId, latestMonth.year, latestMonth.month),
      ])
    : [null, [], null];

  // ...rest of the function body is unchanged...
```

(`user!` is safe here: `proxy.ts` already redirects unauthenticated requests to `/auth` before this Server Component runs, so `user` is guaranteed non-null by the time this page renders.)

- [ ] **Step 2: `app/spending/page.tsx`**

```ts
import { Card } from "@/components/ui/Card";
import { SpendingDonut } from "@/components/spending/SpendingDonut";
import { CategoryCard } from "@/components/spending/CategoryCard";
import { SpendingCalendar } from "@/components/spending/SpendingCalendar";
import { SpendingMonthPicker } from "@/components/spending/SpendingMonthPicker";
import { ReconnectAccountButton } from "@/components/spending/ReconnectAccountButton";
import {
  getAvailableMonths,
  getDailyTotals,
  getItemsNeedingReconnect,
  getSpendingCategories,
} from "@/lib/spending";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SpendingPage(props: PageProps<"/spending">) {
  const searchParams = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const [availableMonths, itemsNeedingReconnect] = await Promise.all([
    getAvailableMonths(userId),
    getItemsNeedingReconnect(userId),
  ]);

  // ...reconnectBanner block and the empty-state early return are unchanged...

  // further down:
  const [summary, dailyTotals] = await Promise.all([
    getSpendingCategories(userId, selected.year, selected.month),
    getDailyTotals(userId, selected.year, selected.month),
  ]);

  // ...rest of the function body is unchanged...
```

- [ ] **Step 3: `app/spending/[category]/page.tsx`**

```ts
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TransactionRow } from "@/components/spending/TransactionRow";
import { getCategoryTransactions } from "@/lib/spending";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CategoryTransactionsPage(
  props: PageProps<"/spending/[category]">,
) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  // ...categoryKey/yearParam/monthParam/backHref/early-return block is unchanged...

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await getCategoryTransactions(user!.id, year, month, categoryKey);

  // ...rest of the function body is unchanged...
```

- [ ] **Step 4: `app/spending/day/[date]/page.tsx`**

```ts
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TransactionRow } from "@/components/spending/TransactionRow";
import { getDayTransactions } from "@/lib/spending";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default async function DayTransactionsPage(
  props: PageProps<"/spending/day/[date]">,
) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  // ...date/yearParam/monthParam/backHref block is unchanged...

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await getDayTransactions(user!.id, date);

  // ...rest of the function body is unchanged...
```

- [ ] **Step 5: `app/networth/page.tsx`**

```ts
import { Card } from "@/components/ui/Card";
import { NetWorthCard } from "@/components/net-worth/NetWorthCard";
import { AssetDistribution } from "@/components/net-worth/AssetDistribution";
import { AccountsBreakdown } from "@/components/net-worth/AccountsBreakdown";
import {
  getAccountsBreakdown,
  getAssetDistribution,
  getNetWorthBreakdownSeries,
} from "@/lib/net-worth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const [breakdown, assetDistribution, accountsBreakdown] = await Promise.all([
    getNetWorthBreakdownSeries(userId),
    getAssetDistribution(userId),
    getAccountsBreakdown(userId),
  ]);

  // ...rest of the function body is unchanged...
```

- [ ] **Step 6: `app/cash-flow/page.tsx`**

```ts
import { Card } from "@/components/ui/Card";
import { CashFlowView } from "@/components/cash-flow/CashFlowView";
import { CashFlowMonthPicker } from "@/components/cash-flow/CashFlowMonthPicker";
import { CashFlowSummaryStats } from "@/components/cash-flow/CashFlowSummaryStats";
import { getAvailableCashFlowMonths, getCashFlowSankey, getCashFlowTrend } from "@/lib/cash-flow";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CashFlowPage(props: PageProps<"/cash-flow">) {
  const searchParams = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const availableMonths = await getAvailableCashFlowMonths(userId);

  // ...empty-state early return is unchanged...

  // further down:
  const [sankey, trend] = await Promise.all([
    getCashFlowSankey(userId, selected.year, selected.month),
    getCashFlowTrend(userId, selected.year, selected.month),
  ]);

  // ...rest of the function body is unchanged...
```

- [ ] **Step 7: `app/cash-flow/income/[source]/page.tsx`**

```ts
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TransactionRow } from "@/components/spending/TransactionRow";
import { getIncomeSourceTransactions } from "@/lib/cash-flow";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function IncomeSourceTransactionsPage(
  props: PageProps<"/cash-flow/income/[source]">,
) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  // ...sourceLabel/yearParam/monthParam/backHref/early-return block is unchanged...

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await getIncomeSourceTransactions(user!.id, year, month, sourceLabel);

  // ...rest of the function body is unchanged...
```

- [ ] **Step 8: `app/subscriptions/page.tsx`**

```ts
import { Card } from "@/components/ui/Card";
import { SubscriptionsSummaryStats } from "@/components/subscriptions/SubscriptionsSummaryStats";
import { UpcomingPayments } from "@/components/subscriptions/UpcomingPayments";
import { SubscriptionsList } from "@/components/subscriptions/SubscriptionsList";
import { SubscriptionSuggestions } from "@/components/subscriptions/SubscriptionSuggestions";
import { getSubscriptionsAndBills } from "@/lib/subscriptions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { items, summary } = await getSubscriptionsAndBills(user!.id);

  // ...rest of the function body is unchanged...
```

- [ ] **Step 9: `app/manage-accounts/page.tsx`**

```ts
import { Card } from "@/components/ui/Card";
import { AddAccountButton } from "@/components/net-worth/AddAccountButton";
import { ReconnectAccountButton } from "@/components/spending/ReconnectAccountButton";
import { getLinkedInstitutions } from "@/lib/net-worth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ManageAccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const linkedInstitutions = await getLinkedInstitutions(user!.id);

  // ...rest of the function body is unchanged...
```

- [ ] **Step 10: `app/transactions/page.tsx`**

```ts
import { Card } from "@/components/ui/Card";
import { TransactionRow } from "@/components/spending/TransactionRow";
import { SpendingMonthPicker } from "@/components/spending/SpendingMonthPicker";
import {
  TransactionsSort,
  type TransactionSort,
} from "@/components/spending/TransactionsSort";
import { TransactionsSearch } from "@/components/spending/TransactionsSearch";
import {
  getAvailableMonths,
  getMonthTransactions,
  groupTransactionsByDate,
  type MonthTransaction,
} from "@/lib/spending";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ...currency/SORT_VALUES/renderRow are unchanged...

export default async function TransactionsPage(
  props: PageProps<"/transactions">,
) {
  const searchParams = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const availableMonths = await getAvailableMonths(userId);

  // ...empty-state early return is unchanged...

  // further down:
  const { all: allTransactions } = await getMonthTransactions(
    userId,
    selected.year,
    selected.month,
  );

  // ...rest of the function body is unchanged...
```

- [ ] **Step 11: Verify types compile clean**

Run: `npx tsc --noEmit`

Expected: **zero errors** — this is the task where every remaining call site gets fixed, so this must be a fully clean pass.

- [ ] **Step 12: Commit**

```bash
git add app/home/page.tsx app/spending/page.tsx "app/spending/[category]/page.tsx" "app/spending/day/[date]/page.tsx" app/networth/page.tsx app/cash-flow/page.tsx "app/cash-flow/income/[source]/page.tsx" app/subscriptions/page.tsx app/manage-accounts/page.tsx app/transactions/page.tsx
git commit -m "Resolve and pass userId through every page that reads owned data"
```

---

## Task 11: Manual multi-user smoke test

**Files:** none (verification only — no code changes)

**Interfaces:** none

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Confirm the backfilled owner still sees their data**

Log in as `ducvuminh6983@gmail.com` (the account the backfill in Task 2 assigned existing data to). Visit `/home`, `/spending`, `/networth`, `/cash-flow`, `/subscriptions` and confirm each shows the same data it showed before this plan started (same net worth chart, same spending categories, same subscriptions list).

Expected: no empty states, no missing data, no console errors about `userId` being `undefined`.

- [ ] **Step 3: Confirm a second user sees nothing**

In Supabase Auth, create a second test user (any email you control). Log in as that user in a private/incognito window. Visit the same five pages.

Expected: every page shows its empty state (e.g. "No transactions yet — link an account...") — zero data from the first user is visible anywhere.

- [ ] **Step 4: Confirm the advisor chat is isolated**

As the second test user, open the advisor chat panel (bottom-right button). Confirm it opens with no prior messages — not the first user's conversation history. Send a test message and confirm it gets a response with no error.

Expected: empty chat history for the second user; a working round-trip response.

- [ ] **Step 5: Confirm linking a new account under the second user works end-to-end**

If you have a spare Plaid Sandbox institution to test with, link an account as the second test user via the "Add account" flow. Confirm the new account appears on `/networth` and `/spending` for that user, and does **not** appear when you log back in as the first user.

Expected: the new account's data is fully scoped to the second user only.

This task has no commit — it's pure verification. If any step fails, stop and fix the underlying task before considering this plan complete.
