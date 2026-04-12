/**
 * Social Perks -- Response Cache (LRU)
 *
 * In-memory LRU cache for memoizing expensive computations.
 * Max 1000 entries; least-recently-used items evicted when full.
 *
 * Usage:
 * ```ts
 * const result = await cacheComputation("pricing:standard", 300, async () => {
 *   return expensiveCalculation();
 * });
 * ```
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// ── LRU Cache ──────────────────────────────────────────────────────────────

const MAX_ENTRIES = 1000;
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Promote a key to "most recently used" by re-inserting it.
 * Map iteration order in JS is insertion order, so the oldest entry
 * is always the first key in the Map.
 */
function touch(key: string, entry: CacheEntry<unknown>): void {
  cache.delete(key);
  cache.set(key, entry);
}

/**
 * Evict the least-recently-used entry (first key in the Map).
 */
function evictLRU(): void {
  if (cache.size <= MAX_ENTRIES) return;
  const firstKey = cache.keys().next().value;
  if (firstKey !== undefined) {
    cache.delete(firstKey);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Memoize an expensive computation with a TTL.
 *
 * @param key    - Unique cache key (e.g. `"pricing:standard"`)
 * @param ttlSec - Time-to-live in seconds
 * @param fn     - Async function to compute the value if not cached
 * @returns The cached or freshly computed value
 */
export async function cacheComputation<T>(
  key: string,
  ttlSec: number,
  fn: () => T | Promise<T>
): Promise<T> {
  const existing = cache.get(key);

  if (existing && existing.expiresAt > Date.now()) {
    touch(key, existing);
    return existing.value as T;
  }

  // Cache miss or expired -- compute the value
  const value = await fn();

  const entry: CacheEntry<T> = {
    value,
    expiresAt: Date.now() + ttlSec * 1000,
  };

  cache.set(key, entry as CacheEntry<unknown>);
  evictLRU();

  return value;
}

/**
 * Synchronous version of cacheComputation for non-async computations.
 */
export function cacheComputationSync<T>(
  key: string,
  ttlSec: number,
  fn: () => T
): T {
  const existing = cache.get(key);

  if (existing && existing.expiresAt > Date.now()) {
    touch(key, existing);
    return existing.value as T;
  }

  const value = fn();

  const entry: CacheEntry<T> = {
    value,
    expiresAt: Date.now() + ttlSec * 1000,
  };

  cache.set(key, entry as CacheEntry<unknown>);
  evictLRU();

  return value;
}

/**
 * Invalidate a specific cache entry.
 */
export function invalidateCache(key: string): boolean {
  return cache.delete(key);
}

/**
 * Invalidate all cache entries matching a prefix.
 * Useful for busting all entries in a namespace (e.g. `"pricing:*"`).
 */
export function invalidateCacheByPrefix(prefix: string): number {
  let count = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      count++;
    }
  }
  return count;
}

/**
 * Clear the entire cache.
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Return current cache stats for monitoring.
 */
export function cacheStats(): { size: number; maxSize: number } {
  return { size: cache.size, maxSize: MAX_ENTRIES };
}

// ── Server-Timing Helper ───────────────────────────────────────────────────

/**
 * Add a `Server-Timing` header to a Response with named duration metrics.
 *
 * @param response - The Response object to mutate
 * @param metrics  - Record of metric name -> duration in milliseconds
 *
 * Example output header:
 *   `Server-Timing: db;dur=23.5, auth;dur=1.2, total;dur=45.0`
 */
export function addServerTiming(
  response: Response,
  metrics: Record<string, number>
): void {
  const timing = Object.entries(metrics)
    .map(([name, dur]) => `${name};dur=${dur.toFixed(1)}`)
    .join(", ");
  response.headers.set("Server-Timing", timing);
}
