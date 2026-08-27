"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { SpendingCategory } from "@/lib/spending";

interface SpendingDonutProps {
  data: SpendingCategory[];
  total: number;
  monthLabel: string;
  year: number;
  month: number;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function SpendingDonut({
  data,
  total,
  monthLabel,
  year,
  month,
}: SpendingDonutProps) {
  const router = useRouter();
  const [bloomed, setBloomed] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setBloomed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function goToCategory(key: string) {
    router.push(
      `/spending/${encodeURIComponent(key)}?year=${year}&month=${month}`,
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
      <div
        className={`chart-bloom relative h-64 w-64 shrink-0 sm:h-80 sm:w-80 lg:h-96 lg:w-96 ${bloomed ? "is-bloomed" : ""}`}
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
              onMouseEnter={(_, index) => setHoveredKey(data[index].key)}
              onMouseLeave={() => setHoveredKey(null)}
              onClick={(_, index) => goToCategory(data[index].key)}
            >
              {data.map((category) => (
                <Cell
                  key={category.key}
                  fill={category.color}
                  opacity={
                    hoveredKey === null || hoveredKey === category.key ? 1 : 0.35
                  }
                  className="cursor-pointer transition-opacity duration-150"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-sans text-[0.8125rem] text-linen-700 sm:text-[0.9375rem]">
            Spent this {monthLabel}
          </span>
          <span className="font-display text-[2rem] text-ink-900 sm:text-[2.5rem]">
            {currency.format(total)}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {data.map((category) => (
          <li key={category.key}>
            <button
              type="button"
              onClick={() => goToCategory(category.key)}
              onMouseEnter={() => setHoveredKey(category.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`flex w-full items-center gap-3 rounded-card px-1.5 py-1 text-left transition-colors duration-150 ${
                hoveredKey === category.key ? "bg-linen-300/40" : ""
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: category.color,
                  opacity:
                    hoveredKey === null || hoveredKey === category.key ? 1 : 0.35,
                }}
                aria-hidden="true"
              />
              <span className="font-sans text-[0.875rem] text-ink-900">
                {category.name}
              </span>
              <span className="font-mono text-[0.8125rem] text-linen-700">
                {category.percent}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
