import { NextRequest, NextResponse } from "next/server";

import { STAFF_SESSION_COOKIE } from "@/lib/constants";

export function middleware(req: NextRequest): NextResponse {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/staff/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/staff")) {
    const token = req.cookies.get(STAFF_SESSION_COOKIE)?.value;
    if (!token) {
      const loginUrl = new URL("/staff/login", req.url);
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*"],
};
