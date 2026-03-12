import { ConfirmationStatus, RegistrationStatus } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const TERMINAL_SENT_STATUSES = new Set<RegistrationStatus>([
  RegistrationStatus.TICKET_SENT,
  RegistrationStatus.CHECKED_IN,
]);

export async function reconcileConfirmationStatuses(): Promise<void> {
  const pendingRows = await prisma.registration.findMany({
    where: {
      confirmationStatus: ConfirmationStatus.PENDING,
      status: {
        not: RegistrationStatus.CANCELLED,
      },
    },
    select: {
      id: true,
      status: true,
      participant: {
        select: {
          telegramUserId: true,
          telegramChatId: true,
        },
      },
      ticket: {
        select: {
          sentAt: true,
        },
      },
    },
    take: 1000,
    orderBy: {
      createdAt: "desc",
    },
  });

  if (pendingRows.length === 0) {
    return;
  }

  const invalidIds: string[] = [];
  const sentRows: Array<{ id: string; sentAt: Date | null }> = [];

  for (const row of pendingRows) {
    const hasTelegramLink = Boolean(
      row.participant.telegramChatId || row.participant.telegramUserId,
    );

    if (!hasTelegramLink) {
      invalidIds.push(row.id);
      continue;
    }

    if (TERMINAL_SENT_STATUSES.has(row.status) || row.ticket?.sentAt) {
      sentRows.push({
        id: row.id,
        sentAt: row.ticket?.sentAt ?? null,
      });
    }
  }

  if (invalidIds.length > 0) {
    await prisma.registration.updateMany({
      where: {
        id: {
          in: invalidIds,
        },
      },
      data: {
        confirmationStatus: ConfirmationStatus.INVALID,
        confirmationError: "telegram_not_linked",
      },
    });
  }

  if (sentRows.length > 0) {
    const now = new Date();
    await prisma.$transaction(
      sentRows.map((row) =>
        prisma.registration.update({
          where: {
            id: row.id,
          },
          data: {
            confirmationStatus: ConfirmationStatus.SENT,
            confirmationSentAt: row.sentAt ?? now,
            confirmationError: null,
          },
        }),
      ),
    );
  }

  logger.info("confirmation_status_reconciled", {
    scanned: pendingRows.length,
    markedSent: sentRows.length,
    markedInvalid: invalidIds.length,
  });
}

