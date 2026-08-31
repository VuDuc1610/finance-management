"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashFlowTrendMonth } from "@/lib/cash-flow";

interface CashFlowTrendChartProps {
  months: CashFlowTrendMonth[];
  latestNet: number;
  latestMonthLabel: string;
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
      <p style={{ color: "var(--color-dye-indigo)" }}>{currency.format(point.net)} kept</p>
    </div>
  );
}

export function CashFlowTrendChart({ months, latestNet, latestMonthLabel }: CashFlowTrendChartProps) {
  const [bloomed, setBloomed] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setBloomed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const data = months.map((m) => ({ ...m, spendingNeg: -m.spending }));

  return (
    <div>
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="font-sans text-[0.875rem] text-linen-700">
          Income above the line in moss, spending below in madder. The thin indigo line is what
          stayed.
        </p>
        <span className="shrink-0 font-mono text-[0.8125rem] text-linen-700">
          Kept {currency.format(latestNet)} in {latestMonthLabel}
        </span>
      </div>

      <div className={`chart-bloom h-64 w-full sm:h-80 ${bloomed ? "is-bloomed" : ""}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="monthLabel"
              tick={(props) => {
                const { x, y, payload } = props;
                const point = data.find((d) => d.monthLabel === payload.value);
                return (
                  <text
                    x={x}
                    y={Number(y) + 12}
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                    fontSize={11}
                    fontWeight={point?.isSelected ? 700 : 400}
                    fill={point?.isSelected ? "var(--color-ink-900)" : "var(--color-linen-700)"}
                  >
                    {payload.value}
                  </text>
                );
              }}
              axisLine={{ stroke: "var(--color-linen-300)" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatCompactDollars}
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <ReferenceLine y={0} stroke="var(--color-linen-300)" />
            <Tooltip content={<TrendTooltip />} cursor={{ fill: "var(--color-linen-300)", opacity: 0.2 }} />
            <Bar dataKey="income" fill="var(--color-dye-moss)" radius={[4, 4, 0, 0]} maxBarSize={48} />
            <Bar
              dataKey="spendingNeg"
              fill="var(--color-dye-madder)"
              radius={[0, 0, 4, 4]}
              maxBarSize={48}
            />
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
    </div>
  );
}
