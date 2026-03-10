import { Event, Participant, Prisma, Registration, RegistrationStatus, TelegramLinkToken } from "@prisma/client";

import { generateRandomToken } from "@/lib/crypto";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isReasonablePhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { buildParticipantDedupWhere } from "@/server/registration-dedupe";

type RegistrationWithRelations = Registration & {
  participant: Participant;
  event: Event;
  ticket: {
    id: string;
    sentAt: Date | null;
  } | null;
};

export class EventUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventUnavailableError";
  }
}

export class InvalidPhoneNumberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPhoneNumberError";
  }
}

type RegistrationInput = {
  eventCode: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  organization?: string;
  notes?: string;
  source?: string;
};

type TokenSummary = Pick<TelegramLinkToken, "id" | "token" | "expiresAt" | "consumedAt">;

export type RegistrationSubmissionResult = {
  registration: RegistrationWithRelations;
  linkToken: TokenSummary;
  duplicate: boolean;
};

function trimOrNull(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeEmail(value?: string): string | null {
  const trimmed = trimOrNull(value);
  return trimmed ? trimmed.toLowerCase() : null;
}

function getTokenExpiryDate(): Date {
  const env = getEnv();
  return new Date(Date.now() + env.TELEGRAM_LINK_TOKEN_TTL_MINUTES * 60 * 1000);
}

async function findReusableParticipant(
  tx: Prisma.TransactionClient,
  phoneNumber: string,
  email: string | null,
) {
  return tx.participant.findFirst({
    where: buildParticipantDedupWhere(phoneNumber, email),
    orderBy: {
      createdAt: "asc",
    },
  });
}

async function getOrCreateActiveLinkToken(tx: Prisma.TransactionClient, registrationId: string): Promise<TokenSummary> {
  const now = new Date();
  const activeToken = await tx.telegramLinkToken.findFirst({
    where: {
      registrationId,
      consumedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      token: true,
      expiresAt: true,
      consumedAt: true,
    },
  });

  if (activeToken) {
    return activeToken;
  }

  return tx.telegramLinkToken.create({
    data: {
      registrationId,
      token: generateRandomToken(24),
      expiresAt: getTokenExpiryDate(),
    },
    select: {
      id: true,
      token: true,
      expiresAt: true,
      consumedAt: true,
    },
  });
}

export async function getEventByCode(eventCode: string): Promise<Event | null> {
  return prisma.event.findUnique({
    where: {
      code: eventCode,
    },
  });
}

export async function submitRegistration(input: RegistrationInput): Promise<RegistrationSubmissionResult> {
  const normalizedPhone = normalizePhoneNumber(input.phoneNumber);
  if (!isReasonablePhoneNumber(normalizedPhone)) {
    throw new InvalidPhoneNumberError("Please enter a valid phone number.");
  }

  const normalizedEmail = normalizeEmail(input.email);
  const fullName = input.fullName.trim();
  const organization = trimOrNull(input.organization);
  const notes = trimOrNull(input.notes);
  const source = trimOrNull(input.source);

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({
      where: {
        code: input.eventCode,
      },
    });

    if (!event || !event.isActive) {
      logger.warn("registration_event_unavailable", {
        eventCode: input.eventCode,
      });
      throw new EventUnavailableError("This event is not available for registration.");
    }

    const existingParticipant = await findReusableParticipant(tx, normalizedPhone, normalizedEmail);
    const participant = existingParticipant
      ? await tx.participant.update({
          where: {
            id: existingParticipant.id,
          },
          data: {
            fullName,
            phoneNumber: normalizedPhone,
            email: normalizedEmail ?? existingParticipant.email,
            organization: organization ?? existingParticipant.organization,
            notes: notes ?? existingParticipant.notes,
          },
        })
      : await tx.participant.create({
          data: {
            fullName,
            phoneNumber: normalizedPhone,
            email: normalizedEmail,
            organization,
            notes,
          },
        });

    const existingRegistration = await tx.registration.findUnique({
      where: {
        eventId_participantId: {
          eventId: event.id,
          participantId: participant.id,
        },
      },
      include: {
        participant: true,
        event: true,
        ticket: {
          select: {
            id: true,
            sentAt: true,
          },
        },
      },
    });

    let duplicate = false;
    let registration: RegistrationWithRelations;

    if (existingRegistration) {
      duplicate = true;
      registration = existingRegistration;
    } else {
      registration = await tx.registration.create({
        data: {
          eventId: event.id,
          participantId: participant.id,
          status: RegistrationStatus.PENDING,
          source,
        },
        include: {
          participant: true,
          event: true,
          ticket: {
            select: {
              id: true,
              sentAt: true,
            },
          },
        },
      });
    }

    const linkToken = await getOrCreateActiveLinkToken(tx, registration.id);
    logger.info("registration_persisted", {
      registrationId: registration.id,
      participantId: participant.id,
      eventCode: event.code,
      duplicate,
    });

    return {
      registration,
      linkToken,
      duplicate,
    };
  });
}

type RegistrationStatusView = {
  registrationId: string;
  eventCode: string;
  eventName: string;
  participant: {
    fullName: string;
    phoneNumber: string;
    email: string | null;
    organization: string | null;
    notes: string | null;
  };
  status: RegistrationStatus;
  token: {
    value: string;
    expiresAt: string;
    consumedAt: string | null;
  };
  telegramLinked: boolean;
  ticketSent: boolean;
};

function deriveRegistrationFlags(registration: RegistrationWithRelations): {
  telegramLinked: boolean;
  ticketSent: boolean;
} {
  const telegramLinked =
    registration.participant.telegramLinkedAt !== null ||
    registration.status === RegistrationStatus.LINKED ||
    registration.status === RegistrationStatus.TICKET_SENT ||
    registration.status === RegistrationStatus.CHECKED_IN;

  const ticketSent =
    registration.ticket?.sentAt !== null ||
    registration.status === RegistrationStatus.TICKET_SENT ||
    registration.status === RegistrationStatus.CHECKED_IN;

  return {
    telegramLinked,
    ticketSent,
  };
}

export async function getRegistrationStatusView(
  registrationId: string,
  tokenValue: string,
): Promise<RegistrationStatusView | null> {
  const token = await prisma.telegramLinkToken.findUnique({
    where: {
      token: tokenValue,
    },
    include: {
      registration: {
        include: {
          event: true,
          participant: true,
          ticket: {
            select: {
              id: true,
              sentAt: true,
            },
          },
        },
      },
    },
  });

  if (!token || token.registrationId !== registrationId) {
    logger.warn("registration_status_invalid_token", {
      registrationId,
    });
    return null;
  }

  const registration = token.registration;
  const flags = deriveRegistrationFlags(registration);

  return {
    registrationId: registration.id,
    eventCode: registration.event.code,
    eventName: registration.event.name,
    participant: {
      fullName: registration.participant.fullName,
      phoneNumber: registration.participant.phoneNumber,
      email: registration.participant.email,
      organization: registration.participant.organization,
      notes: registration.participant.notes,
    },
    status: registration.status,
    token: {
      value: token.token,
      expiresAt: token.expiresAt.toISOString(),
      consumedAt: token.consumedAt?.toISOString() ?? null,
    },
    telegramLinked: flags.telegramLinked,
    ticketSent: flags.ticketSent,
  };
}
