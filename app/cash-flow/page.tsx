import { Card } from "@/components/ui/Card";
import { CashFlowSankey } from "@/components/cash-flow/CashFlowSankey";
import { CashFlowMonthPicker } from "@/components/cash-flow/CashFlowMonthPicker";
import { CashFlowSummaryStats } from "@/components/cash-flow/CashFlowSummaryStats";
import { getAvailableCashFlowMonths, getCashFlowSankey } from "@/lib/cash-flow";

export const dynamic = "force-dynamic";

export default async function CashFlowPage(props: PageProps<"/cash-flow">) {
  const searchParams = await props.searchParams;
  const availableMonths = await getAvailableCashFlowMonths();

  if (availableMonths.length === 0) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
        <h1 className="mb-6 font-sans text-[1.25rem] font-medium text-ink-900">
          Cash flow
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

  const sankey = await getCashFlowSankey(selected.year, selected.month);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-sans text-[1.25rem] font-medium text-ink-900">
          Cash flow
        </h1>
        <CashFlowMonthPicker availableMonths={availableMonths} selected={selected} />
      </div>

      {sankey.nodes.length > 0 ? (
        <>
          <CashFlowSummaryStats
            totalIncome={sankey.totalIncome}
            totalExpenses={sankey.totalExpenses}
            netIncome={sankey.netIncome}
            savingsRate={sankey.savingsRate}
          />

          <Card className="p-6 sm:p-8">
            <p className="mb-4 font-mono text-[0.8125rem] text-linen-700">
              {sankey.monthLabel}
            </p>
            <CashFlowSankey
              nodes={sankey.nodes}
              links={sankey.links}
              totalIncome={sankey.totalIncome}
            />
          </Card>
        </>
      ) : (
        <Card className="p-8 text-center">
          <p className="font-sans text-[0.9375rem] text-linen-700">
            No income transactions found for {sankey.monthLabel}.
          </p>
        </Card>
      )}
    </main>
  );
}
