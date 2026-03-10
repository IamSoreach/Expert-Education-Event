import { z } from "zod";
import { NextResponse } from "next/server";

import {
  createStaffSessionToken,
  getStaffCookieOptions,
} from "@/lib/auth";
import { STAFF_SESSION_COOKIE } from "@/lib/constants";
import { safeEqual } from "@/lib/crypto";
import { getEnv } from "@/lib/env";
import { errorJson, tooManyRequestsJson } from "@/lib/http";
import { createRequestId, logger } from "@/lib/logger";
import { createRateLimitHeaders, createRateLimitKey, consumeRateLimit } from "@/lib/rate-limit";
import { getRequestIdentifier } from "@/lib/request";

const loginSchema = z.object({
  password: z.string().min(1),
});

export async function POST(req: Request): Promise<Response> {
  const requestId = createRequestId();
  const env = getEnv();
  const requestKey = createRateLimitKey("staff_login", getRequestIdentifier(req));
  const rateLimit = consumeRateLimit(
    requestKey,
    env.RATE_LIMIT_STAFF_LOGIN_MAX,
    env.RATE_LIMIT_STAFF_LOGIN_WINDOW_SECONDS,
  );
  const rateHeaders = {
    ...createRateLimitHeaders(rateLimit),
    "x-request-id": requestId,
  };

  if (!rateLimit.allowed) {
    logger.warn("staff_login_rate_limited", {
      requestId,
      identifier: getRequestIdentifier(req),
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return tooManyRequestsJson(
      "Too many login attempts. Please wait and try again.",
      rateLimit.retryAfterSeconds,
      rateHeaders,
    );
  }

  try {
    const payload = await req.json();
    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      return errorJson("Password is required.", 400, undefined, rateHeaders);
    }

    const supplied = parsed.data.password;
    if (!safeEqual(supplied, env.STAFF_PASSWORD)) {
      logger.warn("staff_login_failed", {
        requestId,
        identifier: getRequestIdentifier(req),
      });
      return errorJson("Invalid credentials.", 401, undefined, rateHeaders);
    }

    const token = createStaffSessionToken(env.STAFF_AUTH_SECRET);
    const response = NextResponse.json({ ok: true });
    Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, String(value)));
    response.cookies.set(STAFF_SESSION_COOKIE, token, getStaffCookieOptions());
    logger.info("staff_login_success", {
      requestId,
      identifier: getRequestIdentifier(req),
    });
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorJson("Invalid request body.", 400, undefined, rateHeaders);
    }

    logger.error("staff_login_error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return errorJson("Login failed. Please try again.", 500, undefined, rateHeaders);
  }
}
