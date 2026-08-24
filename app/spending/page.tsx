import { Card } from "@/components/ui/Card";
import { SpendingDonut } from "@/components/spending/SpendingDonut";
import { CategoryCard } from "@/components/spending/CategoryCard";
import { SpendingCalendar } from "@/components/spending/SpendingCalendar";
import { SpendingMonthPicker } from "@/components/spending/SpendingMonthPicker";
import {
  getAvailableMonths,
  getDailyTotals,
  getSpendingCategories,
} from "@/lib/spending";

export const dynamic = "force-dynamic";

export default async function SpendingPage(props: PageProps<"/spending">) {
  const searchParams = await props.searchParams;
  const availableMonths = await getAvailableMonths();

  if (availableMonths.length === 0) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
        <h1 className="mb-6 font-sans text-[1.125rem] font-medium text-ink-900">
          Where it went
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

  const [summary, dailyTotals] = await Promise.all([
    getSpendingCategories(selected.year, selected.month),
    getDailyTotals(selected.year, selected.month),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-sans text-[1.125rem] font-medium text-ink-900">
          Where it went
        </h1>
        <SpendingMonthPicker availableMonths={availableMonths} selected={selected} />
      </div>

      {summary.categories.length > 0 ? (
        <>
          <Card className="p-6 sm:p-8">
            <SpendingDonut
              data={summary.categories}
              total={summary.total}
              monthLabel={summary.monthLabel}
              year={selected.year}
              month={selected.month}
            />
          </Card>

          <div className="mt-6">
            <Card className="p-6 sm:p-8">
              <h2 className="mb-4 font-sans text-[1rem] font-medium text-ink-900">
                Spending Categories
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <h2 className="mb-4 font-sans text-[1rem] font-medium text-ink-900">
                Daily spending
              </h2>
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
