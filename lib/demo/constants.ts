export const DEMO_USER_ID = "demo-00000000-0000-0000-0000-000000000000";

export const DEMO_COOKIE_NAME = "demo_mode";

export const DEMO_COOKIE_VALUE = "1";

export const DEMO_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 4; // 4 hours

/**
 * Client-side check only — reads the (intentionally non-httpOnly) demo
 * cookie so client components like TopBar/AppShell can render demo affordances
 * without needing a server round-trip.
 */
export function isDemoModeClient(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((entry) => entry === `${DEMO_COOKIE_NAME}=${DEMO_COOKIE_VALUE}`);
}
