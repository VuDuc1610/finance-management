"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SpendingComparison } from "@/lib/analytics-types";

interface AnalyticsMiniChartProps {
  data: SpendingComparison;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
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

export function AnalyticsMiniChart({ data }: AnalyticsMiniChartProps) {
  return (
    <div className="h-64 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={tickStyle}
            axisLine={{ stroke: "var(--color-linen-300)" }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis
            domain={[0, "dataMax + 100"]}
            tickFormatter={formatCompactDollars}
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            tickCount={4}
            width={40}
          />
          <Tooltip
            formatter={(value, name) => [
              currency.format(Number(value)),
              name === "current" ? data.currentLabel : data.previousLabel,
            ]}
            contentStyle={{
              background: "var(--color-linen-100)",
              border: "1px solid var(--color-linen-300)",
              borderRadius: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--color-ink-900)",
            }}
          />
          <Area
            type="linear"
            dataKey="previous"
            stroke="var(--color-linen-700)"
            fill="transparent"
            strokeWidth={2}
          />
          <Area
            type="linear"
            dataKey="current"
            stroke="var(--color-dye-madder)"
            fill="var(--color-dye-madder)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
