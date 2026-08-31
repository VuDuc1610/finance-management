import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { CountryCode, Products } from "plaid";
import { plaidClient } from "@/lib/plaid/client";
import { plaidItems } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const itemId = typeof body.itemId === "number" ? body.itemId : undefined;

    let accessToken: string | undefined;
    if (itemId !== undefined) {
      const { db } = await import("@/lib/db/client");
      const [item] = await db
        .select()
        .from(plaidItems)
        .where(and(eq(plaidItems.id, itemId), eq(plaidItems.userId, user.id)));
      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
      accessToken = item.accessToken;
    }

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "Zen Linen",
      products: [Products.Transactions],
      optional_products: [Products.Investments, Products.Liabilities, Products.Identity],
      country_codes: [CountryCode.Us],
      language: "en",
      ...(accessToken ? { access_token: accessToken } : {}),
    });

    return NextResponse.json({ linkToken: response.data.link_token });
  } catch (err) {
    console.error(
      "plaid/link-token failed:",
      err instanceof Error ? err.name : "unknown error",
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
