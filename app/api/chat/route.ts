import { NextRequest, NextResponse } from "next/server";
import { loadVisibleHistory, runChat } from "@/lib/ai/gemini";

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
    return NextResponse.json(
      { error: "Failed to get a response from the advisor" },
      { status: 500 },
    );
  }
}
