import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// analyze and extract call the LLM (Gemini free tier: 15 RPM), so they get tight per-IP caps.
// example only signs a precomputed result, so it is limited separately and loosely.
export const rateLimitPolicies = { analyze: 3, extract: 5, example: 10 } as const;
export type RateLimitPolicy = keyof typeof rateLimitPolicies;
// All LLM calls from every user share one budget below the provider's RPM, so a
// traffic spike gets a "busy" message instead of silently degrading to mock results.
export const globalLlmPerMinute = 14;

const windowMs = 10 * 60 * 1000;
const globalWindowMs = 60 * 1000;
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
      extract: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(rateLimitPolicies.extract, "10 m"),
        analytics: false,
        prefix: "talktivity:extract",
      }),
      example: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(rateLimitPolicies.example, "10 m"),
        analytics: false,
        prefix: "talktivity:example",
      }),
      llmGlobal: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(globalLlmPerMinute, "1 m"),
        analytics: false,
        prefix: "talktivity:llm-global",
      }),
    }
  : null;

function memoryLimit(key: string, max: number, window: number) {
  const now = Date.now();
  for (const [k, bucket] of buckets) if (bucket.reset <= now) buckets.delete(k);
  const bucket = buckets.get(key) ?? { count: 0, reset: now + window };
  bucket.count++;
  buckets.set(key, bucket);
  return { success: bucket.count <= max, reset: bucket.reset };
}

export async function globalLlmLimit() {
  if (redisLimiters) return redisLimiters.llmGlobal.limit("all");
  return memoryLimit("llm-global", globalLlmPerMinute, globalWindowMs);
}

export async function rateLimit(ip: string, policy: RateLimitPolicy) {
  if (redisLimiters) return redisLimiters[policy].limit(ip);
  if (!warned) {
    console.warn("Redis 미설정: 인스턴스 메모리 제한기를 사용합니다. 운영 시 Redis를 설정하세요.");
    warned = true;
  }
  return memoryLimit(`${policy}:${ip}`, rateLimitPolicies[policy], windowMs);
}
