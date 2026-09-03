import { NextRequest, NextResponse } from "next/server";
import {
  DEMO_COOKIE_MAX_AGE_SECONDS,
  DEMO_COOKIE_NAME,
  DEMO_COOKIE_VALUE,
} from "@/lib/demo/constants";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/home", request.url));
  response.cookies.set(DEMO_COOKIE_NAME, DEMO_COOKIE_VALUE, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: DEMO_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
