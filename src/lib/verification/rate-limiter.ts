/**
 * Per-Platform Rate Limiter
 *
 * Each social media API has different rate limits (requests per window).
 * This implements a sliding-window rate limiter that tracks usage per
 * platform and backs off when limits are approached.
 *
 * Strategies:
 * - Token bucket for burst handling
 * - Sliding window for steady-state limiting
 * - Exponential backoff on 429 responses
 * - Priority queue so high-value verifications go first
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  platformId: string;
  /** Max requests per window. */
  maxRequests: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /** Max burst size (token bucket capacity). */
  burstSize: number;
  /** Token refill rate (tokens per second). */
  refillRate: number;
  /** Min delay between consecutive requests in ms. */
  minIntervalMs: number;
  /** Max concurrent requests to this platform. */
  maxConcurrent: number;
}

export interface RateLimitState {
  platformId: string;
  /** Timestamps of requests in the current window. */
  requestTimestamps: number[];
  /** Current token count for burst handling. */
  tokens: number;
  /** Last token refill timestamp. */
  lastRefill: number;
  /** Current backoff level (0 = no backoff). */
  backoffLevel: number;
  /** When the current backoff expires. */
  backoffUntil: number;
  /** Number of active concurrent requests. */
  activeConcurrent: number;
  /** Total requests made (lifetime). */
  totalRequests: number;
  /** Total 429 responses received. */
  totalThrottled: number;
}

export type RateLimitDecision =
  | { allowed: true; waitMs: 0 }
  | { allowed: false; waitMs: number; reason: string };

// ─── Platform Rate Limit Configurations ─────────────────────────────────────

const PLATFORM_RATE_LIMITS: Record<string, RateLimitConfig> = {
  ig: {
    platformId: "ig",
    maxRequests: 200,
    windowMs: 60 * 60 * 1000, // 1 hour
    burstSize: 25,
    refillRate: 3, // 3 tokens/sec
    minIntervalMs: 100,
    maxConcurrent: 5,
  },
  tt: {
    platformId: "tt",
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute (TikTok is stricter)
    burstSize: 10,
    refillRate: 2,
    minIntervalMs: 200,
    maxConcurrent: 3,
  },
  yt: {
    platformId: "yt",
    maxRequests: 10000,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours (quota-based)
    burstSize: 50,
    refillRate: 5,
    minIntervalMs: 50,
    maxConcurrent: 10,
  },
  xw: {
    platformId: "xw",
    maxRequests: 300,
    windowMs: 15 * 60 * 1000, // 15 minutes
    burstSize: 15,
    refillRate: 2,
    minIntervalMs: 100,
    maxConcurrent: 5,
  },
  fb: {
    platformId: "fb",
    maxRequests: 200,
    windowMs: 60 * 60 * 1000,
    burstSize: 25,
    refillRate: 3,
    minIntervalMs: 100,
    maxConcurrent: 5,
  },
  go: {
    platformId: "go",
    maxRequests: 50,
    windowMs: 60 * 1000, // Google My Business is conservative
    burstSize: 10,
    refillRate: 1,
    minIntervalMs: 500,
    maxConcurrent: 3,
  },
  li: {
    platformId: "li",
    maxRequests: 100,
    windowMs: 24 * 60 * 60 * 1000, // Daily limit
    burstSize: 10,
    refillRate: 1,
    minIntervalMs: 200,
    maxConcurrent: 3,
  },
  yl: {
    platformId: "yl",
    maxRequests: 5000,
    windowMs: 24 * 60 * 60 * 1000, // Yelp daily limit
    burstSize: 20,
    refillRate: 3,
    minIntervalMs: 100,
    maxConcurrent: 5,
  },
  pi: {
    platformId: "pi",
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000,
    burstSize: 20,
    refillRate: 3,
    minIntervalMs: 100,
    maxConcurrent: 5,
  },
  rd: {
    platformId: "rd",
    maxRequests: 60,
    windowMs: 60 * 1000, // Reddit: 60 requests per minute with OAuth
    burstSize: 10,
    refillRate: 1,
    minIntervalMs: 1000,
    maxConcurrent: 2,
  },
};

