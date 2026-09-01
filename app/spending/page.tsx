import { Card } from "@/components/ui/Card";
import { SpendingDonut } from "@/components/spending/SpendingDonut";
import { CategoryCard } from "@/components/spending/CategoryCard";
import { SpendingCalendar } from "@/components/spending/SpendingCalendar";
import { SpendingMonthPicker } from "@/components/spending/SpendingMonthPicker";
import { ReconnectAccountButton } from "@/components/spending/ReconnectAccountButton";
import {
  getAvailableMonths,
  getDailyTotals,
  getItemsNeedingReconnect,
  getSpendingCategories,
} from "@/lib/spending";

export const dynamic = "force-dynamic";

export default async function SpendingPage(props: PageProps<"/spending">) {
  const searchParams = await props.searchParams;
  const [availableMonths, itemsNeedingReconnect] = await Promise.all([
    getAvailableMonths(),
    getItemsNeedingReconnect(),
  ]);

  const reconnectBanner =
    itemsNeedingReconnect.length > 0 ? (
      <Card className="mb-6 flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-[0.8125rem] text-ink-900">
          {itemsNeedingReconnect.length === 1
            ? `${itemsNeedingReconnect[0].institutionName} needs to be reconnected to include it in Spending.`
            : "Some accounts need to be reconnected to include them in Spending."}
        </p>
        <div className="flex flex-wrap gap-2">
          {itemsNeedingReconnect.map((item) => (
            <ReconnectAccountButton
              key={item.itemId}
              itemId={item.itemId}
              institutionName={item.institutionName}
            />
          ))}
        </div>
      </Card>
    ) : null;

  if (availableMonths.length === 0) {
    return (
      <main className="w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
        <h1 className="mb-6 font-display text-[2.25rem] text-ink-900">
          Where it went
        </h1>
        {reconnectBanner}
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

  const [summary, dailyTotals] = await Promise.all([
    getSpendingCategories(selected.year, selected.month),
    getDailyTotals(selected.year, selected.month),
  ]);

  return (
    <main className="w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-[2.25rem] text-ink-900">
          Where it went
        </h1>
        <SpendingMonthPicker availableMonths={availableMonths} selected={selected} />
      </div>

      {reconnectBanner}

      {summary.categories.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <Card className="p-6 sm:p-8 lg:col-span-3">
              <SpendingDonut
                data={summary.categories}
                total={summary.total}
                monthLabel={summary.monthLabel}
                year={selected.year}
                month={selected.month}
              />
            </Card>

            <Card className="p-6 sm:p-8 lg:col-span-2">
              <h2 className="mb-4 font-display text-[1.1875rem] text-ink-900">
                Spending Categories
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {summary.categories.map((category) => (
                  <CategoryCard
                    key={category.key}
                    category={category}
                    year={selected.year}
                    month={selected.month}
                  />
                ))}
              </div>
            </Card>
          </div>

          <div className="mt-6">
            <Card className="p-6 sm:p-8">
              <SpendingCalendar
                year={selected.year}
                month={selected.month}
                dailyTotals={dailyTotals}
              />
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-8 text-center">
          <p className="font-sans text-[0.9375rem] text-linen-700">
            No spending found for {summary.monthLabel} — try a different
            month.
          </p>
        </Card>
      )}
    </main>
  );
}
