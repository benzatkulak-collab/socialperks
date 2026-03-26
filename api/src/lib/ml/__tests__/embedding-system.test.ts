import { describe, it, expect, beforeEach } from "vitest";
import {
  VectorStore,
  EmbeddingGenerator,
  MatchingService,
  VECTOR_DIMENSION,
} from "../embedding-system";
import type {
  InfluencerEmbeddingInput,
  CampaignEmbeddingInput,
  BusinessEmbeddingInput,
} from "../embedding-system";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInfluencer(overrides: Partial<InfluencerEmbeddingInput> = {}): InfluencerEmbeddingInput {
  return {
    id: "inf1",
    niches: ["food", "fitness"],
    followerCount: 10000,
    engagementRate: 4.5,
    platforms: [
      { platformId: "ig", followers: 8000 },
      { platformId: "tt", followers: 2000 },
    ],
    tier: "mid",
    location: "New York, NY",
    ...overrides,
  };
}

function makeCampaign(overrides: Partial<CampaignEmbeddingInput> = {}): CampaignEmbeddingInput {
  return {
    id: "cmp1",
    actions: ["ig_rl", "ig_ps", "tt_vd"],
    tier: "essential",
    discountValue: 15,
    discountType: "pct",
    businessType: "Restaurant",
    category: "food",
    tags: ["lunch", "dinner"],
    ...overrides,
  };
}

