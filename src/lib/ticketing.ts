import { Prisma, RegistrationStatus, Ticket } from "@prisma/client";
import QRCode from "qrcode";

import { generateTicketCode } from "@/lib/crypto";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { mapExternalTicketToScanner } from "@/lib/scanner";
import { sendTelegramPhotoByUrl, sendTelegramTicketPhoto } from "@/lib/telegram";

export type TicketWithRegistration = Ticket & {
  registration: {
    id: string;
    status: RegistrationStatus;
    event: {
      name: string;
    };
    participant: {
      fullName: string;
      telegramUserId: string | null;
      telegramChatId: string | null;
    };
  };
};

export type TicketDeliveryResult =
  | { status: "sent"; ticket: TicketWithRegistration }
  | { status: "already_sent"; ticket: TicketWithRegistration };

type TicketingDependencies = {
  prisma: {
    $transaction: typeof prisma.$transaction;
    ticket: Pick<
      typeof prisma.ticket,
      "findUnique" | "create" | "update" | "findUniqueOrThrow"
    >;
    registration: Pick<typeof prisma.registration, "update">;
  };
  sendTelegramTicketPhoto: typeof sendTelegramTicketPhoto;
  sendTelegramPhotoByUrl: typeof sendTelegramPhotoByUrl;
  mapExternalTicketToScanner: typeof mapExternalTicketToScanner;
};

export const ticketingDependencies: TicketingDependencies = {
  prisma,
  sendTelegramTicketPhoto,
  sendTelegramPhotoByUrl,
  mapExternalTicketToScanner,
};

function includeTicketRelations() {
  return {
    registration: {
      include: {
        event: true,
        participant: true,
      },
    },
  } as const;
}

async function createTicketWithRetry(registrationId: string): Promise<TicketWithRegistration> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ticketCode = generateTicketCode();
    const qrPayload = ticketCode;

    try {
      const created = await ticketingDependencies.prisma.ticket.create({
        data: {
          registrationId,
          ticketCode,
          qrPayload,
          // MVP choice: we generate QR in-memory for Telegram send and do not persist files.
          qrImagePath: null,
        },
        include: includeTicketRelations(),
      });
      await mapTicketToScanner(created);
      return created;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        logger.warn("ticket_code_collision_create", { registrationId });
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to create unique ticket code after multiple attempts.");
}

async function rotateTicketPayloadWithRetry(ticketId: string): Promise<TicketWithRegistration> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ticketCode = generateTicketCode();
    const qrPayload = ticketCode;

    try {
      const updated = await ticketingDependencies.prisma.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          ticketCode,
          qrPayload,
          sentAt: null,
          checkedInAt: null,
          revokedAt: null,
          // Keep null in MVP since QR is generated on demand.
          qrImagePath: null,
        },
        include: includeTicketRelations(),
      });
      await mapTicketToScanner(updated);
      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        logger.warn("ticket_code_collision_rotate", { ticketId });
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to regenerate unique ticket code after multiple attempts.");
}

async function mapTicketToScanner(ticket: Pick<Ticket, "ticketCode" | "qrPayload">): Promise<void> {
  await ticketingDependencies.mapExternalTicketToScanner({
    externalCode: ticket.qrPayload,
    ticketCode: ticket.ticketCode,
  });
}

async function markTicketSent(ticketId: string, registrationId: string): Promise<void> {
  await ticketingDependencies.prisma.$transaction([
    ticketingDependencies.prisma.ticket.update({
      where: {
        id: ticketId,
      },
      data: {
        sentAt: new Date(),
      },
    }),
    ticketingDependencies.prisma.registration.update({
      where: {
        id: registrationId,
      },
      data: {
        status: RegistrationStatus.TICKET_SENT,
      },
    }),
  ]);
}

async function getOrCreateTicketState(
  registrationId: string,
): Promise<{ ticket: TicketWithRegistration; created: boolean }> {
  const existing = await ticketingDependencies.prisma.ticket.findUnique({
    where: {
      registrationId,
    },
    include: includeTicketRelations(),
  });

  if (existing) {
    return {
      ticket: existing,
      created: false,
    };
  }

  return {
    ticket: await createTicketWithRetry(registrationId),
    created: true,
  };
}

export async function getOrCreateTicket(registrationId: string): Promise<TicketWithRegistration> {
  return (await getOrCreateTicketState(registrationId)).ticket;
}

export async function createTicketPngBuffer(qrPayload: string): Promise<Buffer> {
  return QRCode.toBuffer(qrPayload, {
    type: "png",
    width: 640,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });
}

export function buildTicketCaption(ticket: TicketWithRegistration): string {
  return [
    `Your ticket for <b>${ticket.registration.event.name}</b>`,
    "",
    `Name: ${ticket.registration.participant.fullName}`,
    `Ticket: ${ticket.ticketCode}`,
    "",
    "Show this QR code at the check-in desk.",
  ].join("\n");
}

