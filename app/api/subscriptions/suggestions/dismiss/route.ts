import { NextRequest, NextResponse } from "next/server";
import { dismissSubscriptionSuggestion } from "@/lib/subscription-suggestions";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { groupKey } = body as { groupKey?: string };

  if (typeof groupKey !== "string" || groupKey.length === 0) {
    return NextResponse.json({ error: "Invalid groupKey" }, { status: 400 });
  }

  await dismissSubscriptionSuggestion(user.id, groupKey);

  return NextResponse.json({ success: true });
}
