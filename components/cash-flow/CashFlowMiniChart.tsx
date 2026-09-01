"use client";

import { Bar, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CashFlowTrendMonth } from "@/lib/cash-flow";

interface CashFlowMiniChartProps {
  months: CashFlowTrendMonth[];
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCompactDollars(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.round(Math.abs(value) / 1000)}k`;
}

const tickStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fill: "var(--color-linen-700)",
};

interface TooltipPayloadItem {
  payload: CashFlowTrendMonth;
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div
      className="rounded-card border border-linen-300 bg-linen-100 px-3 py-2 font-mono text-[0.75rem]"
      style={{ color: "var(--color-ink-900)" }}
    >
      <p className="mb-1 font-sans font-medium">{point.monthLabel}</p>
      <p style={{ color: "var(--color-dye-moss)" }}>+{currency.format(point.income)} in</p>
      <p style={{ color: "var(--color-dye-madder)" }}>-{currency.format(point.spending)} out</p>
    </div>
  );
}

export function CashFlowMiniChart({ months }: CashFlowMiniChartProps) {
  const data = months.map((m) => ({ ...m, spendingNeg: -m.spending }));

  return (
    <div className="h-64 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="monthLabel"
            tick={tickStyle}
            axisLine={{ stroke: "var(--color-linen-300)" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCompactDollars}
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <ReferenceLine y={0} stroke="var(--color-linen-300)" />
          <Tooltip content={<TrendTooltip />} cursor={{ fill: "var(--color-linen-300)", opacity: 0.2 }} />
          <Bar dataKey="income" fill="var(--color-dye-moss)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="spendingNeg" fill="var(--color-dye-madder)" radius={[0, 0, 4, 4]} maxBarSize={40} />
          <Line
            type="monotone"
            dataKey="net"
            stroke="var(--color-dye-indigo)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-dye-indigo)", strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
