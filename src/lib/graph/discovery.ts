/**
 * Social Graph Discovery Service
 *
 * Wires the SocialGraph engine into actionable discovery features:
 * - Populate the graph from seed data, campaigns, and submissions
 * - Find similar businesses via shared influencer connections
 * - Detect overlapping audiences between businesses
 * - Rank campaigns by viral potential
 * - Map influencer networks and communities
 * - Suggest cross-promotion partners
 */

import { socialGraph } from "../graph-engine";
import { createSeedData } from "../seed";
import { campaignManager } from "../campaign-state-machine";
import { getSubmissions } from "../submissions";

// ─── Result Types ───────────────────────────────────────────────────────────

export interface SimilarBusiness {
  business: { id: string; name: string; type: string; industry: string };
  sharedInfluencers: number;
  connectionStrength: number;
  commonNiches: string[];
}

export interface AudienceOverlap {
  business: { id: string; name: string; type: string; industry: string };
  sharedInfluencerIds: string[];
  overlapStrength: number;
}

export interface ViralCampaign {
  campaignId: string;
  businessId: string;
  viralScore: number;
  uniqueReach: number;
  avgInfluence: number;
  participantCount: number;
  networkDensity: number;
}

export interface NetworkInfo {
  influencerId: string;
  influenceScore: number;
  connectedBusinesses: { id: string; name: string }[];
  connectedCampaigns: string[];
  community: {
    size: number;
    density: number;
    memberIds: string[];
  };
  clusteringCoefficient: number;
}

export interface CrossPromotion {
  business: { id: string; name: string; type: string; industry: string };
  sharedCustomers: number;
  connectionStrength: number;
  existingRelationship: boolean;
}

// ─── Graph Population ───────────────────────────────────────────────────────

/**
 * Build the social graph from seed data, campaigns, and submissions.
 * Clears the existing graph first to avoid stale edges.
 *
 * Node types created:
 *   - business  (from seed businesses)
 *   - influencer (from seed influencers)
 *   - campaign  (from campaign state machine)
 *
 * Edge types created:
 *   - launched_campaign:   business → campaign
 *   - participated_in:     influencer → campaign (via approved submissions)
 *   - follows:             influencer → business (via any submission)
 *   - same_niche:          influencer → influencer (shared niches)
 *   - located_near:        business → business (same location)
 */
