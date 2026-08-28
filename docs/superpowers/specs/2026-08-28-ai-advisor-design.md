# Design: AI finance advisor chat (Gemini Flash)

## Context

The user wants an AI advisor built into the app: a chat they can ask
questions like "how much did I spend on dining last month?" or "any advice
on my subscriptions?", answered using their own app data (transactions,
spending, cash flow, net worth, subscriptions). No live web/news access —
out of scope by explicit decision, since it adds cost/complexity without
being needed for advice grounded in the user's own data.

Model: Gemini Flash, via a user-supplied API key (`GEMINI_API_KEY`,
already added to `.env.local`). This is a single-user personal app — no
auth system, no multi-tenant concerns.

Decisions made during brainstorming:
- **Interaction**: chat (not passive dashboard cards).
- **Data scope**: everything — transactions, spending, cash flow, net
  worth, subscriptions/bills, accounts.
- **Placement**: floating chat panel, available from every page (not a
  dedicated nav page).
- **History**: persisted in the DB, one continuous conversation (no
  multi-thread management — YAGNI for a single user).
- **Data access pattern**: tool calling — the model calls functions to
  pull only the data relevant to the question, rather than dumping
  everything into context on every request.
- **Streaming**: not in this pass. The tool-calling loop already adds
  round trips; a plain request/response is simpler to get right first.
  Streaming can be added later as a pure UI enhancement.

## SDK

`@google/genai` — the current unified Google Gen AI SDK for
JS/TS (confirmed via search: replaces the deprecated
`@google/generative-ai` / `@google-ai/generativelanguage` packages).
Function calling is invoked through the SDK's `Chats` module (not raw
`generateContent`), per current SDK guidance.

Model name is read from an env var (`GEMINI_MODEL`, default
`gemini-flash-latest` — an alias Google keeps pointed at the current Flash
release) rather than hardcoded to a dated model string, so it doesn't go
stale as Google ships new Flash versions.

## Schema (`lib/db/schema.ts`)

```ts
chat_messages {
  id: serial primary key
  role: text                  // "user" | "model" | "tool"
  content: text                // for user/model: the message text
                                // for tool: JSON-stringified tool result
  toolName: text nullable      // set on "tool" rows, the function that was called
  toolArgs: text nullable      // JSON-stringified args, set on "tool" rows
  createdAt: timestamp default now()
}
```

One flat table, ordered by `createdAt`, replayed as conversation history
on each request. No `threads` table — single ongoing conversation, per
the YAGNI decision above.

## Data access layer (`lib/ai/tools.ts`)

Thin adapters over existing query modules — no new query logic, just a
tool-calling-shaped wrapper with a name/description/schema Gemini can
read:

- `getSpendingSummary({ year, month })` → wraps `lib/spending.ts`'s
  category summary.
- `getRecentTransactions({ limit, category?, startDate?, endDate? })` →
  wraps transaction queries in `lib/spending.ts`.
- `getSubscriptions()` → wraps `lib/subscriptions.ts`.
- `getCashFlow({ range })` → wraps `lib/cash-flow.ts`.
- `getNetWorth()` → wraps `lib/net-worth.ts`.
- `getAccounts()` → account list + current balances (from `accounts` /
  latest `balance_snapshots`).

Each tool function returns plain JSON-serializable data (numbers as
numbers, not DB `numeric` strings) since it's fed back to the model as a
function response.

## Chat loop (`lib/ai/gemini.ts`)

```
runChat(userMessage: string): Promise<string>
```

1. Load full `chat_messages` history from the DB, map to Gemini's
   `Content[]` shape (role + parts).
2. Insert a system instruction: the model is a personal finance advisor,
   only has access to the tools provided, should ground answers in tool
   results (not invent numbers), and has no internet/news access — if
   asked for something outside its data (e.g. current interest rates),
   it should say so rather than guess.
3. Send the new user message + tool declarations via the SDK's chat
   session.
4. Loop: if the response contains a function call, look up and execute
   the matching tool from `lib/ai/tools.ts`, send the result back as a
   function response; repeat until the model returns a plain text reply.
5. Persist: the new user message, any tool-call/tool-result pairs, and
   the final model reply — each as its own `chat_messages` row.
6. Return the final text reply.

A hardcoded max-iteration guard (e.g. 8 tool calls) prevents a runaway
loop from an unexpected model response pattern.

## API route (`app/api/chat/route.ts`)

`POST`, body `{ message: string }`. Calls `runChat`, returns
`{ reply: string }`. No auth check beyond what already gates the rest of
the app (none — single-user, matches existing API routes like
`link-token`). Errors from the Gemini call (bad API key, rate limit,
network) return a 500 with a plain error message; the client shows it as
a failed-message state, not a crash.

`GET` on the same route returns the persisted history (for the panel to
load on mount).

## UI (`components/chat/AdvisorChat.tsx`)

- Floating round button, fixed bottom-right, visible on every page —
  mounted once in `app/layout.tsx` alongside the sidebar/top bar.
- Click expands into a panel: scrollable message list (user messages
  right-aligned, model messages left-aligned) + text input + send button.
- On mount (first expand), `GET`s history and renders it.
- Sending a message: optimistically appends the user message, calls
  `POST`, appends the reply (or an inline error state) when it resolves.
  Input disabled while awaiting a reply.
- Tool-call rows are not rendered in the transcript — only user/model
  text messages are shown; tool calls are internal plumbing.

## Env vars

Added to `.env.local` (already gitignored):
```
GEMINI_API_KEY=            # user-supplied, already set
GEMINI_MODEL=              # optional override, defaults to gemini-flash-latest
```
Same var must be added in Vercel's Environment Variables before
deploying.

## New dependencies

- `@google/genai` — Gemini API client, server-side only (used from the
  API route / `lib/ai`).

## File structure (new)

```
lib/ai/gemini.ts                -- client setup, runChat tool-calling loop
lib/ai/tools.ts                 -- tool declarations + adapters over existing lib/ modules
app/api/chat/route.ts           -- POST send message, GET load history
components/chat/AdvisorChat.tsx -- floating button + panel, client component
```

`app/layout.tsx` edited in place to mount `AdvisorChat`.
`lib/db/schema.ts` edited in place to add `chat_messages`.

## Testing / verification

No automated test framework in this repo (consistent with prior
features); verified manually. Steps: `drizzle-kit push` to create
`chat_messages`, run dev server, open the chat panel, ask a question that
requires at least one tool call (e.g. "how much did I spend on dining
last month?"), confirm the answer matches real data visible elsewhere in
the app, reload the page and confirm history persists, ask something
outside the model's data access (e.g. "what's today's mortgage rate?")
and confirm it declines rather than fabricating.

## Out of scope for this change

- Web/news search tool — explicitly excluded.
- Multi-thread conversations, thread management UI.
- Streaming responses.
- The model taking write actions (tagging transactions, editing budgets)
  — read-only advice only for this pass.
- Rate limiting / abuse protection — single-user app, not exposed beyond
  the user's own deployment.
