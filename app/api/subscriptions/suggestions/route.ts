import { NextResponse } from "next/server";
import { getSubscriptionSuggestions } from "@/lib/subscription-suggestions";

export async function GET() {
  const suggestions = await getSubscriptionSuggestions();
  return NextResponse.json({ suggestions });
}
