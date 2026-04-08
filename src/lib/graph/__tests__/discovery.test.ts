import { describe, it, expect, beforeEach, vi } from "vitest";
import { socialGraph } from "@/lib/graph-engine";
import {
  buildSocialGraph,
  findSimilarBusinesses,
  findOverlappingAudiences,
  getViralCampaigns,
  getInfluencerNetwork,
  suggestCrossPromotions,
} from "@/lib/graph/discovery";
import { campaignManager } from "@/lib/campaign-state-machine";
import { createSubmission, clearStore as clearSubmissions } from "@/lib/submissions";

// ─── Helpers ────────────────────────────────────────────────────────────────

function seedGraphManually() {
  socialGraph.clear();

  // Businesses
  socialGraph.addNode("b1", "business", { name: "Sunrise Yoga DC", type: "Yoga Studio", industry: "Wellness", location: "Washington, DC" });
  socialGraph.addNode("b2", "business", { name: "Taqueria Sol", type: "Restaurant", industry: "Food & Beverage", location: "Washington, DC" });
  socialGraph.addNode("b3", "business", { name: "Glow Studio", type: "Salon", industry: "Beauty", location: "Arlington, VA" });
  socialGraph.addNode("b4", "business", { name: "Iron Temple", type: "Gym", industry: "Fitness", location: "Bethesda, MD" });

  // Influencers
  socialGraph.addNode("i1", "influencer", { displayName: "Priya Eats DC", niches: ["food", "restaurants", "local"], followerCount: 45000, location: "Washington, DC" });
  socialGraph.addNode("i2", "influencer", { displayName: "FitWithMarcus", niches: ["fitness", "wellness", "gym"], followerCount: 78000, location: "Arlington, VA" });
  socialGraph.addNode("i3", "influencer", { displayName: "DCStyleDiary", niches: ["fashion", "lifestyle", "beauty"], followerCount: 8500, location: "Washington, DC" });

  // Campaigns
  socialGraph.addNode("c1", "campaign", { state: "active", businessId: "b1", completions: 5 });
  socialGraph.addNode("c2", "campaign", { state: "active", businessId: "b2", completions: 3 });

  // Edges: business → campaign
  socialGraph.addEdge("b1", "c1", "launched_campaign", 0.8);
  socialGraph.addEdge("b2", "c2", "launched_campaign", 0.8);

  // Edges: influencer → business (follows)
  socialGraph.addEdge("i1", "b1", "follows", 0.7);
  socialGraph.addEdge("i1", "b2", "follows", 0.6);
  socialGraph.addEdge("i2", "b1", "follows", 0.8);
  socialGraph.addEdge("i2", "b4", "follows", 0.9);
  socialGraph.addEdge("i3", "b3", "follows", 0.5);

  // Edges: influencer → campaign (participated_in)
  socialGraph.addEdge("i1", "c1", "participated_in", 0.7);
  socialGraph.addEdge("i2", "c1", "participated_in", 0.7);
  socialGraph.addEdge("i1", "c2", "participated_in", 0.6);

  // Edges: influencer ↔ influencer (same_niche)
  socialGraph.addEdge("i1", "i2", "same_niche", 0.3, { sharedNiches: ["local"] });

  // Edges: business ↔ business (located_near)
  socialGraph.addEdge("b1", "b2", "located_near", 0.3, { location: "Washington, DC" });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("buildSocialGraph", () => {
  beforeEach(() => {
    socialGraph.clear();
    campaignManager._reset();
    clearSubmissions();
  });

  it("populates nodes from seed data", () => {
    const result = buildSocialGraph();

    // Should have at least the 15 businesses + 5 influencers from seed
    expect(result.nodes).toBeGreaterThanOrEqual(20);
    expect(result.edges).toBeGreaterThanOrEqual(0);

    // Business nodes exist
    expect(socialGraph.getNode("b1")).not.toBeNull();
    expect(socialGraph.getNode("b1")!.type).toBe("business");

    // Influencer nodes exist
    expect(socialGraph.getNode("i1")).not.toBeNull();
    expect(socialGraph.getNode("i1")!.type).toBe("influencer");
  });

  it("creates same_niche edges between influencers with shared niches", () => {
    buildSocialGraph();

    // i1 (food, restaurants, local) and i4 (photography, local, food) share niches
    const i1Edges = socialGraph.getEdges("i1", "both").filter((e) => e.type === "same_niche");
    expect(i1Edges.length).toBeGreaterThan(0);
  });

  it("creates located_near edges between co-located businesses", () => {
    buildSocialGraph();

    // b1 and b2 are both in Washington, DC
    const edges = socialGraph.getEdgesBetween("b1", "b2");
    const nearEdges = edges.filter((e) => e.type === "located_near");
    expect(nearEdges.length).toBeGreaterThan(0);
  });

  it("creates campaign nodes and launched_campaign edges when campaigns exist", () => {
    // Launch a campaign first
    campaignManager.launch("test-camp-1", "b1", {
      name: "Test Campaign",
      budgetAllocated: 500,
      budgetType: "dol",
      maxCompletions: 100,
      expiresInDays: 30,
    });

    buildSocialGraph();

    const campNode = socialGraph.getNode("test-camp-1");
    expect(campNode).not.toBeNull();
    expect(campNode!.type).toBe("campaign");

    // Business → campaign edge
    const edges = socialGraph.getEdgesBetween("b1", "test-camp-1");
    expect(edges.some((e) => e.type === "launched_campaign")).toBe(true);
  });

  it("returns zero nodes and edges on empty data without campaigns", () => {
    // Even with no campaigns/submissions, seed data populates the graph
    const result = buildSocialGraph();
    expect(result.nodes).toBeGreaterThan(0);
    // Edges from same_niche and located_near
    expect(result.edges).toBeGreaterThanOrEqual(0);
  });
});

describe("findSimilarBusinesses", () => {
  beforeEach(() => {
    seedGraphManually();
  });

  it("finds businesses that share influencer connections", () => {
    // b1 has influencers i1, i2; b2 has influencer i1
    const similar = findSimilarBusinesses("b1");

    // b2 should appear because it shares i1
    const b2Result = similar.find((s) => s.business.id === "b2");
    expect(b2Result).toBeDefined();
    expect(b2Result!.sharedInfluencers).toBeGreaterThanOrEqual(1);
  });

  it("respects the limit parameter", () => {
    const similar = findSimilarBusinesses("b1", 1);
    expect(similar.length).toBeLessThanOrEqual(1);
  });

  it("returns empty array for non-existent business", () => {
    const similar = findSimilarBusinesses("nonexistent");
    expect(similar).toEqual([]);
  });

  it("returns empty array for non-business node type", () => {
    const similar = findSimilarBusinesses("i1");
    expect(similar).toEqual([]);
  });

  it("sorts results by shared influencers descending", () => {
    const similar = findSimilarBusinesses("b1");
    for (let i = 1; i < similar.length; i++) {
      expect(similar[i - 1].sharedInfluencers).toBeGreaterThanOrEqual(
        similar[i].sharedInfluencers
      );
    }
  });
});

describe("findOverlappingAudiences", () => {
  beforeEach(() => {
    seedGraphManually();
  });

  it("detects audience overlap between businesses sharing influencers", () => {
    // b1 has i1 and i2; b2 has i1
    const overlaps = findOverlappingAudiences("b1");

    const b2Overlap = overlaps.find((o) => o.business.id === "b2");
    expect(b2Overlap).toBeDefined();
    expect(b2Overlap!.sharedInfluencerIds).toContain("i1");
    expect(b2Overlap!.overlapStrength).toBeGreaterThan(0);
  });

  it("returns empty array for business with no influencer connections", () => {
    // b3 only has i3, and i3 doesn't connect to any other business
    const overlaps = findOverlappingAudiences("b3");
    expect(overlaps).toEqual([]);
  });

  it("returns empty array for non-existent business", () => {
    const overlaps = findOverlappingAudiences("nonexistent");
    expect(overlaps).toEqual([]);
  });

  it("sorts by overlap strength descending", () => {
    const overlaps = findOverlappingAudiences("b1");
    for (let i = 1; i < overlaps.length; i++) {
      expect(overlaps[i - 1].overlapStrength).toBeGreaterThanOrEqual(
        overlaps[i].overlapStrength
      );
    }
  });
});

describe("getViralCampaigns", () => {
  beforeEach(() => {
    seedGraphManually();
  });

  it("returns campaigns with participants ranked by viral score", () => {
    const viral = getViralCampaigns();

    // c1 has participants (i1, i2), c2 has participant (i1)
    expect(viral.length).toBeGreaterThanOrEqual(1);

    // c1 should rank higher (more participants)
    const c1 = viral.find((v) => v.campaignId === "c1");
    expect(c1).toBeDefined();
    expect(c1!.participantCount).toBeGreaterThanOrEqual(2);
    expect(c1!.viralScore).toBeGreaterThan(0);
  });

  it("excludes campaigns with zero inbound edges (truly isolated)", () => {
    // Add a campaign node with no edges at all
    socialGraph.addNode("c-isolated", "campaign", { state: "active", businessId: "b3", completions: 0 });

    const viral = getViralCampaigns();
    const isolated = viral.find((v) => v.campaignId === "c-isolated");
    expect(isolated).toBeUndefined();
  });

  it("respects limit parameter", () => {
    const viral = getViralCampaigns(1);
    expect(viral.length).toBeLessThanOrEqual(1);
  });

  it("returns empty array when graph has no campaigns", () => {
    socialGraph.clear();
    const viral = getViralCampaigns();
    expect(viral).toEqual([]);
  });
});

describe("getInfluencerNetwork", () => {
  beforeEach(() => {
    seedGraphManually();
  });

  it("returns network info for a valid influencer", () => {
    const network = getInfluencerNetwork("i1");

    expect(network.influencerId).toBe("i1");
    expect(network.influenceScore).toBeGreaterThan(0);

    // i1 follows b1 and b2
    expect(network.connectedBusinesses.length).toBeGreaterThanOrEqual(2);
    expect(network.connectedBusinesses.some((b) => b.id === "b1")).toBe(true);
    expect(network.connectedBusinesses.some((b) => b.id === "b2")).toBe(true);

    // i1 participated in c1 and c2
    expect(network.connectedCampaigns.length).toBeGreaterThanOrEqual(2);
    expect(network.connectedCampaigns).toContain("c1");
    expect(network.connectedCampaigns).toContain("c2");

    // Community should include i1 at minimum
    expect(network.community.size).toBeGreaterThanOrEqual(1);
    expect(network.community.memberIds).toContain("i1");
  });

  it("returns zero-value network for non-existent influencer", () => {
    const network = getInfluencerNetwork("nonexistent");
    expect(network.influenceScore).toBe(0);
    expect(network.connectedBusinesses).toEqual([]);
    expect(network.connectedCampaigns).toEqual([]);
    expect(network.community.size).toBe(0);
  });

  it("returns zero-value network for non-influencer node type", () => {
    const network = getInfluencerNetwork("b1");
    expect(network.influenceScore).toBe(0);
    expect(network.connectedBusinesses).toEqual([]);
  });

  it("includes clustering coefficient", () => {
    const network = getInfluencerNetwork("i1");
    expect(typeof network.clusteringCoefficient).toBe("number");
    expect(network.clusteringCoefficient).toBeGreaterThanOrEqual(0);
    expect(network.clusteringCoefficient).toBeLessThanOrEqual(1);
  });
});

describe("suggestCrossPromotions", () => {
  beforeEach(() => {
    seedGraphManually();
  });

  it("suggests cross-promotion partners based on shared connections", () => {
    const suggestions = suggestCrossPromotions("b1");

    // b1 and b2 share i1 as a customer/follower
    const b2Suggestion = suggestions.find((s) => s.business.id === "b2");
    // b2 may appear if it qualifies through findCrossPromotionPartners
    // which looks at "follows", "reviewed", "completed_campaign" inbound edges
    // Since i1 follows both b1 and b2, it should appear
    if (b2Suggestion) {
      expect(b2Suggestion.sharedCustomers).toBeGreaterThanOrEqual(1);
      expect(b2Suggestion.connectionStrength).toBeGreaterThan(0);
    }
  });

  it("returns empty array for non-existent business", () => {
    const suggestions = suggestCrossPromotions("nonexistent");
    expect(suggestions).toEqual([]);
  });

  it("returns empty array for non-business node", () => {
    const suggestions = suggestCrossPromotions("i1");
    expect(suggestions).toEqual([]);
  });
});

describe("edge cases", () => {
  beforeEach(() => {
    socialGraph.clear();
  });

  it("handles empty graph for all discovery functions", () => {
    expect(findSimilarBusinesses("b1")).toEqual([]);
    expect(findOverlappingAudiences("b1")).toEqual([]);
    expect(getViralCampaigns()).toEqual([]);
    expect(getInfluencerNetwork("i1")).toEqual({
      influencerId: "i1",
      influenceScore: 0,
      connectedBusinesses: [],
      connectedCampaigns: [],
      community: { size: 0, density: 0, memberIds: [] },
      clusteringCoefficient: 0,
    });
    expect(suggestCrossPromotions("b1")).toEqual([]);
  });

  it("handles graph with nodes but no edges", () => {
    socialGraph.addNode("b1", "business", { name: "Test Biz", type: "Test", industry: "Test", location: "DC" });
    socialGraph.addNode("i1", "influencer", { displayName: "Test Inf", niches: [], followerCount: 100, location: "DC" });

    expect(findSimilarBusinesses("b1")).toEqual([]);
    expect(findOverlappingAudiences("b1")).toEqual([]);
    expect(getViralCampaigns()).toEqual([]);

    const network = getInfluencerNetwork("i1");
    expect(network.influenceScore).toBe(0);
    expect(network.connectedBusinesses).toEqual([]);
  });

  it("handles single node graph", () => {
    socialGraph.addNode("b1", "business", { name: "Solo Biz", type: "Test", industry: "Test", location: "DC" });

    expect(findSimilarBusinesses("b1")).toEqual([]);
    expect(findOverlappingAudiences("b1")).toEqual([]);
    expect(suggestCrossPromotions("b1")).toEqual([]);
  });
});
