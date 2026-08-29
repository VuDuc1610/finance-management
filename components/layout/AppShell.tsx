"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { AdvisorChat } from "@/components/chat/AdvisorChat";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto border-t border-linen-300">
          {children}
        </div>
      </div>
      <AdvisorChat />
    </div>
  );
}
