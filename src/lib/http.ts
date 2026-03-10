export function errorJson(message: string, status: number, details?: unknown, headers?: HeadersInit): Response {
  return Response.json(
    {
      error: message,
      ...(details ? { details } : {}),
    },
    {
      status,
      headers,
    },
  );
}

export function tooManyRequestsJson(message: string, retryAfterSeconds: number, headers?: HeadersInit): Response {
  return errorJson(message, 429, undefined, {
    ...(headers || {}),
    "retry-after": String(retryAfterSeconds),
  });
}

export function noStoreHeaders(headers?: HeadersInit): HeadersInit {
  return {
    "cache-control": "no-store",
    ...(headers || {}),
  };
}