export function buildSocialGraph(): { nodes: number; edges: number } {
  socialGraph.clear();

  const seed = createSeedData();

  // ── Add business nodes ──────────────────────────────────────────────────
  for (const biz of seed.businesses) {
    socialGraph.addNode(biz.id, "business", {
      name: biz.name,
      type: biz.type,
      industry: biz.industry,
      location: biz.location,
      size: biz.size,
    });
  }

  // ── Add influencer nodes ────────────────────────────────────────────────
  for (const inf of seed.influencers) {
    socialGraph.addNode(inf.id, "influencer", {
      displayName: inf.displayName,
      tier: inf.tier,
      niches: inf.niches,
      followerCount: inf.followerCount,
      location: inf.location,
    });
  }

  // ── Add campaign nodes from state machine ───────────────────────────────
  const campaigns = campaignManager.listAll();
  for (const campaign of campaigns) {
    socialGraph.addNode(campaign.id, "campaign", {
      state: campaign.state,
      businessId: campaign.businessId,
      completions: campaign.completions.current,
    });

    // Edge: business → campaign (launched_campaign)
    if (socialGraph.getNode(campaign.businessId)) {
      socialGraph.addEdge(
        campaign.businessId,
        campaign.id,
        "launched_campaign",
        0.8,
        { state: campaign.state }
      );
    }
  }

  // ── Process submissions for influencer↔campaign and influencer↔business edges
  const { submissions: allSubs } = getSubmissions({}, 1, 50_000);
  const influencerBusinessPairs = new Set<string>();
  const influencerCampaignPairs = new Set<string>();

  for (const sub of allSubs) {
    const influencerNode = socialGraph.getNode(sub.userId);
    const campaignNode = socialGraph.getNode(sub.campaignId);

    if (!influencerNode || influencerNode.type !== "influencer") continue;
    if (!campaignNode) continue;

    // Edge: influencer → campaign (participated_in) for approved submissions
    const icKey = `${sub.userId}::${sub.campaignId}`;
    if (sub.status === "approved" && !influencerCampaignPairs.has(icKey)) {
      influencerCampaignPairs.add(icKey);
      socialGraph.addEdge(
        sub.userId,
        sub.campaignId,
        "participated_in",
        0.7,
        { submissionStatus: sub.status }
      );
    }

    // Edge: influencer → business (follows) — any submission implies engagement
    const businessId = (campaignNode.properties.businessId as string) ?? "";
    const ibKey = `${sub.userId}::${businessId}`;
    if (businessId && socialGraph.getNode(businessId) && !influencerBusinessPairs.has(ibKey)) {
      influencerBusinessPairs.add(ibKey);
      const weight = sub.status === "approved" ? 0.8 : 0.4;
      socialGraph.addEdge(sub.userId, businessId, "follows", weight, {
        viaSubmission: true,
      });
    }
  }

  // ── Influencer–influencer edges (same_niche) ───────────────────────────
  const influencers = seed.influencers;
  for (let i = 0; i < influencers.length; i++) {
    for (let j = i + 1; j < influencers.length; j++) {
      const a = influencers[i];
      const b = influencers[j];
      const sharedNiches = a.niches.filter((n) => b.niches.includes(n));
      if (sharedNiches.length > 0) {
        const weight = Math.min(1, sharedNiches.length * 0.3);
        socialGraph.addEdge(a.id, b.id, "same_niche", weight, {
          sharedNiches,
        });
      }
    }
  }

  // ── Business–business edges (located_near) ─────────────────────────────
  const businesses = seed.businesses;
  for (let i = 0; i < businesses.length; i++) {
    for (let j = i + 1; j < businesses.length; j++) {
      const a = businesses[i];
      const b = businesses[j];
      if (a.location === b.location) {
        socialGraph.addEdge(a.id, b.id, "located_near", 0.3, {
          location: a.location,
        });
      }
    }
  }

  const stats = socialGraph.getStats();
  return { nodes: stats.nodes, edges: stats.edges };
}

// ─── Discovery: Find Similar Businesses ─────────────────────────────────────

/**
 * Find businesses similar to the given one based on shared influencer
 * connections and industry proximity in the graph.
 */
