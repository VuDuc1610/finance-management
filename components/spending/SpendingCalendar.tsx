import Link from "next/link";
import type { DailyTotal } from "@/lib/spending";

interface SpendingCalendarProps {
  year: number;
  month: number;
  dailyTotals: DailyTotal[];
}

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const LOW_COLOR = [237, 231, 220]; // linen-100
const MID_COLOR = [47, 72, 88]; // dye-indigo
const HIGH_COLOR = [168, 73, 58]; // dye-madder

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function mixColor(from: number[], to: number[], t: number): string {
  const [r, g, b] = [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)];
  return `rgb(${r}, ${g}, ${b})`;
}

function heatColor(amount: number, maxAmount: number): string {
  if (maxAmount <= 0 || amount <= 0) return `rgb(${LOW_COLOR.join(", ")})`;
  const t = Math.min(1, amount / maxAmount);
  return t <= 0.6 ? mixColor(LOW_COLOR, MID_COLOR, t / 0.6) : mixColor(MID_COLOR, HIGH_COLOR, (t - 0.6) / 0.4);
}

function heatTextClass(amount: number, maxAmount: number): string {
  if (maxAmount <= 0 || amount <= 0) return "text-linen-700";
  const t = Math.min(1, amount / maxAmount);
  return t > 0.45 ? "text-linen-100" : "text-ink-900";
}

export function SpendingCalendar({ year, month, dailyTotals }: SpendingCalendarProps) {
  const totalsByDay = new Map(dailyTotals.map((t) => [t.day, t.amount]));
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const maxAmount = Math.max(0, ...dailyTotals.map((t) => t.amount));
  const bigDayThreshold = Math.max(100, Math.round((maxAmount * 0.6) / 10) * 10);
  const weekCount = Math.ceil((firstWeekday + daysInMonth) / 7);

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <h2 className="font-display text-[1.4rem] text-ink-900">Day by day</h2>
      <p className="mt-1 mb-5 font-sans text-[0.875rem] text-linen-700">
        {weekCount} weeks of {MONTH_LABELS[month - 1]}. Darker is heavier; madder marks a day
        over {currency.format(bigDayThreshold)}.
      </p>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`blank-${index}`} />;
          }
          const amount = totalsByDay.get(day) ?? 0;
          const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
          const label = `${MONTH_LABELS[month - 1].slice(0, 3)} ${day}${
            amount > 0 ? ` — ${currency.format(amount)}` : ""
          }`;
          return (
            <Link
              key={dateStr}
              href={`/spending/day/${dateStr}?year=${year}&month=${month}`}
              title={label}
              aria-label={label}
              className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-card p-1 text-center transition-transform hover:scale-105"
              style={{ backgroundColor: heatColor(amount, maxAmount) }}
            >
              <span
                className={`font-mono text-[0.6875rem] leading-none ${heatTextClass(amount, maxAmount)}`}
              >
                {day}
              </span>
              {amount > 0 && (
                <span
                  className={`font-mono text-[0.625rem] leading-none ${heatTextClass(amount, maxAmount)}`}
                >
                  {currency.format(amount)}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <span className="font-mono text-[0.75rem] text-linen-700">$0</span>
        <div
          className="h-2 flex-1 rounded-pill"
          style={{
            background: `linear-gradient(to right, rgb(${LOW_COLOR.join(", ")}), rgb(${MID_COLOR.join(", ")}), rgb(${HIGH_COLOR.join(", ")}))`,
          }}
        />
        <span className="font-mono text-[0.75rem] text-linen-700">
          {currency.format(Math.max(maxAmount, bigDayThreshold))}
        </span>
      </div>
    </div>
  );
}
