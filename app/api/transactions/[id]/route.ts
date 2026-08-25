import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { transactions } from "@/lib/db/schema";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/transactions/[id]">,
) {
  const { id } = await ctx.params;
  const transactionId = Number(id);

  if (!Number.isInteger(transactionId)) {
    return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 });
  }

  const body = await request.json();
  const { personalAmount } = body as { personalAmount: number | null };

  if (personalAmount !== null && typeof personalAmount !== "number") {
    return NextResponse.json({ error: "Invalid personalAmount" }, { status: 400 });
  }

  await db
    .update(transactions)
    .set({
      personalAmount: personalAmount === null ? null : personalAmount.toString(),
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, transactionId));

  return NextResponse.json({ success: true });
}