// ─── Rate Limiter ───────────────────────────────────────────────────────────

export class PlatformRateLimiter {
  private states = new Map<string, RateLimitState>();
  private configs: Map<string, RateLimitConfig>;
  /** Pending requests waiting for rate limit clearance. */
  private waitQueues = new Map<string, Array<{ resolve: () => void; priority: number }>>();

  constructor(customConfigs?: Record<string, Partial<RateLimitConfig>>) {
    this.configs = new Map();
    for (const [id, config] of Object.entries(PLATFORM_RATE_LIMITS)) {
      const merged = customConfigs?.[id]
        ? { ...config, ...customConfigs[id] }
        : config;
      this.configs.set(id, merged as RateLimitConfig);
    }
  }

  // ── State Management ──────────────────────────────────────────────────

  private getState(platformId: string): RateLimitState {
    let state = this.states.get(platformId);
    if (!state) {
      state = {
        platformId,
        requestTimestamps: [],
        tokens: this.configs.get(platformId)?.burstSize ?? 10,
        lastRefill: Date.now(),
        backoffLevel: 0,
        backoffUntil: 0,
        activeConcurrent: 0,
        totalRequests: 0,
        totalThrottled: 0,
      };
      this.states.set(platformId, state);
    }
    return state;
  }

  private refillTokens(state: RateLimitState, config: RateLimitConfig): void {
    const now = Date.now();
    const elapsed = (now - state.lastRefill) / 1000;
    const newTokens = elapsed * config.refillRate;
    state.tokens = Math.min(config.burstSize, state.tokens + newTokens);
    state.lastRefill = now;
  }

  private pruneWindow(state: RateLimitState, config: RateLimitConfig): void {
    const cutoff = Date.now() - config.windowMs;
    state.requestTimestamps = state.requestTimestamps.filter((t) => t > cutoff);
  }

  // ── Decision ──────────────────────────────────────────────────────────

  /**
   * Check if a request is allowed right now.
   * Does NOT consume a token — call `acquire()` for that.
   */
  check(platformId: string): RateLimitDecision {
    const config = this.configs.get(platformId);
    if (!config) return { allowed: true, waitMs: 0 };

    const state = this.getState(platformId);
    const now = Date.now();

    // Check backoff
    if (state.backoffUntil > now) {
      return {
        allowed: false,
        waitMs: state.backoffUntil - now,
        reason: `Backing off after 429 (level ${state.backoffLevel})`,
      };
    }

    // Refill tokens and prune window
    this.refillTokens(state, config);
    this.pruneWindow(state, config);

    // Check concurrent limit
    if (state.activeConcurrent >= config.maxConcurrent) {
      return {
        allowed: false,
        waitMs: config.minIntervalMs,
        reason: `Max concurrent requests reached (${config.maxConcurrent})`,
      };
    }

    // Check sliding window
    if (state.requestTimestamps.length >= config.maxRequests) {
      const oldestInWindow = state.requestTimestamps[0];
      const waitMs = oldestInWindow + config.windowMs - now;
      return {
        allowed: false,
        waitMs: Math.max(waitMs, 0),
        reason: `Window limit reached (${config.maxRequests}/${config.windowMs}ms)`,
      };
    }

    // Check token bucket
    if (state.tokens < 1) {
      const waitMs = Math.ceil((1 - state.tokens) / config.refillRate * 1000);
      return {
        allowed: false,
        waitMs,
        reason: "Token bucket empty",
      };
    }

    // Check min interval
    const lastRequest = state.requestTimestamps[state.requestTimestamps.length - 1];
    if (lastRequest && now - lastRequest < config.minIntervalMs) {
      return {
        allowed: false,
        waitMs: config.minIntervalMs - (now - lastRequest),
        reason: `Min interval not met (${config.minIntervalMs}ms)`,
      };
    }

    return { allowed: true, waitMs: 0 };
  }

