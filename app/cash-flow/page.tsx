import { Card } from "@/components/ui/Card";
import { CashFlowSankey } from "@/components/cash-flow/CashFlowSankey";
import {
  cashFlowLinks,
  cashFlowNodes,
  cashFlowSummary,
} from "@/lib/mock-cash-flow-data";

export default function CashFlowPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <h1 className="font-sans text-[1.25rem] font-medium text-ink-900">
        Cash flow
      </h1>
      <p className="mt-1 font-mono text-[0.8125rem] text-linen-700">
        {cashFlowSummary.rangeLabel}
      </p>

      <div className="mt-6">
        <Card className="p-6 sm:p-8">
          <CashFlowSankey
            nodes={cashFlowNodes}
            links={cashFlowLinks}
            totalIncome={cashFlowSummary.totalIncome}
          />
        </Card>
      </div>
    </main>
  );
}
