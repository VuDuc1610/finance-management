import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
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
      const [current] = await db
        .select({ name: transactions.name })
        .from(transactions)
        .where(eq(transactions.id, transactionId));

      if (current) {
        await db
          .update(transactions)
          .set({ billKind: null, updatedAt: new Date() })
          .where(and(eq(transactions.name, current.name), ne(transactions.id, transactionId)));
      }
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
