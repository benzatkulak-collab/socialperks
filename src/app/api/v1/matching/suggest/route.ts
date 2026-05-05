/**
 * GET /api/v1/matching/suggest?platformId=ig&niche=coffee&city=dc&limit=5
 *
 * Bot-detectable matching engine v2 (Phase 226).
 *
 * SCORING FORMULA — published in the response so callers don't have
 * to reverse-engineer:
 *
 *   score =
 *       (niche_match     ? 50 : 0)
 *     + tier_weight                              // 10/20/30/30
 *     + min(engagement_rate * 100, 20)           // 0..20
 *     + freshness_bonus                          // +10 if profile <14d old
 *     + tier_multiplier_applied                  // surfaced separately
 *
 * Bots can predict their fill rate. Power users can target tier
 * thresholds + the new-account 14-day freshness bonus.
 */

import type { NextRequest } from "next/server";
import { ok, rateLimit, getQuery } from "../../_shared";
import { createSeedData } from "@/lib/seed";
import { buildInfluencerSlug } from "@/lib/slugs";
import { tierMatchMultiplier } from "@/lib/influencer/tier";

const SCORING = {
  nicheMatch: 50,
  tier: { mega: 30, macro: 30, mid: 20, micro: 10 } as const,
  engagementCap: 20,
  freshnessBonus: 10,
  freshnessWindowDays: 14,
};

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const params = getQuery(req);
  const platformId = params.get("platformId")?.toLowerCase() ?? null;
  const niche = params.get("niche")?.toLowerCase() ?? null;
  const limit = Math.min(20, Math.max(1, parseInt(params.get("limit") ?? "5", 10) || 5));
  const city = params.get("city")?.toLowerCase() ?? null;

  const seed = createSeedData();

  let candidates = [...seed.influencers];
  if (platformId) {
    candidates = candidates.filter((i) =>
      i.platforms.some((p) => p.platformId.toLowerCase() === platformId),
    );
  }
  if (city) {
    candidates = candidates.filter((i) =>
      (i.location ?? "").toLowerCase().includes(city),
    );
  }

  // Reference timestamp for freshness — seed data has no createdAt, so
  // we treat all seed records as established. Once registrations persist
  // we plug in the real timestamp here.
  const now = Date.now();
  void now;

  const scored = candidates.map((i) => {
    let score = 0;
    if (niche && i.niches.some((n) => n.toLowerCase().includes(niche))) {
      score += SCORING.nicheMatch;
    }
    score += SCORING.tier[i.tier] ?? 0;
    score += Math.min(i.engagementRate * 100, SCORING.engagementCap);
    // freshness_bonus: 0 for seed data; real once we persist registration timestamps.
    const multiplier = tierMatchMultiplier(
      i.tier === "mega" ? "Platinum" :
      i.tier === "macro" ? "Gold" :
      i.tier === "mid" ? "Silver" : "Bronze",
    );
    return { i, score: score * multiplier, baseScore: score, multiplier };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit).map(({ i, score, baseScore, multiplier }) => ({
    id: i.id,
    displayName: i.displayName,
    location: i.location,
    followerCount: i.followerCount,
    tier: i.tier,
    niches: i.niches,
    profileUrl: `/i/${buildInfluencerSlug(i)}`,
    matchScore: Math.round(score),
    baseScore: Math.round(baseScore),
    tierMultiplier: multiplier,
  }));

  return ok({
    matches: top,
    total: scored.length,
    meta: {
      scoring: SCORING,
      filters: { platformId, niche, city },
    },
  });
}
