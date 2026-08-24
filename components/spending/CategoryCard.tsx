import type { SpendingCategory } from "@/lib/mock-spending-data";

interface CategoryCardProps {
  category: SpendingCategory;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <div className="rounded-card border border-linen-300 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[1.125rem] text-ink-900">
          {currency.format(category.amount)}
        </span>
        <span className="font-mono text-[0.8125rem] text-linen-700">
          {category.percent}%
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: category.color }}
          aria-hidden="true"
        />
        <span className="font-sans text-[0.8125rem] text-linen-700">
          {category.name}
        </span>
      </div>
    </div>
  );
}
