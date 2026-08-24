import Link from "next/link";
import type { DailyTotal } from "@/lib/spending";

interface SpendingCalendarProps {
  year: number;
  month: number;
  dailyTotals: DailyTotal[];
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

export function SpendingCalendar({ year, month, dailyTotals }: SpendingCalendarProps) {
  const totalsByDay = new Map(dailyTotals.map((t) => [t.day, t.amount]));
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="pb-1 text-center font-sans text-[0.6875rem] font-medium tracking-wide text-linen-700 uppercase"
          >
            {label}
          </div>
        ))}
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`blank-${index}`} />;
          }
          const amount = totalsByDay.get(day) ?? 0;
          const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
          return (
            <Link
              key={dateStr}
              href={`/spending/day/${dateStr}?year=${year}&month=${month}`}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-card border border-linen-300 p-1 text-center hover:bg-linen-300/30 ${
                amount > 0 ? "bg-dye-indigo/10" : ""
              }`}
            >
              <span className="font-mono text-[0.75rem] text-ink-900">{day}</span>
              {amount > 0 && (
                <span className="font-mono text-[0.625rem] text-dye-indigo">
                  {currency.format(amount)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
