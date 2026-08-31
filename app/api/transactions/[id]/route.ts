import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, plaidItems, transactions } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/transactions/[id]">,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const transactionId = Number(id);

  if (!Number.isInteger(transactionId)) {
    return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 });
  }

  const [owned] = await db
    .select({ id: transactions.id, name: transactions.name })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(and(eq(transactions.id, transactionId), eq(plaidItems.userId, user.id)));

  if (!owned) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const body = await request.json();
  const { personalAmount, billKind, dueDate } = body as {
    personalAmount?: number | null;
    billKind?: "subscription" | "bill" | null;
    dueDate?: string | null;
  };

  const update: Record<string, unknown> = { updatedAt: new Date() };

  if ("personalAmount" in body) {
    if (personalAmount !== null && typeof personalAmount !== "number") {
      return NextResponse.json({ error: "Invalid personalAmount" }, { status: 400 });
    }
    update.personalAmount = personalAmount === null ? null : personalAmount.toString();
  }

  if ("billKind" in body) {
    if (billKind !== null && billKind !== "subscription" && billKind !== "bill") {
      return NextResponse.json({ error: "Invalid billKind" }, { status: 400 });
    }
    update.billKind = billKind;

    if (billKind !== null) {
      const ownedAccountIds = await db
        .select({ id: accounts.id })
        .from(accounts)
        .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
        .where(eq(plaidItems.userId, user.id));
      const ownedAccountIdList = ownedAccountIds.map((row) => row.id);

      await db
        .update(transactions)
        .set({ billKind: null, updatedAt: new Date() })
        .where(
          and(
            eq(transactions.name, owned.name),
            ne(transactions.id, transactionId),
            inArray(transactions.accountId, ownedAccountIdList),
          ),
        );
    }
  }

  if ("dueDate" in body) {
    if (dueDate !== null && typeof dueDate !== "string") {
      return NextResponse.json({ error: "Invalid dueDate" }, { status: 400 });
    }
    update.dueDate = dueDate;
  }

  await db.update(transactions).set(update).where(eq(transactions.id, transactionId));

  return NextResponse.json({ success: true });
}
