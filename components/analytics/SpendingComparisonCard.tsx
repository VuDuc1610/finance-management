"use client";

import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Dropdown } from "@/components/ui/Dropdown";
import { COMPARISON_OPTIONS } from "@/lib/analytics-types";
import type { ComparisonMode, SpendingComparison } from "@/lib/analytics-types";

interface SpendingComparisonCardProps {
  mode: ComparisonMode;
  data: SpendingComparison;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCompactDollars(value: number) {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${Math.round(value)}`;
}

const tickStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fill: "var(--color-linen-700)",
};

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function ComparisonTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-card border border-linen-300 bg-linen-100 px-3 py-2 font-mono text-[0.75rem]"
      style={{ color: "var(--color-ink-900)" }}
    >
      <p className="mb-1 font-sans font-medium">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }}>
          {item.name}: {currency.format(item.value)}
        </p>
      ))}
    </div>
  );
}

export function SpendingComparisonCard({ mode, data }: SpendingComparisonCardProps) {
  const router = useRouter();

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-sans text-[1rem] font-semibold text-ink-900">
          Spending{" "}
          <span className="ml-1 font-mono text-[0.875rem] font-normal text-linen-700">
            {currency.format(data.totalCurrent)} {data.currentLabel}
          </span>
        </h2>
        <Dropdown
          value={mode}
          options={COMPARISON_OPTIONS}
          onChange={(value) => router.push(`/analytics?compare=${value}`)}
        />
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-linen-300)" />
            <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCompactDollars}
            />
            <Tooltip content={<ComparisonTooltip />} />
            <Area
              type="linear"
              dataKey="previous"
              name={data.previousLabel}
              stroke="var(--color-linen-700)"
              fill="transparent"
              strokeWidth={2}
              dot={false}
            />
            <Area
              type="linear"
              dataKey="current"
              name={data.currentLabel}
              stroke="var(--color-dye-madder)"
              fill="var(--color-dye-madder)"
              fillOpacity={0.25}
              strokeWidth={2}
              dot={false}
            />
            <Legend
              verticalAlign="bottom"
              formatter={(value) => (
                <span
                  className="font-sans text-[0.8125rem]"
                  style={{ color: "var(--color-ink-900)" }}
                >
                  {value}
                </span>
              )}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
