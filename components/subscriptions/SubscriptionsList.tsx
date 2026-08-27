import type { BillItem } from "@/lib/subscriptions";
import { SubscriptionRow } from "@/components/subscriptions/SubscriptionRow";

interface SubscriptionsListProps {
  items: BillItem[];
}

export function SubscriptionsList({ items }: SubscriptionsListProps) {
  const subscriptions = items.filter((item) => item.kind === "subscription");
  const bills = items.filter((item) => item.kind === "bill");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 font-sans text-[0.8125rem] font-medium tracking-wide text-linen-700 uppercase">
          Subscriptions
        </h3>
        {subscriptions.length > 0 ? (
          <div>
            {subscriptions.map((item) => (
              <SubscriptionRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="font-sans text-[0.875rem] text-linen-700">
            None tagged yet — use the &ldquo;Sub&rdquo; button on a transaction in Spending.
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-sans text-[0.8125rem] font-medium tracking-wide text-linen-700 uppercase">
          Bills
        </h3>
        {bills.length > 0 ? (
          <div>
            {bills.map((item) => (
              <SubscriptionRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="font-sans text-[0.875rem] text-linen-700">
            None tagged yet — use the &ldquo;Bill&rdquo; button on a transaction in Spending.
          </p>
        )}
      </div>
    </div>
  );
}
