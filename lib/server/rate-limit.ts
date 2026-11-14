import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const windowMs = 10 * 60 * 1000;
// Mutable per-instance request window. Expired entries are removed on each request.
const buckets = new Map<string, { count: number; reset: number }>();
let warned = false;
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Ratelimit({
      redis: new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }),
      limiter: Ratelimit.slidingWindow(10, "10 m"),
      analytics: false,
      prefix: "talktivity",
    }) : null;

export async function rateLimit(ip: string) {
  if (redis) return redis.limit(ip);
  if (!warned) {
    console.warn("Redis 미설정: 인스턴스 메모리 제한기를 사용합니다. 운영 시 Redis를 설정하세요.");
    warned = true;
  }
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.reset <= now) buckets.delete(key);
  const bucket = buckets.get(ip) ?? { count: 0, reset: now + windowMs };
  bucket.count++;
  buckets.set(ip, bucket);
  return { success: bucket.count <= 10, reset: bucket.reset };
}
