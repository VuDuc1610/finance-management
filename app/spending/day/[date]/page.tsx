import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TransactionRow } from "@/components/spending/TransactionRow";
import { getDayTransactions } from "@/lib/spending";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default async function DayTransactionsPage(
  props: PageProps<"/spending/day/[date]">,
) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const date = params.date;
  const yearParam = Array.isArray(searchParams.year)
    ? searchParams.year[0]
    : searchParams.year;
  const monthParam = Array.isArray(searchParams.month)
    ? searchParams.month[0]
    : searchParams.month;

  const backHref =
    yearParam && monthParam
      ? `/spending?year=${yearParam}&month=${monthParam}`
      : "/spending";

  const result = await getDayTransactions(date);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <Link
        href={backHref}
        className="font-sans text-[0.8125rem] text-linen-700 hover:text-ink-900"
      >
        ← Back to Where it went
      </Link>

      <div className="mt-2 mb-6 flex items-baseline gap-3">
        <h1 className="font-sans text-[1.25rem] font-medium text-ink-900">
          {result.dateLabel}
        </h1>
        {result.total > 0 && (
          <span className="font-mono text-[0.9375rem] text-linen-700">
            {currency.format(result.total)} spent
          </span>
        )}
      </div>

      <Card className="p-6 sm:p-8">
        {result.transactions.length > 0 ? (
          <ul className="flex flex-col divide-y divide-linen-300">
            {result.transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                id={transaction.id}
                date={transaction.date}
                name={transaction.name}
                amount={transaction.amount}
                originalAmount={transaction.originalAmount}
                personalAmount={transaction.personalAmount}
                pending={transaction.pending}
                categoryLabel={transaction.categoryLabel}
                color={transaction.color}
                billKind={transaction.billKind}
              />
            ))}
          </ul>
        ) : (
          <p className="font-sans text-[0.9375rem] text-linen-700">
            No spending on this day.
          </p>
        )}
      </Card>
    </main>
  );
}
