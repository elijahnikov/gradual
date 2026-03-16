import { TRPCError } from "@trpc/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let rateLimiter: Ratelimit | null = null;

export function getProtectedRateLimiter(): Ratelimit | null {
  if (rateLimiter) {
    return rateLimiter;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!(url && token) || process.env.NODE_ENV === "development") {
    return null;
  }

  rateLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(100, "1m"),
    prefix: "rl:trpc:protected",
  });

  return rateLimiter;
}

export async function checkRateLimit(
  limiter: Ratelimit,
  key: string
): Promise<void> {
  const result = await limiter.limit(key);
  if (!result.success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. Please try again later.",
    });
  }
}
