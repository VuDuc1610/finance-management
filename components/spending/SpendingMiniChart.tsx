"use client";

import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface SpendingMiniChartProps {
  data: { day: number; amount: number }[];
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function SpendingMiniChart({ data }: SpendingMiniChartProps) {
  const cumulative = data.reduce<{ day: number; amount: number }[]>((acc, point) => {
    const previous = acc[acc.length - 1]?.amount ?? 0;
    acc.push({ day: point.day, amount: previous + point.amount });
    return acc;
  }, []);

  return (
    <div className="h-64 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={cumulative} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="spendingMiniFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-dye-saffron)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-dye-saffron)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" hide />
          <YAxis dataKey="amount" hide domain={["dataMin", "dataMax + 100"]} />
          <Tooltip
            formatter={(value) => currency.format(Number(value))}
            labelFormatter={(label) => `Day ${label}`}
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
            type="monotone"
            dataKey="amount"
            stroke="var(--color-dye-saffron)"
            strokeWidth={2}
            fill="url(#spendingMiniFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
