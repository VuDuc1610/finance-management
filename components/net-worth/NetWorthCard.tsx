import { Card } from "@/components/ui/Card";
import { NetWorthChart } from "@/components/net-worth/NetWorthChart";
import type { NetWorthDataPoint } from "@/lib/mock-data";

interface NetWorthCardProps {
  data: NetWorthDataPoint[];
  currentValue: number;
  changeAmount: number;
  changePercent: number;
  rangeLabel: string;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function ChevronIcon() {
  return (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 6.2V10.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="7" cy="4.1" r="0.9" fill="currentColor" />
    </svg>
  );
}

function DropdownButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-pill border border-linen-300 px-3 py-1.5 font-sans text-[0.8125rem] text-ink-900 hover:bg-linen-300/30"
    >
      {label}
      <span className="text-linen-700">
        <ChevronIcon />
      </span>
    </button>
  );
}

export function NetWorthCard({
  data,
  currentValue,
  changeAmount,
  changePercent,
  rangeLabel,
}: NetWorthCardProps) {
  const isPositive = changeAmount >= 0;

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 font-sans text-[0.8125rem] font-medium tracking-wide text-linen-700 uppercase">
            Net worth
            <InfoIcon />
          </div>
          <div className="mt-2 font-display text-[2rem] leading-none text-ink-900 sm:text-[2.75rem]">
            {currency.format(currentValue)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 font-mono text-[0.8125rem]">
            <span className={isPositive ? "text-dye-moss" : "text-dye-madder"}>
              {isPositive ? "↑" : "↓"} {currency.format(Math.abs(changeAmount))} (
              {Math.abs(changePercent).toFixed(1)}%)
            </span>
            <span className="text-linen-700">{rangeLabel} change</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <DropdownButton label="Net worth performance" />
          <DropdownButton label={rangeLabel} />
        </div>
      </div>

      <div className="mt-6">
        <NetWorthChart data={data} />
      </div>
    </Card>
  );
}
