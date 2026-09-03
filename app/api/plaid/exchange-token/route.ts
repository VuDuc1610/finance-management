import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { plaidClient } from "@/lib/plaid/client";
import { db } from "@/lib/db/client";
import { accounts, plaidItems } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/current-user";

class ItemOwnedByAnotherUserError extends Error {
  constructor() {
    super("This Plaid item is already linked to another account");
  }
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
  const publicToken = body.publicToken;
  const institutionName = body.institutionName;

  if (typeof publicToken !== "string" || publicToken.length === 0) {
    return NextResponse.json(
      { error: "publicToken is required" },
      { status: 400 },
    );
  }

  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const resolvedInstitutionName =
      typeof institutionName === "string" && institutionName.length > 0
        ? institutionName
        : "Unknown institution";

    const accountCount = await db.transaction(async (tx) => {
      const [item] = await tx
        .insert(plaidItems)
        .values({
          userId: user.id,
          institutionName: resolvedInstitutionName,
          plaidItemId: itemId,
          accessToken,
        })
        .onConflictDoUpdate({
          target: plaidItems.plaidItemId,
          set: {
            accessToken,
            institutionName: resolvedInstitutionName,
          },
          where: eq(plaidItems.userId, user.id),
        })
        .returning({ id: plaidItems.id });

      if (!item) {
        throw new ItemOwnedByAnotherUserError();
      }

      const accountRows = accountsResponse.data.accounts.map((account) => ({
        itemId: item.id,
        plaidAccountId: account.account_id,
        name: account.name,
        officialName: account.official_name ?? null,
        type: account.type,
        subtype: account.subtype ?? null,
        mask: account.mask ?? null,
      }));

      if (accountRows.length > 0) {
        await tx
          .insert(accounts)
          .values(accountRows)
          .onConflictDoNothing({ target: accounts.plaidAccountId });
      }

      return accountRows.length;
    });

    return NextResponse.json({ success: true, accountCount });
  } catch (err) {
    if (err instanceof ItemOwnedByAnotherUserError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(
      "plaid/exchange-token failed:",
      err instanceof Error ? err.name : "unknown error",
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
