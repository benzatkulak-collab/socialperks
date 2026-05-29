/**
 * Matching Agent
 *
 * For each active campaign, scores every influencer using the matching
 * engine and emits high-confidence matches. In live mode it could push
 * recommendations to influencers (notifications) or auto-enroll them
 * into the campaign discovery feed.
 *
 * Today we only emit decisions — the recommendation surface needs more
 * product spec before we wire side-effects.
 */

import type { Agent, AgentDecision } from "./types";

interface Influencer {
  id: string;
  tier: string;
  niches: string[];
  followerCount: number;
  engagementRate: number;
  platforms: Array<{ platformId: string }>;
  location?: string;
}

interface Campaign {
  id: string;
  campaignId?: string;
  businessId: string;
  state: string;
  tier?: string;
  niches?: string[];
}

async function fetchInfluencers(): Promise<Influencer[]> {
  try {
    const mod = await import("@/lib/seed");
    return mod.createSeedData().influencers;
  } catch {
    return [];
  }
}

async function fetchActiveCampaigns(): Promise<Campaign[]> {
  try {
    const mod = await import("@/lib/campaign-state-machine");
    const cm = (mod as { campaignManager?: { listByState: (s: string) => Campaign[] } }).campaignManager;
    return cm?.listByState("active") ?? [];
  } catch {
    return [];
  }
}

/**
 * Lightweight match score. The full matching engine has a richer
 * breakdown (niche, audience size, engagement, location, platform,
 * price). Here we use a simpler heuristic that's fast enough to run
 * across all campaign×influencer pairs.
 */
function scoreMatch(camp: Campaign, inf: Influencer): number {
  let score = 0;
  // Engagement (max 30)
  score += Math.min(30, inf.engagementRate * 6);
  // Tier appropriateness for campaign tier (max 25)
  if (camp.tier === "premium" && (inf.tier === "macro" || inf.tier === "mega")) score += 25;
  else if (camp.tier === "growth" && inf.tier === "mid") score += 20;
  else if (camp.tier === "starter" && inf.tier === "micro") score += 25;
  else score += 10;
  // Niche overlap (max 25) — campaigns don't have explicit niches yet so
  // we default to a moderate bonus when the influencer has any niches.
  if (inf.niches.length > 0) score += Math.min(25, inf.niches.length * 5);
  // Active on at least one platform (max 20)
  if (inf.platforms.length > 0) score += Math.min(20, inf.platforms.length * 5);
  return Math.min(100, score);
}

export const matchingAgent: Agent = {
  id: "matching-agent",
  name: "Matching Agent",
  description: "Scores every influencer × active-campaign pair and surfaces high-confidence matches for recommendation.",
  level: 2,
  defaultMode: "dry-run",
  intervalSeconds: 1800,
  config: {
    threshold: { min: 50, max: 99, default: 75, step: 1 },
    maxActionsPerRun: { min: 5, max: 200, default: 30 },
    custom: {
      maxMatchesPerCampaign: { label: "Top-N matches per campaign", min: 1, max: 20, default: 5, step: 1 },
    },
  },
  async run(ctx) {
    const [campaigns, influencers] = await Promise.all([fetchActiveCampaigns(), fetchInfluencers()]);
    const decisions: AgentDecision[] = [];
    const topN = ctx.config.custom.maxMatchesPerCampaign;
    const threshold = ctx.config.threshold;

    for (const camp of campaigns) {
      const scored = influencers
        .map((inf) => ({ inf, score: scoreMatch(camp, inf) }))
        .filter((s) => s.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);

      for (const { inf, score } of scored) {
        decisions.push({
          targetId: `${camp.id}:${inf.id}`,
          action: "recommend-match",
          confidence: score / 100,
          executed: false, // recommendation surface not wired yet
          reason: `score ${score} (engagement ${inf.engagementRate.toFixed(1)}%, tier ${inf.tier})`,
          meta: {
            campaignId: camp.id ?? camp.campaignId,
            businessId: camp.businessId,
            influencerId: inf.id,
            influencerTier: inf.tier,
            followers: inf.followerCount,
          },
        });
      }
    }

    return decisions;
  },
};
