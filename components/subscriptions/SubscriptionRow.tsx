"use client";

import { useEffect, useRef, useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const badge = getDueBadge(item.dueDate);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  async function remove() {
    setSaving(true);
    try {
      await fetch(`/api/transactions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billKind: null, dueDate: null }),
      });
      router.refresh();
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
            <div ref={menuRef} className="relative">
              <button
                type="button"
                disabled={saving}
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Subscription actions"
                className="flex h-6 w-6 items-center justify-center rounded-full text-linen-700 hover:bg-linen-300/30 hover:text-ink-900 disabled:opacity-50"
              >
                ⋮
              </button>
              {menuOpen && (
                <ul className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-card border border-linen-300 bg-linen-100 py-1">
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setEditing(true);
                      }}
                      className="block w-full px-3 py-1.5 text-left font-sans text-[0.75rem] text-linen-700 hover:bg-linen-300/30 hover:text-ink-900"
                    >
                      Edit due date
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        remove();
                      }}
                      className="block w-full px-3 py-1.5 text-left font-sans text-[0.75rem] text-dye-madder hover:bg-linen-300/30"
                    >
                      Remove
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </>
        )}
        <span className="font-mono text-[0.9375rem] font-medium text-ink-900">
          {currency.format(item.amount)}
        </span>
      </div>
    </div>
  );
}
