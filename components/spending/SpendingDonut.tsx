"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { SpendingCategory } from "@/lib/spending";

interface SpendingDonutProps {
  data: SpendingCategory[];
  total: number;
  monthLabel: string;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function SpendingDonut({ data, total, monthLabel }: SpendingDonutProps) {
  const [bloomed, setBloomed] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setBloomed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
      <div
        className={`chart-bloom relative h-64 w-64 shrink-0 ${bloomed ? "is-bloomed" : ""}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="percent"
              nameKey="name"
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={450}
              paddingAngle={3}
              cornerRadius={8}
              stroke="none"
            >
              {data.map((category) => (
                <Cell key={category.key} fill={category.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-sans text-[0.8125rem] text-linen-700">
            Spent this {monthLabel}
          </span>
          <span className="font-display text-[2rem] text-ink-900">
            {currency.format(total)}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {data.map((category) => (
          <li key={category.key} className="flex items-center gap-3">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
              aria-hidden="true"
            />
            <span className="font-sans text-[0.875rem] text-ink-900">
              {category.name}
            </span>
            <span className="font-mono text-[0.8125rem] text-linen-700">
              {category.percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