export function findSimilarBusinesses(
  businessId: string,
  limit: number = 10
): SimilarBusiness[] {
  const node = socialGraph.getNode(businessId);
  if (!node || node.type !== "business") return [];

  const seed = createSeedData();
  const bizMap = new Map(seed.businesses.map((b) => [b.id, b]));

  // Find influencers connected to this business
  const myInfluencerEdges = socialGraph
    .getEdges(businessId, "in")
    .filter((e) => e.type === "follows");
  const myInfluencerIds = new Set(myInfluencerEdges.map((e) => e.from));

  // Collect influencer connections to other businesses
  const otherBusinessScores = new Map<
    string,
    { shared: Set<string>; niches: Set<string> }
  >();

  for (const infId of myInfluencerIds) {
    const infNode = socialGraph.getNode(infId);
    const niches = (infNode?.properties.niches as string[]) ?? [];

    // Find other businesses this influencer connects to
    const infEdges = socialGraph
      .getEdges(infId, "out")
      .filter(
        (e) => e.type === "follows" && e.to !== businessId
      );

    for (const edge of infEdges) {
      const otherNode = socialGraph.getNode(edge.to);
      if (!otherNode || otherNode.type !== "business") continue;

      if (!otherBusinessScores.has(edge.to)) {
        otherBusinessScores.set(edge.to, {
          shared: new Set(),
          niches: new Set(),
        });
      }
      const entry = otherBusinessScores.get(edge.to)!;
      entry.shared.add(infId);
      for (const n of niches) entry.niches.add(n);
    }
  }

  // Also add graph neighbors via "located_near" and "same industry" signals
  const neighbors = socialGraph.getNeighbors(businessId, 2);
  for (const neighbor of neighbors) {
    if (neighbor.type !== "business" || neighbor.id === businessId) continue;
    if (!otherBusinessScores.has(neighbor.id)) {
      otherBusinessScores.set(neighbor.id, {
        shared: new Set(),
        niches: new Set(),
      });
    }
  }

  const results: SimilarBusiness[] = [];
  const myIndustry = (node.properties.industry as string) ?? "";

  for (const [otherId, scores] of otherBusinessScores) {
    const biz = bizMap.get(otherId);
    if (!biz) continue;

    const sharedInfluencers = scores.shared.size;
    // Jaccard similarity on influencer sets
    const otherInfluencerEdges = socialGraph
      .getEdges(otherId, "in")
      .filter((e) => e.type === "follows");
    const otherInfluencerIds = new Set(otherInfluencerEdges.map((e) => e.from));
    const unionSize = new Set([...myInfluencerIds, ...otherInfluencerIds]).size;
    const connectionStrength =
      unionSize > 0
        ? Math.round((sharedInfluencers / unionSize) * 1000) / 1000
        : 0;

    // Industry match bonus
    const commonNiches = [...scores.niches];
    if (biz.industry === myIndustry && !commonNiches.includes(myIndustry.toLowerCase())) {
      commonNiches.push(myIndustry.toLowerCase());
    }

    results.push({
      business: {
        id: biz.id,
        name: biz.name,
        type: biz.type,
        industry: biz.industry,
      },
      sharedInfluencers,
      connectionStrength,
      commonNiches,
    });
  }

  // Sort by shared influencers descending, then connection strength
  results.sort((a, b) => {
    if (b.sharedInfluencers !== a.sharedInfluencers) {
      return b.sharedInfluencers - a.sharedInfluencers;
    }
    return b.connectionStrength - a.connectionStrength;
  });

  return results.slice(0, limit);
}

// ─── Discovery: Overlapping Audiences ───────────────────────────────────────

/**
 * Find businesses that share influencers (audience overlap) with the
 * given business. Each result includes the specific shared influencer IDs.
 */
export function findOverlappingAudiences(
  businessId: string
): AudienceOverlap[] {
  const node = socialGraph.getNode(businessId);
  if (!node || node.type !== "business") return [];

  const seed = createSeedData();
  const bizMap = new Map(seed.businesses.map((b) => [b.id, b]));

  // My influencers
  const myInfluencerEdges = socialGraph
    .getEdges(businessId, "in")
    .filter(
      (e) =>
        e.type === "follows" ||
        e.type === "completed_campaign" ||
        e.type === "reviewed"
    );
  const myInfluencerIds = new Set(myInfluencerEdges.map((e) => e.from));

  if (myInfluencerIds.size === 0) return [];

  // For each influencer, find what other businesses they connect to
  const overlapMap = new Map<string, Set<string>>();

  for (const infId of myInfluencerIds) {
    const infEdges = socialGraph
      .getEdges(infId, "out")
      .filter(
        (e) =>
          (e.type === "follows" ||
            e.type === "completed_campaign" ||
            e.type === "reviewed") &&
          e.to !== businessId
      );

    for (const edge of infEdges) {
      const targetNode = socialGraph.getNode(edge.to);
      if (!targetNode || targetNode.type !== "business") continue;

      if (!overlapMap.has(edge.to)) {
        overlapMap.set(edge.to, new Set());
      }
      overlapMap.get(edge.to)!.add(infId);
    }
  }

  const results: AudienceOverlap[] = [];

  for (const [otherId, sharedSet] of overlapMap) {
    const biz = bizMap.get(otherId);
    if (!biz) continue;

    const sharedInfluencerIds = [...sharedSet];
    // Overlap strength: how much of MY audience overlaps
    const overlapStrength =
      myInfluencerIds.size > 0
        ? Math.round((sharedInfluencerIds.length / myInfluencerIds.size) * 1000) / 1000
        : 0;

    results.push({
      business: {
        id: biz.id,
        name: biz.name,
        type: biz.type,
        industry: biz.industry,
      },
      sharedInfluencerIds,
      overlapStrength,
    });
  }

  // Sort by overlap strength descending
  results.sort((a, b) => b.overlapStrength - a.overlapStrength);

  return results;
}

