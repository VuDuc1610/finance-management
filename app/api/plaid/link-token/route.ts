import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { plaidClient } from "@/lib/plaid/client";

export async function POST() {
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: "zen-linen-single-user" },
    client_name: "Zen Linen",
    products: [Products.Auth],
    country_codes: [CountryCode.Us],
    language: "en",
  });

  return NextResponse.json({ linkToken: response.data.link_token });
}
