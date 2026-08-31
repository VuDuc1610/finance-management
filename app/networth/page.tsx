import { Card } from "@/components/ui/Card";
import { NetWorthCard } from "@/components/net-worth/NetWorthCard";
import { AssetDistribution } from "@/components/net-worth/AssetDistribution";
import { AccountsBreakdown } from "@/components/net-worth/AccountsBreakdown";
import {
  getAccountsBreakdown,
  getAssetDistribution,
  getNetWorthBreakdownSeries,
} from "@/lib/net-worth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const [breakdown, assetDistribution, accountsBreakdown] = await Promise.all([
    getNetWorthBreakdownSeries(userId),
    getAssetDistribution(userId),
    getAccountsBreakdown(userId),
  ]);

  return (
    <main className="w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-[1.4rem] text-ink-900">
          Net worth
        </h1>
      </div>

      {breakdown.length > 0 ? (
        <>
          <NetWorthCard data={breakdown} />

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
            {accountsBreakdown.length > 0 && (
              <div className="lg:col-span-3">
                <Card className="p-6 sm:p-8">
                  <AccountsBreakdown groups={accountsBreakdown} />
                </Card>
              </div>
            )}
            {assetDistribution.length > 0 && (
              <div className="lg:col-span-2">
                <Card className="h-full p-6 sm:p-8">
                  <AssetDistribution data={assetDistribution} />
                </Card>
              </div>
            )}
          </div>
        </>
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
