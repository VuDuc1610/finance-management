import { GoogleGenAI } from "@google/genai";
import { asc, inArray } from "drizzle-orm";
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

      let result: unknown;
      try {
        result = await executeTool(name, args);
      } catch (error) {
        result = {
          error: String(error instanceof Error ? error.message : error),
        };
      }

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
