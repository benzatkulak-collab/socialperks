// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Per-Key API Rate Limiter
// Sliding-window rate limiting keyed by API key with tiered plan limits.
// ══════════════════════════════════════════════════════════════════════════════

import type { RateLimitPlan, RateLimitResult } from "./types";

// ─── Constants ─────────────────────────────────────────────────────────────

interface RateLimitBucket {
  requests: number[];
  plan: RateLimitPlan;
}

const PLAN_LIMITS: Record<RateLimitPlan, number> = {
  starter: 100,
  professional: 1000,
  enterprise: 10000,
};

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// ─── Rate Limiter ──────────────────────────────────────────────────────────

export class APIKeyRateLimiter {
  private buckets: Map<string, RateLimitBucket> = new Map();

  registerKey(apiKey: string, plan: RateLimitPlan): void {
    if (!this.buckets.has(apiKey)) {
      this.buckets.set(apiKey, { requests: [], plan });
    } else {
      this.buckets.get(apiKey)!.plan = plan;
    }
  }

  checkLimit(apiKey: string): RateLimitResult {
    const bucket = this.getOrCreateBucket(apiKey);
    this.pruneOldRequests(bucket);

    const limit = PLAN_LIMITS[bucket.plan];
    const remaining = Math.max(0, limit - bucket.requests.length);
    const resetAt = new Date(Date.now() + WINDOW_MS).toISOString();

    return {
      allowed: remaining > 0,
      remaining,
      limit,
      resetAt,
    };
  }

  recordRequest(apiKey: string): RateLimitResult {
    const bucket = this.getOrCreateBucket(apiKey);
    this.pruneOldRequests(bucket);

    const limit = PLAN_LIMITS[bucket.plan];
    const now = Date.now();

    if (bucket.requests.length >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetAt: new Date(now + WINDOW_MS).toISOString(),
      };
    }

    bucket.requests.push(now);

    return {
      allowed: true,
      remaining: Math.max(0, limit - bucket.requests.length),
      limit,
      resetAt: new Date(now + WINDOW_MS).toISOString(),
    };
  }

  getUsage(apiKey: string): {
    plan: RateLimitPlan;
    used: number;
    limit: number;
    remaining: number;
    windowMs: number;
  } {
    const bucket = this.getOrCreateBucket(apiKey);
    this.pruneOldRequests(bucket);

    const limit = PLAN_LIMITS[bucket.plan];
    return {
      plan: bucket.plan,
      used: bucket.requests.length,
      limit,
      remaining: Math.max(0, limit - bucket.requests.length),
      windowMs: WINDOW_MS,
    };
  }

  private getOrCreateBucket(apiKey: string): RateLimitBucket {
    if (!this.buckets.has(apiKey)) {
      this.buckets.set(apiKey, { requests: [], plan: "starter" });
    }
    return this.buckets.get(apiKey)!;
  }

  private pruneOldRequests(bucket: RateLimitBucket): void {
    const cutoff = Date.now() - WINDOW_MS;
    bucket.requests = bucket.requests.filter((ts) => ts > cutoff);
  }
}
