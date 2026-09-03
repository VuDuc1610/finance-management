import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEMO_COOKIE_NAME, DEMO_COOKIE_VALUE, DEMO_USER_ID } from "@/lib/demo/constants";

export interface CurrentUser {
  id: string;
  displayName: string;
  isDemo: boolean;
}

/**
 * Resolves the acting user for a page or API route. Checks the demo cookie
 * first so demo visitors never touch Supabase or need a real session; every
 * lib/*.ts data query then runs unchanged against the seeded demo user's rows.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_COOKIE_NAME)?.value === DEMO_COOKIE_VALUE) {
    return { id: DEMO_USER_ID, displayName: "Demo Explorer", isDemo: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    displayName: user.user_metadata?.full_name || user.email || "there",
    isDemo: false,
  };
}
