import { readFile } from "fs/promises";
import path from "path";

import { ConfirmationStatus } from "@prisma/client";

import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, sendTelegramPhotoBuffer, sendTelegramPhotoByUrl } from "@/lib/telegram";

type ConfirmationDeliveryStatus = "sent" | "invalid";

export type ConfirmationDeliveryResult = {
  status: ConfirmationDeliveryStatus;
  reason?: "already_sent" | "telegram_not_linked" | "send_failed";
};

function buildConfirmationMessage(
  eventName: string,
  participantName: string,
  participantPhone: string,
): string {
  return [
    "Registration Completed ?",
    "",
    `Event: ${eventName}`,
    `Name: ${participantName}`,
    `Phone: ${participantPhone}`,
  ].join("\n");
}

function buildFloorPlanFilePath(): string {
  return path.join(process.cwd(), "public", "landing", "floor-plan.png");
}

function buildFloorPlanUrl(): string {
  const env = getEnv();
  return `${env.APP_BASE_URL.replace(/\/+$/, "")}/landing/floor-plan.png`;
}

function toErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 191 ? message.slice(0, 191) : message;
}

export async function deliverRegistrationConfirmation(
  registrationId: string,
  options?: {
    preferredChatId?: string | number | null;
  },
): Promise<ConfirmationDeliveryResult> {
  const registration = await prisma.registration.findUnique({
    where: {
      id: registrationId,
    },
    include: {
      event: true,
      participant: true,
    },
  });

  if (!registration) {
    return {
      status: "invalid",
      reason: "send_failed",
    };
  }

  if (registration.confirmationStatus === ConfirmationStatus.SENT) {
    return {
      status: "sent",
      reason: "already_sent",
    };
  }

  const chatId =
    options?.preferredChatId ??
    registration.participant.telegramChatId ??
    registration.participant.telegramUserId;

  if (!chatId) {
    await prisma.registration.update({
      where: {
        id: registration.id,
      },
      data: {
        confirmationStatus: ConfirmationStatus.INVALID,
        confirmationError: "telegram_not_linked",
      },
    });

    logger.info("registration_confirmation_invalid", {
      registrationId: registration.id,
      reason: "telegram_not_linked",
      registrationStatus: registration.status,
    });

    return {
      status: "invalid",
      reason: "telegram_not_linked",
    };
  }

  try {
    await sendTelegramMessage(
      chatId,
      buildConfirmationMessage(
        registration.event.name,
        registration.participant.fullName,
        registration.participant.phoneNumber,
      ),
    );

    let floorPlanSent = false;

    try {
      const floorPlanBuffer = await readFile(buildFloorPlanFilePath());
      await sendTelegramPhotoBuffer(
        chatId,
        floorPlanBuffer,
        "Event floor plan. Please review this before arrival.",
        "floor-plan.png",
      );
      floorPlanSent = true;
    } catch (fileOrBufferError) {
      logger.warn("registration_confirmation_floor_plan_local_failed", {
        registrationId: registration.id,
        error: fileOrBufferError instanceof Error ? fileOrBufferError.message : String(fileOrBufferError),
      });
    }

    if (!floorPlanSent) {
      try {
        await sendTelegramPhotoByUrl(
          chatId,
          buildFloorPlanUrl(),
          "Event floor plan. Please review this before arrival.",
        );
        floorPlanSent = true;
      } catch (urlError) {
        logger.warn("registration_confirmation_floor_plan_url_failed", {
          registrationId: registration.id,
          error: urlError instanceof Error ? urlError.message : String(urlError),
        });
      }
    }

    await prisma.registration.update({
      where: {
        id: registration.id,
      },
      data: {
        confirmationStatus: ConfirmationStatus.SENT,
        confirmationSentAt: new Date(),
        confirmationError: null,
      },
    });

    logger.info("registration_confirmation_sent", {
      registrationId: registration.id,
      registrationStatus: registration.status,
      participantId: registration.participantId,
      eventCode: registration.event.code,
      floorPlanSent,
    });

    return {
      status: "sent",
    };
  } catch (error) {
    const errorMessage = toErrorMessage(error);
    await prisma.registration.update({
      where: {
        id: registration.id,
      },
      data: {
        confirmationStatus: ConfirmationStatus.INVALID,
        confirmationError: errorMessage,
      },
    });

    logger.warn("registration_confirmation_invalid", {
      registrationId: registration.id,
      reason: "send_failed",
      error: errorMessage,
      registrationStatus: registration.status,
    });

    return {
      status: "invalid",
      reason: "send_failed",
    };
  }
}
