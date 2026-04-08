// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Influencer-Business Matching Engine
// Scores and ranks influencers against campaigns based on niche alignment,
// audience quality, platform fit, location proximity, and price alignment.
// ══════════════════════════════════════════════════════════════════════════════

import type {
  Influencer,
  LaunchedCampaign,
  Business,
  ActionType,
} from "./types";
import { findAction } from "./platforms";
import { detectTraits, type BusinessTraits } from "./ai-engine";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MatchScore {
  influencerId: string;
  campaignId: string;
  overallScore: number; // 0-100
  breakdown: {
    nicheAlignment: number; // 0-25
    audienceSize: number; // 0-20
    engagementQuality: number; // 0-20
    locationProximity: number; // 0-15
    platformMatch: number; // 0-10
    priceAlignment: number; // 0-10
  };
  recommendation: "strong_match" | "good_match" | "possible_match" | "poor_match";
  reasoning: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Platform average engagement rates (as decimals). */
const PLATFORM_AVG_ENGAGEMENT: Record<string, number> = {
  ig: 0.030, // Instagram ~3%
  tt: 0.050, // TikTok ~5%
  yt: 0.035, // YouTube ~3.5%
  fb: 0.015, // Facebook ~1.5%
  xw: 0.020, // X ~2%
  li: 0.025, // LinkedIn ~2.5%
  pi: 0.020, // Pinterest ~2%
  th: 0.025, // Threads ~2.5%
  sc: 0.030, // Snapchat ~3%
  rd: 0.040, // Reddit ~4%
  nd: 0.035, // Nextdoor ~3.5%
};

/**
 * Niche-to-business-trait affinity scores.
 * Maps influencer niche keywords to BusinessTraits keys with a 0-1 affinity.
 * Higher means the niche is more relevant to that trait.
 */
const NICHE_TRAIT_AFFINITY: Record<string, Partial<Record<keyof BusinessTraits, number>>> = {
  food: { food: 1.0, hospitality: 0.6, visual: 0.4, entertainment: 0.3, luxury: 0.3 },
  cooking: { food: 0.9, hospitality: 0.4, visual: 0.3 },
  foodie: { food: 1.0, hospitality: 0.5, visual: 0.4 },
  restaurant: { food: 1.0, hospitality: 0.5 },
  fitness: { wellness: 1.0, transform: 0.8, visual: 0.5, healthcare: 0.3 },
  gym: { wellness: 0.9, transform: 0.8 },
  yoga: { wellness: 1.0, transform: 0.6, healthcare: 0.3 },
  health: { wellness: 0.8, healthcare: 0.9, transform: 0.4 },
  wellness: { wellness: 1.0, healthcare: 0.5, transform: 0.5, luxury: 0.3 },
  beauty: { visual: 0.9, transform: 1.0, luxury: 0.5, retail: 0.4 },
  skincare: { visual: 0.7, transform: 0.8, healthcare: 0.3, luxury: 0.4 },
  makeup: { visual: 0.9, transform: 0.9, retail: 0.4 },
  fashion: { visual: 0.8, retail: 1.0, luxury: 0.6, transform: 0.3 },
  style: { visual: 0.7, retail: 0.9, luxury: 0.5 },
  lifestyle: { visual: 0.6, food: 0.4, wellness: 0.4, retail: 0.4, hospitality: 0.3 },
  travel: { hospitality: 1.0, food: 0.5, visual: 0.7, entertainment: 0.5, luxury: 0.5 },
  photography: { visual: 1.0, entertainment: 0.4, luxury: 0.3 },
  art: { visual: 0.9, entertainment: 0.6, education: 0.3 },
  music: { entertainment: 1.0, visual: 0.3, education: 0.3 },
  tech: { b2b: 0.8, education: 0.5 },
  business: { b2b: 1.0, education: 0.3 },
  marketing: { b2b: 0.9, education: 0.4 },
  finance: { b2b: 0.8, education: 0.4 },
  education: { education: 1.0, b2b: 0.3 },
  parenting: { healthcare: 0.3, retail: 0.5, food: 0.3, education: 0.5 },
  pets: { pets: 1.0, visual: 0.5, retail: 0.4 },
  animals: { pets: 1.0, visual: 0.4 },
  dogs: { pets: 1.0, visual: 0.4 },
  cats: { pets: 0.9, visual: 0.4 },
  automotive: { automotive: 1.0, service: 0.5 },
  cars: { automotive: 1.0, visual: 0.4, luxury: 0.3 },
  home: { retail: 0.6, visual: 0.5, service: 0.4, local: 0.5 },
  diy: { retail: 0.5, visual: 0.4, service: 0.3, education: 0.4 },
  garden: { retail: 0.5, visual: 0.5, seasonal: 0.6, local: 0.5 },
  sports: { wellness: 0.6, entertainment: 0.7, visual: 0.4 },
  gaming: { entertainment: 0.9, visual: 0.3, b2b: 0.2 },
  comedy: { entertainment: 1.0, visual: 0.3 },
  luxury: { luxury: 1.0, visual: 0.6, hospitality: 0.5, retail: 0.5 },
  local: { local: 1.0, service: 0.5, food: 0.4, retail: 0.4 },
  community: { local: 0.9, service: 0.4 },
  sustainability: { retail: 0.4, food: 0.3, local: 0.5 },
  vegan: { food: 0.8, wellness: 0.5, retail: 0.3 },
  nightlife: { entertainment: 0.9, food: 0.5, hospitality: 0.4 },
  drinks: { food: 0.7, entertainment: 0.5, hospitality: 0.4 },
  coffee: { food: 0.9, visual: 0.5, local: 0.5 },
  baking: { food: 0.9, visual: 0.6 },
  tattoo: { visual: 0.9, transform: 1.0, entertainment: 0.3 },
  barber: { visual: 0.6, transform: 0.9, local: 0.5 },
  dental: { healthcare: 1.0, service: 0.7, transform: 0.4 },
  medical: { healthcare: 1.0, service: 0.7 },
  legal: { b2b: 0.7, service: 1.0 },
  realestate: { b2b: 0.5, service: 0.7, visual: 0.5, luxury: 0.4 },
  "real estate": { b2b: 0.5, service: 0.7, visual: 0.5, luxury: 0.4 },
};

/**
 * Ideal follower count ranges per campaign tier.
 * [idealMin, idealMax] — influencers within this range score highest.
 */
const TIER_FOLLOWER_RANGES: Record<string, [number, number]> = {
  starter: [500, 5_000],
  essential: [1_000, 25_000],
  growth: [5_000, 100_000],
  high_impact: [10_000, 250_000],
  premium: [25_000, 1_000_000],
};

// ─── Niche Affinity ─────────────────────────────────────────────────────────

/**
 * Calculates how well an influencer's niches align with a business type.
 * Uses trait detection from the AI engine and the niche-trait affinity map.
 * Returns a score from 0 to 1.
 */
export function getNicheAffinity(
  influencerNiches: readonly string[],
  businessType: string
): number {
  if (influencerNiches.length === 0) return 0;

  const traits = detectTraits(businessType);
  const activeTraits = (Object.entries(traits) as [keyof BusinessTraits, boolean][])
    .filter(([, v]) => v)
    .map(([k]) => k);

  if (activeTraits.length === 0) return 0.05; // baseline for unrecognized business types

  let maxAffinity = 0;
  let totalAffinity = 0;
  let matchCount = 0;

  for (const niche of influencerNiches) {
    const normalizedNiche = niche.toLowerCase().trim();
    const affinityMap = NICHE_TRAIT_AFFINITY[normalizedNiche];

    if (affinityMap) {
      let nicheScore = 0;
      for (const trait of activeTraits) {
        const score = affinityMap[trait] ?? 0;
        nicheScore = Math.max(nicheScore, score);
      }
      if (nicheScore > 0) {
        totalAffinity += nicheScore;
        matchCount++;
        maxAffinity = Math.max(maxAffinity, nicheScore);
      }
    } else {
      // Fuzzy matching: check if niche substring appears in business type
      const bt = businessType.toLowerCase();
      if (bt.includes(normalizedNiche) || normalizedNiche.includes(bt)) {
        totalAffinity += 0.7;
        matchCount++;
        maxAffinity = Math.max(maxAffinity, 0.7);
      }
    }
  }

  if (matchCount === 0) return 0.05; // near-zero for completely unrelated

  // Weighted formula: 60% best single match + 40% average across all matches
  const avgAffinity = totalAffinity / matchCount;
  return Math.min(1, maxAffinity * 0.6 + avgAffinity * 0.4);
}

// ─── Score Components ───────────────────────────────────────────────────────

/** Score niche alignment (0-25). */
function scoreNicheAlignment(
  influencer: Influencer,
  business: Business
): number {
  const affinity = getNicheAffinity(influencer.niches, business.type);
  return Math.round(affinity * 25);
}

/**
 * Infer the campaign tier from its tags or characteristics.
 * LaunchedCampaign doesn't carry a tier directly, so we infer from
 * tags, action count, and discount value.
 */
function inferCampaignTier(campaign: LaunchedCampaign): string {
  const tags = campaign.tags ?? [];
  // Check tags for explicit tier labels
  for (const tier of ["premium", "high_impact", "growth", "essential", "starter"]) {
    if (tags.includes(tier)) return tier;
  }
  // Infer from campaign characteristics
  if (campaign.actions.length >= 5 && campaign.discountValue >= 25) return "premium";
  if (campaign.actions.length >= 3 && campaign.discountValue >= 15) return "high_impact";
  if (campaign.discountValue >= 10) return "growth";
  if (campaign.discountValue >= 5) return "essential";
  return "starter";
}

/** Score audience size relative to campaign needs (0-20). */
function scoreAudienceSize(
  influencer: Influencer,
  campaign: LaunchedCampaign
): number {
  const tier = inferCampaignTier(campaign);
  const range = TIER_FOLLOWER_RANGES[tier] ?? TIER_FOLLOWER_RANGES.essential;
  const [idealMin, idealMax] = range;
  const followers = influencer.followerCount;

  if (followers >= idealMin && followers <= idealMax) {
    // Within ideal range: full score
    return 20;
  }

  if (followers < idealMin) {
    // Below range: proportional score, minimum 2
    const ratio = followers / idealMin;
    return Math.max(2, Math.round(ratio * 20));
  }

  // Above range: slight penalty for being oversized (still valuable but possibly overpriced)
  const overRatio = idealMax / followers;
  return Math.max(8, Math.round(overRatio * 20));
}

/** Score engagement quality relative to platform averages (0-20). */
function scoreEngagementQuality(influencer: Influencer): number {
  if (influencer.platforms.length === 0) return 0;

  let totalScore = 0;
  let platformCount = 0;

  for (const plat of influencer.platforms) {
    const avgRate = PLATFORM_AVG_ENGAGEMENT[plat.platformId] ?? 0.025;
    const ratio = plat.engagementRate / avgRate;

    // Scoring: 1.0x avg = 10/20, 2.0x avg = 20/20, 0.5x avg = 5/20
    const platformScore = Math.min(20, Math.round(ratio * 10));
    totalScore += platformScore;
    platformCount++;
  }

  return Math.round(totalScore / platformCount);
}

/**
 * Score location proximity (0-15).
 * Uses string-based matching since we don't have geocoding.
 * Compares city, state, and regional terms.
 */
function scoreLocationProximity(
  influencer: Influencer,
  business: Business
): number {
  const bizLocation = (business.location ?? "").toLowerCase().trim();
  const infLocation = influencer.location.toLowerCase().trim();

  if (!bizLocation || !infLocation) return 7; // Unknown — give neutral score

  // Exact match
  if (bizLocation === infLocation) return 15;

  // Tokenize and compare location parts
  const bizTokens = tokenizeLocation(bizLocation);
  const infTokens = tokenizeLocation(infLocation);

  let matches = 0;
  const totalBizTokens = bizTokens.length;

  for (const bt of bizTokens) {
    for (const it of infTokens) {
      if (bt === it) {
        matches++;
        break;
      }
    }
  }

  if (totalBizTokens === 0) return 7;

  const matchRatio = matches / totalBizTokens;

  // Same city: 15, same state: 10, same region: 7, different: 3
  if (matchRatio >= 0.8) return 15; // Same city/area
  if (matchRatio >= 0.5) return 12; // Overlapping area
  if (matchRatio >= 0.2) return 8; // Same state or region
  return 3; // Different location
}

/** Common location aliases for fuzzy matching. */
const LOCATION_ALIASES: Record<string, string[]> = {
  "nyc": ["new york", "new york city", "manhattan", "brooklyn", "queens"],
  "new york city": ["new york", "nyc", "manhattan", "brooklyn", "queens"],
  "new york": ["new york city", "nyc"],
  "la": ["los angeles"],
  "los angeles": ["la"],
  "sf": ["san francisco"],
  "san francisco": ["sf"],
  "dc": ["washington", "washington dc", "washington d.c."],
  "washington": ["dc", "washington dc", "washington d.c."],
  "philly": ["philadelphia"],
  "philadelphia": ["philly"],
  "chi": ["chicago"],
  "chicago": ["chi"],
  "dmv": ["washington", "dc", "maryland", "virginia"],
};

function tokenizeLocation(loc: string): string[] {
  const normalized = loc
    .replace(/[,.\-\/\\()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const tokens = normalized
    .split(/\s+/)
    .filter(t => t.length > 1);

  // Add alias tokens for known location abbreviations
  const aliases = LOCATION_ALIASES[normalized];
  if (aliases) {
    for (const alias of aliases) {
      const aliasTokens = alias.split(/\s+/).filter(t => t.length > 1);
      tokens.push(...aliasTokens);
    }
  }

  return [...new Set(tokens)];
}

/**
 * Score platform match (0-10).
 * Checks whether the influencer has accounts on the platforms
 * required by the campaign's actions.
 */
function scorePlatformMatch(
  influencer: Influencer,
  campaign: LaunchedCampaign
): number {
  // Determine which platform IDs the campaign needs
  const requiredPlatformIds = new Set<string>();
  for (const actionId of campaign.actions) {
    const action = findAction(actionId);
    if (action) {
      requiredPlatformIds.add(action.platformId);
    }
  }

  if (requiredPlatformIds.size === 0) return 5; // No identifiable platforms

  const influencerPlatformIds = new Set(influencer.platforms.map(p => p.platformId));

  let matched = 0;
  for (const reqPid of requiredPlatformIds) {
    if (influencerPlatformIds.has(reqPid)) {
      matched++;
    }
  }

  const matchRatio = matched / requiredPlatformIds.size;

  // Full match = 10, partial proportional, none = 0
  return Math.round(matchRatio * 10);
}

/**
 * Score price alignment (0-10).
 * Compares the influencer's rate card against the campaign's budget/perk value.
 */
function scorePriceAlignment(
  influencer: Influencer,
  campaign: LaunchedCampaign,
  business: Business
): number {
  // Determine the campaign budget context
  const campaignBudget = campaign.budgetCap ?? null;

  // Get the relevant action types from the campaign
  const actionTypes = new Set<ActionType>();
  for (const actionId of campaign.actions) {
    const action = findAction(actionId);
    if (action) {
      actionTypes.add(action.type);
    }
  }

  if (actionTypes.size === 0) return 5;

  // Calculate the average influencer rate for the needed action types
  let totalRate = 0;
  let rateCount = 0;
  for (const at of actionTypes) {
    const rate = influencer.rateCard.rates[at];
    if (rate !== undefined && rate > 0) {
      totalRate += rate;
      rateCount++;
    }
  }

  if (rateCount === 0) return 5; // No rate data, neutral

  const avgRate = totalRate / rateCount;
  const totalInfluencerCost = avgRate * campaign.actions.length;

  // If we have a budget cap, compare against it
  if (campaignBudget !== null && campaignBudget > 0) {
    const costRatio = totalInfluencerCost / campaignBudget;

    if (costRatio <= 0.3) return 10; // Very affordable
    if (costRatio <= 0.6) return 8; // Affordable
    if (costRatio <= 1.0) return 5; // Fits budget
    if (costRatio <= 1.5) return 3; // Slightly over
    return 1; // Over budget
  }

  // No budget cap: estimate based on perk value and business size
  const perkValue = campaign.discountValue;
  const sizeMultiplier =
    business.size === "enterprise" ? 4 :
    business.size === "medium" ? 2.5 :
    business.size === "small" ? 1.5 : 1;
  const estimatedBudget = perkValue * sizeMultiplier * 10;

  const costRatio = totalInfluencerCost / Math.max(estimatedBudget, 1);

  if (costRatio <= 0.3) return 10;
  if (costRatio <= 0.6) return 8;
  if (costRatio <= 1.0) return 6;
  if (costRatio <= 1.5) return 4;
  return 2;
}

// ─── Recommendation Classification ──────────────────────────────────────────

function classifyRecommendation(
  score: number
): "strong_match" | "good_match" | "possible_match" | "poor_match" {
  if (score >= 75) return "strong_match";
  if (score >= 55) return "good_match";
  if (score >= 35) return "possible_match";
  return "poor_match";
}

// ─── Reasoning Generator ────────────────────────────────────────────────────

function generateReasoning(
  influencer: Influencer,
  _campaign: LaunchedCampaign,
  business: Business,
  breakdown: MatchScore["breakdown"],
  recommendation: MatchScore["recommendation"]
): string {
  const parts: string[] = [];

  // Overall verdict
  switch (recommendation) {
    case "strong_match":
      parts.push(
        `${influencer.displayName} is an excellent fit for this campaign.`
      );
      break;
    case "good_match":
      parts.push(
        `${influencer.displayName} is a good fit for this campaign with some strong points.`
      );
      break;
    case "possible_match":
      parts.push(
        `${influencer.displayName} could work for this campaign, though alignment is partial.`
      );
      break;
    case "poor_match":
      parts.push(
        `${influencer.displayName} is not well-suited for this campaign.`
      );
      break;
  }

  // Niche reasoning
  if (breakdown.nicheAlignment >= 20) {
    parts.push(
      `Their content niches (${influencer.niches.join(", ")}) align strongly with ${business.type} businesses.`
    );
  } else if (breakdown.nicheAlignment >= 12) {
    parts.push(
      `Their niches partially overlap with ${business.type} audiences.`
    );
  } else if (breakdown.nicheAlignment < 8) {
    parts.push(
      `Their content focus (${influencer.niches.join(", ")}) has limited relevance to ${business.type}.`
    );
  }

  // Audience size reasoning
  if (breakdown.audienceSize >= 16) {
    parts.push(
      `With ${formatFollowers(influencer.followerCount)} followers, their audience size is ideal for this campaign tier.`
    );
  } else if (breakdown.audienceSize < 8) {
    parts.push(
      `Their audience of ${formatFollowers(influencer.followerCount)} may be ${influencer.followerCount < 1000 ? "too small" : "misaligned"} for this campaign's needs.`
    );
  }

  // Engagement reasoning
  if (breakdown.engagementQuality >= 16) {
    parts.push(
      `Engagement rate of ${(influencer.engagementRate * 100).toFixed(1)}% is above platform averages, indicating an active audience.`
    );
  } else if (breakdown.engagementQuality < 8) {
    parts.push(
      `Engagement rate of ${(influencer.engagementRate * 100).toFixed(1)}% is below platform averages, which may limit campaign effectiveness.`
    );
  }

  // Platform match reasoning
  if (breakdown.platformMatch >= 8) {
    parts.push("They have accounts on all required platforms.");
  } else if (breakdown.platformMatch < 5) {
    parts.push("They are missing some platforms this campaign targets.");
  }

  // Location reasoning
  if (breakdown.locationProximity >= 12) {
    parts.push("Location is a strong match for this local business.");
  } else if (breakdown.locationProximity <= 5) {
    parts.push(
      "Geographic distance may reduce relevance for a local audience."
    );
  }

  // Price reasoning
  if (breakdown.priceAlignment >= 8) {
    parts.push("Their rates fit well within the campaign budget.");
  } else if (breakdown.priceAlignment <= 3) {
    parts.push("Their rates may exceed what this campaign can accommodate.");
  }

  return parts.join(" ");
}

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Score a single influencer against a campaign for a business.
 * Returns a detailed MatchScore with breakdown and human-readable reasoning.
 */
export function scoreInfluencer(
  influencer: Influencer,
  campaign: LaunchedCampaign,
  business: Business
): MatchScore {
  const breakdown: MatchScore["breakdown"] = {
    nicheAlignment: scoreNicheAlignment(influencer, business),
    audienceSize: scoreAudienceSize(influencer, campaign),
    engagementQuality: scoreEngagementQuality(influencer),
    locationProximity: scoreLocationProximity(influencer, business),
    platformMatch: scorePlatformMatch(influencer, campaign),
    priceAlignment: scorePriceAlignment(influencer, campaign, business),
  };

  const overallScore =
    breakdown.nicheAlignment +
    breakdown.audienceSize +
    breakdown.engagementQuality +
    breakdown.locationProximity +
    breakdown.platformMatch +
    breakdown.priceAlignment;

  const recommendation = classifyRecommendation(overallScore);

  const reasoning = generateReasoning(
    influencer,
    campaign,
    business,
    breakdown,
    recommendation
  );

  return {
    influencerId: influencer.id,
    campaignId: campaign.id,
    overallScore,
    breakdown,
    recommendation,
    reasoning,
  };
}

/**
 * Find the best influencer matches for a campaign from a pool.
 * Returns MatchScore[] sorted by overallScore descending.
 */
export function findBestMatches(
  campaign: LaunchedCampaign,
  business: Business,
  influencerPool: readonly Influencer[],
  limit: number = 10
): MatchScore[] {
  const scores = influencerPool.map(inf =>
    scoreInfluencer(inf, campaign, business)
  );

  // Sort by overall score descending
  scores.sort((a, b) => b.overallScore - a.overallScore);

  return scores.slice(0, limit);
}

/**
 * Generate a concise human-readable explanation of a match score.
 * Suitable for display in a match card or notification.
 */
export function explainMatch(score: MatchScore): string {
  const label =
    score.recommendation === "strong_match" ? "Strong Match" :
    score.recommendation === "good_match" ? "Good Match" :
    score.recommendation === "possible_match" ? "Possible Match" :
    "Poor Match";

  const topStrengths: string[] = [];
  const weaknesses: string[] = [];

  const breakdownLabels: [keyof MatchScore["breakdown"], string, number][] = [
    ["nicheAlignment", "Niche fit", 25],
    ["audienceSize", "Audience size", 20],
    ["engagementQuality", "Engagement quality", 20],
    ["locationProximity", "Location", 15],
    ["platformMatch", "Platform coverage", 10],
    ["priceAlignment", "Price fit", 10],
  ];

  for (const [key, displayName, max] of breakdownLabels) {
    const pct = score.breakdown[key] / max;
    if (pct >= 0.75) {
      topStrengths.push(displayName);
    } else if (pct < 0.4) {
      weaknesses.push(displayName);
    }
  }

  let summary = `${label} (${score.overallScore}/100).`;

  if (topStrengths.length > 0) {
    summary += ` Strengths: ${topStrengths.join(", ")}.`;
  }

  if (weaknesses.length > 0) {
    summary += ` Areas of concern: ${weaknesses.join(", ")}.`;
  }

  return summary;
}
