import { getEnv } from "@/lib/env";
import { errorJson, noStoreHeaders, tooManyRequestsJson } from "@/lib/http";
import { createRequestId, logger } from "@/lib/logger";
import { createRateLimitHeaders, createRateLimitKey, consumeRateLimit } from "@/lib/rate-limit";
import { getRequestIdentifier } from "@/lib/request";
import { registrationStatusQuerySchema } from "@/lib/validation/registration";
import { buildTelegramDeepLink } from "@/lib/telegram";
import { getRegistrationStatusView } from "@/server/registration-flow";

export async function GET(req: Request): Promise<Response> {
  const requestId = createRequestId();
  const env = getEnv();
  const requestKey = createRateLimitKey("registration_status", getRequestIdentifier(req));
  const rateLimit = consumeRateLimit(
    requestKey,
    env.RATE_LIMIT_REGISTRATION_STATUS_MAX,
    env.RATE_LIMIT_REGISTRATION_STATUS_WINDOW_SECONDS,
  );
  const responseHeaders = noStoreHeaders({
    ...createRateLimitHeaders(rateLimit),
    "x-request-id": requestId,
  });

  if (!rateLimit.allowed) {
    return tooManyRequestsJson(
      "Too many status checks. Please wait a moment and try again.",
      rateLimit.retryAfterSeconds,
      responseHeaders,
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = registrationStatusQuerySchema.safeParse({
    registrationId: searchParams.get("registrationId") ?? "",
    token: searchParams.get("token") ?? "",
  });

  if (!parsed.success) {
    return errorJson("Invalid status query.", 400, undefined, responseHeaders);
  }

  try {
    const view = await getRegistrationStatusView(
      parsed.data.registrationId,
      parsed.data.token,
    );

    if (!view) {
      return errorJson("Registration record not found.", 404, undefined, responseHeaders);
    }

    return Response.json(
      {
        registrationId: view.registrationId,
        eventCode: view.eventCode,
        eventName: view.eventName,
        status: view.status,
        participant: view.participant,
        telegramLinked: view.telegramLinked,
        ticketSent: view.ticketSent,
        telegram: {
          token: view.token.value,
          deepLink: buildTelegramDeepLink(view.token.value),
          tokenExpiresAt: view.token.expiresAt,
          tokenConsumedAt: view.token.consumedAt,
        },
      },
      {
        headers: responseHeaders,
      },
    );
  } catch (error) {
    logger.error("registration_status_fetch_failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return errorJson(
      "Unable to load registration status right now. Please try again shortly.",
      500,
      undefined,
      responseHeaders,
    );
  }
}
