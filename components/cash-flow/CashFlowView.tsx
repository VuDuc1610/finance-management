"use client";

import { useState } from "react";
import { Dropdown } from "@/components/ui/Dropdown";
import { CashFlowSankey } from "@/components/cash-flow/CashFlowSankey";
import { CashFlowTrendChart } from "@/components/cash-flow/CashFlowTrendChart";
import type { CashFlowLink, CashFlowNode, CashFlowTrendMonth } from "@/lib/cash-flow";

type ChartView = "breakdown" | "trend";

const VIEW_OPTIONS: { value: ChartView; label: string }[] = [
  { value: "breakdown", label: "Breakdown" },
  { value: "trend", label: "In and out" },
];

interface CashFlowViewProps {
  monthLabel: string;
  nodes: CashFlowNode[];
  links: CashFlowLink[];
  totalIncome: number;
  trendMonths: CashFlowTrendMonth[];
  trendLatestNet: number;
  trendLatestMonthLabel: string;
}

export function CashFlowView({
  monthLabel,
  nodes,
  links,
  totalIncome,
  trendMonths,
  trendLatestNet,
  trendLatestMonthLabel,
}: CashFlowViewProps) {
  const [view, setView] = useState<ChartView>("breakdown");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[1.4rem] text-ink-900">
            {view === "breakdown" ? "Cash flow breakdown" : "In and out"}
          </h2>
          {view === "breakdown" && (
            <p className="mt-1 font-mono text-[0.8125rem] text-linen-700">{monthLabel}</p>
          )}
        </div>
        <Dropdown value={view} options={VIEW_OPTIONS} onChange={setView} />
      </div>

      {view === "breakdown" ? (
        <CashFlowSankey nodes={nodes} links={links} totalIncome={totalIncome} />
      ) : (
        <CashFlowTrendChart
          months={trendMonths}
          latestNet={trendLatestNet}
          latestMonthLabel={trendLatestMonthLabel}
        />
      )}
    </div>
  );
}
