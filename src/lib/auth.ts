import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { safeEqual, signValue } from "@/lib/crypto";
import { STAFF_SESSION_COOKIE } from "@/lib/constants";

export const STAFF_SESSION_TTL_SECONDS = 60 * 60 * 8;

type StaffSessionPayload = {
  exp: number;
};

function encodePayload(payload: StaffSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(raw: string): StaffSessionPayload | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as StaffSessionPayload;
    if (typeof parsed.exp !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createStaffSessionToken(secret: string, ttlSeconds = STAFF_SESSION_TTL_SECONDS): string {
  const payload: StaffSessionPayload = {
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encodedPayload = encodePayload(payload);
  const signature = signValue(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyStaffSessionToken(token: string | undefined, secret: string): boolean {
  if (!token) {
    return false;
  }

  const [rawPayload, signature] = token.split(".", 2);
  if (!rawPayload || !signature) {
    return false;
  }

  const expectedSignature = signValue(rawPayload, secret);
  if (!safeEqual(signature, expectedSignature)) {
    return false;
  }

  const payload = decodePayload(rawPayload);
  if (!payload) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
}

export function getStaffCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: STAFF_SESSION_TTL_SECONDS,
  };
}

export async function isStaffSessionValid(secret: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  return verifyStaffSessionToken(token, secret);
}

export function isStaffRequestAuthorized(req: NextRequest, secret: string): boolean {
  const token = req.cookies.get(STAFF_SESSION_COOKIE)?.value;
  return verifyStaffSessionToken(token, secret);
}