function makeBusiness(overrides: Partial<BusinessEmbeddingInput> = {}): BusinessEmbeddingInput {
  return {
    id: "biz1",
    type: "Restaurant",
    size: "small",
    industry: "food & beverage",
    location: "New York, NY",
    campaignCount: 5,
    avgRating: 4.5,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VectorStore
// ═══════════════════════════════════════════════════════════════════════════════

describe("VectorStore", () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new VectorStore();
  });

  it("upsert adds a new entry and increments size", () => {
    const vec = new Float32Array(VECTOR_DIMENSION).fill(0.1);
    const entry = store.upsert("id1", "influencer", "inf1", vec, { name: "test" });

    expect(entry.id).toBe("id1");
    expect(entry.entityType).toBe("influencer");
    expect(entry.entityId).toBe("inf1");
    expect(store.size).toBe(1);
  });

  it("upsert replaces an existing entry with the same ID", () => {
    const vec1 = new Float32Array(VECTOR_DIMENSION).fill(0.1);
    const vec2 = new Float32Array(VECTOR_DIMENSION).fill(0.9);

    store.upsert("id1", "influencer", "inf1", vec1, { version: 1 });
    store.upsert("id1", "influencer", "inf1", vec2, { version: 2 });

    expect(store.size).toBe(1);
    const entry = store.get("id1");
    expect(entry).not.toBeNull();
    expect(entry!.metadata.version).toBe(2);
  });

  it("search returns results sorted by cosine similarity", () => {
    // Create two vectors — one similar, one different
    const queryVec = new Float32Array(VECTOR_DIMENSION).fill(0);
    queryVec[0] = 1.0;
    queryVec[1] = 1.0;

    const similarVec = new Float32Array(VECTOR_DIMENSION).fill(0);
    similarVec[0] = 0.9;
    similarVec[1] = 0.8;

    const differentVec = new Float32Array(VECTOR_DIMENSION).fill(0);
    differentVec[10] = 1.0;
    differentVec[11] = 1.0;

    store.upsert("similar", "campaign", "c1", similarVec);
    store.upsert("different", "campaign", "c2", differentVec);

    const results = store.search(queryVec, 2, "campaign");
    expect(results.length).toBe(2);
    expect(results[0].entry.id).toBe("similar");
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
  });

  it("search filters by entityType", () => {
    const vec = new Float32Array(VECTOR_DIMENSION).fill(0.1);
    store.upsert("inf1", "influencer", "i1", vec);
    store.upsert("cmp1", "campaign", "c1", vec);

    const results = store.search(vec, 10, "influencer");
    expect(results.length).toBe(1);
    expect(results[0].entry.entityType).toBe("influencer");
  });

  it("delete removes an entry", () => {
    const vec = new Float32Array(VECTOR_DIMENSION).fill(0.1);
    store.upsert("id1", "influencer", "inf1", vec);
    expect(store.size).toBe(1);

    const deleted = store.delete("id1");
    expect(deleted).toBe(true);
    expect(store.size).toBe(0);
  });

  it("delete returns false for non-existent ID", () => {
    expect(store.delete("nonexistent")).toBe(false);
  });

  it("throws on wrong vector dimension", () => {
    const wrongVec = new Float32Array(32).fill(0.1);
    expect(() => store.upsert("id1", "influencer", "inf1", wrongVec)).toThrow(
      /dimension/i
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EmbeddingGenerator
// ═══════════════════════════════════════════════════════════════════════════════

describe("EmbeddingGenerator", () => {
  let generator: EmbeddingGenerator;

  beforeEach(() => {
    generator = new EmbeddingGenerator();
  });

  it("has the correct fixed dimension", () => {
    expect(generator.dimension).toBe(VECTOR_DIMENSION);
    expect(VECTOR_DIMENSION).toBe(64);
  });

  it("embedInfluencer returns a 64-dimensional vector", () => {
    const vec = generator.embedInfluencer(makeInfluencer());
    expect(vec).toBeInstanceOf(Float32Array);
    expect(vec.length).toBe(64);
  });

  it("embedInfluencer returns a normalized vector", () => {
    const vec = generator.embedInfluencer(makeInfluencer());
    const magnitude = Math.sqrt(Array.from(vec).reduce((s, v) => s + v * v, 0));
    // Normalized vectors have magnitude ~1.0
    expect(magnitude).toBeCloseTo(1.0, 1);
  });

  it("embedInfluencer produces different vectors for different inputs", () => {
    const vec1 = generator.embedInfluencer(makeInfluencer({ niches: ["food"] }));
    const vec2 = generator.embedInfluencer(makeInfluencer({ niches: ["tech", "business"] }));

    // At least some dimensions should differ
    let diffCount = 0;
    for (let i = 0; i < vec1.length; i++) {
      if (Math.abs(vec1[i] - vec2[i]) > 0.001) diffCount++;
    }
    expect(diffCount).toBeGreaterThan(0);
  });

  it("embedInfluencer is deterministic for the same input", () => {
    const input = makeInfluencer();
    const vec1 = generator.embedInfluencer(input);
    const vec2 = generator.embedInfluencer(input);

    for (let i = 0; i < vec1.length; i++) {
      expect(vec1[i]).toBeCloseTo(vec2[i], 6);
    }
  });

  it("embedCampaign returns a 64-dimensional vector", () => {
    const vec = generator.embedCampaign(makeCampaign());
    expect(vec).toBeInstanceOf(Float32Array);
    expect(vec.length).toBe(64);
  });

  it("embedBusiness returns a 64-dimensional vector", () => {
    const vec = generator.embedBusiness(makeBusiness());
    expect(vec).toBeInstanceOf(Float32Array);
    expect(vec.length).toBe(64);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MatchingService
// ═══════════════════════════════════════════════════════════════════════════════

describe("MatchingService", () => {
  let service: MatchingService;

  beforeEach(() => {
    service = new MatchingService();
  });

  it("indexInfluencer and find it in the store", () => {
    const entry = service.indexInfluencer(makeInfluencer());
    expect(entry.id).toBe("inf_inf1");
    expect(entry.entityType).toBe("influencer");
    expect(service.getStore().size).toBe(1);
  });

  it("indexCampaign and find it in the store", () => {
    const entry = service.indexCampaign(makeCampaign());
    expect(entry.id).toBe("cmp_cmp1");
    expect(entry.entityType).toBe("campaign");
    expect(service.getStore().size).toBe(1);
  });

  it("indexBusiness and find it in the store", () => {
    const entry = service.indexBusiness(makeBusiness());
    expect(entry.id).toBe("biz_biz1");
    expect(entry.entityType).toBe("business");
    expect(service.getStore().size).toBe(1);
  });

  it("findMatchingCampaigns returns scored results", () => {
    // Index some campaigns
    service.indexCampaign(makeCampaign({ id: "cmp1", businessType: "Restaurant" }));
    service.indexCampaign(makeCampaign({ id: "cmp2", businessType: "Gym" }));
    service.indexCampaign(makeCampaign({ id: "cmp3", businessType: "Salon" }));

    const influencer = makeInfluencer({ niches: ["food", "fitness"] });
    const results = service.findMatchingCampaigns(influencer, 5);

    expect(results.length).toBeGreaterThan(0);
    // Results should have similarity scores
    for (const result of results) {
      expect(result.similarity).toBeGreaterThanOrEqual(-1);
      expect(result.similarity).toBeLessThanOrEqual(1);
      expect(result.entry.entityType).toBe("campaign");
    }
  });

  it("getRecommendations returns combined results", () => {
    // Index campaigns and businesses
    service.indexCampaign(makeCampaign({ id: "cmp1" }));
    service.indexCampaign(makeCampaign({ id: "cmp2" }));
    service.indexBusiness(makeBusiness({ id: "biz1" }));

    const influencer = makeInfluencer();
    const recs = service.getRecommendations(influencer, {
      maxCampaigns: 5,
      maxBusinesses: 3,
      minScore: 0,
    });

    expect(recs.length).toBeGreaterThan(0);
    for (const rec of recs) {
      expect(rec.score).toBeGreaterThanOrEqual(0);
      expect(rec.entityId).toBeTruthy();
      expect(rec.reasons.length).toBeGreaterThan(0);
    }
  });

  it("findSimilarInfluencers excludes the query influencer", () => {
    const inf1 = makeInfluencer({ id: "inf1" });
    const inf2 = makeInfluencer({ id: "inf2", niches: ["food"] });
    service.indexInfluencer(inf1);
    service.indexInfluencer(inf2);

    const results = service.findSimilarInfluencers(inf1, 5);
    // Should not include inf1 itself
    const ids = results.map((r) => r.entry.entityId);
    expect(ids).not.toContain("inf1");
  });
});
