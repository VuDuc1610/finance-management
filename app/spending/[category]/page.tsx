import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TransactionRow } from "@/components/spending/TransactionRow";
import { getCategoryTransactions } from "@/lib/spending";

export const dynamic = "force-dynamic";

export default async function CategoryTransactionsPage(
  props: PageProps<"/spending/[category]">,
) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const categoryKey = decodeURIComponent(params.category);
  const yearParam = Array.isArray(searchParams.year)
    ? searchParams.year[0]
    : searchParams.year;
  const monthParam = Array.isArray(searchParams.month)
    ? searchParams.month[0]
    : searchParams.month;
  const year = Number(yearParam);
  const month = Number(monthParam);

  const backHref =
    yearParam && monthParam
      ? `/spending?year=${yearParam}&month=${monthParam}`
      : "/spending";

  if (!year || !month) {
    return (
      <main className="w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
        <Link
          href={backHref}
          className="font-sans text-[0.8125rem] text-linen-700 hover:text-ink-900"
        >
          ← Back to Where it went
        </Link>
        <Card className="mt-6 p-8 text-center">
          <p className="font-sans text-[0.9375rem] text-linen-700">
            Missing month — go back and pick a month first.
          </p>
        </Card>
      </main>
    );
  }

  const result = await getCategoryTransactions(year, month, categoryKey);

  return (
    <main className="w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <Link
        href={backHref}
        className="font-sans text-[0.8125rem] text-linen-700 hover:text-ink-900"
      >
        ← Back to Where it went
      </Link>

      <h1 className="mt-2 mb-6 font-display text-[1.4rem] text-ink-900">
        {result.categoryLabel} — {result.monthLabel}
      </h1>

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
                billKind={transaction.billKind}
              />
            ))}
          </ul>
        ) : (
          <p className="font-sans text-[0.9375rem] text-linen-700">
            No transactions found for this category.
          </p>
        )}
      </Card>
    </main>
  );
}
