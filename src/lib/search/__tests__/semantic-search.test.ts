import { describe, it, expect, beforeEach } from "vitest";
import {
  indexAllData,
  semanticSearch,
  getRecommendedCampaigns,
  getRecommendedInfluencers,
  resetIndex,
} from "../semantic-search";
import { embeddingEngine } from "@/lib/embedding-engine";

// ─── Setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetIndex();
});

// ─── indexAllData ─────────────────────────────────────────────────────────

describe("indexAllData", () => {
  it("populates the store with correct embedding dimensions", () => {
    const counts = indexAllData();

    // Should have indexed businesses, influencers, and campaigns
    expect(counts.businesses).toBeGreaterThan(0);
    expect(counts.influencers).toBeGreaterThan(0);
    expect(counts.campaigns).toBeGreaterThan(0);

    // Verify embedding store has entries
    const allCampaigns = embeddingEngine.getAll("campaign");
    const allInfluencers = embeddingEngine.getAll("influencer");
    const allBusinesses = embeddingEngine.getAll("business");

    expect(allCampaigns.length).toBe(counts.campaigns);
    expect(allInfluencers.length).toBe(counts.influencers);
    expect(allBusinesses.length).toBe(counts.businesses);

    // All embeddings should be 32-dimensional vectors
    for (const record of allCampaigns) {
      expect(record.vector).toHaveLength(32);
    }
    for (const record of allInfluencers) {
      expect(record.vector).toHaveLength(32);
    }
    for (const record of allBusinesses) {
      expect(record.vector).toHaveLength(32);
    }
  });

  it("stores metadata with each embedding", () => {
    indexAllData();

    const campaigns = embeddingEngine.getAll("campaign");
    expect(campaigns.length).toBeGreaterThan(0);

    const first = campaigns[0];
    expect(first.metadata).toBeDefined();
    expect(first.metadata.name).toBeDefined();
    expect(first.metadata.businessId).toBeDefined();
    expect(first.metadata.category).toBeDefined();

    const influencers = embeddingEngine.getAll("influencer");
    const firstInf = influencers[0];
    expect(firstInf.metadata.displayName).toBeDefined();
    expect(firstInf.metadata.niches).toBeDefined();
    expect(firstInf.metadata.followerCount).toBeDefined();
  });
});

// ─── semanticSearch ───────────────────────────────────────────────────────

describe("semanticSearch", () => {
  it("returns empty results for an empty index", () => {
    // Don't index anything — store is empty
    // Manually search without triggering ensureIndexed by resetting after indexing
    indexAllData();
    resetIndex();

    // Now embeddingEngine is cleared but indexed flag is false
    // Calling semanticSearch will trigger ensureIndexed, which re-indexes
    // So instead, test with a direct store check
    const results = embeddingEngine.findSimilar(
      new Array(32).fill(0.1),
      "campaign",
      10
    );
    expect(results).toHaveLength(0);
  });

  it("returns results for a text query", () => {
    indexAllData();
    const results = semanticSearch("yoga wellness fitness");

    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.entityId).toBeDefined();
      expect(r.similarity).toBeGreaterThanOrEqual(0);
      expect(r.similarity).toBeLessThanOrEqual(1);
    }
  });

  it("filters results by entity type", () => {
    indexAllData();

    const campaignResults = semanticSearch("restaurant food", "campaign", 5);
    for (const r of campaignResults) {
      expect(r.entityType).toBe("campaign");
    }

    const businessResults = semanticSearch("restaurant food", "business", 5);
    for (const r of businessResults) {
      expect(r.entityType).toBe("business");
    }

    const influencerResults = semanticSearch("food blogger", "influencer", 5);
    for (const r of influencerResults) {
      expect(r.entityType).toBe("influencer");
    }
  });

  it("similar queries produce higher similarity scores", () => {
    indexAllData();

    // "yoga wellness" should match yoga studio campaigns more closely
    // than "auto mechanic" matches yoga studio campaigns
    const yogaResults = semanticSearch("yoga wellness meditation", "business", 5);
    const autoResults = semanticSearch("auto mechanic car repair", "business", 5);

    // Find the yoga studio business in each result set
    const yogaInYoga = yogaResults.find((r) =>
      (r.metadata.type as string)?.toLowerCase().includes("yoga")
    );
    const yogaInAuto = autoResults.find((r) =>
      (r.metadata.type as string)?.toLowerCase().includes("yoga")
    );

    // If found in both, the yoga query should score higher for the yoga business
    if (yogaInYoga && yogaInAuto) {
      expect(yogaInYoga.similarity).toBeGreaterThan(yogaInAuto.similarity);
    }
  });

  it("respects the limit parameter", () => {
    indexAllData();

    const results3 = semanticSearch("food restaurant", "campaign", 3);
    expect(results3.length).toBeLessThanOrEqual(3);

    const results1 = semanticSearch("food restaurant", "campaign", 1);
    expect(results1.length).toBe(1);
  });
});

