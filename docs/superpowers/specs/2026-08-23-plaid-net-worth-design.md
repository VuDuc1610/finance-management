# Design: Real Plaid data for the Net Worth page

## Context

The net worth page (`app/page.tsx`) currently renders a static mock series
from `lib/mock-data.ts`. This is the first backend/data feature in the
project — no database, no external API integration, and no secrets exist
yet. The goal is to replace the mock net worth chart with real balances
pulled from Plaid (production environment), for accounts the user links
themselves through the app's own "+ Add account" button.

Plaid client ID (not secret) is already known: `6a8b7febf953a8000dd0a340`.
The user will fill in `PLAID_SECRET` themselves and is deploying to Vercel.

Two things are established as unavoidable, from discussion:
1. Plaid access tokens must be persisted somewhere durable — re-running
   Plaid Link on every page load isn't workable.
2. Plaid has no "historical balance" endpoint — `accountsBalanceGet` only
   ever returns the current balance. A real (non-fake) net worth history
   chart requires accumulating our own daily snapshots over time, starting
   from whenever the first account is linked. The chart will be sparse
   (as few as one point) on day one and fill in daily.

Everything else (current net worth total, account list) could technically
be computed live from Plaid on every request, but since we already need a
DB for the above, the plan stores accounts too rather than re-fetching
metadata from Plaid on every page load.

## Storage: Supabase Postgres + Drizzle ORM

Supabase over Neon/Vercel Postgres/KV: it's Postgres under the hood (so
Drizzle works identically), and its table editor is useful for a solo user
to eyeball real balance rows without writing SQL. Connect via Supabase's
pooled ("Transaction mode") Postgres connection string — required for
serverless function connection limits.

### Schema (`lib/db/schema.ts`)

```ts
plaid_items {
  id: serial primary key
  institution_name: text
  plaid_item_id: text unique
  access_token: text          // server-only, never returned to the client
  created_at: timestamp default now()
}

accounts {
  id: serial primary key
  item_id: integer references plaid_items(id)
  plaid_account_id: text unique
  name: text
  official_name: text nullable
  type: text                  // Plaid AccountType: depository, credit, loan, investment, ...
  subtype: text nullable
  mask: text nullable
  created_at: timestamp default now()
}

balance_snapshots {
  id: serial primary key
  account_id: integer references accounts(id)
  date: date
  current_balance: numeric
  iso_currency_code: text
  created_at: timestamp default now()
  unique (account_id, date)   // lets the cron upsert safely
}
```

Net worth for a given day = `sum(current_balance)` across that day's
snapshots, with `type in ('credit', 'loan')` balances subtracted (Plaid
reports those as a positive amount owed, not a negative asset).

## Plaid Link flow (connecting a real account)

1. `POST /api/plaid/link-token` — server route. Calls Plaid
   `linkTokenCreate` with `PLAID_CLIENT_ID` / `PLAID_SECRET` /
   `PLAID_ENV=production`. Returns the short-lived `link_token` to the
   browser. No DB access needed.
2. `components/net-worth/AddAccountButton.tsx` — client component,
   replaces the current static "+ Add account" button on the net worth
   page. Uses `react-plaid-link`'s `usePlaidLink` hook: fetches the link
   token, opens Plaid's hosted Link UI, and on success receives a
   `public_token`.
3. `POST /api/plaid/exchange-token` — receives `public_token`, calls
   Plaid `itemPublicTokenExchange` to get a permanent `access_token` +
   `item_id`, then `accountsGet` to pull that item's accounts. Inserts one
   `plaid_items` row and one `accounts` row per account.
4. On success, the client triggers a Next.js router refresh so the page
   re-renders with the new account (it will show $0 / sparse history
   until the first snapshot runs — see below).

## Daily balance snapshot (cron)

- `GET /api/cron/snapshot-balances` — iterates every `plaid_items` row,
  calls Plaid `accountsBalanceGet` per item, and upserts one
  `balance_snapshots` row per account for today's date
  (`ON CONFLICT (account_id, date) DO UPDATE` — safe to re-run same-day).
