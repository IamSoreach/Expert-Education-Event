export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, Bucket>;

declare global {
  var __eventMvpRateLimitStore: RateLimitStore | undefined;
}

function getStore(): RateLimitStore {
  if (!global.__eventMvpRateLimitStore) {
    global.__eventMvpRateLimitStore = new Map<string, Bucket>();
  }
  return global.__eventMvpRateLimitStore;
}

function cleanupExpiredBuckets(store: RateLimitStore, now: number): void {
  if (store.size < 1000) {
    return;
  }

  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function consumeRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const store = getStore();

  cleanupExpiredBuckets(store, now);

  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, {
      count: 1,
      resetAt,
    });
    return {
      allowed: true,
      limit,
      remaining: Math.max(limit - 1, 0),
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  current.count += 1;
  store.set(key, current);

  if (current.count <= limit) {
    return {
      allowed: true,
      limit,
      remaining: Math.max(limit - current.count, 0),
      resetAt: current.resetAt,
      retryAfterSeconds: 0,
    };
  }

  const retryAfterSeconds = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);
  return {
    allowed: false,
    limit,
    remaining: 0,
    resetAt: current.resetAt,
    retryAfterSeconds,
  };
}

export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "x-ratelimit-limit": String(result.limit),
    "x-ratelimit-remaining": String(result.remaining),
    "x-ratelimit-reset": String(Math.floor(result.resetAt / 1000)),
  };
}

export function createRateLimitKey(scope: string, identifier: string): string {
  return `${scope}:${identifier}`;
}
