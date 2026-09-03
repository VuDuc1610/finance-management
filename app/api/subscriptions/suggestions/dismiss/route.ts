import { NextRequest, NextResponse } from "next/server";
import { dismissSubscriptionSuggestion } from "@/lib/subscription-suggestions";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.isDemo) {
    return NextResponse.json({ error: "Not available in demo mode" }, { status: 403 });
  }

  const body = await request.json();
  const { groupKey } = body as { groupKey?: string };

  if (typeof groupKey !== "string" || groupKey.length === 0) {
    return NextResponse.json({ error: "Invalid groupKey" }, { status: 400 });
  }

  await dismissSubscriptionSuggestion(user.id, groupKey);

  return NextResponse.json({ success: true });
}
