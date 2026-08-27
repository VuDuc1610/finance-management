"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

interface SubscriptionsSummaryStatsProps {
  monthlyTotal: number;
  subscriptionMonthlyTotal: number;
  billMonthlyTotal: number;
  subscriptionCount: number;
  billCount: number;
  dueSoonCount: number;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function SubscriptionsSummaryStats({
  monthlyTotal,
  subscriptionMonthlyTotal,
  billMonthlyTotal,
  subscriptionCount,
  billCount,
  dueSoonCount,
}: SubscriptionsSummaryStatsProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const otherStats = [
    {
      label: "Subscriptions",
      value: String(subscriptionCount),
      colorClass: "text-ink-900",
    },
    {
      label: "Bills",
      value: String(billCount),
      colorClass: "text-ink-900",
    },
    {
      label: "Due in 5 Days",
      value: String(dueSoonCount),
      colorClass: dueSoonCount > 0 ? "text-dye-madder" : "text-ink-900",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card className="relative p-0">
        <button
          type="button"
          onClick={() => setBreakdownOpen((prev) => !prev)}
          aria-expanded={breakdownOpen}
          className="w-full rounded-card p-5 text-left hover:bg-linen-300/20"
        >
          <p className="font-sans text-[1.375rem] font-semibold text-ink-900">
            {currency.format(monthlyTotal)}
          </p>
          <p className="mt-1 font-sans text-[0.6875rem] font-medium tracking-wide text-linen-700 uppercase">
            Monthly Total
          </p>
        </button>

        {breakdownOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setBreakdownOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute left-0 top-full z-30 mt-2 w-56 rounded-card border border-linen-300 bg-linen-100 p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-4 py-1">
                <span className="font-sans text-[0.8125rem] text-linen-700">
                  Subscriptions
                </span>
                <span className="font-mono text-[0.9375rem] text-ink-900">
                  {currency.format(subscriptionMonthlyTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-linen-300 py-1 pt-2">
                <span className="font-sans text-[0.8125rem] text-linen-700">Bills</span>
                <span className="font-mono text-[0.9375rem] text-ink-900">
                  {currency.format(billMonthlyTotal)}
                </span>
              </div>
            </div>
          </>
        )}
      </Card>

      {otherStats.map((stat) => (
        <Card key={stat.label} className="p-5">
          <p className={`font-sans text-[1.375rem] font-semibold ${stat.colorClass}`}>
            {stat.value}
          </p>
          <p className="mt-1 font-sans text-[0.6875rem] font-medium tracking-wide text-linen-700 uppercase">
            {stat.label}
          </p>
        </Card>
      ))}
    </div>
  );
}
