import { RegistrationStatus } from "@prisma/client";

import { getEnv } from "@/lib/env";
import { errorJson, tooManyRequestsJson } from "@/lib/http";
import { createRequestId, logger } from "@/lib/logger";
import { createRateLimitHeaders, createRateLimitKey, consumeRateLimit } from "@/lib/rate-limit";
import { linkRegistrationToTelegramFromMiniApp } from "@/lib/registrations";
import { getRequestIdentifier } from "@/lib/request";
import { buildTelegramDeepLink } from "@/lib/telegram";
import { verifyTelegramWebAppInitData } from "@/lib/telegram-webapp";
import { deliverTicketToTelegram, deliverTicketToTelegramChat } from "@/lib/ticketing";
import { registrationPayloadSchema } from "@/lib/validation/registration";
import {
  EventUnavailableError,
  InvalidPhoneNumberError,
  submitRegistration,
} from "@/server/registration-flow";

type MiniAppRegistrationState = {
  detected: boolean;
  verified: boolean;
  linked: boolean;
  ticketDelivery: "not_attempted" | "sent" | "already_sent" | "failed";
  message: string | null;
};

export async function POST(req: Request): Promise<Response> {
  const requestId = createRequestId();
  const env = getEnv();
  const requestKey = createRateLimitKey("public_register", getRequestIdentifier(req));
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
    logger.warn("registration_rate_limited", {
      requestId,
      identifier: getRequestIdentifier(req),
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return tooManyRequestsJson(
      "Too many registration attempts. Please wait and try again.",
      rateLimit.retryAfterSeconds,
      rateHeaders,
    );
  }

  try {
    const payload = await req.json();
    const parsed = registrationPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      return errorJson(
        "Please check the highlighted fields and try again.",
        400,
        parsed.error.flatten(),
        rateHeaders,
      );
    }

    const result = await submitRegistration(parsed.data);
    let responseStatus = result.registration.status;
    let ticketReady =
      result.registration.status === RegistrationStatus.TICKET_SENT ||
      result.registration.status === RegistrationStatus.CHECKED_IN ||
      result.registration.ticket?.sentAt !== null;
    let miniApp: MiniAppRegistrationState | null = null;

    const initData = parsed.data.telegramWebAppInitData?.trim();
    if (initData) {
      miniApp = {
        detected: true,
        verified: false,
        linked: false,
        ticketDelivery: "not_attempted",
        message: null,
      };

      try {
        const verified = verifyTelegramWebAppInitData(
          initData,
          env.TELEGRAM_BOT_TOKEN,
          env.TELEGRAM_WEBAPP_AUTH_MAX_AGE_SECONDS,
        );

        if (!verified?.user?.id) {
          miniApp.message =
            "Telegram session could not be verified automatically. Use the connect button on confirmation.";
        } else {
          miniApp.verified = true;
          const linkResult = await linkRegistrationToTelegramFromMiniApp(
            result.registration.id,
            verified.user,
          );

          if (linkResult.status === "linked" || linkResult.status === "already_linked") {
            miniApp.linked = true;
            responseStatus = linkResult.registration.status;

            try {
              const delivery = await deliverTicketToTelegram(result.registration.id);
              if (delivery.status === "sent") {
                miniApp.ticketDelivery = "sent";
              } else {
                miniApp.ticketDelivery = "already_sent";
                miniApp.message = "You already have a QR code in this Telegram chat. No new ticket was sent.";
              }
              ticketReady = true;
            } catch (deliveryError) {
              miniApp.ticketDelivery = "failed";
              miniApp.message =
                "Telegram was verified, but automatic ticket sending failed. Use the connect button to retry.";
              logger.error("mini_app_ticket_delivery_failed", {
                requestId,
                registrationId: result.registration.id,
                error: deliveryError instanceof Error ? deliveryError.message : String(deliveryError),
              });
            }
          } else if (
            linkResult.status === "already_linked_other_user" ||
            linkResult.status === "telegram_in_use"
          ) {
            try {
              const delivery = await deliverTicketToTelegramChat(
                result.registration.id,
                String(verified.user.id),
              );
              miniApp.ticketDelivery = delivery.status === "sent" ? "sent" : "already_sent";
              miniApp.message =
                linkResult.status === "telegram_in_use"
                  ? "Ticket was sent to this chat, but Telegram account remains linked to a previous registration."
                  : "Ticket was sent to this chat, but this registration remains linked to a different Telegram account.";
              ticketReady = true;
            } catch (deliveryError) {
              miniApp.ticketDelivery = "failed";
              miniApp.message =
                "Telegram was verified, but automatic ticket sending failed. Use /checkin in the bot to retry.";
              logger.error("mini_app_ticket_delivery_failed_conflict_fallback", {
                requestId,
                registrationId: result.registration.id,
                linkStatus: linkResult.status,
                error: deliveryError instanceof Error ? deliveryError.message : String(deliveryError),
              });
            }
          } else {
            miniApp.message =
              "Telegram session could not be matched automatically. Use the connect button on confirmation.";
          }
        }
      } catch (miniAppError) {
        miniApp.message =
          "Could not complete Telegram Mini App linking automatically. Use the connect button on confirmation.";
        logger.error("mini_app_registration_flow_failed", {
          requestId,
          registrationId: result.registration.id,
          error: miniAppError instanceof Error ? miniAppError.message : String(miniAppError),
        });
      }
    }

    logger.info("registration_submitted", {
      requestId,
      registrationId: result.registration.id,
      eventCode: result.registration.event.code,
      duplicate: result.duplicate,
      miniAppDetected: Boolean(miniApp?.detected),
      miniAppVerified: Boolean(miniApp?.verified),
      miniAppLinked: Boolean(miniApp?.linked),
    });

    return Response.json(
      {
        registrationId: result.registration.id,
        eventCode: result.registration.event.code,
        status: responseStatus,
        duplicate: result.duplicate,
        telegram: {
          token: result.linkToken.token,
          deepLink: buildTelegramDeepLink(result.linkToken.token),
          expiresAt: result.linkToken.expiresAt.toISOString(),
        },
        participant: {
          fullName: result.registration.participant.fullName,
          phoneNumber: result.registration.participant.phoneNumber,
          email: result.registration.participant.email,
          organization: result.registration.participant.organization,
          notes: result.registration.participant.notes,
        },
        ticketReady,
        miniApp,
      },
      {
        headers: rateHeaders,
      },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorJson("Invalid request body.", 400, undefined, rateHeaders);
    }

    if (error instanceof EventUnavailableError) {
      logger.warn("registration_event_unavailable", { requestId, message: error.message });
      return errorJson(error.message, 404, undefined, rateHeaders);
    }

    if (error instanceof InvalidPhoneNumberError) {
      logger.warn("registration_invalid_phone", { requestId });
      return errorJson(error.message, 400, undefined, rateHeaders);
    }

    logger.error("registration_submit_failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return errorJson(
      "Unable to complete registration right now. Please try again in a moment.",
      500,
      undefined,
      rateHeaders,
    );
  }
}
