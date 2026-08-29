import type { BillItem } from "@/lib/subscriptions";
import { getDueBadge } from "@/components/subscriptions/dueStatus";
import { nextOccurrenceDate, daysUntil } from "@/lib/recurring-date";

interface UpcomingPaymentsProps {
  items: BillItem[];
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function UpcomingPayments({ items }: UpcomingPaymentsProps) {
  const upcoming = items
    .filter(
      (item) => item.dueDate !== null && daysUntil(nextOccurrenceDate(item.dueDate)) < 5,
    )
    .slice(0, 5);

  if (upcoming.length === 0) {
    return (
      <p className="font-sans text-[1rem] text-linen-700">
        Nothing due in the next 5 days.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {upcoming.map((item) => {
        const badge = getDueBadge(item.dueDate);
        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-card border border-linen-300 px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <div>
                <p className="font-sans text-[1.0625rem] text-ink-900">{item.name}</p>
                <p className="font-sans text-[0.9375rem] text-linen-700">
                  {item.category}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[1.0625rem] text-ink-900">
                {currency.format(item.amount)}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-[0.8125rem] ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
