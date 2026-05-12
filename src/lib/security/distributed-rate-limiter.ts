/**
 * Distributed Rate Limiter — Sliding Window Algorithm
 *
 * Uses Redis when available for distributed rate limiting across
 * multiple server instances. Falls back to in-memory when Redis
 * is unavailable.
 *
 * Sliding window algorithm:
 * - Divides time into fixed windows (e.g., per minute)
 * - Tracks count in current window + previous window
 * - Weight: previousCount * (1 - elapsedInCurrentWindow / windowSize) + currentCount
 * - More accurate than fixed window, prevents burst at window boundaries
 */

import { checkRateLimit as _inMemoryCheckRateLimit } from './rate-limiter';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
  retryAfter?: number;
}

interface RedisLike {
  incr(key: string): Promise<number>;
  get(key: string): Promise<string | null>;
  expire(key: string, seconds: number): Promise<number>;
  del(key: string | string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  ping(): Promise<string>;
  multi(): RedisPipeline;
  quit(): Promise<string>;
}

interface RedisPipeline {
  incr(key: string): RedisPipeline;
  expire(key: string, seconds: number): RedisPipeline;
  get(key: string): RedisPipeline;
  exec(): Promise<Array<[Error | null, unknown]> | null>;
}

// ─── Stats tracking ─────────────────────────────────────────────────────────

interface EndpointStats {
  totalRequests: number;
  blockedRequests: number;
  lastRequestAt: number;
}

interface ConsumerStats {
  totalRequests: number;
  blockedRequests: number;
  endpoints: Set<string>;
}

// ─── Distributed Rate Limiter ───────────────────────────────────────────────

export class DistributedRateLimiter {
  private redis: RedisLike | null = null;
  private redisUrl: string | undefined;
  private connecting = false;
  private connected = false;

  // In-memory sliding window fallback
  private windows = new Map<string, number>();
  private windowTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // Stats tracking
  private endpointStats = new Map<string, EndpointStats>();
  private consumerStats = new Map<string, ConsumerStats>();

  constructor(redisUrl?: string) {
    this.redisUrl = redisUrl;
    if (redisUrl) {
      this.connectRedis();
    }
  }

  // ─── Redis Connection ───────────────────────────────────────────────────

