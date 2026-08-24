import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid/client";
import { db } from "@/lib/db/client";
import { accounts, plaidItems } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const publicToken = body.publicToken;
  const institutionName = body.institutionName;

  if (typeof publicToken !== "string" || publicToken.length === 0) {
    return NextResponse.json(
      { error: "publicToken is required" },
      { status: 400 },
    );
  }

  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });
  const accessToken = exchangeResponse.data.access_token;
  const itemId = exchangeResponse.data.item_id;

  const accountsResponse = await plaidClient.accountsGet({
    access_token: accessToken,
  });

  const [insertedItem] = await db
    .insert(plaidItems)
    .values({
      institutionName:
        typeof institutionName === "string" && institutionName.length > 0
          ? institutionName
          : "Unknown institution",
      plaidItemId: itemId,
      accessToken,
    })
    .returning({ id: plaidItems.id });

  const accountRows = accountsResponse.data.accounts.map((account) => ({
    itemId: insertedItem.id,
    plaidAccountId: account.account_id,
    name: account.name,
    officialName: account.official_name ?? null,
    type: account.type,
    subtype: account.subtype ?? null,
    mask: account.mask ?? null,
  }));

  if (accountRows.length > 0) {
    await db.insert(accounts).values(accountRows);
  }

  return NextResponse.json({ success: true, accountCount: accountRows.length });
}
