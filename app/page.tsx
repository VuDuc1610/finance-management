import { Card } from "@/components/ui/Card";
import { NetWorthCard } from "@/components/net-worth/NetWorthCard";
import { AddAccountButton } from "@/components/net-worth/AddAccountButton";
import { getNetWorthSummary } from "@/lib/net-worth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const summary = await getNetWorthSummary();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-sans text-[1.125rem] font-medium text-ink-900">
          Accounts
        </h1>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-pill border border-linen-300 px-4 py-2 font-sans text-[0.8125rem] text-ink-900 hover:bg-linen-300/30"
          >
            Refresh all
          </button>
          <AddAccountButton />
        </div>
      </div>

      {summary ? (
        <NetWorthCard
          data={summary.series}
          currentValue={summary.currentValue}
          changeAmount={summary.changeAmount}
          changePercent={summary.changePercent}
          rangeLabel={summary.rangeLabel}
        />
      ) : (
        <Card className="p-8 text-center">
          <p className="font-sans text-[0.9375rem] text-linen-700">
            No transactions yet — link an account above to see it here.
          </p>
        </Card>
      )}
    </main>
  );
}
