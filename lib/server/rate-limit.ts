import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// analyze calls the LLM (Gemini free tier: 15 RPM), so it gets a tight per-IP cap.
// example only signs a precomputed result, so it is limited separately and loosely.
export const rateLimitPolicies = { analyze: 3, example: 10 } as const;
export type RateLimitPolicy = keyof typeof rateLimitPolicies;

const windowMs = 10 * 60 * 1000;
// Mutable per-instance request window. Expired entries are removed on each request.
const buckets = new Map<string, { count: number; reset: number }>();
let warned = false;
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;
const redisLimiters = redis
  ? {
      analyze: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(rateLimitPolicies.analyze, "10 m"),
        analytics: false,
        prefix: "talktivity:analyze",
      }),
      example: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(rateLimitPolicies.example, "10 m"),
        analytics: false,
        prefix: "talktivity:example",
      }),
    }
  : null;

export async function rateLimit(ip: string, policy: RateLimitPolicy) {
  if (redisLimiters) return redisLimiters[policy].limit(ip);
  if (!warned) {
    console.warn("Redis 미설정: 인스턴스 메모리 제한기를 사용합니다. 운영 시 Redis를 설정하세요.");
    warned = true;
  }
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.reset <= now) buckets.delete(key);
  const key = `${policy}:${ip}`;
  const bucket = buckets.get(key) ?? { count: 0, reset: now + windowMs };
  bucket.count++;
  buckets.set(key, bucket);
  return { success: bucket.count <= rateLimitPolicies[policy], reset: bucket.reset };
}
