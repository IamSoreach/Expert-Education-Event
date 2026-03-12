import { z } from "zod";

import { deliverRegistrationConfirmation } from "@/lib/confirmation";
import { getEnv } from "@/lib/env";
import { errorJson, tooManyRequestsJson } from "@/lib/http";
import { createRequestId, logger } from "@/lib/logger";
import { createRateLimitHeaders, createRateLimitKey, consumeRateLimit } from "@/lib/rate-limit";
import { getRequestIdentifier } from "@/lib/request";
import { buildTelegramDeepLink } from "@/lib/telegram";
import { registrationPayloadSchema } from "@/lib/validation/registration";
import { submitRegistration } from "@/server/registration-flow";

const legacyRegistrationSchema = registrationPayloadSchema.omit({
  eventCode: true,
});

export async function POST(req: Request): Promise<Response> {
  const requestId = createRequestId();
  const env = getEnv();
  const requestKey = createRateLimitKey("legacy_register", getRequestIdentifier(req));
  const rateLimit = consumeRateLimit(
    requestKey,
    env.RATE_LIMIT_REGISTER_MAX,
    env.RATE_LIMIT_REGISTER_WINDOW_SECONDS,
  );
  const rateHeaders = {
    ...createRateLimitHeaders(rateLimit),
    "x-request-id": requestId,
  };

  if (!rateLimit.allowed) {
    return tooManyRequestsJson(
      "Too many registration attempts. Please wait and try again.",
      rateLimit.retryAfterSeconds,
      rateHeaders,
    );
  }

  try {
    const payload = await req.json();
    const parsed = legacyRegistrationSchema.safeParse(payload);

    if (!parsed.success) {
      return errorJson("Invalid registration data.", 400, parsed.error.flatten(), rateHeaders);
    }

    const fallbackEventCode = z.string().min(1).parse(env.EVENT_CODE);
    const result = await submitRegistration({
      ...parsed.data,
      eventCode: fallbackEventCode,
    });
    const confirmationDelivery = await deliverRegistrationConfirmation(result.registration.id);

    logger.info("legacy_registration_submitted", {
      requestId,
      registrationId: result.registration.id,
      duplicate: result.duplicate,
      eventCode: fallbackEventCode,
      confirmationDelivery: confirmationDelivery.status,
    });

    return Response.json(
      {
        registrationId: result.registration.id,
        telegramDeepLink: buildTelegramDeepLink(result.linkToken.token),
        telegramLinkExpiresAt: result.linkToken.expiresAt.toISOString(),
        duplicate: result.duplicate,
        confirmationDelivery: confirmationDelivery.status,
      },
      {
        headers: rateHeaders,
      },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorJson("Invalid request body.", 400, undefined, rateHeaders);
    }

    logger.error("legacy_registration_failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return errorJson(
      "Unable to create registration right now. Please try again shortly.",
      500,
      undefined,
      rateHeaders,
    );
  }
}
