import { NextRequest, NextResponse } from "next/server";
import { dismissSubscriptionSuggestion } from "@/lib/subscription-suggestions";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { groupKey } = body as { groupKey?: string };

  if (typeof groupKey !== "string" || groupKey.length === 0) {
    return NextResponse.json({ error: "Invalid groupKey" }, { status: 400 });
  }

  await dismissSubscriptionSuggestion(groupKey);

  return NextResponse.json({ success: true });
}
