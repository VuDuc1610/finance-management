import { NextRequest, NextResponse } from "next/server";
import { loadVisibleHistory, runChat } from "@/lib/ai/gemini";
import { getCurrentUser } from "@/lib/auth/current-user";

export const maxDuration = 60;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.isDemo) {
    return NextResponse.json({ error: "Not available in demo mode" }, { status: 403 });
  }

  const messages = await loadVisibleHistory(user.id);
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.isDemo) {
    return NextResponse.json({ error: "Not available in demo mode" }, { status: 403 });
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
