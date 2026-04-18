/**
 * GET /api/v1/recommendations
 *
 * ML-powered recommendations for an influencer. Blends the matching engine
 * (niche affinity) with the embedding engine (semantic similarity) for
 * higher-quality results.
 *
 * Score formula: 60% semantic similarity + 40% matching engine affinity.
 *
 * Query params: influencerId (required), maxCampaigns?, maxBusinesses?, minScore?
 */

import { NextRequest } from "next/server";
import { ok, err, getQuery, rateLimit, requireAuth, withTiming } from "../_shared";
import { createSeedData } from "@/lib/seed";
import { generateCampaigns } from "@/lib/ai-engine";
import { getNicheAffinity } from "@/lib/matching-engine";
import { getRecommendedCampaigns, ensureIndexed } from "@/lib/search/semantic-search";

// Seed data for lookups
const seedData = createSeedData();

export const GET = withTiming(async (req: NextRequest) => {
  // Auth required — recommendation data exposes matching strategy
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const rl = rateLimit(req, "standard");
  if (rl) return rl;

  const params = getQuery(req);
  const influencerId = params.get("influencerId");

  if (!influencerId) {
    return err("MISSING_PARAM", "influencerId query parameter is required", 400);
  }

  const maxCampaigns = Math.min(50, Math.max(1, parseInt(params.get("maxCampaigns") ?? "10", 10) || 10));
  const maxBusinesses = Math.min(20, Math.max(1, parseInt(params.get("maxBusinesses") ?? "5", 10) || 5));
  const minScore = Math.max(0, Math.min(1, parseFloat(params.get("minScore") ?? "0.2") || 0.2));

  // Look up influencer
  const influencer = seedData.influencers.find((i) => i.id === influencerId);
  if (!influencer) {
    return err("NOT_FOUND", `Influencer "${influencerId}" not found`, 404);
  }

  // ── Matching Engine: business affinity scores ──────────────────────────
  const businessMatches = seedData.businesses
    .map((business) => {
      const affinity = getNicheAffinity(influencer.niches, business.type);
      return {
        businessId: business.id,
        businessName: business.name,
        businessType: business.type,
        location: business.location,
        affinityScore: Math.round(affinity * 100) / 100,
      };
    })
    .filter((m) => m.affinityScore >= minScore)
    .sort((a, b) => b.affinityScore - a.affinityScore)
    .slice(0, maxBusinesses);

  // ── Semantic Engine: embedding-based campaign recommendations ──────────
  ensureIndexed();

  // Build a lookup of semantic scores keyed by businessId
  const semanticCampaigns = getRecommendedCampaigns(influencerId, 100);
  const semanticByBusiness = new Map<string, number>();
  for (const sc of semanticCampaigns) {
    const existing = semanticByBusiness.get(sc.businessId) ?? 0;
    if (sc.semanticScore > existing) {
      semanticByBusiness.set(sc.businessId, sc.semanticScore);
    }
  }

  // ── Blended Campaign Recommendations ──────────────────────────────────
  const campaignRecommendations = businessMatches.flatMap((bm) => {
    const campaigns = generateCampaigns({
      businessType: bm.businessType,
      businessSize: "small",
    });

    // Get best semantic score for this business (default to 0.5 neutral)
    const semanticScore = semanticByBusiness.get(bm.businessId) ?? 0.5;

    return campaigns.slice(0, 3).map((campaign) => {
      // Blended score: 60% semantic + 40% affinity
      const blendedScore =
        Math.round((semanticScore * 0.6 + bm.affinityScore * 0.4) * 100) / 100;

      return {
        businessId: bm.businessId,
        businessName: bm.businessName,
        campaignId: campaign.id,
        campaignName: campaign.name,
        category: campaign.category,
        tier: campaign.tier,
        estimatedReach: campaign.estimatedReach,
        discountValue: campaign.discountValue,
        discountType: campaign.discountType,
        matchScore: blendedScore,
        affinityScore: bm.affinityScore,
        semanticScore: Math.round(semanticScore * 100) / 100,
        reason: `${influencer.displayName}'s content in ${influencer.niches.join(", ")} aligns with ${bm.businessName}'s ${bm.businessType} audience.`,
      };
    });
  });

  // Sort by blended match score, take top N
  const topCampaigns = campaignRecommendations
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, maxCampaigns);

  return ok({
    influencerId: influencer.id,
    influencerName: influencer.displayName,
    businessMatches,
    campaignRecommendations: topCampaigns,
    totalCampaigns: topCampaigns.length,
    totalBusinesses: businessMatches.length,
  });
});
