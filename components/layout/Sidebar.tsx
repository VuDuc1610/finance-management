"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Net worth" },
  { href: "/spending", label: "Spending" },
  { href: "/cash-flow", label: "Cash flow" },
  { href: "/subscriptions", label: "Subscriptions" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`absolute inset-y-0 left-0 z-20 flex flex-col border-r border-linen-300 bg-linen-100 py-6 shadow-lg transition-[width] duration-200 ${
        collapsed ? "w-16 px-2" : "w-64 px-6"
      }`}
    >
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <span className="font-display text-[1.25rem] text-ink-900">Navbar</span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-linen-700 hover:bg-linen-300/30 hover:text-ink-900"
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={`rounded-card font-sans text-[0.9375rem] ${
                collapsed
                  ? "mx-auto flex h-9 w-9 items-center justify-center text-[0.8125rem]"
                  : "px-3 py-2"
              } ${
                isActive
                  ? "bg-linen-300/40 text-ink-900"
                  : "text-linen-700 hover:bg-linen-300/20 hover:text-ink-900"
              }`}
            >
              {collapsed ? link.label.charAt(0) : link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
