# AI Finance Advisor Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating chat panel, available on every page, where the user can ask a Gemini Flash-backed advisor questions about their own finance data (spending, transactions, subscriptions, cash flow, net worth, accounts), grounded via tool calling against the app's existing query functions.

**Architecture:** A single `lib/ai/gemini.ts` module owns a tool-calling loop against the Gemini API (`@google/genai`), calling into thin tool adapters (`lib/ai/tools.ts`) that wrap the app's existing `lib/spending.ts` / `lib/cash-flow.ts` / `lib/subscriptions.ts` / `lib/net-worth.ts` query functions — no new query logic is introduced. One API route (`app/api/chat/route.ts`) exposes `POST` (send a message, run the loop, persist + return the reply) and `GET` (load persisted history). A client component (`components/chat/AdvisorChat.tsx`) renders the floating button/panel and is mounted once in `app/layout.tsx`.

**Tech Stack:** Next.js 16 App Router, `@google/genai` (Gemini API SDK), Drizzle ORM (existing `lib/db/client.ts`), existing Supabase Postgres.

**Spec:** `docs/superpowers/specs/2026-08-28-ai-advisor-design.md`

## Global Constraints

- No web/news access, no write actions, no multi-thread UI, no streaming, no rate limiting — all explicitly out of scope per spec.
- Tool adapters wrap existing functions as-is; they do not add new query capabilities beyond what's already in `lib/spending.ts`, `lib/cash-flow.ts`, `lib/subscriptions.ts`, `lib/net-worth.ts`. Where the spec's illustrative tool signature (e.g. `getRecentTransactions({ limit, category?, ... })`) doesn't match an existing function, the tool takes the parameters the existing function actually accepts (`year`, `month`) rather than inventing new query logic — confirmed against `lib/spending.ts` during planning.
- Single continuous conversation — one `chat_messages` table, no threads table.
- No automated test framework exists in this repo and none is introduced here (matches spec's "Testing / verification" and prior plans' convention). Verification is `npx tsc --noEmit`, `npm run lint`, manual `curl`, and manual browser checks.
- `GEMINI_API_KEY` is already set in `.env.local`. Model name is read from `process.env.GEMINI_MODEL`, defaulting to `"gemini-flash-latest"` if unset — never hardcode a dated model string.
- `@google/genai` is the only new dependency (confirmed during brainstorming as the current, non-deprecated Gemini SDK for JS/TS — replaces `@google/generative-ai`).
- Tool call rows (`role: "tool"`) are persisted for audit/debugging but are never sent back to the client from `GET /api/chat` and never rendered in the transcript — only `user`/`model` rows are user-visible.

---

## File Structure

```
lib/db/schema.ts                    -- modified: add chatMessages table
lib/ai/tools.ts                     -- new: tool declarations + executeTool dispatcher
lib/ai/gemini.ts                    -- new: Gemini client, history load/save, runChat loop
app/api/chat/route.ts               -- new: POST send message, GET load history
components/chat/AdvisorChat.tsx     -- new: floating button + panel, client component
app/layout.tsx                      -- modified: mount AdvisorChat
```

---

### Task 1: Dependency install and API key smoke test

**Files:**
- Modify: `package.json` (via `npm install`)

**Interfaces:**
- Produces: `@google/genai` installed and importable, confirms `GEMINI_API_KEY` in `.env.local` is a working key before any other code depends on it.

- [ ] **Step 1: Install the dependency**

```bash
npm install @google/genai
```

- [ ] **Step 2: Verify install**

Run: `npm ls @google/genai`
Expected: package listed with a resolved version, no `UNMET DEPENDENCY` error.

- [ ] **Step 3: Smoke-test the API key with a throwaway script**

Create a temporary file `scripts/gemini-smoke-test.mjs`:

```js
import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "node:fs";

const envContent = readFileSync(".env.local", "utf8");
const match = envContent.match(/^GEMINI_API_KEY=(.+)$/m);
const apiKey = match?.[1]?.trim();

if (!apiKey) {
  throw new Error("GEMINI_API_KEY not found in .env.local");
}

const ai = new GoogleGenAI({ apiKey });
const response = await ai.models.generateContent({
  model: "gemini-flash-latest",
  contents: "Reply with exactly the word OK.",
});

console.log("Model replied:", response.text);
```