async function sendTicketToChatId(
  ticket: TicketWithRegistration,
  chatId: number | string,
): Promise<void> {
  const pngBuffer = await createTicketPngBuffer(ticket.qrPayload);
  await ticketingDependencies.sendTelegramTicketPhoto(chatId, pngBuffer, buildTicketCaption(ticket));

  const env = getEnv();
  const appBaseUrl = env.APP_BASE_URL.replace(/\/+$/, "");
  const floorPlanUrl = `${appBaseUrl}/landing/floor-plan.png`;
  try {
    await ticketingDependencies.sendTelegramPhotoByUrl(
      chatId,
      floorPlanUrl,
      "Please find the event floor plan here.",
    );
  } catch (error) {
    // Non-fatal: QR ticket was already sent successfully.
    logger.warn("ticket_floor_plan_send_failed", {
      registrationId: ticket.registrationId,
      ticketId: ticket.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function sendTicketToTelegram(ticket: TicketWithRegistration): Promise<void> {
  const participant = ticket.registration.participant;
  const chatId = participant.telegramChatId || participant.telegramUserId;

  if (!chatId) {
    throw new Error("Telegram user is not linked for this registration.");
  }

  await sendTicketToChatId(ticket, chatId);
}

export async function deliverTicketToTelegramChat(
  registrationId: string,
  chatId: number | string,
): Promise<TicketDeliveryResult> {
  const { ticket, created } = await getOrCreateTicketState(registrationId);

  if (!created && !ticket.sentAt) {
    await mapTicketToScanner(ticket);
  }

  await sendTicketToChatId(ticket, chatId);

  if (ticket.sentAt) {
    logger.info("ticket_resent_to_chat", {
      registrationId,
      ticketId: ticket.id,
      chatId: String(chatId),
    });
    return {
      status: "already_sent",
      ticket,
    };
  }

  await markTicketSent(ticket.id, ticket.registrationId);
  logger.info("ticket_sent_to_chat", {
    registrationId,
    ticketId: ticket.id,
    chatId: String(chatId),
  });

  const refreshed = await ticketingDependencies.prisma.ticket.findUniqueOrThrow({
    where: {
      id: ticket.id,
    },
    include: includeTicketRelations(),
  });

  return {
    status: "sent",
    ticket: refreshed,
  };
}

export async function deliverTicketToTelegram(registrationId: string): Promise<TicketDeliveryResult> {
  const { ticket, created } = await getOrCreateTicketState(registrationId);

  if (!created && !ticket.sentAt) {
    await mapTicketToScanner(ticket);
  }

  if (ticket.sentAt) {
    logger.info("ticket_already_sent", {
      registrationId,
      ticketId: ticket.id,
    });
    return {
      status: "already_sent",
      ticket,
    };
  }

  await sendTicketToTelegram(ticket);
  await markTicketSent(ticket.id, ticket.registrationId);
  logger.info("ticket_sent", {
    registrationId,
    ticketId: ticket.id,
  });

  const refreshed = await ticketingDependencies.prisma.ticket.findUniqueOrThrow({
    where: {
      id: ticket.id,
    },
    include: includeTicketRelations(),
  });

  return {
    status: "sent",
    ticket: refreshed,
  };
}

export async function resendExistingTicketToTelegram(registrationId: string): Promise<TicketWithRegistration> {
  const { ticket, created } = await getOrCreateTicketState(registrationId);

  if (!created) {
    await mapTicketToScanner(ticket);
  }

  await sendTicketToTelegram(ticket);
  logger.info("ticket_resent", {
    registrationId,
    ticketId: ticket.id,
  });

  if (!ticket.sentAt) {
    await markTicketSent(ticket.id, ticket.registrationId);
  }

  return ticketingDependencies.prisma.ticket.findUniqueOrThrow({
    where: {
      id: ticket.id,
    },
    include: includeTicketRelations(),
  });
}

export async function regenerateTicketForAdmin(registrationId: string): Promise<TicketWithRegistration> {
  const ticket = await getOrCreateTicket(registrationId);
  logger.info("ticket_regenerated", {
    registrationId,
    ticketId: ticket.id,
  });
  return rotateTicketPayloadWithRetry(ticket.id);
}

export async function regenerateAndResendTicketForAdmin(
  registrationId: string,
): Promise<TicketWithRegistration> {
  const regenerated = await regenerateTicketForAdmin(registrationId);
  await sendTicketToTelegram(regenerated);
  await markTicketSent(regenerated.id, regenerated.registrationId);

  return ticketingDependencies.prisma.ticket.findUniqueOrThrow({
    where: {
      id: regenerated.id,
    },
    include: includeTicketRelations(),
  });
}
