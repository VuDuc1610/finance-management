import { NextResponse } from "next/server";
import { getSubscriptionSuggestions } from "@/lib/subscription-suggestions";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suggestions = await getSubscriptionSuggestions(user.id);
  return NextResponse.json({ suggestions });
}