Run: `node scripts/gemini-smoke-test.mjs`

Expected: prints `Model replied: OK` (or close to it — the exact wording isn't guaranteed, but a successful non-error response confirms the key works). If this errors with an auth/permission error, stop here — the key in `.env.local` needs to be replaced with a real AI Studio key (`aistudio.google.com/apikey`) before continuing; the `AQ.`-prefixed key set earlier in this conversation did not match the typical `AIzaSy...` Gemini API key format, so this step exists specifically to catch that early.

- [ ] **Step 4: Delete the smoke-test script**

```bash
rm scripts/gemini-smoke-test.mjs
```

It was throwaway — not part of the shipped feature.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add @google/genai dependency"
```

---

### Task 2: `chat_messages` schema

**Files:**
- Modify: `lib/db/schema.ts`

**Interfaces:**
- Produces: `chatMessages` (Drizzle `pgTable`) exported from `lib/db/schema.ts`, consumed by `lib/ai/gemini.ts` (Task 4) and `app/api/chat/route.ts` (Task 5).

- [ ] **Step 1: Add the table to `lib/db/schema.ts`**

Append to the existing file (keep existing tables untouched):

```ts
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // "user" | "model" | "tool"
  content: text("content").notNull(),
  toolName: text("tool_name"),
  toolArgs: text("tool_args"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

No new imports needed — `pgTable`, `serial`, `text`, `timestamp` are already imported at the top of `lib/db/schema.ts`.

- [ ] **Step 2: Push the schema**

Run: `npx drizzle-kit push`
Expected: drizzle-kit reports a new `chat_messages` table created, no errors. Confirm in Supabase's table editor that `chat_messages` exists with columns `id`, `role`, `content`, `tool_name`, `tool_args`, `created_at`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `lib/db/schema.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts
git commit -m "Add chat_messages table for AI advisor history"
```

---

### Task 3: Tool declarations and dispatcher

**Files:**
- Create: `lib/ai/tools.ts`

**Interfaces:**
- Consumes: `getAvailableMonths`, `getSpendingCategories`, `getMonthTransactions` (`lib/spending.ts`), `getSubscriptionsAndBills` (`lib/subscriptions.ts`), `getCashFlowSankey` (`lib/cash-flow.ts`), `getNetWorthBreakdownSeries`, `getAccountsBreakdown` (`lib/net-worth.ts`) — all pre-existing, unmodified.
- Produces: `toolDeclarations: FunctionDeclaration[]` and `executeTool(name: string, args: Record<string, unknown>): Promise<unknown>`, both exported from `lib/ai/tools.ts`, consumed by `lib/ai/gemini.ts` (Task 4).

- [ ] **Step 1: Write `lib/ai/tools.ts`**

```ts
import { Type, type FunctionDeclaration } from "@google/genai";
import { getAvailableMonths, getSpendingCategories, getMonthTransactions } from "@/lib/spending";
import { getSubscriptionsAndBills } from "@/lib/subscriptions";
import { getCashFlowSankey } from "@/lib/cash-flow";
import { getNetWorthBreakdownSeries, getAccountsBreakdown } from "@/lib/net-worth";

const monthYearParams = {
  type: Type.OBJECT,
  properties: {
    year: { type: Type.NUMBER, description: "Four-digit year, e.g. 2026" },
    month: { type: Type.NUMBER, description: "Month number, 1-12" },
  },
  required: ["year", "month"],
};

const noParams = { type: Type.OBJECT, properties: {} };

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "getAvailableMonths",
    description:
      "List the year/month combinations that have transaction data, most recent first. Call this first if unsure which months have data before asking for a specific month.",
    parameters: noParams,
  },
  {
    name: "getSpendingSummary",
    description:
      "Get spending broken down by category for a given month, with totals and percentages per category.",
    parameters: monthYearParams,
  },
  {
    name: "getRecentTransactions",
    description:
      "Get every individual transaction for a given month: name, amount, category, date, pending status, and whether it's a subscription/bill.",
    parameters: monthYearParams,
  },
  {
    name: "getSubscriptions",
    description:
      "Get all recurring subscriptions and bills, with monthly totals, counts, and how many are due soon.",
    parameters: noParams,
  },
  {
    name: "getCashFlow",
    description:
      "Get income vs. spending flow (cash flow) for a given month, broken down by source and category.",
    parameters: monthYearParams,
  },
  {
    name: "getNetWorth",
    description:
      "Get the daily net worth history (assets, liabilities, net total) across all linked accounts.",
    parameters: noParams,
  },
  {
    name: "getAccounts",
    description:
      "Get current balances for every linked account, grouped by type (cash, credit cards, investments, loans).",
    parameters: noParams,
  },
];