- Protected by a `CRON_SECRET` env var checked against a header/query
  param; any other caller is rejected.
- `vercel.json` schedules it once daily.
- Can also be hit manually (e.g. right after linking a new account) to
  get an immediate snapshot instead of waiting for the next scheduled run.

## Net worth page data flow

- `app/page.tsx` becomes an async Server Component. Queries Supabase
  (via Drizzle) for:
  - all `balance_snapshots` grouped/summed by date → feeds `NetWorthChart`
  - today's total vs. the snapshot closest to ~30 days ago → feeds the
    big numeral + delta line
- Zero linked accounts, or zero snapshots yet → empty state per the
  design doc's voice guidance ("No transactions yet — link an account
  above to see it here"), instead of the chart.
- `NetWorthChart`'s props/shape are unchanged — it stays a dumb
  presentational component, now fed real data instead of mock data.
- `lib/mock-data.ts` is left in place (unused by the page) rather than
  deleted, since spending/cash-flow pages still reference their own mock
  files and this keeps the net worth mock data available for reference/
  future storybook-style use; can be deleted later if it stays dead code.

## Env vars & secrets

`.env.local` (already gitignored):
```
PLAID_CLIENT_ID=6a8b7febf953a8000dd0a340
PLAID_SECRET=              # user fills in
PLAID_ENV=production
DATABASE_URL=              # user fills in, from Supabase connection string
CRON_SECRET=               # generated random value
```

Same vars must be added in the Vercel project's Environment Variables
settings before deploying (dashboard access — user does this step).
`access_token` values are written only by `/api/plaid/exchange-token` and
read only by `/api/cron/snapshot-balances`; no route ever returns them to
the client, and they are never logged.

## New dependencies

- `plaid` — official Node SDK, used server-side only (API routes).
- `react-plaid-link` — Plaid Link React hook, used client-side only in
  `AddAccountButton.tsx`.
- `drizzle-orm` + `drizzle-kit` — schema, queries, migrations.
- `postgres` (the `postgres-js` driver) — Drizzle's Postgres driver,
  compatible with Supabase's pooled connection string.

## File structure (new)

```
lib/db/schema.ts               -- Drizzle table definitions
lib/db/client.ts                -- Drizzle client (reads DATABASE_URL)
lib/plaid/client.ts             -- Plaid Node client (reads PLAID_* env vars)
lib/net-worth.ts                -- query helpers: daily series, current total, 30-day-ago total
app/api/plaid/link-token/route.ts
app/api/plaid/exchange-token/route.ts
app/api/cron/snapshot-balances/route.ts
components/net-worth/AddAccountButton.tsx   -- replaces static button, client component
drizzle.config.ts               -- drizzle-kit config (migration generation)
vercel.json                     -- cron schedule
```

`app/page.tsx`, `components/net-worth/NetWorthCard.tsx` are edited in
place (Card/Chart components keep their existing prop shapes).

## Testing / verification

- No unit test framework exists yet in this repo; this feature is
  verified end-to-end manually (real Plaid production Link flow, real
  Supabase data), not via automated tests. Introducing a test framework
  is out of scope for this change.
- Verification steps: run `drizzle-kit push` against the real Supabase DB
  to create tables, run the dev server, click "+ Add account", complete
  Plaid Link with a real account, confirm rows appear in Supabase's table
  editor, manually hit the cron route once to get a same-day snapshot,
  confirm the net worth page renders the real balance and a one-point
  chart.

## Out of scope for this change

- Spending (donut) and cash flow (Sankey) pages stay on mock data — only
  net worth is wired to real data in this pass.
- Multi-user auth — this is a single-user personal app; no login system.
- Historical backfill — no synthetic/estimated past data; the chart
  starts sparse and grows for real, as decided in discussion.
- Investment holdings, liabilities/due-date chips — deferred per the
  original design doc's component table; not part of this change.
