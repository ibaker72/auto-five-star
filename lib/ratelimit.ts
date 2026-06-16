import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;
const hasUpstashEnv =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) && Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

function redis(): Redis {
  if (!_redis) {
    _redis = Redis.fromEnv();
  }
  return _redis;
}

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

type RateLimiter = {
  limit: (identifier: string) => Promise<RateLimitResult>;
};

const allowAllLimiter: RateLimiter = {
  async limit() {
    return {
      success: true,
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: Date.now() + 60_000,
    };
  },
};

function createLimiter(limit: number, window: `${number} ${"ms" | "s" | "m" | "h"}`, prefix: string): RateLimiter {
  if (!hasUpstashEnv) return allowAllLimiter;
  return new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix,
  });
}

// 5 auth requests per IP per minute
export const authLimiter = createLimiter(5, "1 m", "ratelimit:auth");

// OpenAI generation: 30 per org per minute
export const aiGenerateLimiter = createLimiter(30, "1 m", "ratelimit:ai");

// GBP posting: 5 per location per minute (matches Google's posting limits)
export const gbpPostLimiter = createLimiter(5, "1 m", "ratelimit:gbp:post");
