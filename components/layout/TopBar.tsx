"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function TopBar() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-linen-300 px-8 py-6 md:px-14">
      <span className="font-display text-[1.5rem] text-ink-900">Finance Management</span>
      <div className="flex items-center gap-5">
        {user ? (
          <>
            <span className="font-sans text-[1rem] text-linen-700">{user.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-pill border border-dye-indigo px-6 py-2.5 font-sans text-[1rem] text-dye-indigo hover:bg-dye-indigo/10"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/auth"
              className="font-sans text-[1rem] text-linen-700 hover:text-ink-900"
            >
              Log in
            </Link>
            <Link
              href="/auth"
              className="rounded-pill border border-dye-indigo px-6 py-2.5 font-sans text-[1rem] text-dye-indigo hover:bg-dye-indigo/10"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
