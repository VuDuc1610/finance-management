"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TransactionRowProps {
  id: number;
  date: string;
  name: string;
  amount: number;
  originalAmount: number;
  personalAmount: number | null;
  pending: boolean;
  categoryLabel?: string;
  color?: string;
  kind?: "expense" | "income";
}

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

export function TransactionRow({
  id,
  date,
  name,
  amount,
  originalAmount,
  personalAmount,
  pending,
  categoryLabel,
  color,
  kind = "expense",
}: TransactionRowProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(Math.abs(personalAmount ?? originalAmount).toString());
  const [saving, setSaving] = useState(false);
  const isAdjusted = personalAmount !== null;
  const sign = kind === "income" ? -1 : 1;
  const editLabel = kind === "income" ? "Not mine" : "Split";
  const fullAmountLabel = kind === "income" ? "Full transfer" : "Full charge";

  async function save(magnitude: number | null) {
    setSaving(true);
    try {
      await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalAmount: magnitude === null ? null : magnitude * sign,
        }),
      });
      router.refresh();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <li className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.8125rem] text-linen-700">
            {formatDate(date)}
          </span>
          <span className="font-sans text-[0.875rem] text-ink-900">{name}</span>
          <span className="font-sans text-[0.75rem] text-linen-700">
            {fullAmountLabel}: {currency.format(originalAmount)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-24 rounded-md border border-linen-300 bg-linen-100 px-2 py-1 font-mono text-[0.8125rem] text-ink-900"
            autoFocus
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => save(Number(value))}
            className="rounded-pill border border-dye-indigo px-2.5 py-1 font-sans text-[0.75rem] font-medium text-ink-900 hover:bg-dye-indigo/10 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => setEditing(false)}
            className="rounded-pill border border-linen-300 px-2.5 py-1 font-sans text-[0.75rem] text-linen-700 hover:bg-linen-300/30 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[0.8125rem] text-linen-700">
          {formatDate(date)}
        </span>
        {color && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        )}
        <span className="font-sans text-[0.875rem] text-ink-900">{name}</span>
        {categoryLabel && (
          <span className="font-sans text-[0.75rem] text-linen-700">
            {categoryLabel}
          </span>
        )}
        {pending && (
          <span className="rounded-pill border border-linen-300 px-2 py-0.5 font-sans text-[0.6875rem] text-linen-700">
            Pending
          </span>
        )}
        {isAdjusted && (
          <span className="rounded-pill border border-dye-saffron px-2 py-0.5 font-sans text-[0.6875rem] text-dye-saffron">
            Adjusted
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {isAdjusted && (
          <span className="font-mono text-[0.75rem] text-linen-700 line-through">
            {currency.format(originalAmount)}
          </span>
        )}
        <span
          className={`font-mono text-[0.875rem] ${kind === "income" ? "text-dye-moss" : "text-ink-900"}`}
        >
          {kind === "income" ? "+" : "-"}
          {currency.format(amount)}
        </span>
        <button
          type="button"
          onClick={() => {
            setValue(Math.abs(personalAmount ?? originalAmount).toString());
            setEditing(true);
          }}
          className="font-sans text-[0.75rem] text-linen-700 underline hover:text-ink-900"
        >
          {isAdjusted ? "Edit" : editLabel}
        </button>
        {isAdjusted && (
          <button
            type="button"
            disabled={saving}
            onClick={() => save(null)}
            className="font-sans text-[0.75rem] text-linen-700 underline hover:text-ink-900 disabled:opacity-50"
          >
            Reset
          </button>
        )}
      </div>
    </li>
  );
}
