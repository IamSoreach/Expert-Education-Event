import assert from "node:assert/strict";
import test from "node:test";

import { RegistrationStatus, Ticket } from "@prisma/client";

import { resetEnvCacheForTests } from "@/lib/env";
import { scannerDependencies } from "@/lib/scanner";
import {
  deliverTicketToTelegram,
  TicketWithRegistration,
  ticketingDependencies,
} from "@/lib/ticketing";

function buildTicket(overrides?: Partial<Ticket>): TicketWithRegistration {
  const now = new Date("2026-03-12T00:00:00.000Z");

  return {
    id: "ticket_1",
    registrationId: "registration_1",
    ticketCode: "AB12CD34EF56",
    qrPayload: "AB12CD34EF56",
    qrImagePath: null,
    sentAt: null,
    checkedInAt: null,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
    registration: {
      id: "registration_1",
      status: RegistrationStatus.LINKED,
      event: {
        name: "Expert Education Fair",
      },
      participant: {
        fullName: "Test User",
        telegramUserId: "10001",
        telegramChatId: "10001",
      },
    },
  };
}

test("deliverTicketToTelegram maps newly issued QR payload to scanner backend", async () => {
  const originalEnv = { ...process.env };
  const originalTicketingDependencies = {
    prisma: ticketingDependencies.prisma,
    sendTelegramTicketPhoto: ticketingDependencies.sendTelegramTicketPhoto,
    sendTelegramPhotoByUrl: ticketingDependencies.sendTelegramPhotoByUrl,
    mapExternalTicketToScanner: ticketingDependencies.mapExternalTicketToScanner,
  };
  const originalScannerDependencies = {
    fetch: scannerDependencies.fetch,
    wait: scannerDependencies.wait,
  };

  process.env.DATABASE_URL = "mysql://root:password@localhost:3306/event_ticketing_mvp";
  process.env.APP_BASE_URL = "https://tickets.example.com";
  process.env.TELEGRAM_BOT_TOKEN = "123456:telegram-token";
  process.env.TELEGRAM_BOT_USERNAME = "ticket_bot";
  process.env.TELEGRAM_WEBHOOK_SECRET = "1234567890abcdef";
  process.env.QR_SIGNING_SECRET = "1234567890abcdef";
  process.env.STAFF_PASSWORD = "password123";
  process.env.STAFF_AUTH_SECRET = "1234567890abcdef";
  process.env.SCANNER_BASE_URL = "https://scanner.example.com";
  process.env.SCANNER_API_KEY = "scanner-api-key";
  delete process.env.SCANNER_SOURCE;
  resetEnvCacheForTests();

  const createdTicket = buildTicket();
  const refreshedTicket = buildTicket({ sentAt: new Date("2026-03-12T00:01:00.000Z") });
  const fetchCalls: Array<{ url: string; init: RequestInit | undefined }> = [];

  ticketingDependencies.prisma = {
    $transaction: async (operations) => Promise.all(operations),
    ticket: {
      findUnique: async () => null,
      create: async () => createdTicket,
      update: async ({ data }) =>
        buildTicket({
          sentAt: data.sentAt ?? refreshedTicket.sentAt,
        }),
      findUniqueOrThrow: async () => refreshedTicket,
    },
    registration: {
      update: async () => ({ id: "registration_1" }),
    },
  } as typeof ticketingDependencies.prisma;
  ticketingDependencies.sendTelegramTicketPhoto = async () => {};
  ticketingDependencies.sendTelegramPhotoByUrl = async () => {};
  scannerDependencies.fetch = async (input, init) => {
    fetchCalls.push({
      url: String(input),
      init,
    });
    return new Response(
      JSON.stringify({
        externalCode: createdTicket.qrPayload,
        ticketCode: createdTicket.ticketCode,
        source: "telegram-miniapp",
        mappedAt: "2026-03-12T00:00:01.000Z",
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  };
  scannerDependencies.wait = async () => {};

  try {
    const delivery = await deliverTicketToTelegram(createdTicket.registrationId);

    assert.equal(delivery.status, "sent");
    assert.equal(fetchCalls.length, 1);
    assert.equal(
      fetchCalls[0]?.url,
      "https://scanner.example.com/api/integrations/external-ticket/map",
    );
    assert.deepEqual(JSON.parse(String(fetchCalls[0]?.init?.body)), {
      externalCode: "AB12CD34EF56",
      ticketCode: "AB12CD34EF56",
      source: "telegram-miniapp",
    });
    assert.deepEqual(fetchCalls[0]?.init?.headers, {
      "content-type": "application/json",
      "x-scanner-api-key": "scanner-api-key",
    });
  } finally {
    ticketingDependencies.prisma = originalTicketingDependencies.prisma;
    ticketingDependencies.sendTelegramTicketPhoto =
      originalTicketingDependencies.sendTelegramTicketPhoto;
    ticketingDependencies.sendTelegramPhotoByUrl =
      originalTicketingDependencies.sendTelegramPhotoByUrl;
    ticketingDependencies.mapExternalTicketToScanner =
      originalTicketingDependencies.mapExternalTicketToScanner;
    scannerDependencies.fetch = originalScannerDependencies.fetch;
    scannerDependencies.wait = originalScannerDependencies.wait;
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
    resetEnvCacheForTests();
  }
});
