/**
 * Rate Limit Statistics Tracker
 *
 * Tracks rate limit hits and blocks per IP, per tier, within time windows.
 * Provides statistics for the admin dashboard including:
 * - Total hits and blocks by tier
 * - Top 10 most rate-limited IPs
 * - Per-IP reset capability
 *
 * Wired into the rate limiter via recordHit() and recordBlock() calls.
 */

import type { RateLimitTier } from "./rate-limiter";

// ─── Types ──────────────────────────────────────���───────────────────────────

interface IPStats {
  hits: number;
  blocks: number;
  firstSeen: number;
  lastSeen: number;
  byTier: Record<string, { hits: number; blocks: number }>;
}

interface RateLimitStats {
  totalHits: number;
  totalBlocks: number;
  uniqueIPs: number;
  byTier: Record<string, { hits: number; blocks: number }>;
  topBlockedIPs: Array<{
    ip: string;
    hits: number;
    blocks: number;
    lastSeen: string;
  }>;
  windowStart: string;
  windowEnd: string;
}

// ─── Internal State ─────────────────────────────────────────────────────────

const ipStats = new Map<string, IPStats>();

let totalHits = 0;
let totalBlocks = 0;
const tierStats: Record<string, { hits: number; blocks: number }> = {};

/** Track when this stats window started */
let windowStart = Date.now();

/** Auto-prune counter to avoid unbounded memory growth */
let opCounter = 0;

// ─── Pruning ───────────────────────────────────────────────────��────────────

const MAX_IPS = 10_000;
const PRUNE_THRESHOLD = 500; // prune every N operations

function pruneOldEntries(): void {
  if (ipStats.size <= MAX_IPS) return;

  // Remove oldest entries by lastSeen
  const entries = [...ipStats.entries()].sort(
    (a, b) => a[1].lastSeen - b[1].lastSeen
  );

  const toRemove = entries.slice(0, entries.length - MAX_IPS);
  for (const [ip, stats] of toRemove) {
    totalHits -= stats.hits;
    totalBlocks -= stats.blocks;
    for (const [tier, tStats] of Object.entries(stats.byTier)) {
      if (tierStats[tier]) {
        tierStats[tier].hits -= tStats.hits;
        tierStats[tier].blocks -= tStats.blocks;
      }
    }
    ipStats.delete(ip);
  }
}

function maybeAutoPrune(): void {
  opCounter++;
  if (opCounter % PRUNE_THRESHOLD === 0) {
    pruneOldEntries();
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Record a rate limit check hit (whether allowed or not).
 */
export function recordHit(ip: string, tier: RateLimitTier): void {
  maybeAutoPrune();

  const now = Date.now();
  totalHits++;

  // Per-tier stats
  if (!tierStats[tier]) {
    tierStats[tier] = { hits: 0, blocks: 0 };
  }
  tierStats[tier].hits++;

  // Per-IP stats
  let stats = ipStats.get(ip);
  if (!stats) {
    stats = { hits: 0, blocks: 0, firstSeen: now, lastSeen: now, byTier: {} };
    ipStats.set(ip, stats);
  }
  stats.hits++;
  stats.lastSeen = now;

  if (!stats.byTier[tier]) {
    stats.byTier[tier] = { hits: 0, blocks: 0 };
  }
  stats.byTier[tier].hits++;
}

/**
 * Record a rate limit block (request was denied due to rate limit).
 */
export function recordBlock(ip: string, tier: RateLimitTier): void {
  maybeAutoPrune();

  const now = Date.now();
  totalBlocks++;

  // Per-tier stats
  if (!tierStats[tier]) {
    tierStats[tier] = { hits: 0, blocks: 0 };
  }
  tierStats[tier].blocks++;

  // Per-IP stats
  let stats = ipStats.get(ip);
  if (!stats) {
    stats = { hits: 0, blocks: 0, firstSeen: now, lastSeen: now, byTier: {} };
    ipStats.set(ip, stats);
  }
  stats.blocks++;
  stats.lastSeen = now;

  if (!stats.byTier[tier]) {
    stats.byTier[tier] = { hits: 0, blocks: 0 };
  }
  stats.byTier[tier].blocks++;
}

/**
 * Get aggregated rate limit statistics.
 */
export function getStats(): RateLimitStats {
  // Build top 10 most blocked IPs
  const sortedIPs = [...ipStats.entries()]
    .filter(([, stats]) => stats.blocks > 0)
    .sort((a, b) => b[1].blocks - a[1].blocks)
    .slice(0, 10);

  const topBlockedIPs = sortedIPs.map(([ip, stats]) => ({
    ip,
    hits: stats.hits,
    blocks: stats.blocks,
    lastSeen: new Date(stats.lastSeen).toISOString(),
  }));

  return {
    totalHits,
    totalBlocks,
    uniqueIPs: ipStats.size,
    byTier: { ...tierStats },
    topBlockedIPs,
    windowStart: new Date(windowStart).toISOString(),
    windowEnd: new Date().toISOString(),
  };
}

/**
 * Reset rate limit tracking data for a specific IP address.
 * Returns true if the IP was found and reset, false otherwise.
 */
export function resetForIp(ip: string): boolean {
  const stats = ipStats.get(ip);
  if (!stats) return false;

  // Subtract from totals
  totalHits -= stats.hits;
  totalBlocks -= stats.blocks;

  // Subtract from tier stats
  for (const [tier, tStats] of Object.entries(stats.byTier)) {
    if (tierStats[tier]) {
      tierStats[tier].hits -= tStats.hits;
      tierStats[tier].blocks -= tStats.blocks;
    }
  }

  ipStats.delete(ip);
  return true;
}

/**
 * Reset all stats. Primarily for testing.
 */
export function resetAllStats(): void {
  ipStats.clear();
  totalHits = 0;
  totalBlocks = 0;
  for (const key of Object.keys(tierStats)) {
    delete tierStats[key];
  }
  windowStart = Date.now();
  opCounter = 0;
}
