import { NextRequest, NextResponse } from "next/server";
import { loadVisibleHistory, runChat } from "@/lib/ai/gemini";

export const maxDuration = 60;

// Chat API route handler
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
