import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isStaffRequestAuthorized } from "@/lib/auth";
import { checkInByScanInput, getRecentScanLogs } from "@/lib/checkin";
import { getEnv } from "@/lib/env";
import { errorJson, tooManyRequestsJson } from "@/lib/http";
import { createRequestId, logger } from "@/lib/logger";
import { createRateLimitHeaders, createRateLimitKey, consumeRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request";

const checkInSchema = z.object({
  scanInput: z.string().min(1).max(2048),
  operatorLabel: z.string().max(120).optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function enforceRateLimit(req: NextRequest, env: ReturnType<typeof getEnv>, requestId: string): Response | null {
  const identifier = getRequestIp(req) ?? "unknown";
  const requestKey = createRateLimitKey("staff_checkin", identifier);
  const rateLimit = consumeRateLimit(
    requestKey,
    env.RATE_LIMIT_STAFF_CHECKIN_MAX,
    env.RATE_LIMIT_STAFF_CHECKIN_WINDOW_SECONDS,
  );
  if (rateLimit.allowed) {
    return null;
  }

  const headers = {
    ...createRateLimitHeaders(rateLimit),
    "x-request-id": requestId,
  };
  return tooManyRequestsJson(
    "Too many scan requests. Please wait and try again.",
    rateLimit.retryAfterSeconds,
    headers,
  );
}

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = createRequestId();
  const env = getEnv();
  if (!isStaffRequestAuthorized(req, env.STAFF_AUTH_SECRET)) {
    return unauthorized();
  }

  const limitedResponse = enforceRateLimit(req, env, requestId);
  if (limitedResponse) {
    return limitedResponse;
  }

  try {
    const logs = await getRecentScanLogs(100);
    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        status: log.result,
        reason: log.notes,
        attemptedAt: log.scannedAt.toISOString(),
        scannerName: log.operatorLabel,
        attemptedValue: log.scannedCode,
        registrationName: log.ticket?.registration.participant.fullName ?? null,
        registrationEmail: log.ticket?.registration.participant.email ?? null,
        eventName: log.ticket?.registration.event.name ?? null,
        eventCode: log.ticket?.registration.event.code ?? null,
        ticketCode: log.ticket?.ticketCode ?? null,
        checkedInAt: log.ticket?.checkedInAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    logger.error("staff_checkin_logs_failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return errorJson("Unable to load scan logs right now.", 500);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = createRequestId();
  const env = getEnv();
  if (!isStaffRequestAuthorized(req, env.STAFF_AUTH_SECRET)) {
    return unauthorized();
  }

  const limitedResponse = enforceRateLimit(req, env, requestId);
  if (limitedResponse) {
    return limitedResponse;
  }

  try {
    const payload = await req.json();
    const parsed = checkInSchema.safeParse(payload);
    if (!parsed.success) {
      return errorJson("Invalid scan payload.", 400);
    }

    const result = await checkInByScanInput({
      scanInput: parsed.data.scanInput,
      operatorLabel: parsed.data.operatorLabel,
      deviceLabel: getRequestIp(req),
    });

    logger.info("staff_checkin_attempt", {
      requestId,
      status: result.status,
      operatorLabel: parsed.data.operatorLabel ?? null,
      ticketCode: result.participant?.ticketCode ?? null,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorJson("Invalid request body.", 400);
    }

    logger.error("staff_checkin_failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return errorJson("Check-in failed. Please try again.", 500);
  }
}
