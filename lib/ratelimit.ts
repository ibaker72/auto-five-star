import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;
function redis(): Redis {
  if (!_redis) {
    _redis = Redis.fromEnv();
  }
  return _redis;
}

// 5 auth requests per IP per minute
export const authLimiter = new Ratelimit({
  redis: redis(),
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "ratelimit:auth",
});

// OpenAI generation: 30 per org per minute
export const aiGenerateLimiter = new Ratelimit({
  redis: redis(),
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "ratelimit:ai",
});

// GBP posting: 5 per location per minute (matches Google's posting limits)
export const gbpPostLimiter = new Ratelimit({
  redis: redis(),
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "ratelimit:gbp:post",
});
