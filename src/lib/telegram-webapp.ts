import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

import { TelegramUser } from "@/lib/telegram";

const telegramUserSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
});

export type VerifiedTelegramWebAppData = {
  user: TelegramUser;
  authDate: number;
  queryId: string | null;
  raw: string;
};

function buildDataCheckString(params: URLSearchParams): string {
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") {
      continue;
    }
    pairs.push(`${key}=${value}`);
  }

  return pairs.sort((a, b) => a.localeCompare(b)).join("\n");
}

function deriveWebAppSecret(botToken: string): Buffer {
  return createHmac("sha256", "WebAppData").update(botToken).digest();
}

function safeHexEqual(leftHex: string, rightHex: string): boolean {
  try {
    const left = Buffer.from(leftHex, "hex");
    const right = Buffer.from(rightHex, "hex");

    if (left.length !== right.length || left.length === 0) {
      return false;
    }

    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function verifyTelegramWebAppInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400,
): VerifiedTelegramWebAppData | null {
  if (!initData || !botToken) {
    return null;
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash")?.trim().toLowerCase();
  if (!hash || !/^[a-f0-9]{64}$/.test(hash)) {
    return null;
  }

  const dataCheckString = buildDataCheckString(params);
  const secret = deriveWebAppSecret(botToken);
  const expectedHash = createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex")
    .toLowerCase();

  if (!safeHexEqual(hash, expectedHash)) {
    return null;
  }

  const authDateRaw = params.get("auth_date");
  const authDate = authDateRaw ? Number(authDateRaw) : NaN;
  if (!Number.isInteger(authDate) || authDate <= 0) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > maxAgeSeconds || authDate > now + 60) {
    return null;
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    return null;
  }

  let parsedUser: unknown;
  try {
    parsedUser = JSON.parse(userRaw);
  } catch {
    return null;
  }

  const userResult = telegramUserSchema.safeParse(parsedUser);
  if (!userResult.success) {
    return null;
  }

  return {
    user: {
      id: userResult.data.id,
      username: userResult.data.username,
      first_name: userResult.data.first_name,
      last_name: userResult.data.last_name,
    },
    authDate,
    queryId: params.get("query_id"),
    raw: initData,
  };
}