type ToolArgs = Record<string, unknown>;

function asYearMonth(args: ToolArgs): { year: number; month: number } {
  const year = Number(args.year);
  const month = Number(args.month);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error(`Invalid year/month tool args: ${JSON.stringify(args)}`);
  }
  return { year, month };
}

export async function executeTool(name: string, args: ToolArgs): Promise<unknown> {
  switch (name) {
    case "getAvailableMonths":
      return getAvailableMonths();
    case "getSpendingSummary": {
      const { year, month } = asYearMonth(args);
      return getSpendingCategories(year, month);
    }
    case "getRecentTransactions": {
      const { year, month } = asYearMonth(args);
      return getMonthTransactions(year, month);
    }
    case "getSubscriptions":
      return getSubscriptionsAndBills();
    case "getCashFlow": {
      const { year, month } = asYearMonth(args);
      return getCashFlowSankey(year, month);
    }
    case "getNetWorth":
      return getNetWorthBreakdownSeries();
    case "getAccounts":
      return getAccountsBreakdown();
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `lib/ai/tools.ts`. If `Type` or `FunctionDeclaration` don't resolve as shown, check `node_modules/@google/genai/dist/**/*.d.ts` for the actual exported names in the installed version and adjust the import accordingly — the SDK's public API has shifted across versions.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/tools.ts
git commit -m "Add Gemini tool declarations wrapping existing data queries"
```

---

### Task 4: Gemini client and tool-calling chat loop

**Files:**
- Create: `lib/ai/gemini.ts`

**Interfaces:**
- Consumes: `db`, `chatMessages` (`lib/db/schema.ts`, Task 2), `toolDeclarations`, `executeTool` (`lib/ai/tools.ts`, Task 3).
- Produces: `runChat(userMessage: string): Promise<string>` and `loadVisibleHistory(): Promise<{ id: number; role: "user" | "model"; content: string; createdAt: Date }[]>`, both exported, consumed by `app/api/chat/route.ts` (Task 5).

- [ ] **Step 1: Write `lib/ai/gemini.ts`**

```ts
import { GoogleGenAI } from "@google/genai";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chatMessages } from "@/lib/db/schema";
import { toolDeclarations, executeTool } from "@/lib/ai/tools";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
const MAX_TOOL_ITERATIONS = 8;

function buildSystemInstruction(): string {
  const today = new Date().toISOString().slice(0, 10);
  return [
    "You are a personal finance advisor built into this user's own finance app.",
    `Today's date is ${today}.`,
    "You have tools to look up the user's real spending, transactions, subscriptions, cash flow, net worth, and account balances — always call a tool rather than guessing or estimating a number.",
    "You have no internet or news access. If asked about something outside your tools (e.g. current interest rates, market news), say plainly that you don't have access to that instead of guessing.",
    "Keep answers concise and concrete, referencing real figures from tool results.",
  ].join(" ");
}

interface DbChatRow {
  id: number;
  role: string;
  content: string;
  createdAt: Date;
}

export async function loadVisibleHistory(): Promise<
  { id: number; role: "user" | "model"; content: string; createdAt: Date }[]
> {
  const rows: DbChatRow[] = await db
    .select()
    .from(chatMessages)
    .where(inArray(chatMessages.role, ["user", "model"]))
    .orderBy(asc(chatMessages.createdAt));

  return rows.map((row) => ({
    id: row.id,
    role: row.role as "user" | "model",
    content: row.content,
    createdAt: row.createdAt,
  }));
}

async function loadGeminiHistory() {
  const visible = await loadVisibleHistory();
  return visible.map((row) => ({
    role: row.role,
    parts: [{ text: row.content }],
  }));
}

export async function runChat(userMessage: string): Promise<string> {
  const history = await loadGeminiHistory();

  const chat = ai.chats.create({
    model: MODEL,
    config: {
      systemInstruction: buildSystemInstruction(),
      tools: [{ functionDeclarations: toolDeclarations }],
    },
    history,
  });

  await db.insert(chatMessages).values({ role: "user", content: userMessage });

  let response = await chat.sendMessage({ message: userMessage });
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
      const result = await executeTool(name, args);

      await db.insert(chatMessages).values({
        role: "tool",
        content: JSON.stringify(result),
        toolName: name,
        toolArgs: JSON.stringify(args),
      });

      functionResponseParts.push({
        functionResponse: { id: call.id, name, response: { result } },
      });
    }

    response = await chat.sendMessage({ message: functionResponseParts });
    iterations += 1;
  }

  const replyText = response.text ?? "I couldn't come up with an answer for that.";
  await db.insert(chatMessages).values({ role: "model", content: replyText });

  return replyText;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `lib/ai/gemini.ts`. If `chat.sendMessage`, `response.functionCalls`, or `response.text` don't match the installed SDK's types, check `node_modules/@google/genai/dist/**/*.d.ts` (search for `sendMessage` and `functionCalls`) and adjust the calls to match — this is the one place in the plan most likely to need adjustment against the exact installed SDK version.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/gemini.ts
