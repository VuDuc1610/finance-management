# Design: Per-user data isolation (multi-tenancy)

## Context

The app currently uses Supabase Auth for login (wired up recently — see
`proxy.ts` / `lib/supabase/middleware.ts`), and the proxy already gates
every non-public page and API route behind `user`. But the financial data
tables (`plaid_items`, `accounts`, `transactions`, `balance_snapshots`,
`dismissed_subscription_suggestions`, `chat_messages`) have no ownership
column at all — every logged-in user currently sees the same global data.

This is the first of two projects. The user has multiple real people using
the app and wants each to see only their own linked accounts and data
(true multi-tenancy), before separately swapping the account-linking
provider from Plaid to SimpleFIN (next spec) to get past Plaid's
free-tier 10-connection cap. Doing tenancy first avoids reworking the
linking flow twice.

The app talks to Postgres directly via Drizzle (`lib/db/client.ts`, a raw
`DATABASE_URL` connection) — not through Supabase's PostgREST/RLS layer —
so ownership is enforced at the application query layer, not via Postgres
RLS policies.

## Schema changes (`lib/db/schema.ts`)

```ts
plaidItems {
  ...existing columns...
  userId: text("user_id").notNull()   // Supabase auth.users.id (uuid as text)
}

dismissedSubscriptionSuggestions {
  userId: text("user_id").notNull()
  name: text("name").notNull()
  dismissedAt: timestamp(...)
  // primary key becomes (userId, name) instead of name alone
}

chatMessages {
  ...existing columns...
  userId: text("user_id").notNull()
}
```

No FK constraint to `auth.users` — that table lives in Supabase's own
`auth` schema, which Drizzle doesn't manage here.

`accounts` and `balance_snapshots` get **no new column**. Ownership
cascades: `accounts.itemId → plaidItems.id`, `balanceSnapshots.accountId →
accounts.id`. Every query that needs to scope by user joins through to
`plaidItems.userId`.

## Scoping pattern

Every page/route that reads or writes owned data resolves the user itself
via `supabase.auth.getUser()` (the pattern `app/home/page.tsx` already
uses) and passes `userId: string` as the **first parameter** into the
relevant `lib/*.ts` function. No shared request-scoped helper — explicit
per-call, consistent with this codebase's plain-function style.

Functions that gain a `userId` param and a join/filter through to
`plaidItems.userId` (or a direct `chatMessages.userId` /
`dismissedSubscriptionSuggestions.userId` filter):

- `lib/spending.ts`: `getItemsNeedingReconnect`, `getAvailableMonths`,
  `getSpendingCategories`, `getCategoryTransactions`, `getDailyTotals`,
  `getDayTransactions`, `getMonthTransactions`
- `lib/net-worth.ts`: `getNetWorthBreakdownSeries`,
  `getAssetDistribution`, `getAccountsBreakdown`, `getLinkedInstitutions`
- `lib/cash-flow.ts`: `getAvailableCashFlowMonths`, `getCashFlowSankey`,
  `getIncomeSourceTransactions`, `getCashFlowTrend`
- `lib/subscriptions.ts`: `getSubscriptionsAndBills`
- `lib/subscription-suggestions.ts`: `getSubscriptionSuggestions`,
  `dismissSubscriptionSuggestion`
- `lib/ai/gemini.ts`: chat history read/insert/delete functions gain
  `userId` and filter `chatMessages` by it (each user gets their own
  advisor conversation instead of one shared thread)

Routes that create owned rows stamp `userId` from the session onto the
insert:

- `app/api/plaid/link-token/route.ts`, `app/api/plaid/exchange-token/route.ts`
  — the new `plaidItems` row gets `userId` from `supabase.auth.getUser()`.
- `app/api/transactions/[id]/route.ts`, `app/api/subscriptions/suggestions/**`
  — pass `userId` through to whatever `lib` function they call.

`app/api/cron/sync-transactions/route.ts` and
`app/api/cron/snapshot-balances/route.ts` are **unaffected** — they
already iterate every `plaidItems` row system-wide (`db.select().from(plaidItems)`
with no filter) regardless of owner, and write `accounts`/`transactions`/
`balanceSnapshots` rows tied to those items via existing FKs. Ownership is
implicit through the chain; no `userId` param needed there. `proxy.ts`
already exempts `/api/cron/*` from the auth gate, which is correct and
unchanged.

Every UI component that calls these functions from a Server Component
page passes the `userId` it already has in scope (pages already call
`supabase.auth.getUser()` for display-name purposes in some cases, e.g.
`app/home/page.tsx` — that call is reused for `userId`, not duplicated).

## Backfill migration

A one-time SQL migration, run once against production data:

```sql
update plaid_items set user_id = (select id from auth.users where email = 'ducvuminh6983@gmail.com') where user_id is null;
update dismissed_subscription_suggestions set user_id = (select id from auth.users where email = 'ducvuminh6983@gmail.com') where user_id is null;
update chat_messages set user_id = (select id from auth.users where email = 'ducvuminh6983@gmail.com') where user_id is null;
```

Run as a raw migration step (via Drizzle's migration mechanism or a
one-off script using `lib/db/client.ts`) **before** the `NOT NULL`
constraint is applied, in the same migration or as a preceding step, so
existing rows get an owner before the constraint would reject them. Looks
up the user by known email at migration-run time rather than hardcoding a
UUID.

## Error handling

`proxy.ts` already 401s unauthenticated API calls and redirects
unauthenticated pages to `/auth`, so every `lib/*.ts` call site is
guaranteed a `user` in scope — no new "missing user" error path is
needed. A user with zero `plaidItems` rows (new account, nothing linked
yet) falls out naturally as empty result sets, which existing empty-state
UI already has to handle today.

## Testing

No test suite exists in this repo. Verification is manual:

1. Run the backfill migration against a copy of production data (or
   production directly, with a backup) and confirm all existing rows got
   `user_id` set to the owner's account.
2. Log in as the existing user and confirm `/home`, `/spending`,
   `/networth`, `/cash-flow`, `/subscriptions` all show the same data as
   before the change.
3. Create a second Supabase test user, log in as them, and confirm every
   page shows an empty state — no data leaks from the first user.
4. Confirm the advisor chat panel shows an empty conversation for the
   second user and doesn't see the first user's chat history.

## Out of scope

- Postgres RLS policies — enforcement stays at the application query
  layer, matching how this app already talks to the database.
- Sharing/collaboration between users (e.g. a household seeing combined
  data) — explicitly ruled out; this is strict per-user isolation.
- The Plaid → SimpleFIN provider swap — separate spec, built on top of
  this one.
