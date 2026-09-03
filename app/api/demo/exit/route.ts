import { NextRequest, NextResponse } from "next/server";
import { DEMO_COOKIE_NAME } from "@/lib/demo/constants";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(DEMO_COOKIE_NAME);
  return response;
}
