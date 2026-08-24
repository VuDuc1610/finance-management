import { Card } from "@/components/ui/Card";
import { NetWorthCard } from "@/components/net-worth/NetWorthCard";
import { AssetDistribution } from "@/components/net-worth/AssetDistribution";
import { AddAccountButton } from "@/components/net-worth/AddAccountButton";
import { getAssetDistribution, getNetWorthBreakdownSeries } from "@/lib/net-worth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [breakdown, assetDistribution] = await Promise.all([
    getNetWorthBreakdownSeries(),
    getAssetDistribution(),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-sans text-[1.125rem] font-medium text-ink-900">
          Accounts
        </h1>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-pill border border-linen-300 px-4 py-2 font-sans text-[0.8125rem] text-ink-900 hover:bg-linen-300/30"
          >
            Refresh all
          </button>
          <AddAccountButton />
        </div>
      </div>

      {breakdown.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <NetWorthCard data={breakdown} />
          </div>
          {assetDistribution.length > 0 && (
            <div className="lg:col-span-2">
              <Card className="h-full p-6 sm:p-8">
                <AssetDistribution data={assetDistribution} />
              </Card>
            </div>
          )}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="font-sans text-[0.9375rem] text-linen-700">
            No transactions yet — link an account above to see it here.
          </p>
        </Card>
      )}
    </main>
  );
}
