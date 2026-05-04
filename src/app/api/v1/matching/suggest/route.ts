/**
 * GET /api/v1/matching/suggest?platformId=ig&niche=coffee&limit=5
 *
 * Returns top influencers matched to a campaign's platform + niche.
 * Public (relaxed rate limit) so a logged-in business can call it
 * directly from the dashboard, and so the public profile pages can
 * surface "creators like this" widgets later.
 *
 * Initial heuristic — matches against seed.influencers by:
 *   1. Platform overlap (must)
 *   2. Niche overlap (sorted desc)
 *   3. Follower count (tiebreak)
 *
 * Replaceable later with the embedding-based matchingService when the
 * influencer registry is real (instead of seed data).
 */

import type { NextRequest } from "next/server";
import { ok, rateLimit, getQuery } from "../../_shared";
import { createSeedData } from "@/lib/seed";
import { buildInfluencerSlug } from "@/lib/slugs";

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

  // Platform filter (must match if specified)
  if (platformId) {
    candidates = candidates.filter((i) =>
      i.platforms.some((p) => p.platformId.toLowerCase() === platformId),
    );
  }

  // City filter (must match if specified)
  if (city) {
    candidates = candidates.filter((i) =>
      (i.location ?? "").toLowerCase().includes(city),
    );
  }

  // Score: niche overlap → tier weight → follower count
  const scored = candidates.map((i) => {
    let score = 0;
    if (niche && i.niches.some((n) => n.toLowerCase().includes(niche))) score += 50;
    if (i.followerCount >= 100_000) score += 30;
    else if (i.followerCount >= 25_000) score += 20;
    else if (i.followerCount >= 5_000) score += 10;
    score += Math.min(i.engagementRate * 100, 20);
    return { i, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit).map(({ i, score }) => ({
    id: i.id,
    displayName: i.displayName,
    location: i.location,
    followerCount: i.followerCount,
    tier: i.tier,
    niches: i.niches,
    profileUrl: `/i/${buildInfluencerSlug(i)}`,
    matchScore: Math.round(score),
  }));

  return ok({ matches: top, total: scored.length });
}