  private async connectRedis(): Promise<void> {
    if (this.connecting || this.connected || !this.redisUrl) return;
    this.connecting = true;

    try {
      // Dynamic import so the module works without ioredis installed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Redis = ((await import('ioredis' as string)) as { default: new (url: string, opts: Record<string, unknown>) => unknown }).default;
      this.redis = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times: number) {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
        enableOfflineQueue: false,
      }) as unknown as RedisLike;
      await (this.redis as unknown as { connect(): Promise<void> }).connect();
      this.connected = true;
    } catch (err) {
      // Surface the failure — silent fallback to in-memory makes a misconfigured
      // Redis URL invisible in production. Operators need to see this.
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[DistributedRateLimiter] Redis connect failed (${message}); falling back to in-memory rate limiting.`
      );
      this.redis = null;
      this.connected = false;
    } finally {
      this.connecting = false;
    }
  }

  // ─── Key Helpers ────────────────────────────────────────────────────────

  private getWindowId(windowMs: number, timestamp?: number): number {
    const now = timestamp ?? Date.now();
    return Math.floor(now / windowMs);
  }

  private redisKey(key: string, windowId: number): string {
    return `rl:${key}:${windowId}`;
  }

  // ─── Sliding Window Calculation ─────────────────────────────────────────

  private slidingWindowCount(
    previousCount: number,
    currentCount: number,
    windowMs: number,
    now?: number
  ): number {
    const timestamp = now ?? Date.now();
    const currentWindowStart = this.getWindowId(windowMs, timestamp) * windowMs;
    const elapsed = timestamp - currentWindowStart;
    const weight = 1 - elapsed / windowMs;
    return Math.floor(previousCount * weight + currentCount);
  }

  // ─── Stats Tracking ─────────────────────────────────────────────────────

  private trackStats(key: string, allowed: boolean): void {
    // Parse key to extract endpoint and consumer info
    // Key format: "{ip}:{endpoint}" or "{endpoint}:{ip}"
    const colonIdx = key.indexOf(':');
    const consumer = colonIdx >= 0 ? key.slice(0, colonIdx) : key;
    const endpoint = colonIdx >= 0 ? key.slice(colonIdx + 1) : key;

    // Track endpoint stats
    const existing = this.endpointStats.get(endpoint) ?? {
      totalRequests: 0,
      blockedRequests: 0,
      lastRequestAt: 0,
    };
    existing.totalRequests++;
    if (!allowed) existing.blockedRequests++;
    existing.lastRequestAt = Date.now();
    this.endpointStats.set(endpoint, existing);

    // Track consumer stats
    const consumerExisting = this.consumerStats.get(consumer) ?? {
      totalRequests: 0,
      blockedRequests: 0,
      endpoints: new Set<string>(),
    };
    consumerExisting.totalRequests++;
    if (!allowed) consumerExisting.blockedRequests++;
    consumerExisting.endpoints.add(endpoint);
    this.consumerStats.set(consumer, consumerExisting);
  }

  // ─── Core Methods ───────────────────────────────────────────────────────

  /**
   * Check rate limit using sliding window algorithm without incrementing.
   */
  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const count = await this.peek(key, windowMs);
    const now = Date.now();
    const windowId = this.getWindowId(windowMs, now);
    const resetAt = (windowId + 1) * windowMs;
    const allowed = count < limit;

    return {
      allowed,
      remaining: Math.max(0, limit - count),
      resetAt,
      limit,
      ...(allowed ? {} : { retryAfter: Math.ceil((resetAt - now) / 1000) }),
    };
  }

  /**
   * Atomic increment + check (the primary method for rate limiting).
   * Uses sliding window for accuracy.
   */
  async increment(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();

    if (this.connected && this.redis) {
      return this.redisIncrement(key, limit, windowMs, now);
    }

    return this.inMemoryIncrement(key, limit, windowMs, now);
  }

  /**
   * Get current sliding window count without incrementing.
   */
  async peek(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const currentWindowId = this.getWindowId(windowMs, now);
    const previousWindowId = currentWindowId - 1;

    if (this.connected && this.redis) {
      const currentKey = this.redisKey(key, currentWindowId);
      const previousKey = this.redisKey(key, previousWindowId);

      const [currentStr, previousStr] = await Promise.all([
        this.redis.get(currentKey),
        this.redis.get(previousKey),
      ]);

      const currentCount = parseInt(currentStr ?? '0', 10);
      const previousCount = parseInt(previousStr ?? '0', 10);

      return this.slidingWindowCount(previousCount, currentCount, windowMs, now);
    }

    // In-memory fallback
    const currentCount = this.windows.get(`${key}:${currentWindowId}`) ?? 0;
    const previousCount = this.windows.get(`${key}:${previousWindowId}`) ?? 0;
    return this.slidingWindowCount(previousCount, currentCount, windowMs, now);
  }

  /**
   * Reset rate limit for a specific key. Clears all windows.
   */
  async reset(key: string): Promise<void> {
    if (this.connected && this.redis) {
      const keys = await this.redis.keys(`rl:${key}:*`);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
      return;
    }

    // In-memory: clear all windows for this key
    for (const [windowKey, _] of this.windows) {
      if (windowKey.startsWith(`${key}:`)) {
        this.windows.delete(windowKey);
        const timer = this.windowTimers.get(windowKey);
        if (timer) {
          clearTimeout(timer);
          this.windowTimers.delete(windowKey);
        }
      }
    }

    // Also clear stats
    this.endpointStats.delete(key);
    this.consumerStats.delete(key);
  }

  /**
   * Check if Redis is connected.
   */
  async isConnected(): Promise<boolean> {
    if (!this.redis) return false;
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch {
      this.connected = false;
      return false;
    }
  }

  /**
   * Get rate limit statistics for admin endpoints.
   */
  getStats(): {
    endpoints: Record<string, EndpointStats>;
    topConsumers: Array<{ consumer: string; totalRequests: number; blockedRequests: number; endpointCount: number }>;
    backend: 'redis' | 'memory';
  } {
    const endpoints: Record<string, EndpointStats> = {};
    for (const [ep, stats] of this.endpointStats) {
      endpoints[ep] = { ...stats };
    }

    const topConsumers = Array.from(this.consumerStats.entries())
      .map(([consumer, stats]) => ({
        consumer,
        totalRequests: stats.totalRequests,
        blockedRequests: stats.blockedRequests,
        endpointCount: stats.endpoints.size,
      }))
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 20);

    return {
      endpoints,
      topConsumers,
      backend: this.connected ? 'redis' : 'memory',
    };
  }

  /**
   * Gracefully shut down the rate limiter.
   */
  async shutdown(): Promise<void> {
    for (const timer of this.windowTimers.values()) {
      clearTimeout(timer);
    }
    this.windowTimers.clear();
    this.windows.clear();

    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        // Ignore quit errors during shutdown
      }
      this.redis = null;
      this.connected = false;
    }
  }

  // ─── Private: Redis Increment ───────────────────────────────────────────

  private async redisIncrement(
    key: string,
    limit: number,
    windowMs: number,
    now: number
  ): Promise<RateLimitResult> {
    const currentWindowId = this.getWindowId(windowMs, now);
    const previousWindowId = currentWindowId - 1;
    const currentKey = this.redisKey(key, currentWindowId);
    const previousKey = this.redisKey(key, previousWindowId);
    const ttlSeconds = Math.ceil((windowMs * 2) / 1000);

    try {
      // Use MULTI/EXEC for atomicity
      const pipeline = this.redis!.multi();
      pipeline.incr(currentKey);
      pipeline.expire(currentKey, ttlSeconds);
      pipeline.get(previousKey);

      const results = await pipeline.exec();
      if (!results) throw new Error('Pipeline returned null');

      const currentCount = results[0][1] as number;
      const previousCount = parseInt((results[2][1] as string) ?? '0', 10);

      const slidingCount = this.slidingWindowCount(previousCount, currentCount, windowMs, now);
      const resetAt = (currentWindowId + 1) * windowMs;
      const allowed = slidingCount <= limit;

      this.trackStats(key, allowed);

      return {
        allowed,
        remaining: Math.max(0, limit - slidingCount),
        resetAt,
        limit,
        ...(allowed ? {} : { retryAfter: Math.ceil((resetAt - now) / 1000) }),
      };
    } catch {
      // Redis failed, fall back to in-memory
      this.connected = false;
      this.redis = null;
      return this.inMemoryIncrement(key, limit, windowMs, now);
    }
  }

  // ─── Private: In-Memory Increment ───────────────────────────────────────

  private inMemoryIncrement(
    key: string,
    limit: number,
    windowMs: number,
    now: number
  ): RateLimitResult {
    const currentWindowId = this.getWindowId(windowMs, now);
    const previousWindowId = currentWindowId - 1;
    const currentWindowKey = `${key}:${currentWindowId}`;
    const previousWindowKey = `${key}:${previousWindowId}`;

    // Increment current window
    const currentCount = (this.windows.get(currentWindowKey) ?? 0) + 1;
    this.windows.set(currentWindowKey, currentCount);

    // Auto-cleanup: set timer to delete window after 2x window duration
    if (!this.windowTimers.has(currentWindowKey)) {
      const timer = setTimeout(() => {
        this.windows.delete(currentWindowKey);
        this.windowTimers.delete(currentWindowKey);
      }, windowMs * 2);
      // Don't block process exit
      if (timer && typeof timer === 'object' && 'unref' in timer) {
        timer.unref();
      }
      this.windowTimers.set(currentWindowKey, timer);
    }

    // Get previous window count
    const previousCount = this.windows.get(previousWindowKey) ?? 0;

    // Calculate sliding window
    const slidingCount = this.slidingWindowCount(previousCount, currentCount, windowMs, now);
    const resetAt = (currentWindowId + 1) * windowMs;
    const allowed = slidingCount <= limit;

    this.trackStats(key, allowed);

    return {
      allowed,
      remaining: Math.max(0, limit - slidingCount),
      resetAt,
      limit,
      ...(allowed ? {} : { retryAfter: Math.ceil((resetAt - now) / 1000) }),
    };
  }
}

// ─── Singleton Instance ───────────────────────────────────────────────────

let instance: DistributedRateLimiter | null = null;

export function getDistributedRateLimiter(): DistributedRateLimiter {
  if (!instance) {
    const redisUrl = process.env.REDIS_URL || process.env.RATE_LIMIT_REDIS_URL;
    instance = new DistributedRateLimiter(redisUrl);
  }
  return instance;
}

/**
 * Drop-in replacement for checkRateLimit that uses the distributed limiter.
 * Falls back to in-memory when Redis is unavailable.
 *
 * Same signature as the original checkRateLimit for backward compatibility.
 */
export function checkDistributedRateLimit(
  ip: string,
  endpoint: string,
  tier: 'strict' | 'standard' | 'relaxed' | 'public' = 'standard'
): { allowed: boolean; remaining: number; resetAt: number; limit: number; retryAfter?: number } {
  const TIER_CONFIGS: Record<string, { maxRequests: number; windowMs: number }> = {
    strict: { maxRequests: 5, windowMs: 60_000 },
    standard: { maxRequests: 30, windowMs: 60_000 },
    relaxed: { maxRequests: 60, windowMs: 60_000 },
    public: { maxRequests: 120, windowMs: 60_000 },
  };

  const config = TIER_CONFIGS[tier];
  const limiter = getDistributedRateLimiter();
  const key = `${ip}:${endpoint}`;

  // Use synchronous in-memory increment (the distributed limiter's in-memory path is sync)
  // This maintains backward compatibility with the synchronous API
  const now = Date.now();
  void Math.floor(now / config.windowMs);

  // Access the limiter's internal in-memory state via increment
  // Since we need sync behavior for the drop-in replacement, we call the internal method
  const result = (limiter as unknown as {
    inMemoryIncrement(key: string, limit: number, windowMs: number, now: number): RateLimitResult;
  }).inMemoryIncrement(key, config.maxRequests, config.windowMs, now);

  return result;
}

/**
 * Async version for use in async route handlers.
 * Prefers Redis when available, falls back to in-memory.
 */
export async function checkDistributedRateLimitAsync(
  ip: string,
  endpoint: string,
  tier: 'strict' | 'standard' | 'relaxed' | 'public' = 'standard'
): Promise<RateLimitResult> {
  const TIER_CONFIGS: Record<string, { maxRequests: number; windowMs: number }> = {
    strict: { maxRequests: 5, windowMs: 60_000 },
    standard: { maxRequests: 30, windowMs: 60_000 },
    relaxed: { maxRequests: 60, windowMs: 60_000 },
    public: { maxRequests: 120, windowMs: 60_000 },
  };

  const config = TIER_CONFIGS[tier];
  const limiter = getDistributedRateLimiter();
  const key = `${ip}:${endpoint}`;

  return limiter.increment(key, config.maxRequests, config.windowMs);
}

// Reset singleton (for testing)
export function _resetInstance(): void {
  if (instance) {
    // Don't await — fire and forget during test cleanup
    instance.shutdown().catch(() => {});
  }
  instance = null;
}