// ─── Discovery: Viral Campaigns ─────────────────────────────────────────────

/**
 * Rank campaigns by viral potential using the graph engine's
 * viral potential scoring. Only considers campaigns that have
 * at least one participant edge in the graph.
 */
export function getViralCampaigns(limit: number = 10): ViralCampaign[] {
  const campaignNodes = socialGraph.getNodes("campaign");

  const scored: ViralCampaign[] = [];

  for (const node of campaignNodes) {
    const potential = socialGraph.getViralPotential(node.id);
    if (potential.participantCount === 0) continue;

    scored.push({
      campaignId: node.id,
      businessId: (node.properties.businessId as string) ?? "",
      viralScore: potential.score,
      uniqueReach: potential.uniqueReach,
      avgInfluence: potential.avgInfluence,
      participantCount: potential.participantCount,
      networkDensity: potential.networkDensity,
    });
  }

  // Sort by viral score descending
  scored.sort((a, b) => b.viralScore - a.viralScore);

  return scored.slice(0, limit);
}

// ─── Discovery: Influencer Network ──────────────────────────────────────────

/**
 * Get a comprehensive view of an influencer's network:
 * connected businesses, campaigns, community structure,
 * and their influence score.
 */
export function getInfluencerNetwork(influencerId: string): NetworkInfo {
  const node = socialGraph.getNode(influencerId);
  if (!node || node.type !== "influencer") {
    return {
      influencerId,
      influenceScore: 0,
      connectedBusinesses: [],
      connectedCampaigns: [],
      community: { size: 0, density: 0, memberIds: [] },
      clusteringCoefficient: 0,
    };
  }

  const seed = createSeedData();
  const bizMap = new Map(seed.businesses.map((b) => [b.id, b]));

  // Connected businesses
  const bizEdges = socialGraph
    .getEdges(influencerId, "out")
    .filter((e) => e.type === "follows");
  const connectedBusinesses: { id: string; name: string }[] = [];
  for (const edge of bizEdges) {
    const biz = bizMap.get(edge.to);
    if (biz) {
      connectedBusinesses.push({ id: biz.id, name: biz.name });
    }
  }

  // Connected campaigns
  const campaignEdges = socialGraph
    .getEdges(influencerId, "out")
    .filter((e) => e.type === "participated_in");
  const connectedCampaigns = campaignEdges.map((e) => e.to);

  // Community
  const community = socialGraph.getCommunity(influencerId);

  // Influence & clustering
  const influenceScore = socialGraph.getInfluenceScore(influencerId);
  const clusteringCoefficient = socialGraph.getClusteringCoefficient(influencerId);

  return {
    influencerId,
    influenceScore,
    connectedBusinesses,
    connectedCampaigns,
    community: {
      size: community.members.length,
      density: community.density,
      memberIds: community.members.map((m) => m.id),
    },
    clusteringCoefficient,
  };
}

// ─── Discovery: Cross-Promotion Suggestions ─────────────────────────────────

/**
 * Suggest cross-promotion partners for a business using the graph
 * engine's built-in `findCrossPromotionPartners`. Enriches the
 * results with seed data for display.
 */
export function suggestCrossPromotions(
  businessId: string
): CrossPromotion[] {
  const seed = createSeedData();
  const bizMap = new Map(seed.businesses.map((b) => [b.id, b]));

  const partners = socialGraph.findCrossPromotionPartners(businessId, 20);

  return partners.map((p) => {
    const biz = bizMap.get(p.business.id);
    return {
      business: {
        id: p.business.id,
        name: biz?.name ?? (p.business.properties.name as string) ?? "Unknown",
        type: biz?.type ?? (p.business.properties.type as string) ?? "Business",
        industry: biz?.industry ?? (p.business.properties.industry as string) ?? "",
      },
      sharedCustomers: p.sharedCustomers,
      connectionStrength: p.connectionStrength,
      existingRelationship: p.existingRelationship,
    };
  });
}