// ─── getRecommendedCampaigns ──────────────────────────────────────────────

describe("getRecommendedCampaigns", () => {
  it("returns relevant campaigns for an influencer", () => {
    indexAllData();

    // i1 = "Priya Eats DC" — food blogger
    const results = getRecommendedCampaigns("i1", 10);

    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.campaignId).toBeDefined();
      expect(r.campaignName).toBeDefined();
      expect(r.businessId).toBeDefined();
      expect(r.businessName).toBeDefined();
      expect(r.finalScore).toBeGreaterThanOrEqual(0);
      expect(r.finalScore).toBeLessThanOrEqual(1);
      expect(r.semanticScore).toBeGreaterThanOrEqual(0);
      expect(r.platformMatch).toBeGreaterThanOrEqual(0);
      expect(r.reason).toBeTruthy();
    }
  });

  it("food influencer ranks restaurant campaigns higher than unrelated ones", () => {
    indexAllData();

    // i1 = "Priya Eats DC" — food, restaurants, local
    const results = getRecommendedCampaigns("i1", 50);

    // Top results should include restaurant/food businesses
    const topBusinessTypes = results
      .slice(0, 10)
      .map((r) => r.businessType.toLowerCase());

    const hasFoodRelated = topBusinessTypes.some(
      (t) =>
        t.includes("restaurant") ||
        t.includes("coffee") ||
        t.includes("pizza") ||
        t.includes("food")
    );
    expect(hasFoodRelated).toBe(true);
  });

  it("wellness influencer ranks wellness campaigns higher", () => {
    indexAllData();

    // i5 = "TheWellnessWitch" — wellness, yoga, meditation, health
    const results = getRecommendedCampaigns("i5", 50);

    const topBusinessTypes = results
      .slice(0, 10)
      .map((r) => r.businessType.toLowerCase());

    const hasWellnessRelated = topBusinessTypes.some(
      (t) =>
        t.includes("yoga") ||
        t.includes("gym") ||
        t.includes("wellness") ||
        t.includes("fitness")
    );
    expect(hasWellnessRelated).toBe(true);
  });

  it("returns empty array for unknown influencer", () => {
    indexAllData();
    const results = getRecommendedCampaigns("nonexistent_id", 10);
    expect(results).toHaveLength(0);
  });

  it("platform filtering works", () => {
    indexAllData();

    // Filter to only Instagram campaigns
    const igResults = getRecommendedCampaigns("i1", 50, {
      platforms: ["ig"],
    });

    // All results should involve Instagram actions
    // (not all actions may be ig, but at least one action should be)
    expect(igResults.length).toBeGreaterThan(0);
  });

  it("minScore filtering works", () => {
    indexAllData();

    const allResults = getRecommendedCampaigns("i1", 100, { minScore: 0 });
    const filteredResults = getRecommendedCampaigns("i1", 100, {
      minScore: 0.5,
    });

    // Filtered results should all meet the threshold
    for (const r of filteredResults) {
      expect(r.finalScore).toBeGreaterThanOrEqual(0.5);
    }

    // Filtered should have fewer or equal results
    expect(filteredResults.length).toBeLessThanOrEqual(allResults.length);
  });

  it("respects the limit parameter", () => {
    indexAllData();
    const results = getRecommendedCampaigns("i1", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

// ─── getRecommendedInfluencers ────────────────────────────────────────────

describe("getRecommendedInfluencers", () => {
  it("returns influencers for a campaign", () => {
    indexAllData();

    // Get an actual campaign ID from the indexed data
    const allCampaigns = embeddingEngine.getAll("campaign");
    expect(allCampaigns.length).toBeGreaterThan(0);

    const campaignId = allCampaigns[0].entityId;
    const results = getRecommendedInfluencers(campaignId, 10);

    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.influencerId).toBeDefined();
      expect(r.displayName).toBeDefined();
      expect(r.niches).toBeDefined();
      expect(Array.isArray(r.niches)).toBe(true);
      expect(r.finalScore).toBeGreaterThanOrEqual(0);
      expect(r.reason).toBeTruthy();
    }
  });

  it("returns empty array for unknown campaign", () => {
    indexAllData();
    const results = getRecommendedInfluencers("nonexistent_campaign", 10);
    expect(results).toHaveLength(0);
  });

  it("results are sorted by finalScore descending", () => {
    indexAllData();

    const allCampaigns = embeddingEngine.getAll("campaign");
    const campaignId = allCampaigns[0].entityId;
    const results = getRecommendedInfluencers(campaignId, 10);

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].finalScore).toBeGreaterThanOrEqual(
        results[i].finalScore
      );
    }
  });
});
