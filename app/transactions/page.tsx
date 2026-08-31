import { Card } from "@/components/ui/Card";
import { TransactionRow } from "@/components/spending/TransactionRow";
import { SpendingMonthPicker } from "@/components/spending/SpendingMonthPicker";
import {
  TransactionsSort,
  type TransactionSort,
} from "@/components/spending/TransactionsSort";
import { TransactionsSearch } from "@/components/spending/TransactionsSearch";
import {
  getAvailableMonths,
  getMonthTransactions,
  groupTransactionsByDate,
  type MonthTransaction,
} from "@/lib/spending";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const SORT_VALUES: TransactionSort[] = [
  "date-desc",
  "date-asc",
  "amount-desc",
  "amount-asc",
];

function renderRow(transaction: MonthTransaction) {
  return (
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
      accountLabel={transaction.accountLabel}
      color={transaction.color}
      kind={transaction.kind}
      billKind={transaction.billKind}
    />
  );
}

export default async function TransactionsPage(
  props: PageProps<"/transactions">,
) {
  const searchParams = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const availableMonths = await getAvailableMonths(userId);

  if (availableMonths.length === 0) {
    return (
      <main className="w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
        <h1 className="mb-6 font-display text-[1.4rem] text-ink-900">
          Transactions
        </h1>
        <Card className="p-8 text-center">
          <p className="font-sans text-[0.9375rem] text-linen-700">
            No transactions yet — link an account and give the sync a moment
            to run.
          </p>
        </Card>
      </main>
    );
  }

  const yearParam = Array.isArray(searchParams.year)
    ? searchParams.year[0]
    : searchParams.year;
  const monthParam = Array.isArray(searchParams.month)
    ? searchParams.month[0]
    : searchParams.month;
  const sortParam = Array.isArray(searchParams.sort)
    ? searchParams.sort[0]
    : searchParams.sort;
  const qParam = Array.isArray(searchParams.q)
    ? searchParams.q[0]
    : searchParams.q;
  const query = qParam?.trim() ?? "";

  const sort: TransactionSort = SORT_VALUES.includes(
    sortParam as TransactionSort,
  )
    ? (sortParam as TransactionSort)
    : "date-desc";

  const requested =
    yearParam && monthParam
      ? { year: Number(yearParam), month: Number(monthParam) }
      : null;

  const selected =
    requested &&
    availableMonths.some(
      (m) => m.year === requested.year && m.month === requested.month,
    )
      ? requested
      : availableMonths[0];

  const { all: allTransactions } = await getMonthTransactions(
    userId,
    selected.year,
    selected.month,
  );

  const all = query
    ? allTransactions.filter((t) =>
        t.name.toLowerCase().includes(query.toLowerCase()),
      )
    : allTransactions;

  const groups = groupTransactionsByDate(all);

  const orderedGroups =
    sort === "date-asc" ? groups.slice().reverse() : groups;

  const sortedByAmount =
    sort === "amount-desc" || sort === "amount-asc"
      ? all
          .slice()
          .sort((a, b) =>
            sort === "amount-desc" ? b.amount - a.amount : a.amount - b.amount,
          )
      : null;

  return (
    <main className="w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-[1.4rem] text-ink-900">
          Transactions
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <TransactionsSearch query={query} />
          <TransactionsSort sort={sort} />
          <SpendingMonthPicker availableMonths={availableMonths} selected={selected} />
        </div>
      </div>

      {all.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-sans text-[0.9375rem] text-linen-700">
            {query
              ? `No transactions matching "${query}" this month.`
              : "No transactions found for this month."}
          </p>
        </Card>
      ) : sortedByAmount ? (
        <Card className="overflow-hidden">
          <ul className="flex flex-col divide-y divide-linen-300 px-6 sm:px-8">
            {sortedByAmount.map(renderRow)}
          </ul>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {orderedGroups.map((group) => (
            <Card key={group.date} className="overflow-hidden">
              <div className="flex items-baseline justify-between bg-linen-300/20 px-6 py-3 sm:px-8">
                <h2 className="font-sans text-[0.8125rem] font-medium text-ink-900">
                  {group.dateLabel}
                </h2>
                <span
                  className={`font-mono text-[0.8125rem] ${
                    group.netAmount < 0 ? "text-dye-moss" : "text-linen-700"
                  }`}
                >
                  {group.netAmount < 0 ? "+" : ""}
                  {currency.format(Math.abs(group.netAmount))}
                </span>
              </div>
              <ul className="flex flex-col divide-y divide-linen-300 px-6 sm:px-8">
                {group.transactions.map(renderRow)}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