git commit -m "Add Gemini tool-calling chat loop"
```

---

### Task 5: Chat API route

**Files:**
- Create: `app/api/chat/route.ts`

**Interfaces:**
- Consumes: `runChat`, `loadVisibleHistory` (`lib/ai/gemini.ts`, Task 4).
- Produces: `GET /api/chat` → `{ messages: { id: number; role: "user" | "model"; content: string; createdAt: string }[] }`. `POST /api/chat` with body `{ message: string }` → `{ reply: string }` on success, `{ error: string }` with status 400/500 on failure. Consumed by `AdvisorChat` (Task 6).

- [ ] **Step 1: Write `app/api/chat/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { loadVisibleHistory, runChat } from "@/lib/ai/gemini";

export async function GET() {
  const messages = await loadVisibleHistory();
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = body.message;

  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const reply = await runChat(message);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to get a response from the advisor" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `app/api/chat/route.ts`.

- [ ] **Step 3: Manual verification**

Run: `npm run dev` (if not already running), then:
`curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"message":"How much did I spend last month?"}'`

Expected: a JSON body like `{"reply":"..."}` with a real, non-generic answer referencing an actual dollar figure — confirms the full tool-calling loop worked end to end against real data. Then:
`curl -s http://localhost:3000/api/chat`
Expected: `{"messages":[...]}` containing the user message and model reply just sent.

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "Add chat API route"
```

---

### Task 6: Floating chat UI

**Files:**
- Create: `components/chat/AdvisorChat.tsx`

**Interfaces:**
- Consumes: `GET /api/chat`, `POST /api/chat` (Task 5).
- Produces: `<AdvisorChat />` component, named export, consumed by `app/layout.tsx` (Task 7).

- [ ] **Step 1: Write `components/chat/AdvisorChat.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  id: number;
  role: "user" | "model";
  content: string;
}

