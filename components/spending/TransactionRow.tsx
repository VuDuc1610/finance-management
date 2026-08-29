"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type BillKind = "subscription" | "bill" | null;

interface TransactionRowProps {
  id: number;
  date: string;
  name: string;
  amount: number;
  originalAmount: number;
  personalAmount: number | null;
  pending: boolean;
  categoryLabel?: string;
  accountLabel?: string;
  color?: string;
  kind?: "expense" | "income";
  billKind?: BillKind;
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
  accountLabel,
  color,
  kind = "expense",
  billKind = null,
}: TransactionRowProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(Math.abs(personalAmount ?? originalAmount).toString());
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAdjusted = personalAmount !== null;
  const sign = kind === "income" ? -1 : 1;
  const splitLabel = kind === "income" ? "Not mine" : "Split amount";
  const fullAmountLabel = kind === "income" ? "Full transfer" : "Full charge";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  async function selectBillKind(next: BillKind) {
    setMenuOpen(false);
    if (next === billKind) return;
    setSaving(true);
    try {
      await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billKind: next,
          ...(next !== null && billKind === null ? { dueDate: date } : {}),
        }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const badges = (
    <>
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
      {billKind && (
        <span className="shrink-0 rounded-pill border border-dye-indigo px-2 py-0.5 font-sans text-[0.6875rem] text-dye-indigo">
          {billKind === "subscription" ? "Subscription" : "Bill"}
        </span>
      )}
    </>
  );

  const accountBadge = accountLabel ? (
    <span
      className={`flex w-fit items-center gap-1.5 rounded-pill border px-2.5 py-1 font-sans text-[0.75rem] ${
        kind === "income"
          ? "border-dye-moss text-dye-moss"
          : "border-dye-madder text-dye-madder"
      }`}
      title={
        kind === "income"
          ? `Money added to ${accountLabel}`
          : `Money taken from ${accountLabel}`
      }
    >
      <span aria-hidden="true">{kind === "income" ? "↓" : "↑"}</span>
      {accountLabel}
    </span>
  ) : null;

  // Table-style layout (used when an account column is shown, e.g. the Transactions page)
  if (accountLabel) {
    return (
      <li className="grid grid-cols-[4.5rem_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-6 py-4 first:pt-0 last:pb-0">
        <span className="font-mono text-[0.8125rem] text-linen-700">
          {formatDate(date)}
        </span>

        <div className="flex min-w-0 items-center gap-2.5">
          {color && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          )}
          <span className="truncate font-sans text-[0.875rem] text-ink-900">
            {name}
          </span>
          {badges}
        </div>

        {categoryLabel ? (
          <span className="font-sans text-[0.8125rem] text-linen-700">
            {categoryLabel}
          </span>
        ) : (
          <span />
        )}

        {accountBadge}

        {editing ? (
          <div className="flex shrink-0 items-center gap-1.5 justify-self-end">
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
        ) : (
          <div className="flex shrink-0 items-center gap-2 justify-self-end">
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
            <div ref={menuRef} className="relative">
              <button
                type="button"
                disabled={saving}
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Transaction actions"
                className="flex h-6 w-6 items-center justify-center rounded-full text-linen-700 hover:bg-linen-300/30 hover:text-ink-900 disabled:opacity-50"
              >
                ⋮
              </button>
              {menuOpen && (
                <ul className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-card border border-linen-300 bg-linen-100 py-1">
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setValue(Math.abs(personalAmount ?? originalAmount).toString());
                        setEditing(true);
                      }}
                      className="block w-full px-3 py-1.5 text-left font-sans text-[0.75rem] text-linen-700 hover:bg-linen-300/30 hover:text-ink-900"
                    >
                      {isAdjusted ? "Edit split" : splitLabel}
                    </button>
                  </li>
                  {isAdjusted && (
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          save(null);
                        }}
                        className="block w-full px-3 py-1.5 text-left font-sans text-[0.75rem] text-linen-700 hover:bg-linen-300/30 hover:text-ink-900"
                      >
                        Reset to full amount
                      </button>
                    </li>
                  )}
                  {kind === "expense" && (
                    <>
                      <li aria-hidden className="my-1 h-px bg-linen-300" />
                      {billKind !== "subscription" && (
                        <li>
                          <button
                            type="button"
                            onClick={() => selectBillKind("subscription")}
                            className="block w-full px-3 py-1.5 text-left font-sans text-[0.75rem] text-linen-700 hover:bg-linen-300/30 hover:text-ink-900"
                          >
                            Tag as Subscription
                          </button>
                        </li>
                      )}
                      {billKind !== "bill" && (
                        <li>
                          <button
                            type="button"
                            onClick={() => selectBillKind("bill")}
                            className="block w-full px-3 py-1.5 text-left font-sans text-[0.75rem] text-linen-700 hover:bg-linen-300/30 hover:text-ink-900"
                          >
                            Tag as Bill
                          </button>
                        </li>
                      )}
                      {billKind !== null && (
                        <li>
                          <button
                            type="button"
                            onClick={() => selectBillKind(null)}
                            className="block w-full px-3 py-1.5 text-left font-sans text-[0.75rem] text-linen-700 hover:bg-linen-300/30 hover:text-ink-900"
                          >
                            Remove tag
                          </button>
                        </li>
                      )}
                    </>
                  )}
                </ul>
              )}
            </div>
          </div>
        )}
      </li>
    );
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
      {badges}
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
        <div ref={menuRef} className="relative">
          <button
            type="button"
            disabled={saving}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Transaction actions"
            className="flex h-6 w-6 items-center justify-center rounded-full text-linen-700 hover:bg-linen-300/30 hover:text-ink-900 disabled:opacity-50"
          >
            ⋮
          </button>
          {menuOpen && (
            <ul className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-card border border-linen-300 bg-linen-100 py-1">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setValue(Math.abs(personalAmount ?? originalAmount).toString());
                    setEditing(true);
                  }}
                  className="block w-full px-3 py-1.5 text-left font-sans text-[0.75rem] text-linen-700 hover:bg-linen-300/30 hover:text-ink-900"
                >
                  {isAdjusted ? "Edit split" : splitLabel}
                </button>
              </li>
              {isAdjusted && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      save(null);
                    }}
                    className="block w-full px-3 py-1.5 text-left font-sans text-[0.75rem] text-linen-700 hover:bg-linen-300/30 hover:text-ink-900"
                  >
                    Reset to full amount
                  </button>
                </li>
              )}
              {kind === "expense" && (
                <>
                  <li aria-hidden className="my-1 h-px bg-linen-300" />
                  {billKind !== "subscription" && (
                    <li>
                      <button
                        type="button"
                        onClick={() => selectBillKind("subscription")}
                        className="block w-full px-3 py-1.5 text-left font-sans text-[0.75rem] text-linen-700 hover:bg-linen-300/30 hover:text-ink-900"
                      >
                        Tag as Subscription
                      </button>
                    </li>
                  )}
                  {billKind !== "bill" && (
                    <li>
                      <button
                        type="button"
                        onClick={() => selectBillKind("bill")}
                        className="block w-full px-3 py-1.5 text-left font-sans text-[0.75rem] text-linen-700 hover:bg-linen-300/30 hover:text-ink-900"
                      >
                        Tag as Bill
                      </button>
                    </li>
                  )}
                  {billKind !== null && (
                    <li>
                      <button
                        type="button"
                        onClick={() => selectBillKind(null)}
                        className="block w-full px-3 py-1.5 text-left font-sans text-[0.75rem] text-linen-700 hover:bg-linen-300/30 hover:text-ink-900"
                      >
                        Remove tag
                      </button>
                    </li>
                  )}
                </>
              )}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}
