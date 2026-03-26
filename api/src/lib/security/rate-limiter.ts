import { getRedis } from "../redis";

type RateLimitTier = 'strict' | 'standard' | 'relaxed' | 'public';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const TIER_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  strict: { maxRequests: 5, windowMs: 60_000 },
  standard: { maxRequests: 30, windowMs: 60_000 },
  relaxed: { maxRequests: 60, windowMs: 60_000 },
  public: { maxRequests: 120, windowMs: 60_000 },
};

// ─── In-memory fallback ──────────────────────────────────────────────────────

interface RateLimitEntry { count: number; resetAt: number; }
const memStore = new Map<string, RateLimitEntry>();
let pruneCounter = 0;

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, entry] of memStore) {
    if (entry.resetAt <= now) memStore.delete(key);
  }
}

function checkMemory(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number; limit: number } {
  if (++pruneCounter % 100 === 0) pruneExpired();
  const now = Date.now();
  const entry = memStore.get(key);

  if (!entry || entry.resetAt <= now) {
    memStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs, limit: config.maxRequests };
  }

  entry.count++;
  return {
    allowed: entry.count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
    limit: config.maxRequests,
  };
}

// ─── Redis-backed rate limiter ───────────────────────────────────────────────

async function checkRedis(key: string, config: RateLimitConfig): Promise<{ allowed: boolean; remaining: number; resetAt: number; limit: number } | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const redisKey = `rl:${key}`;
    const windowSec = Math.ceil(config.windowMs / 1000);

    // Atomic increment + TTL set
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSec);
    }

    const ttl = await redis.ttl(redisKey);
    const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : config.windowMs);

    return {
      allowed: count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetAt,
      limit: config.maxRequests,
    };
  } catch {
    return null; // Redis error — fall back to memory
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function checkRateLimit(
  ip: string,
  endpoint: string,
  tier: RateLimitTier = 'standard'
): { allowed: boolean; remaining: number; resetAt: number; limit: number } {
  const config = TIER_CONFIGS[tier];
  const key = `${ip}:${endpoint}`;

  // Try Redis (async, but we need sync return for existing middleware).
  // Use fire-and-forget Redis check to sync the distributed state,
  // but use in-memory for the immediate response.
  const redis = getRedis();
  if (redis) {
    // Background sync: update Redis counter
    checkRedis(key, config).catch(() => {});
  }

  // In-memory provides the immediate answer
  return checkMemory(key, config);
}

/**
 * Async version — preferred for new code.
 * Uses Redis if available, falls back to in-memory.
 */
export async function checkRateLimitAsync(
  ip: string,
  endpoint: string,
  tier: RateLimitTier = 'standard'
): Promise<{ allowed: boolean; remaining: number; resetAt: number; limit: number }> {
  const config = TIER_CONFIGS[tier];
  const key = `${ip}:${endpoint}`;

  const redisResult = await checkRedis(key, config);
  if (redisResult) return redisResult;

  return checkMemory(key, config);
}

export function rateLimitHeaders(result: ReturnType<typeof checkRateLimit>): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  };
}

export type { RateLimitTier };
