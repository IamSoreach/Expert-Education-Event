import { NextResponse } from "next/server";

import { getStaffCookieOptions } from "@/lib/auth";
import { STAFF_SESSION_COOKIE } from "@/lib/constants";

export async function POST(): Promise<Response> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STAFF_SESSION_COOKIE, "", {
    ...getStaffCookieOptions(),
    maxAge: 0,
  });
  return response;
}
