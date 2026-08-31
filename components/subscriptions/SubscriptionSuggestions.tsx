"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SubscriptionSuggestion } from "@/lib/subscription-suggestions";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type ScanState = "idle" | "loading" | "done" | "error";

export function SubscriptionSuggestions() {
  const router = useRouter();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [suggestions, setSuggestions] = useState<SubscriptionSuggestion[]>([]);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setHelpOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function runScan() {
    setScanState("loading");
    try {
      const response = await fetch("/api/subscriptions/suggestions");
      if (!response.ok) throw new Error("Scan failed");
      const data = await response.json();
      setSuggestions(data.suggestions);
      setScanState("done");
    } catch {
      setScanState("error");
    }
  }

  async function acceptSuggestion(
    suggestion: SubscriptionSuggestion,
    kind: "subscription" | "bill",
  ) {
    setBusyName(suggestion.groupKey);
    await fetch(`/api/transactions/${suggestion.latestTransactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billKind: kind, dueDate: suggestion.latestDate }),
    });
    setSuggestions((prev) =>
      prev.filter((item) => item.groupKey !== suggestion.groupKey),
    );
    setBusyName(null);
    router.refresh();
  }

  async function dismissSuggestion(suggestion: SubscriptionSuggestion) {
    setBusyName(suggestion.groupKey);
    await fetch("/api/subscriptions/suggestions/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupKey: suggestion.groupKey }),
    });
    setSuggestions((prev) =>
      prev.filter((item) => item.groupKey !== suggestion.groupKey),
    );
    setBusyName(null);
  }

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={runScan}
          disabled={scanState === "loading"}
          className="rounded-pill border border-dye-indigo px-4 py-2 font-sans text-[0.875rem] text-dye-indigo transition hover:bg-dye-indigo hover:text-linen-100 disabled:opacity-60"
        >
          {scanState === "loading"
            ? "Scanning transactions…"
            : "Scan transactions for subscriptions & bills"}
        </button>

        <div ref={helpRef} className="relative">
          <button
            type="button"
            onClick={() => setHelpOpen((open) => !open)}
            aria-label="How to add a subscription or bill"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-linen-300 font-sans text-[0.75rem] text-linen-700 hover:text-ink-900"
          >
            ?
          </button>

          {helpOpen && (
            <div className="absolute left-0 top-8 z-10 w-72 rounded-card border border-linen-300 bg-linen-100 p-4 shadow-lg">
              <p className="font-sans text-[0.8125rem] text-ink-900">
                To manually tag a transaction as a subscription or bill, go to{" "}
                <Link
                  href="/spending"
                  className="text-dye-indigo underline"
                  onClick={() => setHelpOpen(false)}
                >
                  Spending
                </Link>
                , open a transaction&apos;s ••• menu, and choose{" "}
                <span className="text-ink-900">Tag as Subscription</span> or{" "}
                <span className="text-ink-900">Tag as Bill</span>.
              </p>
            </div>
          )}
        </div>
      </div>

      {scanState === "error" && (
        <p className="font-sans text-[0.8125rem] text-dye-madder">
          Something went wrong scanning transactions. Try again.
        </p>
      )}

      {scanState === "done" && suggestions.length === 0 && (
        <p className="font-sans text-[0.8125rem] text-linen-700">
          No potential subscriptions or bills found.
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="rounded-card border border-linen-300 p-4 sm:p-6">
          <h2 className="mb-3 font-display text-[1.0625rem] text-ink-900">
            Suggested Subscriptions & Bills
          </h2>
          <div className="flex flex-col gap-3">
            {suggestions.map((suggestion) => {
              const isBusy = busyName === suggestion.groupKey;
              return (
                <div
                  key={suggestion.groupKey}
                  className="flex flex-col gap-3 rounded-card border border-linen-300 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-sans text-[0.9375rem] text-ink-900">
                      {suggestion.name}
                    </p>
                    <p className="font-sans text-[0.8125rem] text-linen-700">
                      {suggestion.category} · {currency.format(suggestion.suggestedAmount)}
                      /mo · seen in {suggestion.monthsSeen} months
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => acceptSuggestion(suggestion, "subscription")}
                      className="rounded-pill bg-dye-indigo px-3 py-1.5 font-sans text-[0.8125rem] text-linen-100 transition hover:opacity-90 disabled:opacity-60"
                    >
                      Tag as Subscription
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => acceptSuggestion(suggestion, "bill")}
                      className="rounded-pill border border-dye-indigo px-3 py-1.5 font-sans text-[0.8125rem] text-dye-indigo transition hover:bg-dye-indigo hover:text-linen-100 disabled:opacity-60"
                    >
                      Tag as Bill
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => dismissSuggestion(suggestion)}
                      aria-label="Dismiss suggestion"
                      className="px-2 py-1.5 font-sans text-[0.8125rem] text-linen-700 hover:text-ink-900 disabled:opacity-60"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
