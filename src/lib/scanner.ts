import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { normalizeRawTicketCode } from "@/lib/ticket-code";

const SCANNER_MAP_PATH = "/api/integrations/external-ticket/map";
const SCANNER_TIMEOUT_MS = 10_000;
const SCANNER_RETRY_DELAYS_MS = [300, 900, 1800] as const;
const MAX_ERROR_BODY_LENGTH = 500;

type ScannerMappingInput = {
  externalCode: string;
  ticketCode: string;
  source?: string;
};

type ScannerMappingPayload = {
  externalCode: string;
  ticketCode: string;
  source: string;
};

export const scannerDependencies = {
  fetch(input: string | URL | Request, init?: RequestInit) {
    return fetch(input, init);
  },
  wait(ms: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  },
};

function buildScannerMapUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${SCANNER_MAP_PATH}`;
}

function buildScannerMappingPayload(input: ScannerMappingInput): ScannerMappingPayload {
  const env = getEnv();

  if (!env.SCANNER_BASE_URL || !env.SCANNER_API_KEY) {
    throw new Error("Scanner integration is not configured.");
  }

  if (typeof input.externalCode !== "string" || input.externalCode.length === 0) {
    throw new Error("externalCode must be the exact non-empty QR text.");
  }

  if (normalizeRawTicketCode(input.ticketCode) !== input.ticketCode) {
    throw new Error("ticketCode must match uppercase A-Z0-9 format with length 12-64.");
  }

  const source = (input.source ?? env.SCANNER_SOURCE).trim();
  if (source.length === 0 || source.length > 120) {
    throw new Error("source must be 1-120 characters.");
  }

  return {
    externalCode: input.externalCode,
    ticketCode: input.ticketCode,
    source,
  };
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    return text.slice(0, MAX_ERROR_BODY_LENGTH);
  } catch {
    return "";
  }
}

export async function mapExternalTicketToScanner(input: ScannerMappingInput): Promise<boolean> {
  let payload: ScannerMappingPayload;

  try {
    payload = buildScannerMappingPayload(input);
  } catch (error) {
    logger.error("mapping_failed", {
      externalCode: input.externalCode,
      ticketCode: input.ticketCode,
      httpStatus: null,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }

  const env = getEnv();
  const url = buildScannerMapUrl(env.SCANNER_BASE_URL!);
  let httpStatus: number | null = null;
  let errorMessage = "Scanner mapping failed.";

  for (let attempt = 0; attempt <= SCANNER_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await scannerDependencies.fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-scanner-api-key": env.SCANNER_API_KEY!,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(SCANNER_TIMEOUT_MS),
      });

      if (response.ok) {
        logger.info("mapping_success", {
          externalCode: payload.externalCode,
          ticketCode: payload.ticketCode,
          source: payload.source,
        });
        return true;
      }

      httpStatus = response.status;
      const responseBody = await readErrorBody(response);
      errorMessage =
        responseBody || `Scanner mapping request failed with status ${response.status}.`;
    } catch (error) {
      httpStatus = null;
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    if (attempt < SCANNER_RETRY_DELAYS_MS.length) {
      await scannerDependencies.wait(SCANNER_RETRY_DELAYS_MS[attempt]);
    }
  }

  logger.error("mapping_failed", {
    externalCode: payload.externalCode,
    ticketCode: payload.ticketCode,
    httpStatus,
    error: errorMessage,
  });
  return false;
}
