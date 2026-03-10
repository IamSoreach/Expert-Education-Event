import { randomUUID } from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown> | undefined;

const levelWeight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const redactedKeys = ["password", "secret", "token", "authorization", "cookie", "apiKey"];

function parseLogLevel(value: string | undefined): LogLevel {
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }
  return "info";
}

function shouldLog(level: LogLevel): boolean {
  const configured = parseLogLevel(process.env.LOG_LEVEL);
  return levelWeight[level] >= levelWeight[configured];
}

function redact(value: unknown, keyPath = ""): unknown {
  const lower = keyPath.toLowerCase();
  if (redactedKeys.some((part) => lower.includes(part.toLowerCase()))) {
    return "[REDACTED]";
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => redact(item, `${keyPath}[${index}]`));
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(objectValue)) {
      next[key] = redact(item, keyPath ? `${keyPath}.${key}` : key);
    }
    return next;
  }

  return value;
}

function emit(level: LogLevel, message: string, meta?: LogMeta): void {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: redact(meta) } : {}),
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug(message: string, meta?: LogMeta) {
    emit("debug", message, meta);
  },
  info(message: string, meta?: LogMeta) {
    emit("info", message, meta);
  },
  warn(message: string, meta?: LogMeta) {
    emit("warn", message, meta);
  },
  error(message: string, meta?: LogMeta) {
    emit("error", message, meta);
  },
};

export function createRequestId(): string {
  return randomUUID();
}
