import { RegistrationStatus } from "@prisma/client";

import { getEnv } from "@/lib/env";
import { errorJson, tooManyRequestsJson } from "@/lib/http";
import { createRequestId, logger } from "@/lib/logger";
import {
  buildPhoneLookupCandidates,
  isReasonablePhoneNumber,
  normalizePhoneNumber,
} from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { createRateLimitHeaders, createRateLimitKey, consumeRateLimit } from "@/lib/rate-limit";
import { linkRegistrationToTelegramFromMiniApp } from "@/lib/registrations";
import { getRequestIdentifier } from "@/lib/request";
import { verifyTelegramWebAppInitData } from "@/lib/telegram-webapp";
import { deliverTicketToTelegram, resendExistingTicketToTelegram } from "@/lib/ticketing";
import { telegramTicketLookupPayloadSchema } from "@/lib/validation/telegram-ticket";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const requestId = createRequestId();
  const env = getEnv();
  const requestKey = createRateLimitKey("telegram_miniapp_ticket", getRequestIdentifier(req));
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
      "Too many attempts. Please wait and try again.",
      rateLimit.retryAfterSeconds,
      rateHeaders,
    );
  }

  try {
    const payload = await req.json();
    const parsed = telegramTicketLookupPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return errorJson(
        "Please enter a valid phone number.",
        400,
        parsed.error.flatten(),
        rateHeaders,
      );
    }

    const verified = verifyTelegramWebAppInitData(
      parsed.data.telegramWebAppInitData,
      env.TELEGRAM_BOT_TOKEN,
      env.TELEGRAM_WEBAPP_AUTH_MAX_AGE_SECONDS,
    );
    if (!verified?.user?.id) {
      return errorJson("Telegram session verification failed. Please reopen from Telegram.", 401, undefined, rateHeaders);
    }

    const normalizedPhone = normalizePhoneNumber(parsed.data.phoneNumber);
    if (!isReasonablePhoneNumber(normalizedPhone)) {
      return errorJson("Please enter a valid phone number.", 400, undefined, rateHeaders);
    }

    const phoneCandidates = buildPhoneLookupCandidates(parsed.data.phoneNumber);
    const registration = await prisma.registration.findFirst({
      where: {
        status: {
          not: RegistrationStatus.CANCELLED,
        },
        event: {
          code: parsed.data.eventCode,
        },
        participant: {
          phoneNumber: {
            in: phoneCandidates.length > 0 ? phoneCandidates : [normalizedPhone],
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        participant: true,
        event: true,
        ticket: true,
      },
    });

    if (!registration) {
      logger.warn("miniapp_ticket_lookup_not_found", {
        requestId,
        eventCode: parsed.data.eventCode,
        normalizedPhone,
        phoneCandidates,
      });
      return errorJson(
        "No registration was found for that phone number in this event.",
        404,
        undefined,
        rateHeaders,
      );
    }

    const linkResult = await linkRegistrationToTelegramFromMiniApp(registration.id, verified.user);
    if (linkResult.status === "already_linked_other_user") {
      return errorJson(
        "This registration is already linked to another Telegram account.",
        409,
        undefined,
        rateHeaders,
      );
    }

    if (linkResult.status === "telegram_in_use") {
      return errorJson(
        "This Telegram account is already linked to another registration.",
        409,
        undefined,
        rateHeaders,
      );
    }

    if (linkResult.status === "invalid_registration" || linkResult.status === "invalid_user") {
      return errorJson("Could not process this request.", 400, undefined, rateHeaders);
    }

    const delivery = await deliverTicketToTelegram(registration.id);
    let ticketDelivery: "sent" | "resent";
    let ticketCode: string;

    if (delivery.status === "already_sent") {
      const resent = await resendExistingTicketToTelegram(registration.id);
      ticketDelivery = "resent";
      ticketCode = resent.ticketCode;
    } else {
      ticketDelivery = "sent";
      ticketCode = delivery.ticket.ticketCode;
    }

    logger.info("miniapp_ticket_lookup_success", {
      requestId,
      registrationId: registration.id,
      eventCode: parsed.data.eventCode,
      ticketDelivery,
    });

    return Response.json(
      {
        ok: true,
        registrationId: registration.id,
        eventCode: registration.event.code,
        eventName: registration.event.name,
        participantName: registration.participant.fullName,
        ticketCode,
        ticketDelivery,
        message:
          ticketDelivery === "sent"
            ? "Your ticket was sent in this chat."
            : "Your existing ticket was re-sent in this chat.",
      },
      { headers: rateHeaders },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorJson("Invalid request body.", 400, undefined, rateHeaders);
    }

    logger.error("miniapp_ticket_lookup_failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return errorJson(
      "Could not send your ticket right now. Please try again shortly.",
      500,
      undefined,
      rateHeaders,
    );
  }
}
