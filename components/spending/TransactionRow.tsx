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

  const leftContent = (
    <div className="flex min-w-0 items-center gap-3">
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
      <span className="truncate font-sans text-[0.875rem] text-ink-900">{name}</span>
      {categoryLabel && (
        <span className="shrink-0 font-sans text-[0.75rem] text-linen-700">
          {categoryLabel}
        </span>
      )}
      {pending && (
        <span className="shrink-0 rounded-pill border border-linen-300 px-2 py-0.5 font-sans text-[0.6875rem] text-linen-700">
          Pending
        </span>
      )}
      {isAdjusted && !editing && (
        <span className="shrink-0 rounded-pill border border-dye-saffron px-2 py-0.5 font-sans text-[0.6875rem] text-dye-saffron">
          Adjusted
        </span>
      )}
    </div>
  );

  if (editing) {
    return (
      <li className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        {leftContent}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="font-mono text-[0.6875rem] text-linen-700">
            of {currency.format(originalAmount)}
          </span>
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-16 rounded-md border border-linen-300 bg-linen-100 px-1.5 py-0.5 text-right font-mono text-[0.8125rem] text-ink-900"
            autoFocus
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => save(Number(value))}
            aria-label="Save"
            title={fullAmountLabel}
            className="flex h-6 w-6 items-center justify-center rounded-full text-dye-indigo hover:bg-dye-indigo/10 disabled:opacity-50"
          >
            ✓
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => setEditing(false)}
            aria-label="Cancel"
            className="flex h-6 w-6 items-center justify-center rounded-full text-linen-700 hover:bg-linen-300/30 disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      {leftContent}
      <div className="flex shrink-0 items-center gap-2">
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
