"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Net worth" },
  { href: "/spending", label: "Spending" },
  { href: "/cash-flow", label: "Cash flow" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-linen-300">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-10 lg:px-16">
        <span className="font-display text-[1.25rem] text-ink-900">
          zen linen
        </span>
        <nav className="flex gap-5">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-sans text-[0.9375rem] ${
                  isActive ? "text-ink-900" : "text-linen-700 hover:text-ink-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
