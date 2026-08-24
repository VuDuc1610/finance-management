import Link from "next/link";
import type { SpendingCategory } from "@/lib/spending";

interface CategoryCardProps {
  category: SpendingCategory;
  year: number;
  month: number;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function CategoryCard({ category, year, month }: CategoryCardProps) {
  return (
    <Link
      href={`/spending/${encodeURIComponent(category.key)}?year=${year}&month=${month}`}
      className="block rounded-card border border-linen-300 p-4 hover:bg-linen-300/20"
    >
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
    </Link>
  );
}
