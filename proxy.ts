import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { DEMO_COOKIE_NAME, DEMO_COOKIE_VALUE } from "@/lib/demo/constants";

const PUBLIC_PAGE_PATHS = new Set(["/", "/auth"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/cron/") || pathname.startsWith("/api/demo/")) {
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicPage = PUBLIC_PAGE_PATHS.has(pathname);
  const isDemo = request.cookies.get(DEMO_COOKIE_NAME)?.value === DEMO_COOKIE_VALUE;
  const isAuthenticated = Boolean(user) || isDemo;

  if (!isAuthenticated) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isPublicPage) {
      const redirect = NextResponse.redirect(new URL("/auth", request.url));
      supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }
    return supabaseResponse;
  }

  if (pathname === "/auth") {
    const redirect = NextResponse.redirect(new URL("/home", request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
