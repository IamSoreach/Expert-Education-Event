import { getEnv } from "@/lib/env";
import { tooManyRequestsJson } from "@/lib/http";
import { createRequestId, logger } from "@/lib/logger";
import { createRateLimitHeaders, createRateLimitKey, consumeRateLimit } from "@/lib/rate-limit";
import { getRequestIdentifier } from "@/lib/request";
import { linkRegistrationToTelegram } from "@/lib/registrations";
import {
  buildTelegramMiniAppHomeUrl,
  buildTelegramMiniAppTicketUrl,
  extractTelegramCommand,
  extractStartToken,
  sendTelegramMessage,
  TelegramUpdate,
} from "@/lib/telegram";
import { deliverTicketToTelegram } from "@/lib/ticketing";

export const runtime = "nodejs";

function unauthorizedResponse(): Response {
  return Response.json({ error: "Unauthorized webhook call." }, { status: 401 });
}

export async function POST(req: Request): Promise<Response> {
  const requestId = createRequestId();
  const env = getEnv();
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");

  if (!secretHeader || secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
    logger.warn("telegram_webhook_unauthorized", {
      requestId,
      identifier: getRequestIdentifier(req),
    });
    return unauthorizedResponse();
  }

  const requestKey = createRateLimitKey("telegram_webhook", getRequestIdentifier(req));
  const rateLimit = consumeRateLimit(
    requestKey,
    env.RATE_LIMIT_TELEGRAM_WEBHOOK_MAX,
    env.RATE_LIMIT_TELEGRAM_WEBHOOK_WINDOW_SECONDS,
  );
  if (!rateLimit.allowed) {
    logger.warn("telegram_webhook_rate_limited", {
      requestId,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return tooManyRequestsJson(
      "Too many Telegram webhook calls. Please retry shortly.",
      rateLimit.retryAfterSeconds,
      createRateLimitHeaders(rateLimit),
    );
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch (error) {
    logger.warn("telegram_webhook_invalid_json", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ ok: true });
  }

  const message = update.message;
  if (!message?.chat?.id) {
    return Response.json({ ok: true });
  }

  const command = extractTelegramCommand(message.text);
  if (command === "register" || command === "open" || command === "home") {
    const miniAppHomeUrl = buildTelegramMiniAppHomeUrl();
    await sendTelegramMessage(
      message.chat.id,
      `Open the event landing page to continue.\n\n${miniAppHomeUrl}`,
      {
        disableWebPagePreview: true,
        replyMarkup: {
          inline_keyboard: [
            [
              {
                text: "Open Event Landing",
                web_app: {
                  url: miniAppHomeUrl,
                },
              },
            ],
          ],
        },
      },
    );

    logger.info("telegram_webhook_register_command", {
      requestId,
      chatId: message.chat.id,
      command,
    });
    return Response.json({ ok: true });
  }

  if (command === "checkin" || command === "ticket" || command === "myticket") {
    const miniAppUrl = buildTelegramMiniAppTicketUrl();
    await sendTelegramMessage(
      message.chat.id,
      `Open the ticket page, enter your phone number, and we will send your QR ticket in this chat.\n\n${miniAppUrl}`,
      {
        disableWebPagePreview: true,
        replyMarkup: {
          inline_keyboard: [
            [
              {
                text: "Open Ticket Page",
                web_app: {
                  url: miniAppUrl,
                },
              },
            ],
          ],
        },
      },
    );

    logger.info("telegram_webhook_ticket_command", {
      requestId,
      chatId: message.chat.id,
      command,
    });
    return Response.json({ ok: true });
  }

  const startToken = extractStartToken(message.text);
  if (startToken === null) {
    return Response.json({ ok: true });
  }

  if (startToken.length === 0) {
    const miniAppHomeUrl = buildTelegramMiniAppHomeUrl();
    await sendTelegramMessage(
      message.chat.id,
      "Please open the event landing page to register or continue. If you already registered, send /checkin to request your ticket by phone number.",
      {
        disableWebPagePreview: true,
        replyMarkup: {
          inline_keyboard: [
            [
              {
                text: "Open Event Landing",
                web_app: {
                  url: miniAppHomeUrl,
                },
              },
            ],
          ],
        },
      },
    );
    return Response.json({ ok: true });
  }

  try {
    const linkResult = await linkRegistrationToTelegram(startToken, message.from, message.chat.id);
    let shouldTryTicketDelivery = false;

    switch (linkResult.status) {
      case "missing_token":
      case "invalid_token":
        await sendTelegramMessage(
          message.chat.id,
          "This link is invalid. Please return to the registration page and request a new Telegram link.",
        );
        return Response.json({ ok: true });
      case "expired_token":
        await sendTelegramMessage(
          message.chat.id,
          "This Telegram connection link has expired. Please register again to receive a new link.",
        );
        return Response.json({ ok: true });
      case "token_consumed":
        await sendTelegramMessage(
          message.chat.id,
          "This link has already been used. Please open your registration page if you need a fresh link.",
        );
        return Response.json({ ok: true });
      case "already_linked":
        await sendTelegramMessage(
          message.chat.id,
          "Your Telegram account is already linked for this registration. Checking your ticket now...",
        );
        shouldTryTicketDelivery = true;
        break;
      case "already_linked_other_user":
        await sendTelegramMessage(
          message.chat.id,
          "This registration is already linked to another Telegram account.",
        );
        return Response.json({ ok: true });
      case "telegram_in_use":
        await sendTelegramMessage(
          message.chat.id,
          "This Telegram account is already linked to another registration.",
        );
        return Response.json({ ok: true });
      case "linked":
        shouldTryTicketDelivery = true;
        break;
      default:
        return Response.json({ ok: true });
    }

    if (linkResult.status === "linked") {
      await sendTelegramMessage(
        message.chat.id,
        "Telegram linked successfully. Generating your QR ticket now...",
      );
    }

    if (shouldTryTicketDelivery) {
      try {
        const delivery = await deliverTicketToTelegram(linkResult.registration.id);
        if (delivery.status === "already_sent") {
          await sendTelegramMessage(
            message.chat.id,
            "Your ticket was already sent earlier in this chat.",
          );
        } else {
          await sendTelegramMessage(
            message.chat.id,
            "Ticket sent. Please keep this chat open so you can show your QR at check-in.",
          );
        }
      } catch (error) {
        await sendTelegramMessage(
          message.chat.id,
          "Telegram was linked, but ticket delivery failed. Please contact support.",
        );
        logger.error("telegram_ticket_delivery_failed", {
          requestId,
          error: error instanceof Error ? error.message : String(error),
          chatId: message.chat.id,
        });
      }
    }

    logger.info("telegram_webhook_processed", {
      requestId,
      chatId: message.chat.id,
      startTokenUsed: startToken.length > 0,
    });
    return Response.json({ ok: true });
  } catch (error) {
    logger.error("telegram_webhook_failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      chatId: message.chat.id,
    });
    return Response.json({ ok: false }, { status: 500 });
  }
}
