"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LinkCard } from "@/components/ui/LinkCard";
import { NetWorthChart } from "@/components/net-worth/NetWorthChart";
import { SpendingMiniChart } from "@/components/spending/SpendingMiniChart";
import { UpcomingPayments } from "@/components/subscriptions/UpcomingPayments";
import type { BillItem } from "@/lib/subscriptions";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface HomeTransaction {
  id: number;
  date: string;
  name: string;
  amount: number;
  kind: "expense" | "income";
}

interface HomeBoardProps {
  netWorthPoints: { date: string; value: number }[];
  currentNetWorth: number;
  spendingTotal: number | null;
  dailyTotals: { day: number; amount: number }[];
  transactionsMonthLabel: string | null;
  recentTransactions: HomeTransaction[];
  subscriptionItems: BillItem[];
}

const STORAGE_KEY = "home-board-order-v1";
const CARD_IDS = ["net-worth", "spending", "transactions", "upcoming-payments"] as const;
type CardId = (typeof CARD_IDS)[number];

export function HomeBoard({
  netWorthPoints,
  currentNetWorth,
  spendingTotal,
  dailyTotals,
  transactionsMonthLabel,
  recentTransactions,
  subscriptionItems,
}: HomeBoardProps) {
  const [order, setOrder] = useState<CardId[]>([...CARD_IDS]);
  const [dragId, setDragId] = useState<CardId | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as string[];
        const known = new Set<string>(CARD_IDS);
        const valid = saved.filter((id): id is CardId => known.has(id));
        const missing = CARD_IDS.filter((id) => !valid.includes(id));
        // Reading persisted order from localStorage on mount (client-only external
        // store) requires a one-time setState here; there is no SSR-safe alternative.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOrder([...valid, ...missing]);
      }
    } catch {
      // ignore malformed or inaccessible storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch {
      // ignore write failures (private mode, quota)
    }
  }, [order, hydrated]);

  const moveBefore = useCallback((draggedId: CardId, targetId: CardId) => {
    if (draggedId === targetId) return;
    setOrder((prev) => {
      const next = prev.filter((id) => id !== draggedId);
      next.splice(next.indexOf(targetId), 0, draggedId);
      return next;
    });
  }, []);

  function dragProps(id: CardId) {
    return {
      draggable: true,
      isDragging: dragId === id,
      onDragStart: () => setDragId(id),
      onDragEnd: () => setDragId(null),
    };
  }

  const cards: Record<CardId, ReactNode> = {
    "net-worth": (
      <LinkCard
        href="/"
        title="Net worth"
        subtitle={netWorthPoints.length > 0 ? currency.format(currentNetWorth) : undefined}
        {...dragProps("net-worth")}
      >
        {netWorthPoints.length > 0 ? (
          <NetWorthChart data={netWorthPoints} />
        ) : (
          <p className="font-sans text-[0.9375rem] text-linen-700">No net worth data yet.</p>
        )}
      </LinkCard>
    ),
    spending: (
      <LinkCard
        href="/spending"
        title="Spending"
        subtitle={spendingTotal !== null ? `${currency.format(spendingTotal)} this month` : undefined}
        {...dragProps("spending")}
      >
        {dailyTotals.length > 0 ? (
          <SpendingMiniChart data={dailyTotals} />
        ) : (
          <p className="font-sans text-[0.9375rem] text-linen-700">No spending data yet.</p>
        )}
      </LinkCard>
    ),
    transactions: (
      <LinkCard
        href="/transactions"
        title="Transactions"
        subtitle={transactionsMonthLabel ?? undefined}
        {...dragProps("transactions")}
      >
        {recentTransactions.length > 0 ? (
          <ul className="flex flex-col divide-y divide-linen-300">
            {recentTransactions.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="font-mono text-[0.875rem] text-linen-700">
                    {formatDate(transaction.date)}
                  </span>
                  <span className="truncate font-sans text-[1rem] text-ink-900">
                    {transaction.name}
                  </span>
                </div>
                <span
                  className={`shrink-0 font-mono text-[1rem] ${
                    transaction.kind === "income" ? "text-dye-moss" : "text-ink-900"
                  }`}
                >
                  {transaction.kind === "income" ? "+" : "-"}
                  {currency.format(transaction.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-sans text-[0.9375rem] text-linen-700">No transactions yet.</p>
        )}
      </LinkCard>
    ),
    "upcoming-payments": (
      <LinkCard
        href="/subscriptions"
        title="Upcoming payments"
        subtitle="Due in the next 5 days"
        {...dragProps("upcoming-payments")}
      >
        <UpcomingPayments items={subscriptionItems} />
      </LinkCard>
    ),
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {order.map((id) => (
        <div
          key={id}
          onDragOver={(event) => event.preventDefault()}
          onDragEnter={() => dragId && moveBefore(dragId, id)}
        >
          {cards[id]}
        </div>
      ))}
    </div>
  );
}
