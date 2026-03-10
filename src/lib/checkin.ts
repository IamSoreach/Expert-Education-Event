import { RegistrationStatus, ScanResult } from "@prisma/client";

import { getImmediateScanResult } from "@/lib/checkin-logic";
import { parseSignedQrPayload } from "@/lib/crypto";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { normalizeRawTicketCode } from "@/lib/ticket-code";

export type CheckInInput = {
  scanInput: string;
  operatorLabel?: string;
  deviceLabel?: string;
};

export type CheckInResult = {
  status: ScanResult;
  message: string;
  participant?: {
    fullName: string;
    email: string;
    organization: string | null;
    eventName: string;
    eventCode: string;
    ticketCode: string;
  };
  checkedInAt?: string;
};

type AttemptMetadata = {
  scannedCode: string;
  operatorLabel?: string;
  deviceLabel?: string;
};

async function createLog(
  result: ScanResult,
  notes: string,
  metadata: AttemptMetadata,
  ticketId?: string,
): Promise<void> {
  await prisma.scanLog.create({
    data: {
      result,
      notes,
      scannedCode: metadata.scannedCode,
      operatorLabel: metadata.operatorLabel || null,
      deviceLabel: metadata.deviceLabel || null,
      ticketId: ticketId || null,
    },
  });
}

export function parseScanInputToTicketCode(
  scanInput: string,
  signingSecret: string,
): { ticketCode: string; source: "qr_payload" | "manual_code" } | null {
  const parsed = parseSignedQrPayload(scanInput, signingSecret);
  if (parsed) {
    return {
      ticketCode: parsed.ticketCode,
      source: "qr_payload",
    };
  }

  const normalized = normalizeRawTicketCode(scanInput);
  if (!normalized) {
    return null;
  }

  return {
    ticketCode: normalized,
    source: "manual_code",
  };
}

export async function checkInByScanInput(input: CheckInInput): Promise<CheckInResult> {
  const scannedCode = input.scanInput.trim();
  const metadata: AttemptMetadata = {
    scannedCode,
    operatorLabel: input.operatorLabel,
    deviceLabel: input.deviceLabel,
  };

  const env = getEnv();
  const parsed = parseScanInputToTicketCode(scannedCode, env.QR_SIGNING_SECRET);
  if (!parsed) {
    await createLog(ScanResult.INVALID, "Invalid scan input format.", metadata);
    logger.warn("checkin_invalid_scan_input", {
      scannedCodeLength: scannedCode.length,
      operatorLabel: input.operatorLabel ?? null,
    });
    return {
      status: ScanResult.INVALID,
      message: "Invalid ticket QR/code.",
    };
  }

  const ticket = await prisma.ticket.findUnique({
    where: {
      ticketCode: parsed.ticketCode,
    },
    include: {
      registration: {
        include: {
          participant: true,
          event: true,
        },
      },
    },
  });

  if (!ticket) {
    await createLog(ScanResult.INVALID, "No ticket found for the scanned code.", metadata);
    logger.warn("checkin_ticket_not_found", {
      operatorLabel: input.operatorLabel ?? null,
    });
    return {
      status: ScanResult.INVALID,
      message: "Ticket not found or invalid.",
    };
  }

  const immediateResult = getImmediateScanResult({
    revokedAt: ticket.revokedAt,
    checkedInAt: ticket.checkedInAt,
  });

  if (immediateResult === "REVOKED") {
    await createLog(ScanResult.REVOKED, "Revoked ticket scan attempt.", metadata, ticket.id);
    logger.warn("checkin_revoked_ticket", {
      ticketId: ticket.id,
      registrationId: ticket.registrationId,
    });
    return {
      status: ScanResult.REVOKED,
      message: "This ticket has been revoked.",
      participant: {
        fullName: ticket.registration.participant.fullName,
        email: ticket.registration.participant.email ?? "-",
        organization: ticket.registration.participant.organization,
        eventName: ticket.registration.event.name,
        eventCode: ticket.registration.event.code,
        ticketCode: ticket.ticketCode,
      },
    };
  }

  if (immediateResult === "DUPLICATE") {
    await createLog(ScanResult.DUPLICATE, "Duplicate check-in attempt.", metadata, ticket.id);
    logger.info("checkin_duplicate", {
      ticketId: ticket.id,
      registrationId: ticket.registrationId,
      operatorLabel: input.operatorLabel ?? null,
    });
    return {
      status: ScanResult.DUPLICATE,
      message: "Ticket was already checked in.",
      participant: {
        fullName: ticket.registration.participant.fullName,
        email: ticket.registration.participant.email ?? "-",
        organization: ticket.registration.participant.organization,
        eventName: ticket.registration.event.name,
        eventCode: ticket.registration.event.code,
        ticketCode: ticket.ticketCode,
      },
      checkedInAt: ticket.checkedInAt?.toISOString(),
    };
  }

  const now = new Date();
  const txResult = await prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.updateMany({
      where: {
        id: ticket.id,
        checkedInAt: null,
      },
      data: {
        checkedInAt: now,
      },
    });

    if (updated.count === 0) {
      const current = await tx.ticket.findUnique({
        where: {
          id: ticket.id,
        },
      });

      await tx.scanLog.create({
        data: {
          result: ScanResult.DUPLICATE,
          notes: "Duplicate check-in attempt.",
          scannedCode,
          operatorLabel: input.operatorLabel || null,
          deviceLabel: input.deviceLabel || null,
          ticketId: ticket.id,
        },
      });

      return {
        type: "duplicate" as const,
        checkedInAt: current?.checkedInAt?.toISOString() ?? null,
      };
    }

    await tx.registration.update({
      where: {
        id: ticket.registrationId,
      },
      data: {
        status: RegistrationStatus.CHECKED_IN,
      },
    });

    await tx.scanLog.create({
      data: {
        result: ScanResult.VALID,
        notes: "Check-in successful.",
        scannedCode,
        operatorLabel: input.operatorLabel || null,
        deviceLabel: input.deviceLabel || null,
        ticketId: ticket.id,
      },
    });

    return {
      type: "success" as const,
      checkedInAt: now.toISOString(),
    };
  });

  const participant = {
    fullName: ticket.registration.participant.fullName,
    email: ticket.registration.participant.email ?? "-",
    organization: ticket.registration.participant.organization,
    eventName: ticket.registration.event.name,
    eventCode: ticket.registration.event.code,
    ticketCode: ticket.ticketCode,
  };

  if (txResult.type === "duplicate") {
    logger.info("checkin_duplicate", {
      ticketId: ticket.id,
      registrationId: ticket.registrationId,
      operatorLabel: input.operatorLabel ?? null,
    });
    return {
      status: ScanResult.DUPLICATE,
      message: "Ticket was already checked in.",
      participant,
      checkedInAt: txResult.checkedInAt ?? undefined,
    };
  }

  logger.info("checkin_valid", {
    ticketId: ticket.id,
    registrationId: ticket.registrationId,
    operatorLabel: input.operatorLabel ?? null,
  });
  return {
    status: ScanResult.VALID,
    message: "Check-in complete.",
    participant,
    checkedInAt: txResult.checkedInAt,
  };
}

export async function getRecentScanLogs(limit = 50) {
  return prisma.scanLog.findMany({
    orderBy: {
      scannedAt: "desc",
    },
    take: limit,
    include: {
      ticket: {
        select: {
          ticketCode: true,
          checkedInAt: true,
          registration: {
            select: {
              event: {
                select: {
                  name: true,
                  code: true,
                },
              },
              participant: {
                select: {
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
