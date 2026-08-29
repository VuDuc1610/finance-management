import { GoogleGenAI } from "@google/genai";
import { desc, eq, inArray } from "drizzle-orm";
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

async function loadGeminiHistory() {
  const visible = await loadVisibleHistory();
  return visible.map((row) => ({
    role: row.role,
    parts: [{ text: row.content }],
  }));
}

export async function runChat(userMessage: string): Promise<string> {
  const callId = Math.random().toString(36).slice(2, 8);
  const t0 = Date.now();
  console.log(`[chat ${callId}] start, message="${userMessage.slice(0, 80)}"`);

  const history = await loadGeminiHistory();
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
    .values({ role: "user", content: userMessage })
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
          result = await executeTool(name, args);
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
    await db.insert(chatMessages).values({ role: "model", content: replyText });

    console.log(`[chat ${callId}] done in ${Date.now() - t0}ms total, ${iterations} tool iteration(s)`);

    return replyText;
  } catch (error) {
    console.log(`[chat ${callId}] FAILED, cleaning up orphaned user row id=${insertedUserRow.id}: ${String(error)}`);
    await db.delete(chatMessages).where(eq(chatMessages.id, insertedUserRow.id));
    throw error;
  }
}
