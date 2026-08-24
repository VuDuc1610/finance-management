"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NetWorthDataPoint } from "@/lib/mock-data";

interface NetWorthChartProps {
  data: NetWorthDataPoint[];
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatCompactDollars(value: number) {
  return `$${Math.round(value / 1000)}K`;
}

function formatTickDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTooltipDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const tickStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fill: "var(--color-linen-700)",
};

export function NetWorthChart({ data }: NetWorthChartProps) {
  const [bloomed, setBloomed] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setBloomed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={`chart-bloom h-64 w-full sm:h-80 ${bloomed ? "is-bloomed" : ""}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-dye-indigo)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-dye-indigo)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-linen-300)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatTickDate}
            tick={tickStyle}
            axisLine={{ stroke: "var(--color-linen-300)" }}
            tickLine={false}
            interval={3}
          />
          <YAxis
            dataKey="value"
            domain={["dataMin - 2000", "dataMax + 2000"]}
            tickFormatter={formatCompactDollars}
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            formatter={(value) => currency.format(Number(value))}
            labelFormatter={(label) => formatTooltipDate(String(label))}
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
            dataKey="value"
            stroke="var(--color-dye-indigo)"
            strokeWidth={2}
            fill="url(#netWorthFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
