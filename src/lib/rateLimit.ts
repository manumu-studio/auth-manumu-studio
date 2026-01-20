import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

type HeaderValue = string | string[] | undefined;
type HeaderSource = Headers | Record<string, HeaderValue>;

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

type RateLimitKeyInput = {
  scope: string;
  ip?: string | null;
  email?: string | null;
};

const memoryStore = new Map<string, number[]>();
const limit = env.RATE_LIMIT_MAX;
const windowMinutes = env.RATE_LIMIT_WINDOW_MINUTES;
const windowMs = windowMinutes * 60 * 1000;

const useUpstash = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
const upstashLimiter = useUpstash
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(limit, `${windowMinutes} m`),
      analytics: true,
    })
  : null;

export function buildRateLimitKey({ scope, ip, email }: RateLimitKeyInput): string {
  const safeIp = (ip ?? "unknown").trim() || "unknown";
  const safeEmail = (email ?? "unknown").trim().toLowerCase() || "unknown";
  return `${scope}:${safeIp}:${safeEmail}`;
}

export function getRequestIp(headers: HeaderSource): string | null {
  const forwarded = getHeader(headers, "x-forwarded-for");
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (!first) return null;
    return first.split(",")[0]?.trim() ?? null;
  }

  const realIp = getHeader(headers, "x-real-ip");
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] ?? null : realIp;
  }

  return null;
}

export async function rateLimit(identifier: string): Promise<RateLimitResult> {
  if (upstashLimiter) {
    return upstashLimiter.limit(identifier);
  }

  return memoryLimit(identifier);
}

function getHeader(headers: HeaderSource, key: string): HeaderValue {
  if (headers instanceof Headers) {
    return headers.get(key) ?? undefined;
  }
  return headers[key];
}

function memoryLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const timestamps = memoryStore.get(identifier) ?? [];
  const recent = timestamps.filter((ts) => now - ts < windowMs);
  recent.push(now);
  memoryStore.set(identifier, recent);

  const remaining = Math.max(0, limit - recent.length);
  return {
    success: recent.length <= limit,
    limit,
    remaining,
    reset: now + windowMs,
  };
}
