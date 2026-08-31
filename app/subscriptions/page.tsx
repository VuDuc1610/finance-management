import { Card } from "@/components/ui/Card";
import { SubscriptionsSummaryStats } from "@/components/subscriptions/SubscriptionsSummaryStats";
import { UpcomingPayments } from "@/components/subscriptions/UpcomingPayments";
import { SubscriptionsList } from "@/components/subscriptions/SubscriptionsList";
import { SubscriptionSuggestions } from "@/components/subscriptions/SubscriptionSuggestions";
import { getSubscriptionsAndBills } from "@/lib/subscriptions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { items, summary } = await getSubscriptionsAndBills(user!.id);

  return (
    <main className="w-full max-w-6xl flex-1 px-6 py-10 md:px-10 lg:px-16">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-[1.4rem] text-ink-900">
          Subscriptions & Billing
        </h1>
      </div>

      <SubscriptionSuggestions />

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-sans text-[0.9375rem] text-linen-700">
            No subscriptions or bills tagged yet — go to Spending and use a
            transaction&apos;s actions menu to tag it as a Subscription or Bill.
          </p>
        </Card>
      ) : (
        <>
          <SubscriptionsSummaryStats
            monthlyTotal={summary.monthlyTotal}
            subscriptionMonthlyTotal={summary.subscriptionMonthlyTotal}
            billMonthlyTotal={summary.billMonthlyTotal}
            subscriptionCount={summary.subscriptionCount}
            billCount={summary.billCount}
            dueSoonCount={summary.dueSoonCount}
          />

          <Card className="p-6 sm:p-8">
            <h2 className="mb-4 font-display text-[1.1875rem] text-ink-900">
              Upcoming Payments
            </h2>
            <UpcomingPayments items={items} />
          </Card>

          <div className="mt-6">
            <Card className="p-6 sm:p-8">
              <h2 className="mb-4 font-display text-[1.1875rem] text-ink-900">
                All Subscriptions & Bills
              </h2>
              <SubscriptionsList items={items} />
            </Card>
          </div>
        </>
      )}
    </main>
  );
}
