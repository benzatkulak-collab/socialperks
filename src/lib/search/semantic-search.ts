/**
 * Semantic Search — Wires the embedding engine for real campaign-influencer
 * matching and discovery.
 *
 * Provides:
 * - indexAllData()  — populate the embedding store from seed data and campaigns
 * - semanticSearch() — find nearest neighbors for a text query
 * - getRecommendedCampaigns() — campaigns best-suited for an influencer
 * - getRecommendedInfluencers() — influencers best-suited for a campaign
 */

import {
  embeddingEngine,
  type CampaignInput,
  type BusinessInput,
  type InfluencerInput,
  type EmbeddableEntityType,
} from "@/lib/embedding-engine";
import { createSeedData, type SeedBusiness, type SeedInfluencer } from "@/lib/seed";
import { generateCampaigns, type GeneratedCampaign } from "@/lib/ai-engine";
import { findAction } from "@/lib/platforms";

// ─── Result Types ─────────────────────────────────────────────────────────

export interface SemanticResult {
  entityId: string;
  entityType: EmbeddableEntityType;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface RecommendedCampaign {
  campaignId: string;
  campaignName: string;
  businessId: string;
  businessName: string;
  businessType: string;
  category: string;
  tier: string;
  discountValue: number;
  discountType: "pct" | "dol";
  semanticScore: number;
  platformMatch: number;
  rewardBoost: number;
  finalScore: number;
  reason: string;
}

export interface RecommendedInfluencer {
  influencerId: string;
  displayName: string;
  niches: string[];
  followerCount: number;
  engagementRate: number;
  tier: string;
  location: string;
  semanticScore: number;
  finalScore: number;
  reason: string;
}

// ─── Internal State ───────────────────────────────────────────────────────

let indexed = false;
let indexedCampaignMap: Map<string, { campaign: GeneratedCampaign; business: SeedBusiness }> = new Map();
let indexedInfluencerMap: Map<string, SeedInfluencer> = new Map();
let indexedBusinessMap: Map<string, SeedBusiness> = new Map();

// ─── Index All Data ───────────────────────────────────────────────────────

/**
 * Generate and store embeddings for all available data: businesses, influencers,
 * and AI-generated campaigns for each business. Returns counts indexed.
 */
export function indexAllData(): { campaigns: number; influencers: number; businesses: number } {
  const seed = createSeedData();

  let campaignCount = 0;
  let influencerCount = 0;
  let businessCount = 0;

  // Reset maps
  indexedCampaignMap = new Map();
  indexedInfluencerMap = new Map();
  indexedBusinessMap = new Map();

  // Index businesses
  for (const biz of seed.businesses) {
    const input: BusinessInput = {
      id: biz.id,
      name: biz.name,
      type: biz.type,
      size: biz.size,
      location: biz.location,
      industry: biz.industry,
    };

    const vector = embeddingEngine.generateBusinessEmbedding(input);
    embeddingEngine.store(biz.id, "business", vector, {
      name: biz.name,
      type: biz.type,
      size: biz.size,
      location: biz.location,
      industry: biz.industry,
    });

    indexedBusinessMap.set(biz.id, biz);
    businessCount++;
  }

  // Index influencers
  for (const inf of seed.influencers) {
    const input: InfluencerInput = {
      id: inf.id,
      displayName: inf.displayName,
      niches: inf.niches,
      platforms: inf.platforms.map((p) => ({
        platformId: p.platformId,
        followers: p.followers,
        engagementRate: inf.engagementRate / 100, // seed stores as percentage
      })),
      followerCount: inf.followerCount,
      engagementRate: inf.engagementRate / 100,
      tier: inf.tier,
      location: inf.location,
    };

    const vector = embeddingEngine.generateInfluencerEmbedding(input);
    embeddingEngine.store(inf.id, "influencer", vector, {
      displayName: inf.displayName,
      niches: inf.niches,
      followerCount: inf.followerCount,
      engagementRate: inf.engagementRate,
      tier: inf.tier,
      location: inf.location,
      platforms: inf.platforms.map((p) => p.platformId),
    });

    indexedInfluencerMap.set(inf.id, inf);
    influencerCount++;
  }

  // Generate and index campaigns for each business
  for (const biz of seed.businesses) {
    const campaigns = generateCampaigns({
      businessType: biz.type,
      businessSize: biz.size,
    });

    for (const campaign of campaigns) {
      const campaignId = `${biz.id}_${campaign.id}`;

      const input: CampaignInput = {
        id: campaignId,
        name: campaign.name,
        actions: campaign.actions,
        discountValue: campaign.discountValue,
        discountType: campaign.discountType,
        category: campaign.category,
        tier: campaign.tier,
        description: campaign.description,
        tags: campaign.tags,
      };

      const vector = embeddingEngine.generateCampaignEmbedding(input);
      embeddingEngine.store(campaignId, "campaign", vector, {
        name: campaign.name,
        businessId: biz.id,
        businessName: biz.name,
        businessType: biz.type,
        category: campaign.category,
        tier: campaign.tier,
        discountValue: campaign.discountValue,
        discountType: campaign.discountType,
        actions: campaign.actions,
        estimatedReach: campaign.estimatedReach,
      });

      indexedCampaignMap.set(campaignId, { campaign, business: biz });
      campaignCount++;
    }
  }

  indexed = true;
  return { campaigns: campaignCount, influencers: influencerCount, businesses: businessCount };
}

/**
 * Ensure data is indexed. Lazy initialization on first use.
 */
export function ensureIndexed(): void {
  if (!indexed) {
    indexAllData();
  }
}

// ─── Semantic Search ──────────────────────────────────────────────────────

/**
 * Generate an embedding for a text query and find the nearest neighbors.
 * The query is converted to a pseudo-campaign embedding by building a
 * synthetic campaign input from the query terms.
 */
export function semanticSearch(
  query: string,
  type?: EmbeddableEntityType,
  limit: number = 10
): SemanticResult[] {
  ensureIndexed();

  // Build a pseudo-embedding from the query text by creating a synthetic
  // campaign input that captures the query's semantic intent.
  const queryInput: CampaignInput = {
    id: "__query__",
    name: query,
    actions: [],
    discountValue: 10,
    discountType: "pct",
    category: query,
    tier: "essential",
    description: query,
    tags: query.toLowerCase().split(/\s+/),
  };

  const queryVector = embeddingEngine.generateCampaignEmbedding(queryInput);

  // If a specific type is requested, search only that type
  if (type) {
    return embeddingEngine
      .findSimilar(queryVector, type, limit)
      .map((r) => ({
        entityId: r.entityId,
        entityType: type,
        similarity: r.similarity,
        metadata: r.metadata,
      }));
  }

  // Otherwise search across all types and merge results
  const types: EmbeddableEntityType[] = ["campaign", "business", "influencer"];
  const allResults: SemanticResult[] = [];

  for (const t of types) {
    const results = embeddingEngine.findSimilar(queryVector, t, limit);
    for (const r of results) {
      allResults.push({
        entityId: r.entityId,
        entityType: t,
        similarity: r.similarity,
        metadata: r.metadata,
      });
    }
  }

  // Sort by similarity descending and take top N
  allResults.sort((a, b) => b.similarity - a.similarity);
  return allResults.slice(0, limit);
}

// ─── Recommended Campaigns for Influencer ─────────────────────────────────

/**
 * Find the best campaigns for an influencer using semantic similarity,
 * platform overlap, and reward value.
 */
export function getRecommendedCampaigns(
  influencerId: string,
  limit: number = 10,
  options?: { platforms?: string[]; minScore?: number }
): RecommendedCampaign[] {
  ensureIndexed();

  const influencerRecord = embeddingEngine.get(influencerId);
  if (!influencerRecord) return [];

  const influencer = indexedInfluencerMap.get(influencerId);
  if (!influencer) return [];

  const influencerPlatforms = new Set(
    influencer.platforms.map((p) => p.platformId)
  );

  // Use the embedding engine's recommendation method for initial scoring
  const semanticMatches = embeddingEngine.recommendCampaignsForInfluencer(
    influencerId,
    200 // get a large pool for re-ranking
  );

  const results: RecommendedCampaign[] = [];

  for (const match of semanticMatches) {
    const campaignData = indexedCampaignMap.get(match.entityId);
    if (!campaignData) continue;

    const { campaign, business } = campaignData;

    // Platform overlap score (0-1)
    const campaignPlatforms = new Set<string>();
    for (const actionId of campaign.actions) {
      const action = findAction(actionId);
      if (action) {
        campaignPlatforms.add(action.platformId);
      }
    }

    let platformOverlap = 0;
    if (campaignPlatforms.size > 0) {
      let matched = 0;
      for (const pid of campaignPlatforms) {
        if (influencerPlatforms.has(pid)) matched++;
      }
      platformOverlap = matched / campaignPlatforms.size;
    }

    // Filter by platform if specified
    if (options?.platforms && options.platforms.length > 0) {
      const filterSet = new Set(options.platforms);
      let hasMatch = false;
      for (const pid of campaignPlatforms) {
        if (filterSet.has(pid)) {
          hasMatch = true;
          break;
        }
      }
      if (!hasMatch) continue;
    }

    // Reward value boost (normalized 0-1, higher discount = more attractive)
    const rewardBoost = Math.min(1, campaign.discountValue / 30);

    // Composite score: 60% semantic + 25% platform match + 15% reward
    const finalScore =
      Math.round(
        (match.score * 0.6 + platformOverlap * 0.25 + rewardBoost * 0.15) *
          10000
      ) / 10000;

    if (options?.minScore && finalScore < options.minScore) continue;

    // Build a human-readable reason
    const nicheOverlap = influencer.niches.filter((n) => {
      const bizType = business.type.toLowerCase();
      return bizType.includes(n.toLowerCase()) || n.toLowerCase().includes("food") && bizType.includes("restaurant");
    });

    let reason: string;
    if (nicheOverlap.length > 0) {
      reason = `Your ${nicheOverlap.join(" & ")} content aligns with ${business.name}'s ${business.type} audience.`;
    } else if (platformOverlap >= 0.8) {
      reason = `Strong platform match: ${business.name} targets platforms you're active on.`;
    } else {
      reason = `${business.name} is looking for ${campaign.category} content that fits your audience profile.`;
    }

    results.push({
      campaignId: match.entityId,
      campaignName: campaign.name,
      businessId: business.id,
      businessName: business.name,
      businessType: business.type,
      category: campaign.category,
      tier: campaign.tier,
      discountValue: campaign.discountValue,
      discountType: campaign.discountType,
      semanticScore: match.score,
      platformMatch: Math.round(platformOverlap * 10000) / 10000,
      rewardBoost: Math.round(rewardBoost * 10000) / 10000,
      finalScore,
      reason,
    });
  }

  // Sort by final score descending
  results.sort((a, b) => b.finalScore - a.finalScore);
  return results.slice(0, limit);
}

// ─── Recommended Influencers for Campaign ─────────────────────────────────

/**
 * Find the best influencers for a campaign using semantic similarity,
 * enriched with influencer metadata.
 */
export function getRecommendedInfluencers(
  campaignId: string,
  limit: number = 10
): RecommendedInfluencer[] {
  ensureIndexed();

  const campaignData = indexedCampaignMap.get(campaignId);
  if (!campaignData) return [];

  const { campaign, business } = campaignData;

  // Use the embedding engine's recommendation method
  const semanticMatches = embeddingEngine.recommendInfluencersForCampaign(
    campaignId,
    50
  );

  const results: RecommendedInfluencer[] = [];

  for (const match of semanticMatches) {
    const influencer = indexedInfluencerMap.get(match.entityId);
    if (!influencer) continue;

    // Engagement quality boost
    const engagementBoost = Math.min(1, influencer.engagementRate / 10);

    // Composite score: 70% semantic + 30% engagement quality
    const finalScore =
      Math.round((match.score * 0.7 + engagementBoost * 0.3) * 10000) / 10000;

    // Build reason
    const sharedNiches = influencer.niches.filter((n) =>
      business.type.toLowerCase().includes(n.toLowerCase())
    );

    let reason: string;
    if (sharedNiches.length > 0) {
      reason = `${influencer.displayName}'s ${sharedNiches.join(", ")} content is a natural fit for ${business.type}.`;
    } else {
      reason = `${influencer.displayName}'s audience profile and engagement match ${campaign.name}'s goals.`;
    }

    results.push({
      influencerId: match.entityId,
      displayName: influencer.displayName,
      niches: [...influencer.niches],
      followerCount: influencer.followerCount,
      engagementRate: influencer.engagementRate,
      tier: influencer.tier,
      location: influencer.location,
      semanticScore: match.score,
      finalScore,
      reason,
    });
  }

  results.sort((a, b) => b.finalScore - a.finalScore);
  return results.slice(0, limit);
}

// ─── Utility ──────────────────────────────────────────────────────────────

/**
 * Reset the index. Primarily for testing.
 */
export function resetIndex(): void {
  embeddingEngine.clear();
  indexedCampaignMap = new Map();
  indexedInfluencerMap = new Map();
  indexedBusinessMap = new Map();
  indexed = false;
}
