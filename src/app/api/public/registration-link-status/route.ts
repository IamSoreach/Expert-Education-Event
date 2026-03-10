import { getEnv } from "@/lib/env";
import { errorJson, noStoreHeaders, tooManyRequestsJson } from "@/lib/http";
import { createRequestId, logger } from "@/lib/logger";
import { createRateLimitHeaders, createRateLimitKey, consumeRateLimit } from "@/lib/rate-limit";
import { getRequestIdentifier } from "@/lib/request";
import { registrationStatusQuerySchema } from "@/lib/validation/registration";
import { getRegistrationStatusView } from "@/server/registration-flow";

export async function GET(req: Request): Promise<Response> {
  const requestId = createRequestId();
  const env = getEnv();
  const requestKey = createRateLimitKey("registration_link_status", getRequestIdentifier(req));
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
        status: view.status,
        telegramLinked: view.telegramLinked,
        ticketSent: view.ticketSent,
        tokenConsumed: view.token.consumedAt !== null,
        tokenExpired: new Date(view.token.expiresAt).getTime() <= Date.now(),
      },
      {
        headers: responseHeaders,
      },
    );
  } catch (error) {
    logger.error("registration_link_status_fetch_failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return errorJson(
      "Unable to load link status right now. Please try again shortly.",
      500,
      undefined,
      responseHeaders,
    );
  }
}
