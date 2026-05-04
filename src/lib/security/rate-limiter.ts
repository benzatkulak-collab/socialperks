type RateLimitTier = 'strict' | 'standard' | 'relaxed' | 'public';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const TIER_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  strict: { maxRequests: 5, windowMs: 60_000 },      // Auth, password reset
  standard: { maxRequests: 30, windowMs: 60_000 },    // Authenticated API calls
  relaxed: { maxRequests: 60, windowMs: 60_000 },     // Read-only endpoints
  public: { maxRequests: 120, windowMs: 60_000 },     // Public data (pricing, actions)
};

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
let pruneCounter = 0;

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

// Periodic prune so a low-traffic instance doesn't grow the store
// indefinitely (the every-100-requests prune below only fires under
// load). 60s cadence is well under any meaningful memory pressure.
// Skip in test environments to avoid leaking timers between vitest runs.
if (
  typeof globalThis.setInterval === "function" &&
  process.env.NODE_ENV !== "test" &&
  process.env.VITEST !== "true"
) {
  const interval = setInterval(pruneExpired, 60_000);
  // Don't keep the Node process alive just for this timer.
  if (typeof interval === "object" && interval && "unref" in interval) {
    (interval as { unref: () => void }).unref();
  }
}

// Test-only bypass: when RATE_LIMIT_BYPASS=1 in non-production, all requests
// are allowed. This is gated on NODE_ENV !== 'production' so it physically
// cannot be enabled in a production build.
const BYPASS_ENABLED =
  process.env.NODE_ENV !== 'production' &&
  process.env.RATE_LIMIT_BYPASS === '1';

export function checkRateLimit(
  ip: string,
  endpoint: string,
  tier: RateLimitTier = 'standard'
): { allowed: boolean; remaining: number; resetAt: number; limit: number } {
  if (BYPASS_ENABLED) {
    const config = TIER_CONFIGS[tier];
    return { allowed: true, remaining: config.maxRequests, resetAt: Date.now() + config.windowMs, limit: config.maxRequests };
  }

  if (++pruneCounter % 100 === 0) pruneExpired();

  const config = TIER_CONFIGS[tier];
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs, limit: config.maxRequests };
  }

  entry.count++;
  const allowed = entry.count <= config.maxRequests;
  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
    limit: config.maxRequests,
  };
}

export function rateLimitHeaders(result: ReturnType<typeof checkRateLimit>): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  };
}

export type { RateLimitTier };
