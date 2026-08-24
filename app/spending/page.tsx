import { Card } from "@/components/ui/Card";
import { SpendingDonut } from "@/components/spending/SpendingDonut";
import { CategoryCard } from "@/components/spending/CategoryCard";
import { spendingCategories, spendingSummary } from "@/lib/mock-spending-data";

export default function SpendingPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <h1 className="mb-6 font-sans text-[1.125rem] font-medium text-ink-900">
        Where it went
      </h1>

      <Card className="p-6 sm:p-8">
        <SpendingDonut
          data={spendingCategories}
          total={spendingSummary.total}
          monthLabel={spendingSummary.monthLabel}
        />
      </Card>

      <div className="mt-6">
        <Card className="p-6 sm:p-8">
          <h2 className="mb-4 font-sans text-[1rem] font-medium text-ink-900">
            Spending Categories
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {spendingCategories.map((category) => (
              <CategoryCard key={category.name} category={category} />
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
