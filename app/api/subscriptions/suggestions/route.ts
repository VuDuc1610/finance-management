import { NextResponse } from "next/server";
import { getSubscriptionSuggestions } from "@/lib/subscription-suggestions";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suggestions = await getSubscriptionSuggestions(user.id);
  return NextResponse.json({ suggestions });
}
