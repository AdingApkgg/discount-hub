import { TRPCError } from "@trpc/server";
import { redis } from "./redis";

interface RateLimitOpts {
  /** Maximum requests in the window */
  max: number;
  /** Window size in seconds */
  windowSec: number;
}

/**
 * Redis-backed sliding-window rate limiter.
 * Falls back to a permissive in-memory Map when Redis is unavailable.
 */
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  key: string,
  opts: RateLimitOpts,
): Promise<void> {
  if (redis) {
    return redisRateLimit(key, opts);
  }
  return memoryRateLimit(key, opts);
}

async function redisRateLimit(key: string, opts: RateLimitOpts) {
  const redisKey = `rl:${key}`;
  try {
    const current = await redis!.incr(redisKey);
    if (current === 1) {
      await redis!.expire(redisKey, opts.windowSec);
    }
    if (current > opts.max) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "请求过于频繁，请稍后再试",
      });
    }
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    // Redis failure → allow request (graceful degradation)
  }
}

function memoryRateLimit(key: string, opts: RateLimitOpts) {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + opts.windowSec * 1000 });
    return;
  }

  entry.count++;
  if (entry.count > opts.max) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "请求过于频繁，请稍后再试",
    });
  }
}

// Clean up memory store periodically (every 5 min)
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of memoryStore) {
        if (now > entry.resetAt) memoryStore.delete(key);
      }
    },
    5 * 60 * 1000,
  );
}
