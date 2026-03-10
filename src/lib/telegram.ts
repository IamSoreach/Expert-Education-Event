import { getEnv } from "@/lib/env";

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    from?: TelegramUser;
    chat: {
      id: number;
      type: string;
    };
  };
};

const START_LINK_PREFIX = "link_";
const TELEGRAM_TIMEOUT_MS = 20_000;

function telegramApiUrl(method: string): string {
  const env = getEnv();
  return `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;
}

async function callTelegramApi<T>(method: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(telegramApiUrl(method), {
      ...init,
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    });
  } catch {
    throw new Error(`Telegram API request failed for ${method}`);
  }

  let payload: TelegramApiResponse<T>;
  try {
    payload = (await response.json()) as TelegramApiResponse<T>;
  } catch {
    throw new Error(`Telegram API returned invalid JSON for ${method}`);
  }

  if (!response.ok || !payload.ok || !payload.result) {
    const description = payload.description ?? `Telegram API call failed for ${method}`;
    throw new Error(description);
  }

  return payload.result;
}

export function buildTelegramDeepLink(token: string): string {
  const env = getEnv();
  return `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(
    `${START_LINK_PREFIX}${token}`,
  )}`;
}

export function extractStartToken(text: string | undefined): string | null {
  if (!text) {
    return null;
  }

  const [command, rawToken] = text.trim().split(/\s+/, 2);
  if (!command.startsWith("/start")) {
    return null;
  }

  if (!rawToken) {
    return "";
  }

  const trimmedToken = rawToken.trim();
  if (!trimmedToken) {
    return "";
  }

  if (trimmedToken.startsWith(START_LINK_PREFIX)) {
    return trimmedToken.slice(START_LINK_PREFIX.length);
  }

  return trimmedToken;
}

export async function sendTelegramMessage(chatId: number | string, text: string): Promise<void> {
  await callTelegramApi("sendMessage", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

export async function sendTelegramTicketPhoto(
  chatId: number | string,
  pngBuffer: Buffer,
  caption: string,
): Promise<void> {
  const formData = new FormData();
  formData.append("chat_id", String(chatId));
  formData.append("caption", caption);
  formData.append("parse_mode", "HTML");
  formData.append(
    "photo",
    new Blob([Uint8Array.from(pngBuffer)], { type: "image/png" }),
    "ticket.png",
  );

  await callTelegramApi("sendPhoto", {
    method: "POST",
    body: formData,
  });
}

export async function sendTelegramDocument(
  chatId: number | string,
  fileBuffer: Buffer,
  filename: string,
  caption?: string,
): Promise<void> {
  const formData = new FormData();
  formData.append("chat_id", String(chatId));
  if (caption) {
    formData.append("caption", caption);
  }
  formData.append(
    "document",
    new Blob([Uint8Array.from(fileBuffer)], { type: "application/octet-stream" }),
    filename,
  );

  await callTelegramApi("sendDocument", {
    method: "POST",
    body: formData,
  });
}

export async function setTelegramWebhook(url: string, secretToken: string): Promise<void> {
  await callTelegramApi("setWebhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      url,
      secret_token: secretToken,
    }),
  });
}
