/**
 * Public Stats API — /api/v1/stats/public
 *
 * GET: Returns aggregate platform stats safe for marketing/landing-page
 * consumption. Anonymous and cached aggressively.
 *
 * Why this endpoint exists: the pricing page wants to show real social
 * proof ("X campaigns launched · Y businesses"). Without measurement
 * those numbers are made up; with this endpoint they're live.
 *
 * Privacy / security:
 *   • Aggregates only — no per-business identifiers ever leave.
 *   • Numbers are floored to nearest 5 to avoid leaking precise growth
 *     velocity to competitors via repeated polling.
 *   • Hidden entirely below a minimum activity threshold so the page
 *     doesn't read "2 businesses use this" on day 1.
 *   • In-process cache with 5-minute TTL keeps load from this endpoint
 *     well below 1 query/sec even under heavy traffic.
 */

import type { NextRequest } from "next/server";
import { ok, rateLimit, withTiming } from "../../_shared";
import { campaignManager } from "@/lib/campaign-state-machine";

// Below these floors the "live stats" UI hides itself. Prevents the
// "we have 3 customers" optics during cold-start.
const MIN_CAMPAIGNS_TO_SHOW = 10;
const MIN_BUSINESSES_TO_SHOW = 3;

// Round counts to the nearest N. Two purposes:
//   1. Makes the numbers feel "marketing-honest" (i.e. obviously rounded)
//   2. Prevents tracking precise day-by-day growth via polling
const ROUND_TO = 5;

interface PublicStats {
  show: boolean;
  campaigns: number;
  businesses: number;
  active: number;
  updatedAt: string;
}

interface CacheEntry {
  data: PublicStats;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: CacheEntry | null = null;

function roundDown(value: number, to: number): number {
  if (value <= 0) return 0;
  return Math.floor(value / to) * to;
}

function compute(): PublicStats {
  const all = campaignManager.listAll();
  const businessIds = new Set<string>();
  let active = 0;
  for (const c of all) {
    businessIds.add(c.businessId);
    if (c.state === "active") active += 1;
  }

  const campaigns = roundDown(all.length, ROUND_TO);
  const businesses = roundDown(businessIds.size, ROUND_TO);
  const activeRounded = roundDown(active, ROUND_TO);

  const show =
    all.length >= MIN_CAMPAIGNS_TO_SHOW &&
    businessIds.size >= MIN_BUSINESSES_TO_SHOW;

  return {
    show,
    campaigns,
    businesses,
    active: activeRounded,
    updatedAt: new Date().toISOString(),
  };
}

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return ok(cache.data);
  }

  const data = compute();
  cache = { data, expiresAt: now + CACHE_TTL_MS };
  return ok(data);
});
