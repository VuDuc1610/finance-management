"use client";

import { useState } from "react";
import type { SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-4h2v4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function NetWorthIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7" />
    </svg>
  );
}

function SpendingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v9l6 3" />
    </svg>
  );
}

function TransactionsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="14" y2="17" />
    </svg>
  );
}

function CashFlowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

function AnalyticsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="6" y="12" width="3" height="8" />
      <rect x="11" y="7" width="3" height="13" />
      <rect x="16" y="3" width="3" height="17" />
    </svg>
  );
}

function SubscriptionsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M7 14h4" />
    </svg>
  );
}

function ManageAccountsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const links = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/networth", label: "Net worth", Icon: NetWorthIcon },
  { href: "/spending", label: "Spending", Icon: SpendingIcon },
  { href: "/transactions", label: "Transactions", Icon: TransactionsIcon },
  { href: "/cash-flow", label: "Cash flow", Icon: CashFlowIcon },
  { href: "/analytics", label: "Analytics", Icon: AnalyticsIcon },
  { href: "/subscriptions", label: "Subscriptions", Icon: SubscriptionsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex shrink-0 flex-col overflow-y-auto border-r border-linen-300 bg-linen-100 py-6 shadow-lg transition-[width] duration-200 ${
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
              className={`flex items-center rounded-card font-sans text-[0.9375rem] ${
                collapsed ? "mx-auto h-9 w-9 justify-center" : "gap-3 px-3 py-2"
              } ${
                isActive
                  ? "bg-dye-indigo/10 text-dye-indigo"
                  : "text-linen-700 hover:bg-linen-300/20 hover:text-ink-900"
              }`}
            >
              <link.Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
              {!collapsed && link.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/manage-accounts"
        title={collapsed ? "Manage accounts" : undefined}
        className={`mt-auto flex items-center rounded-card font-sans text-[0.9375rem] ${
          collapsed ? "mx-auto h-9 w-9 justify-center" : "gap-3 px-3 py-2"
        } ${
          pathname === "/manage-accounts"
            ? "bg-dye-indigo/10 text-dye-indigo"
            : "text-linen-700 hover:bg-linen-300/20 hover:text-ink-900"
        }`}
      >
        <ManageAccountsIcon className="h-[1.125rem] w-[1.125rem] shrink-0" />
        {!collapsed && "Manage accounts"}
      </Link>
    </aside>
  );
}
