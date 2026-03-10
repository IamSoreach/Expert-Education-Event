import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const QR_PREFIX = "evtqr";
const QR_VERSION = "v1";

export function generateRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function generateTicketCode(): string {
  return randomBytes(12).toString("hex").toUpperCase();
}

export function signValue(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function createSignedQrPayload(ticketCode: string, secret: string): string {
  const signature = signValue(ticketCode, secret);
  return `${QR_PREFIX}:${QR_VERSION}:${ticketCode}.${signature}`;
}

export function parseSignedQrPayload(
  payload: string,
  secret: string,
): { ticketCode: string } | null {
  if (!payload.startsWith(`${QR_PREFIX}:`)) {
    return null;
  }

  const raw = payload.slice(`${QR_PREFIX}:`.length);
  let ticketCode = "";
  let signature = "";
  if (raw.startsWith(`${QR_VERSION}:`)) {
    const versioned = raw.slice(`${QR_VERSION}:`.length);
    [ticketCode, signature] = versioned.split(".", 2);
  } else {
    // Backward compatibility for legacy payloads: evtqr:<ticketCode>.<signature>
    [ticketCode, signature] = raw.split(".", 2);
  }

  if (!ticketCode || !signature) {
    return null;
  }

  const expectedSignature = signValue(ticketCode, secret);
  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  return { ticketCode };
}
