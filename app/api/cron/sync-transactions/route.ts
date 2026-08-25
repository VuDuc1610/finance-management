import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { plaidClient } from "@/lib/plaid/client";
import { accounts, plaidItems, transactions } from "@/lib/db/schema";

function getPlaidErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null || !("response" in err)) {
    return undefined;
  }
  const response = (err as { response?: { data?: { error_code?: unknown } } })
    .response;
  const code = response?.data?.error_code;
  return typeof code === "string" ? code : undefined;
}

export async function GET(request: NextRequest) {
  const providedSecret = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  if (!providedSecret || providedSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { db } = await import("@/lib/db/client");

  const items = await db.select().from(plaidItems);
  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;
  const failedItems: { id: number; institutionName: string }[] = [];

  for (const item of items) {
    try {
      const itemAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.itemId, item.id));
      const accountIdByPlaidId = new Map(
        itemAccounts.map((account) => [account.plaidAccountId, account.id]),
      );

      let cursor: string | undefined = item.transactionsCursor ?? undefined;
      let hasMore = true;

      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: item.accessToken,
          cursor,
        });

        for (const transaction of response.data.added) {
          const localAccountId = accountIdByPlaidId.get(transaction.account_id);
          if (!localAccountId) continue;

          await db
            .insert(transactions)
            .values({
              accountId: localAccountId,
              plaidTransactionId: transaction.transaction_id,
              name: transaction.name,
              amount: transaction.amount.toString(),
              date: transaction.authorized_date ?? transaction.date,
              pending: transaction.pending,
              personalFinanceCategoryPrimary:
                transaction.personal_finance_category?.primary ?? null,
              personalFinanceCategoryDetailed:
                transaction.personal_finance_category?.detailed ?? null,
              isoCurrencyCode: transaction.iso_currency_code ?? "USD",
            })
            .onConflictDoNothing({ target: transactions.plaidTransactionId });
          addedCount += 1;
        }

        for (const transaction of response.data.modified) {
          const localAccountId = accountIdByPlaidId.get(transaction.account_id);
          if (!localAccountId) continue;

          await db
            .update(transactions)
            .set({
              name: transaction.name,
              amount: transaction.amount.toString(),
              date: transaction.authorized_date ?? transaction.date,
              pending: transaction.pending,
              personalFinanceCategoryPrimary:
                transaction.personal_finance_category?.primary ?? null,
              personalFinanceCategoryDetailed:
                transaction.personal_finance_category?.detailed ?? null,
              isoCurrencyCode: transaction.iso_currency_code ?? "USD",
              updatedAt: new Date(),
            })
            .where(eq(transactions.plaidTransactionId, transaction.transaction_id));
          modifiedCount += 1;
        }

        for (const removed of response.data.removed) {
          await db
            .delete(transactions)
            .where(eq(transactions.plaidTransactionId, removed.transaction_id));
          removedCount += 1;
        }

        cursor = response.data.next_cursor;
        hasMore = response.data.has_more;
      }

      await db
        .update(plaidItems)
        .set({ transactionsCursor: cursor, transactionsConsentMissing: false })
        .where(eq(plaidItems.id, item.id));
    } catch (err) {
      const errorCode = getPlaidErrorCode(err);

      console.error(
        "cron/sync-transactions item failed:",
        errorCode ?? (err instanceof Error ? err.name : "unknown error"),
      );

      if (errorCode === "ADDITIONAL_CONSENT_REQUIRED") {
        await db
          .update(plaidItems)
          .set({ transactionsConsentMissing: true })
          .where(eq(plaidItems.id, item.id));
      }

      failedItems.push({ id: item.id, institutionName: item.institutionName });
    }
  }

  return NextResponse.json({
    success: true,
    addedCount,
    modifiedCount,
    removedCount,
    failedItems,
  });
}
