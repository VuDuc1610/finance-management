"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { NetWorthChart } from "@/components/net-worth/NetWorthChart";
import type { NetWorthBreakdownPoint } from "@/lib/net-worth";

interface NetWorthCardProps {
  data: NetWorthBreakdownPoint[];
}

type Metric = "net" | "assets" | "liabilities";
type Range = "1w" | "1m" | "3m" | "6m" | "1y" | "all";

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: "net", label: "Net worth performance" },
  { value: "assets", label: "Assets performance" },
  { value: "liabilities", label: "Liabilities performance" },
];

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "1w", label: "1 week" },
  { value: "1m", label: "1 month" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
];

const RANGE_DAYS: Record<Range, number | null> = {
  "1w": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
  all: null,
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 6.2V10.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="7" cy="4.1" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function NetWorthCard({ data }: NetWorthCardProps) {
  const [metric, setMetric] = useState<Metric>("net");
  const [range, setRange] = useState<Range>("1m");

  const view = useMemo(() => {
    const points = data.map((point) => ({ date: point.date, value: point[metric] }));
    const days = RANGE_DAYS[range];

    let filtered = points;
    if (days !== null && points.length > 0) {
      const latestDate = points[points.length - 1].date;
      const cutoff = new Date(latestDate);
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffIso = cutoff.toISOString().slice(0, 10);
      filtered = points.filter((point) => point.date >= cutoffIso);
      if (filtered.length === 0) filtered = points.slice(-1);
    }

    const current = filtered[filtered.length - 1];
    const comparison = filtered[0];
    const changeAmount = current.value - comparison.value;
    const changePercent =
      comparison.value !== 0 ? (changeAmount / Math.abs(comparison.value)) * 100 : 0;

    return {
      series: filtered,
      currentValue: current.value,
      changeAmount,
      changePercent,
    };
  }, [data, metric, range]);

  const isPositive = view.changeAmount >= 0;
  const rangeLabel = RANGE_OPTIONS.find((option) => option.value === range)!.label;

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 font-sans text-[0.8125rem] font-medium tracking-wide text-linen-700 uppercase">
            {metric === "net"
              ? "Net worth"
              : metric === "assets"
                ? "Assets"
                : "Liabilities"}
            <InfoIcon />
          </div>
          <div className="mt-2 font-display text-[2rem] leading-none text-ink-900 sm:text-[2.75rem]">
            {currency.format(view.currentValue)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 font-mono text-[0.8125rem]">
            <span className={isPositive ? "text-dye-moss" : "text-dye-madder"}>
              {isPositive ? "↑" : "↓"} {currency.format(Math.abs(view.changeAmount))} (
              {Math.abs(view.changePercent).toFixed(1)}%)
            </span>
            <span className="text-linen-700">{rangeLabel} change</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Dropdown value={metric} options={METRIC_OPTIONS} onChange={setMetric} />
          <Dropdown value={range} options={RANGE_OPTIONS} onChange={setRange} />
        </div>
      </div>

      <div className="mt-6">
        <NetWorthChart key={`${metric}-${range}`} data={view.series} />
      </div>
    </Card>
  );
}