  // ── Acquire / Release ─────────────────────────────────────────────────

  /**
   * Acquire a rate limit slot. Waits if necessary.
   * Returns a release function that MUST be called when the request completes.
   */
  async acquire(platformId: string, priority: number = 0): Promise<() => void> {
    const config = this.configs.get(platformId);
    if (!config) return () => {}; // No config = no limiting

    // Wait loop
    let decision = this.check(platformId);
    while (!decision.allowed) {
      await this.wait(platformId, decision.waitMs, priority);
      decision = this.check(platformId);
    }

    // Consume resources
    const state = this.getState(platformId);
    state.tokens -= 1;
    state.requestTimestamps.push(Date.now());
    state.activeConcurrent += 1;
    state.totalRequests += 1;

    let released = false;
    return () => {
      if (released) return;
      released = true;
      state.activeConcurrent = Math.max(0, state.activeConcurrent - 1);
      this.processWaitQueue(platformId);
    };
  }

  private wait(platformId: string, ms: number, priority: number): Promise<void> {
    return new Promise((resolve) => {
      // For short waits, just use setTimeout
      if (ms <= 100) {
        setTimeout(resolve, ms);
        return;
      }

      // For longer waits, add to priority queue
      let queue = this.waitQueues.get(platformId);
      if (!queue) {
        queue = [];
        this.waitQueues.set(platformId, queue);
      }
      queue.push({ resolve, priority });
      queue.sort((a, b) => b.priority - a.priority); // Higher priority first

      // Safety timeout
      setTimeout(() => resolve(), ms + 100);
    });
  }

  private processWaitQueue(platformId: string): void {
    const queue = this.waitQueues.get(platformId);
    if (!queue || queue.length === 0) return;

    const decision = this.check(platformId);
    if (decision.allowed) {
      const next = queue.shift();
      next?.resolve();
    }
  }

  // ── Backoff ───────────────────────────────────────────────────────────

  /**
   * Report a 429 Too Many Requests response from a platform.
   * Triggers exponential backoff.
   */
  reportThrottled(platformId: string, retryAfterMs?: number): void {
    const state = this.getState(platformId);
    state.backoffLevel = Math.min(state.backoffLevel + 1, 8);
    state.totalThrottled += 1;

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s
    const baseMs = retryAfterMs ?? 1000 * Math.pow(2, state.backoffLevel);
    // Add jitter (±25%)
    const jitter = baseMs * 0.25 * (Math.random() * 2 - 1);
    state.backoffUntil = Date.now() + baseMs + jitter;
  }

  /**
   * Report a successful request. Reduces backoff level.
   */
  reportSuccess(platformId: string): void {
    const state = this.getState(platformId);
    if (state.backoffLevel > 0) {
      state.backoffLevel = Math.max(0, state.backoffLevel - 1);
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────

  getStats(platformId: string): {
    requestsInWindow: number;
    tokensAvailable: number;
    activeConcurrent: number;
    backoffLevel: number;
    totalRequests: number;
    totalThrottled: number;
    utilizationPct: number;
  } {
    const config = this.configs.get(platformId);
    const state = this.getState(platformId);

    if (config) {
      this.refillTokens(state, config);
      this.pruneWindow(state, config);
    }

    return {
      requestsInWindow: state.requestTimestamps.length,
      tokensAvailable: Math.floor(state.tokens),
      activeConcurrent: state.activeConcurrent,
      backoffLevel: state.backoffLevel,
      totalRequests: state.totalRequests,
      totalThrottled: state.totalThrottled,
      utilizationPct: config
        ? (state.requestTimestamps.length / config.maxRequests) * 100
        : 0,
    };
  }

  getAllStats(): Record<string, ReturnType<PlatformRateLimiter["getStats"]>> {
    const result: Record<string, ReturnType<PlatformRateLimiter["getStats"]>> = {};
    for (const platformId of this.configs.keys()) {
      result[platformId] = this.getStats(platformId);
    }
    return result;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const rateLimiter = new PlatformRateLimiter();
