import { Card } from "@/components/ui/Card";

interface CashFlowSummaryStatsProps {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  savingsRate: number;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function CashFlowSummaryStats({
  totalIncome,
  totalExpenses,
  netIncome,
  savingsRate,
}: CashFlowSummaryStatsProps) {
  const stats = [
    {
      label: "Total Income",
      value: currency.format(totalIncome),
      colorClass: "text-dye-moss",
    },
    {
      label: "Total Expenses",
      value: currency.format(totalExpenses),
      colorClass: "text-dye-madder",
    },
    {
      label: "Net Income",
      value: currency.format(netIncome),
      colorClass: netIncome >= 0 ? "text-ink-900" : "text-dye-madder",
    },
    {
      label: "Savings Rate",
      value: `${savingsRate.toFixed(1)}%`,
      colorClass: "text-ink-900",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
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
