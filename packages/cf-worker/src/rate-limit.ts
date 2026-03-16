import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis/cloudflare";

interface RateLimitEnv {
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
}

interface SdkRateLimiters {
  init: Ratelimit;
  snapshot: Ratelimit;
  evaluations: Ratelimit;
  connect: Ratelimit;
}

export function createSdkRateLimiters(env: RateLimitEnv): SdkRateLimiters {
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  return {
    init: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1m"),
      prefix: "rl:sdk:init",
    }),
    snapshot: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(200, "1m"),
      prefix: "rl:sdk:snapshot",
    }),
    evaluations: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1m"),
      prefix: "rl:sdk:evaluations",
    }),
    connect: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1m"),
      prefix: "rl:sdk:connect",
    }),
  };
}

export function buildRateLimitResponse(
  result: { limit: number; remaining: number; reset: number },
  corsHeaders?: Record<string, string>
): Response {
  const resetSeconds = Math.ceil((result.reset - Date.now()) / 1000);
  return Response.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(result.reset),
        "Retry-After": String(Math.max(resetSeconds, 1)),
        ...corsHeaders,
      },
    }
  );
}

export function mergeRateLimitHeaders(
  response: Response,
  result: { limit: number; remaining: number; reset: number }
): Response {
  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(result.reset));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
