import { Participant, Prisma, Registration, RegistrationStatus } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { TelegramUser } from "@/lib/telegram";

export async function getRegistrationById(id: string) {
  return prisma.registration.findUnique({
    where: {
      id,
    },
    include: {
      event: true,
      participant: true,
      ticket: true,
      telegramLinkTokens: {
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
    },
  });
}

export type LinkTelegramResult =
  | { status: "missing_token" }
  | { status: "invalid_token" }
  | { status: "expired_token" }
  | { status: "token_consumed" }
  | { status: "already_linked"; registration: Registration }
  | { status: "already_linked_other_user" }
  | { status: "telegram_in_use" }
  | { status: "linked"; registration: Registration };

export type MiniAppLinkTelegramResult =
  | { status: "invalid_registration" }
  | { status: "invalid_user" }
  | { status: "already_linked"; registration: Registration }
  | { status: "already_linked_other_user" }
  | { status: "telegram_in_use" }
  | { status: "linked"; registration: Registration };

function buildParticipantTelegramUpdate(
  participant: Pick<
    Participant,
    | "telegramChatId"
    | "telegramUsername"
    | "telegramFirstName"
    | "telegramLastName"
    | "telegramLinkedAt"
  >,
  telegramUser: TelegramUser,
  chatId: string | number | undefined,
  now: Date,
): Prisma.ParticipantUpdateInput {
  return {
    telegramUserId: String(telegramUser.id),
    telegramChatId: chatId ? String(chatId) : participant.telegramChatId ?? String(telegramUser.id),
    telegramUsername: telegramUser.username || participant.telegramUsername,
    telegramFirstName: telegramUser.first_name || participant.telegramFirstName,
    telegramLastName: telegramUser.last_name || participant.telegramLastName,
    telegramLinkedAt: participant.telegramLinkedAt ?? now,
  };
}

export async function linkRegistrationToTelegram(
  token: string,
  telegramUser: TelegramUser | undefined,
  telegramChatId: string | number | undefined,
): Promise<LinkTelegramResult> {
  if (!token) {
    logger.warn("telegram_link_missing_token");
    return { status: "missing_token" };
  }

  if (!telegramUser?.id) {
    logger.warn("telegram_link_invalid_user");
    return { status: "invalid_token" };
  }

  const now = new Date();
  const linkToken = await prisma.telegramLinkToken.findUnique({
    where: {
      token,
    },
    include: {
      registration: {
        include: {
          participant: true,
        },
      },
    },
  });

  if (!linkToken) {
    logger.warn("telegram_link_token_not_found");
    return { status: "invalid_token" };
  }

  const participant = linkToken.registration.participant;
  const incomingUserId = String(telegramUser.id);

  if (linkToken.consumedAt) {
    if (participant.telegramUserId === incomingUserId) {
      logger.info("telegram_link_idempotent_already_linked", {
        registrationId: linkToken.registrationId,
      });
      return {
        status: "already_linked",
        registration: linkToken.registration,
      };
    }
    logger.warn("telegram_link_token_consumed", {
      registrationId: linkToken.registrationId,
    });
    return { status: "token_consumed" };
  }

  if (linkToken.expiresAt.getTime() <= now.getTime()) {
    logger.warn("telegram_link_token_expired", {
      registrationId: linkToken.registrationId,
    });
    return { status: "expired_token" };
  }

  if (participant.telegramUserId && participant.telegramUserId !== incomingUserId) {
    logger.warn("telegram_link_already_linked_other_user", {
      registrationId: linkToken.registrationId,
    });
    return { status: "already_linked_other_user" };
  }

  const telegramAlreadyInUse = await prisma.participant.findFirst({
    where: {
      telegramUserId: incomingUserId,
      id: {
        not: participant.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (telegramAlreadyInUse) {
    logger.warn("telegram_link_user_in_use", {
      telegramUserId: incomingUserId,
    });
    return { status: "telegram_in_use" };
  }

  let updated: Registration;
  try {
    updated = await prisma.$transaction(async (tx) => {
      // Business rule: token is one-time; update succeeds only if still unconsumed.
      const consumeResult = await tx.telegramLinkToken.updateMany({
        where: {
          id: linkToken.id,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      if (consumeResult.count === 0) {
        throw new Error("TOKEN_ALREADY_CONSUMED");
      }

      await tx.participant.update({
        where: {
          id: participant.id,
        },
        data: buildParticipantTelegramUpdate(participant, telegramUser, telegramChatId, now),
      });

      return tx.registration.update({
        where: {
          id: linkToken.registrationId,
        },
        data: {
          status:
            linkToken.registration.status === RegistrationStatus.PENDING
              ? RegistrationStatus.LINKED
              : linkToken.registration.status,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TOKEN_ALREADY_CONSUMED") {
      const latest = await prisma.telegramLinkToken.findUnique({
        where: {
          token,
        },
        include: {
          registration: {
            include: {
              participant: true,
            },
          },
        },
      });

      if (latest?.registration.participant.telegramUserId === incomingUserId) {
        logger.info("telegram_link_race_idempotent", {
          registrationId: latest.registration.id,
        });
        return {
          status: "already_linked",
          registration: latest.registration,
        };
      }

      return { status: "token_consumed" };
    }

    throw error;
  }

  logger.info("telegram_link_success", {
    registrationId: updated.id,
    participantId: updated.participantId,
  });

  return {
    status: "linked",
    registration: updated,
  };
}

export async function linkRegistrationToTelegramFromMiniApp(
  registrationId: string,
  telegramUser: TelegramUser | undefined,
): Promise<MiniAppLinkTelegramResult> {
  if (!telegramUser?.id) {
    return { status: "invalid_user" };
  }

  const registration = await prisma.registration.findUnique({
    where: {
      id: registrationId,
    },
    include: {
      participant: true,
    },
  });

  if (!registration) {
    return { status: "invalid_registration" };
  }

  const participant = registration.participant;
  const incomingUserId = String(telegramUser.id);

  if (participant.telegramUserId) {
    if (participant.telegramUserId === incomingUserId) {
      return {
        status: "already_linked",
        registration,
      };
    }
    return { status: "already_linked_other_user" };
  }

  const inUse = await prisma.participant.findFirst({
    where: {
      telegramUserId: incomingUserId,
      id: {
        not: participant.id,
      },
    },
    select: {
      id: true,
    },
  });
  if (inUse) {
    return { status: "telegram_in_use" };
  }

  const now = new Date();
  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.participant.update({
        where: {
          id: participant.id,
        },
        data: buildParticipantTelegramUpdate(participant, telegramUser, telegramUser.id, now),
      });

      return tx.registration.update({
        where: {
          id: registration.id,
        },
        data: {
          status:
            registration.status === RegistrationStatus.PENDING
              ? RegistrationStatus.LINKED
              : registration.status,
        },
      });
    });

    logger.info("telegram_link_success_from_mini_app", {
      registrationId: updated.id,
      participantId: updated.participantId,
    });
    return {
      status: "linked",
      registration: updated,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { status: "telegram_in_use" };
    }

    throw error;
  }
}
