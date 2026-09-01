import { HomeBoard } from "@/components/home/HomeBoard";
import { getNetWorthBreakdownSeries } from "@/lib/net-worth";
import {
  getAvailableMonths,
  getDailyTotals,
  getMonthTransactions,
  getSpendingCategories,
} from "@/lib/spending";
import { getSubscriptionsAndBills } from "@/lib/subscriptions";
import { getSpendingComparison } from "@/lib/analytics";
import { getAvailableCashFlowMonths, getCashFlowTrend } from "@/lib/cash-flow";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const displayName = user?.user_metadata?.full_name || user?.email || "there";

  const [netWorthSeries, availableMonths, subscriptions, analyticsData, availableCashFlowMonths] =
    await Promise.all([
      getNetWorthBreakdownSeries(),
      getAvailableMonths(),
      getSubscriptionsAndBills(),
      getSpendingComparison("month"),
      getAvailableCashFlowMonths(),
    ]);

  const latestMonth = availableMonths[0] ?? null;
  const latestCashFlowMonth = availableCashFlowMonths[0] ?? null;
  const [spendingSummary, dailyTotals, monthTransactions, cashFlowTrend] = await Promise.all([
    latestMonth ? getSpendingCategories(latestMonth.year, latestMonth.month) : null,
    latestMonth ? getDailyTotals(latestMonth.year, latestMonth.month) : [],
    latestMonth ? getMonthTransactions(latestMonth.year, latestMonth.month) : null,
    latestCashFlowMonth ? getCashFlowTrend(latestCashFlowMonth.year, latestCashFlowMonth.month) : null,
  ]);

  const netWorthPoints = netWorthSeries.slice(-30).map((point) => ({
    date: point.date,
    value: point.net,
  }));
  const currentNetWorth = netWorthPoints[netWorthPoints.length - 1]?.value ?? 0;

  const recentTransactions = (monthTransactions?.all.slice(0, 6) ?? []).map((transaction) => ({
    id: transaction.id,
    date: transaction.date,
    name: transaction.name,
    amount: transaction.amount,
    kind: transaction.kind,
  }));

  return (
    <main className="w-full max-w-7xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <h1 className="mb-8 font-display text-[2.25rem] text-ink-900">Hi {displayName}!</h1>

      <HomeBoard
        netWorthPoints={netWorthPoints}
        currentNetWorth={currentNetWorth}
        spendingTotal={spendingSummary?.total ?? null}
        dailyTotals={dailyTotals}
        transactionsMonthLabel={latestMonth ? (monthTransactions?.monthLabel ?? null) : null}
        recentTransactions={recentTransactions}
        subscriptionItems={subscriptions.items}
        analyticsData={analyticsData}
        cashFlowMonths={cashFlowTrend?.months ?? []}
        cashFlowLatestNet={cashFlowTrend?.latestNet ?? 0}
        cashFlowLatestMonthLabel={cashFlowTrend?.latestMonthLabel ?? null}
      />
    </main>
  );
}
