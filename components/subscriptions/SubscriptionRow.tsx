"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BillItem } from "@/lib/subscriptions";
import { getDueBadge } from "@/components/subscriptions/dueStatus";

interface SubscriptionRowProps {
  item: BillItem;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function SubscriptionRow({ item }: SubscriptionRowProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.dueDate ?? "");
  const [saving, setSaving] = useState(false);
  const badge = getDueBadge(item.dueDate);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/transactions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: value === "" ? null : value }),
      });
      router.refresh();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-b border-linen-300 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: item.color }}
          aria-hidden="true"
        />
        <div>
          <p className="font-sans text-[0.9375rem] text-ink-900">{item.name}</p>
          <p className="font-sans text-[0.8125rem] text-linen-700">{item.category}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-5 sm:pl-0">
        {editing ? (
          <>
            <input
              type="date"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="rounded-md border border-linen-300 bg-linen-100 px-1.5 py-0.5 font-mono text-[0.8125rem] text-ink-900"
              autoFocus
            />
            <button
              type="button"
              disabled={saving}
              onClick={save}
              aria-label="Save"
              className="flex h-6 w-6 items-center justify-center rounded-full text-dye-indigo hover:bg-dye-indigo/10 disabled:opacity-50"
            >
              ✓
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setValue(item.dueDate ?? "");
                setEditing(false);
              }}
              aria-label="Cancel"
              className="flex h-6 w-6 items-center justify-center rounded-full text-linen-700 hover:bg-linen-300/30 disabled:opacity-50"
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[0.75rem] ${badge.className}`}
            >
              {badge.label}
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-sans text-[0.75rem] text-linen-700 underline hover:text-ink-900"
            >
              Edit
            </button>
          </>
        )}
        <span className="font-mono text-[0.9375rem] font-medium text-ink-900">
          {currency.format(item.amount)}
        </span>
      </div>
    </div>
  );
}