export function AdvisorChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || hasLoadedHistory) return;

    fetch("/api/chat")
      .then((res) => res.json())
      .then((data) => setMessages(data.messages))
      .finally(() => setHasLoadedHistory(true));
  }, [isOpen, hasLoadedHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;

    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content: text }]);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "model", content: data.reply },
      ]);
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close finance advisor chat" : "Open finance advisor chat"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-dye-saffron font-sans text-[1.25rem] text-ink-900 shadow-lg hover:opacity-90"
      >
        {isOpen ? "×" : "💬"}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[32rem] w-96 flex-col rounded-card border border-linen-300 bg-linen-100 shadow-xl">
          <div className="border-b border-linen-300 px-4 py-3 font-sans text-[0.9375rem] font-medium text-ink-900">
            Finance Advisor
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && hasLoadedHistory && (
              <p className="font-sans text-[0.8125rem] text-linen-700">
                Ask about your spending, subscriptions, cash flow, or net worth.
              </p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 font-sans text-[0.8125rem] whitespace-pre-wrap ${
                  message.role === "user"
                    ? "ml-auto bg-dye-indigo text-linen-100"
                    : "bg-linen-300/50 text-ink-900"
                }`}
              >
                {message.content}
              </div>
            ))}
            {error && <p className="font-sans text-[0.75rem] text-dye-madder">{error}</p>}
          </div>

          <div className="flex gap-2 border-t border-linen-300 p-3">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSend();
              }}
              disabled={isSending}
              placeholder="Ask about your spending…"
              className="flex-1 rounded-pill border border-linen-300 bg-white px-3 py-2 font-sans text-[0.8125rem] text-ink-900 outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || input.trim().length === 0}
              className="rounded-pill bg-dye-saffron px-4 py-2 font-sans text-[0.8125rem] font-medium text-ink-900 hover:opacity-90 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `components/chat/AdvisorChat.tsx`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/chat/AdvisorChat.tsx
git commit -m "Add floating AdvisorChat UI component"
```

---

### Task 7: Mount the chat panel globally

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `AdvisorChat` (`components/chat/AdvisorChat.tsx`, Task 6).

- [ ] **Step 1: Edit `app/layout.tsx`**

Add the import and mount the component inside `<body>`, alongside the existing layout:

```tsx
import type { Metadata } from "next";
import { Fraunces, Karla, IBM_Plex_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { AdvisorChat } from "@/components/chat/AdvisorChat";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Zen Linen — Finance Dashboard",
  description: "A calm, soothing home for looking at your money.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${karla.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex h-full flex-col overflow-hidden">
        <TopBar />
        <div className="relative flex min-h-0 flex-1">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</div>
        </div>
        <AdvisorChat />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `app/layout.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "Mount AdvisorChat globally in the root layout"
```

---

### Task 8: End-to-end verification in the browser

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`, open `http://localhost:3000`.

- [ ] **Step 2: Open the chat and ask a grounded question**

Click the floating button bottom-right, type "How much did I spend on dining last month?" (or a category you know has real transactions), send it.

Expected: after a short delay (tool call round trip), a reply appears citing a real dollar figure. Cross-check that figure against the `/spending` page for the same month — they should match, since both read the same underlying data.

- [ ] **Step 3: Ask something requiring a different tool**

Ask "What subscriptions am I paying for?"

Expected: a reply listing real subscriptions/bills, matching what's shown on `/subscriptions`.

- [ ] **Step 4: Ask something outside the model's data access**

Ask "What's today's average mortgage interest rate?"

Expected: the model declines or says it doesn't have access to that, rather than fabricating a number — confirms the system instruction's "no internet access" guidance is working.

- [ ] **Step 5: Verify persistence**

Reload the page, reopen the chat panel.

Expected: the full conversation from Steps 2–4 is still there, loaded from `GET /api/chat`.

- [ ] **Step 6: Commit (only if a fix was needed)**

If Steps 1–5 required no code changes, there's nothing to commit — this task is verification-only. If a bug surfaced and was fixed, commit that fix with a message describing what was wrong.

---

## Self-Review Notes

- **Spec coverage:** SDK choice (`@google/genai`) ✅ Task 1; schema (`chat_messages`) ✅ Task 2; data access layer (all 6 named tools + `getAvailableMonths`) ✅ Task 3; chat loop with system instruction, tool-call iteration guard, and persistence ✅ Task 4; API route (`POST`/`GET`) ✅ Task 5; floating UI mounted globally ✅ Tasks 6–7; env vars (`GEMINI_API_KEY` already set, `GEMINI_MODEL` optional override read in code) ✅ Task 4; out-of-scope items (web search, streaming, write actions, multi-thread, rate limiting) correctly not implemented ✅.
- **Type consistency:** `loadVisibleHistory`'s return shape (`{ id, role, content, createdAt }[]`) matches what `app/api/chat/route.ts`'s `GET` handler returns directly and what `AdvisorChat.tsx`'s `ChatMessage` interface expects (`id`, `role`, `content` — `createdAt` unused client-side, harmless extra field over JSON). `executeTool`'s `Record<string, unknown>` args type matches how `lib/ai/gemini.ts` calls it (`call.args ?? {}` cast to that type).
- **No placeholders:** all steps contain complete, runnable code or exact commands. Task 1's smoke test explicitly addresses the earlier flagged risk (unusual API key format) before any other task depends on the key working. Tasks 3 and 4 flag the one real uncertainty in the plan — exact `@google/genai` type/method names — with a concrete fallback (check `node_modules/@google/genai/dist/**/*.d.ts`) rather than glossing over it.
