import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { plaidClient } from "@/lib/plaid/client";
import { db } from "@/lib/db/client";
import { accounts, balanceSnapshots, plaidItems } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const providedSecret = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  if (!providedSecret || providedSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db.select().from(plaidItems);
  const today = new Date().toISOString().slice(0, 10);
  let snapshotCount = 0;

  for (const item of items) {
    const balanceResponse = await plaidClient.accountsBalanceGet({
      access_token: item.accessToken,
    });

    for (const plaidAccount of balanceResponse.data.accounts) {
      const [localAccount] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.plaidAccountId, plaidAccount.account_id));

      if (!localAccount) continue;

      const balance = plaidAccount.balances.current;
      if (balance === null || balance === undefined) continue;

      await db
        .insert(balanceSnapshots)
        .values({
          accountId: localAccount.id,
          date: today,
          currentBalance: balance.toString(),
          isoCurrencyCode: plaidAccount.balances.iso_currency_code ?? "USD",
        })
        .onConflictDoUpdate({
          target: [balanceSnapshots.accountId, balanceSnapshots.date],
          set: {
            currentBalance: balance.toString(),
            isoCurrencyCode: plaidAccount.balances.iso_currency_code ?? "USD",
          },
        });

      snapshotCount += 1;
    }
  }

  return NextResponse.json({ success: true, snapshotCount });
}
