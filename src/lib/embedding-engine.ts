// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Vector Embedding Engine
// Future-proofing foundation for ML-powered similarity and recommendations
// ══════════════════════════════════════════════════════════════════════════════

import { PLATFORMS, ACTION_CATEGORIES, findAction } from "./platforms";

// ─── Type Definitions ───────────────────────────────────────────────────────

export type Vector = number[];

export type EmbeddableEntityType =
  | "campaign"
  | "business"
  | "influencer"
  | "action";

export interface EmbeddingRecord {
  id: string;
  entityId: string;
  entityType: EmbeddableEntityType;
  vector: Vector;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Input Types for Embedding Generation ───────────────────────────────────

export interface CampaignInput {
  id: string;
  name: string;
  actions: string[];
  discountValue: number;
  discountType: "pct" | "dol";
  category: string;
  tier: string;
  description?: string;
  tags?: string[];
}

export interface BusinessInput {
  id: string;
  name: string;
  type: string;
  size: "solo" | "small" | "medium" | "enterprise";
  location?: string;
  campaignCount?: number;
  avgRating?: number;
  plan?: string;
  industry?: string;
}

export interface InfluencerInput {
  id: string;
  displayName: string;
  niches: string[];
  platforms: Array<{
    platformId: string;
    followers: number;
    engagementRate: number;
  }>;
  followerCount: number;
  engagementRate: number;
  tier: "micro" | "mid" | "macro" | "mega";
  location?: string;
  completionRate?: number;
  campaignsCompleted?: number;
}

export interface ActionInput {
  id: string;
  label: string;
  type: string;
  effort: number;
  value: number;
  platformId: string;
}

// ─── Cluster Result ─────────────────────────────────────────────────────────

export interface ClusterResult {
  clusterId: number;
  centroid: Vector;
  members: Array<{
    entityId: string;
    distance: number;
  }>;
}

// ─── Vector Math (Static Utilities) ─────────────────────────────────────────

export class VectorMath {
  /**
   * Cosine similarity between two vectors.
   * Returns a value from -1 (opposite) to 1 (identical direction).
   * Returns 0 if either vector has zero magnitude.
   */
  static cosineSimilarity(a: Vector, b: Vector): number {
    if (a.length !== b.length) {
      throw new Error(
        `Vector dimension mismatch: ${a.length} vs ${b.length}`
      );
    }

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  /**
   * Euclidean distance between two vectors.
   * Lower values mean the vectors are closer together.
   */
  static euclideanDistance(a: Vector, b: Vector): number {
    if (a.length !== b.length) {
      throw new Error(
        `Vector dimension mismatch: ${a.length} vs ${b.length}`
      );
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Dot product of two vectors.
   */
  static dotProduct(a: Vector, b: Vector): number {
    if (a.length !== b.length) {
      throw new Error(
        `Vector dimension mismatch: ${a.length} vs ${b.length}`
      );
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result += a[i] * b[i];
    }
    return result;
  }

  /**
   * Normalize a vector to unit length (magnitude = 1).
   * Returns a zero vector if the input has zero magnitude.
   */
  static normalize(v: Vector): Vector {
    let magnitude = 0;
    for (let i = 0; i < v.length; i++) {
      magnitude += v[i] * v[i];
    }
    magnitude = Math.sqrt(magnitude);

    if (magnitude === 0) return new Array(v.length).fill(0);
    return v.map((x) => x / magnitude);
  }

  /**
   * Element-wise addition of two vectors.
   */
  static add(a: Vector, b: Vector): Vector {
    if (a.length !== b.length) {
      throw new Error(
        `Vector dimension mismatch: ${a.length} vs ${b.length}`
      );
    }
    return a.map((val, i) => val + b[i]);
  }

  /**
   * Scalar multiplication.
   */
  static scale(v: Vector, scalar: number): Vector {
    return v.map((x) => x * scalar);
  }

  /**
   * Magnitude (L2 norm) of a vector.
   */
  static magnitude(v: Vector): number {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
      sum += v[i] * v[i];
    }
    return Math.sqrt(sum);
  }

  /**
   * Mean of multiple vectors (element-wise average).
   */
  static mean(vectors: Vector[]): Vector {
    if (vectors.length === 0) return [];
    const dim = vectors[0].length;
    const result = new Array(dim).fill(0);
    for (const v of vectors) {
      if (v.length !== dim) {
        throw new Error(
          `Vector dimension mismatch in mean: expected ${dim}, got ${v.length}`
        );
      }
      for (let i = 0; i < dim; i++) {
        result[i] += v[i];
      }
    }
    for (let i = 0; i < dim; i++) {
      result[i] /= vectors.length;
    }
    return result;
  }
}

// ─── Feature Encoding Helpers ───────────────────────────────────────────────

/** Map of all platform IDs to index for one-hot encoding. */
const PLATFORM_INDEX: Record<string, number> = {};
PLATFORMS.forEach((p, i) => {
  PLATFORM_INDEX[p.id] = i;
});
const NUM_PLATFORMS = PLATFORMS.length;

/** Map of action type to index. */
const ACTION_TYPE_INDEX: Record<string, number> = {};
ACTION_CATEGORIES.forEach((c, i) => {
  ACTION_TYPE_INDEX[c.id] = i;
});
const NUM_ACTION_TYPES = ACTION_CATEGORIES.length;

/** Campaign tier to index. */
const TIER_INDEX: Record<string, number> = {
  starter: 0,
  essential: 1,
  growth: 2,
  high_impact: 3,
  premium: 4,
};
/** Business size to numeric value. */
const SIZE_VALUE: Record<string, number> = {
  solo: 0.2,
  small: 0.4,
  medium: 0.7,
  enterprise: 1.0,
};

/** Influencer tier to numeric value. */
const INFLUENCER_TIER_VALUE: Record<string, number> = {
  micro: 0.2,
  mid: 0.5,
  macro: 0.8,
  mega: 1.0,
};

/** Known niche categories for embedding. */
const NICHE_INDEX: Record<string, number> = {
  food: 0,
  fitness: 1,
  beauty: 2,
  fashion: 3,
  travel: 4,
  tech: 5,
  health: 6,
  lifestyle: 7,
  pets: 8,
  home: 9,
  entertainment: 10,
  education: 11,
  business: 12,
  automotive: 13,
  luxury: 14,
  family: 15,
};
const NUM_NICHES = 16;

/** Business trait keywords used for business type embedding. */
const TRAIT_KEYWORDS: string[] = [
  "visual",
  "food",
  "service",
  "wellness",
  "retail",
  "b2b",
  "transform",
  "hospitality",
  "healthcare",
  "education",
  "entertainment",
  "automotive",
  "pets",
  "luxury",
  "seasonal",
  "local",
];

/**
 * Simple trait detector that returns a feature vector for a business type string.
 * Matches against known keywords in the business type.
 */
function detectTraitFeatures(businessType: string): number[] {
  const t = businessType.toLowerCase();
  const patterns: Record<string, RegExp> = {
    visual: /salon|spa|tattoo|bakery|florist|restaurant|cafe|coffee|bar|gym|yoga|photo|fashion|boutique|beauty|hotel|art|gallery/i,
    food: /restaurant|cafe|coffee|bakery|bar|brewery|pizza|sushi|taco|burger|food|kitchen|juice|deli|catering|bistro/i,
    service: /law|account|insur|consult|clean|plumb|electric|mechanic|auto|dental|doctor|medical|therapy|vet|tutor|financial/i,
    wellness: /yoga|pilates|gym|fitness|spa|massage|wellness|meditation|health|therapy|dance|martial|crossfit/i,
    retail: /store|shop|boutique|cloth|fashion|jewel|book|toy|pet|garden|hardware|furniture|gift|flower|market/i,
    b2b: /consult|agency|market|design|develop|account|law|insur|financial|commercial|saas|tech|recruit/i,
    transform: /salon|barber|tattoo|spa|gym|fitness|yoga|beauty|nail|makeup|personal train|coach/i,
    hospitality: /hotel|motel|inn|resort|airbnb|bed and breakfast|hostel|lodge/i,
    healthcare: /dental|doctor|medical|clinic|hospital|optom|pharmacy|urgent care|chiropract/i,
    education: /tutor|school|academy|lesson|class|workshop|training/i,
    entertainment: /arcade|bowling|escape room|movie|theater|karaoke|museum|gallery|club/i,
    automotive: /mechanic|auto|car wash|tire|body shop|detail|oil change/i,
    pets: /vet|veterinar|pet|grooming|kennel|boarding|dog walk/i,
    luxury: /jewel|boutique|spa|resort|salon|fine dining|designer|premium|luxury/i,
    seasonal: /ice cream|pool|ski|christmas|halloween|garden center|wedding/i,
    local: /./i, // Everything is local
  };

  return TRAIT_KEYWORDS.map((trait) => {
    const pattern = patterns[trait];
    return pattern && pattern.test(t) ? 1.0 : 0.0;
  });
}

// ─── Embedding Engine ───────────────────────────────────────────────────────

let embeddingCounter = 0;

class EmbeddingEngine {
  private embeddings: Map<string, EmbeddingRecord> = new Map();

  // ── Embedding Generation ────────────────────────────────────────────────

  /**
   * Generate a 32-dimensional embedding for a campaign based on:
   * - Platform distribution of actions (dims 0-14, first 15 of 25 platforms)
   * - Action type distribution (dims 15-19, 5 types)
   * - Tier encoding (dims 20-24, 5 tiers)
   * - Effort stats (dims 25-26: avg effort normalized, effort variance)
   * - Value stats (dims 27-28: avg value normalized, total value)
   * - Discount features (dims 29-30: value normalized, type)
   * - Category hash (dim 31: deterministic hash of category string)
   */
  generateCampaignEmbedding(campaign: CampaignInput): Vector {
    const vec = new Array(32).fill(0);

    // Dims 0-14: Platform distribution
    const platformCounts: Record<string, number> = {};
    let totalEffort = 0;
    let totalValue = 0;
    const actionDetails: Array<{ effort: number; value: number; type: string }> = [];

    for (const actionId of campaign.actions) {
      const platformId = actionId.split("_")[0];
      platformCounts[platformId] = (platformCounts[platformId] ?? 0) + 1;
      const action = findAction(actionId);
      if (action) {
        totalEffort += action.effort;
        totalValue += action.value;
        actionDetails.push({
          effort: action.effort,
          value: action.value,
          type: action.type,
        });
      }
    }

    const numActions = Math.max(1, campaign.actions.length);
    for (const [pid, count] of Object.entries(platformCounts)) {
      const idx = PLATFORM_INDEX[pid];
      if (idx !== undefined && idx < 15) {
        vec[idx] = count / numActions;
      }
    }

    // Dims 15-19: Action type distribution
    const typeCounts: Record<string, number> = {};
    for (const detail of actionDetails) {
      typeCounts[detail.type] = (typeCounts[detail.type] ?? 0) + 1;
    }
    for (const [type, count] of Object.entries(typeCounts)) {
      const idx = ACTION_TYPE_INDEX[type];
      if (idx !== undefined) {
        vec[15 + idx] = count / numActions;
      }
    }

    // Dims 20-24: Tier one-hot
    const tierIdx = TIER_INDEX[campaign.tier];
    if (tierIdx !== undefined) {
      vec[20 + tierIdx] = 1.0;
    }

    // Dims 25-26: Effort stats
    const avgEffort = totalEffort / numActions;
    vec[25] = avgEffort / 5; // Normalize to 0-1 (max effort is 5)
    if (actionDetails.length > 1) {
      const effortVariance =
        actionDetails.reduce(
          (sum, a) => sum + (a.effort - avgEffort) ** 2,
          0
        ) / actionDetails.length;
      vec[26] = Math.min(1, effortVariance / 5);
    }

    // Dims 27-28: Value stats
    const avgValue = totalValue / numActions;
    vec[27] = Math.min(1, avgValue / 12); // Normalize (max single action value ~12)
    vec[28] = Math.min(1, totalValue / 50); // Normalize total

    // Dims 29-30: Discount features
    vec[29] = Math.min(1, campaign.discountValue / 50); // Normalize
    vec[30] = campaign.discountType === "pct" ? 1.0 : 0.0;

    // Dim 31: Category hash (deterministic)
    vec[31] = hashStringToFloat(campaign.category);

    return VectorMath.normalize(vec);
  }

  /**
   * Generate a 32-dimensional embedding for a business based on:
   * - Business type trait features (dims 0-15, 16 traits)
   * - Size encoding (dim 16)
   * - Campaign activity (dims 17-18: count normalized, avg rating)
   * - Plan tier (dim 19)
   * - Location features (dims 20-23: region hash features)
   * - Industry hash (dim 24)
   * - Derived features (dims 25-31: cross-features and padding)
   */
  generateBusinessEmbedding(business: BusinessInput): Vector {
    const vec = new Array(32).fill(0);

    // Dims 0-15: Trait features
    const traits = detectTraitFeatures(business.type);
    for (let i = 0; i < Math.min(16, traits.length); i++) {
      vec[i] = traits[i];
    }

    // Dim 16: Size
    vec[16] = SIZE_VALUE[business.size] ?? 0.4;

    // Dims 17-18: Campaign activity and rating
    vec[17] = Math.min(1, (business.campaignCount ?? 0) / 50);
    vec[18] = (business.avgRating ?? 0) / 5;

    // Dim 19: Plan tier
    const planValues: Record<string, number> = {
      free: 0.0,
      starter: 0.33,
      pro: 0.66,
      enterprise: 1.0,
    };
    vec[19] = planValues[business.plan ?? "free"] ?? 0;

    // Dims 20-23: Location features (hash-based)
    if (business.location) {
      const locHash = hashStringToFloat(business.location);
      vec[20] = locHash;
      vec[21] = hashStringToFloat(business.location + "_region");
      vec[22] = hashStringToFloat(business.location + "_area");
      vec[23] = hashStringToFloat(business.location + "_zone");
    }

    // Dim 24: Industry hash
    if (business.industry) {
      vec[24] = hashStringToFloat(business.industry);
    }

    // Dims 25-27: Cross-features (trait combinations that matter)
    // Visual + food = visually appealing food business (high social potential)
    vec[25] = vec[0] * vec[1]; // visual * food
    // Service + local = local service provider
    vec[26] = vec[2] * vec[15]; // service * local
    // Wellness + transform = transformation-oriented wellness
    vec[27] = vec[3] * vec[6]; // wellness * transform

    // Dims 28-31: Size interaction features
    vec[28] = vec[16] * vec[17]; // size * campaign activity
    vec[29] = vec[16] * vec[18]; // size * rating
    vec[30] = vec[16] * vec[19]; // size * plan
    vec[31] = vec[17] * vec[18]; // activity * rating

    return VectorMath.normalize(vec);
  }

  /**
   * Generate a 32-dimensional embedding for an influencer based on:
   * - Niche features (dims 0-15, 16 niches)
   * - Platform presence (dims 16-19: scaled by follower weight)
   * - Follower stats (dims 20-22: total, max single platform, diversity)
   * - Engagement (dim 23)
   * - Tier (dim 24)
   * - Performance (dims 25-27: completion rate, campaigns completed, response)
   * - Location hash (dims 28-29)
   * - Cross-features (dims 30-31)
   */
  generateInfluencerEmbedding(influencer: InfluencerInput): Vector {
    const vec = new Array(32).fill(0);

    // Dims 0-15: Niche features
    for (const niche of influencer.niches) {
      const idx = NICHE_INDEX[niche.toLowerCase()];
      if (idx !== undefined && idx < NUM_NICHES) {
        vec[idx] = 1.0;
      }
    }

    // Dims 16-19: Platform presence (top 4 platforms by followers)
    const sortedPlatforms = [...influencer.platforms].sort(
      (a, b) => b.followers - a.followers
    );
    for (let i = 0; i < Math.min(4, sortedPlatforms.length); i++) {
      const p = sortedPlatforms[i];
      // Encode platform identity mixed with relative follower weight
      const platformIdx = PLATFORM_INDEX[p.platformId] ?? 0;
      const followerWeight =
        influencer.followerCount > 0
          ? p.followers / influencer.followerCount
          : 0;
      vec[16 + i] =
        (platformIdx / NUM_PLATFORMS) * 0.5 + followerWeight * 0.5;
    }

    // Dims 20-22: Follower stats
    // Log scale to handle wide ranges (100 to 10M+)
    vec[20] = Math.min(
      1,
      Math.log10(Math.max(1, influencer.followerCount)) / 7
    ); // log10(10M) ~7
    const maxSingle = sortedPlatforms.length > 0 ? sortedPlatforms[0].followers : 0;
    vec[21] = Math.min(1, Math.log10(Math.max(1, maxSingle)) / 7);
    // Platform diversity: how spread across platforms
    vec[22] =
      influencer.platforms.length > 0
        ? Math.min(1, influencer.platforms.length / NUM_PLATFORMS)
        : 0;

    // Dim 23: Engagement rate (already 0-1 scale but cap at 0.2 = 20%)
    vec[23] = Math.min(1, influencer.engagementRate / 0.2);

    // Dim 24: Tier
    vec[24] = INFLUENCER_TIER_VALUE[influencer.tier] ?? 0.2;

    // Dims 25-27: Performance
    vec[25] = influencer.completionRate ?? 0;
    vec[26] = Math.min(
      1,
      (influencer.campaignsCompleted ?? 0) / 100
    );
    // Placeholder for avg response time (not always available)
    vec[27] = 0;

    // Dims 28-29: Location
    if (influencer.location) {
      vec[28] = hashStringToFloat(influencer.location);
      vec[29] = hashStringToFloat(influencer.location + "_region");
    }

    // Dims 30-31: Cross-features
    vec[30] = vec[20] * vec[23]; // followers * engagement
    vec[31] = vec[24] * vec[25]; // tier * completion rate

    return VectorMath.normalize(vec);
  }

  /**
   * Generate a 16-dimensional embedding for a marketing action based on:
   * - Platform one-hot (dims 0-7: compressed platform via hashing)
   * - Action type one-hot (dims 8-12, 5 types)
   * - Effort (dim 13: normalized 0-1)
   * - Value (dim 14: normalized 0-1)
   * - Effort-to-value ratio (dim 15)
   */
  generateActionEmbedding(action: ActionInput): Vector {
    const vec = new Array(16).fill(0);

    // Dims 0-7: Platform features (compressed)
    const platformIdx = PLATFORM_INDEX[action.platformId] ?? 0;
    // Distribute platform identity across 8 dims using a simple encoding
    for (let i = 0; i < 8; i++) {
      vec[i] = Math.sin((platformIdx + 1) * (i + 1) * 0.7) * 0.5 + 0.5;
    }

    // Dims 8-12: Action type one-hot
    const typeIdx = ACTION_TYPE_INDEX[action.type];
    if (typeIdx !== undefined && typeIdx < NUM_ACTION_TYPES) {
      vec[8 + typeIdx] = 1.0;
    }

    // Dim 13: Effort (normalized)
    vec[13] = action.effort / 5;

    // Dim 14: Value (normalized, max ~12)
    vec[14] = Math.min(1, action.value / 12);

    // Dim 15: Effort-to-value ratio
    vec[15] = action.effort > 0 ? Math.min(1, action.value / (action.effort * 3)) : 0.5;

    return VectorMath.normalize(vec);
  }

  // ── Storage ─────────────────────────────────────────────────────────────

  /** Store an embedding for an entity. Overwrites if the entityId already exists. */
  store(
    entityId: string,
    entityType: EmbeddableEntityType,
    vector: Vector,
    metadata: Record<string, unknown> = {}
  ): EmbeddingRecord {
    embeddingCounter++;
    const record: EmbeddingRecord = {
      id: `emb_${embeddingCounter}_${Date.now().toString(36)}`,
      entityId,
      entityType,
      vector,
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.embeddings.set(entityId, record);
    return record;
  }

  /** Retrieve an embedding by entity ID. */
  get(entityId: string): EmbeddingRecord | null {
    return this.embeddings.get(entityId) ?? null;
  }

  /** Remove an embedding. */
  remove(entityId: string): boolean {
    return this.embeddings.delete(entityId);
  }

  /** Get all embeddings of a given type. */
  getAll(entityType?: EmbeddableEntityType): EmbeddingRecord[] {
    const all = [...this.embeddings.values()];
    return entityType ? all.filter((e) => e.entityType === entityType) : all;
  }

  // ── Similarity Search ───────────────────────────────────────────────────

  /**
   * Find the top-N most similar entities to a given vector.
   * Uses cosine similarity for comparison.
   */
  findSimilar(
    vector: Vector,
    entityType: EmbeddableEntityType,
    limit: number = 10,
    minSimilarity: number = 0.0
  ): Array<{ entityId: string; similarity: number; metadata: Record<string, unknown> }> {
    const candidates: Array<{
      entityId: string;
      similarity: number;
      metadata: Record<string, unknown>;
    }> = [];

    for (const record of this.embeddings.values()) {
      if (record.entityType !== entityType) continue;
      if (record.vector.length !== vector.length) continue;

      const similarity = VectorMath.cosineSimilarity(vector, record.vector);
      if (similarity >= minSimilarity) {
        candidates.push({
          entityId: record.entityId,
          similarity: Math.round(similarity * 10000) / 10000,
          metadata: record.metadata,
        });
      }
    }

    candidates.sort((a, b) => b.similarity - a.similarity);
    return candidates.slice(0, limit);
  }

  /** Find campaigns similar to a given campaign (by its stored embedding). */
  findSimilarCampaigns(
    campaignId: string,
    limit: number = 10
  ): Array<{ entityId: string; similarity: number; metadata: Record<string, unknown> }> {
    const record = this.embeddings.get(campaignId);
    if (!record) return [];
    return this.findSimilar(record.vector, "campaign", limit + 1).filter(
      (r) => r.entityId !== campaignId
    ).slice(0, limit);
  }

  /** Find businesses similar to a given business. */
  findSimilarBusinesses(
    businessId: string,
    limit: number = 10
  ): Array<{ entityId: string; similarity: number; metadata: Record<string, unknown> }> {
    const record = this.embeddings.get(businessId);
    if (!record) return [];
    return this.findSimilar(record.vector, "business", limit + 1).filter(
      (r) => r.entityId !== businessId
    ).slice(0, limit);
  }

  /** Find influencers similar to a given influencer. */
  findSimilarInfluencers(
    influencerId: string,
    limit: number = 10
  ): Array<{ entityId: string; similarity: number; metadata: Record<string, unknown> }> {
    const record = this.embeddings.get(influencerId);
    if (!record) return [];
    return this.findSimilar(record.vector, "influencer", limit + 1).filter(
      (r) => r.entityId !== influencerId
    ).slice(0, limit);
  }

  // ── Recommendations ─────────────────────────────────────────────────────

  /**
   * Recommend campaigns for an influencer by comparing the influencer's
   * embedding against all campaign embeddings. Since the dimensions differ
   * (32 for influencer, 32 for campaign), we project both into a shared
   * compatibility space before comparison.
   */
  recommendCampaignsForInfluencer(
    influencerId: string,
    limit: number = 10
  ): Array<{ entityId: string; score: number; metadata: Record<string, unknown> }> {
    const influencerRecord = this.embeddings.get(influencerId);
    if (!influencerRecord) return [];

    const influencerVec = influencerRecord.vector;
    const campaigns = this.getAll("campaign");

    const scored: Array<{
      entityId: string;
      score: number;
      metadata: Record<string, unknown>;
    }> = [];

    for (const campaign of campaigns) {
      // Project both into a shared space by taking matching dimension elements
      const sharedDim = Math.min(influencerVec.length, campaign.vector.length);
      const infSlice = influencerVec.slice(0, sharedDim);
      const campSlice = campaign.vector.slice(0, sharedDim);

      const similarity = VectorMath.cosineSimilarity(infSlice, campSlice);

      // Boost score based on engagement alignment:
      // Influencer's niche dimensions (0-15) matched against campaign's platform dims (0-14)
      let nicheBoost = 0;
      for (let i = 0; i < Math.min(15, sharedDim); i++) {
        nicheBoost += influencerVec[i] * campaign.vector[i];
      }
      nicheBoost = Math.min(0.3, nicheBoost * 0.1);

      const score = Math.round((similarity * 0.7 + nicheBoost + 0.1) * 10000) / 10000;

      scored.push({
        entityId: campaign.entityId,
        score: Math.min(1, Math.max(0, score)),
        metadata: campaign.metadata,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /**
   * Recommend influencers for a campaign by comparing campaign embedding
   * against all influencer embeddings.
   */
  recommendInfluencersForCampaign(
    campaignId: string,
    limit: number = 10
  ): Array<{ entityId: string; score: number; metadata: Record<string, unknown> }> {
    const campaignRecord = this.embeddings.get(campaignId);
    if (!campaignRecord) return [];

    const campaignVec = campaignRecord.vector;
    const influencers = this.getAll("influencer");

    const scored: Array<{
      entityId: string;
      score: number;
      metadata: Record<string, unknown>;
    }> = [];

    for (const influencer of influencers) {
      const sharedDim = Math.min(campaignVec.length, influencer.vector.length);
      const campSlice = campaignVec.slice(0, sharedDim);
      const infSlice = influencer.vector.slice(0, sharedDim);

      const similarity = VectorMath.cosineSimilarity(campSlice, infSlice);

      // Boost based on follower count dimension alignment (dim 20 of influencer)
      const followerBoost =
        influencer.vector.length > 20 ? influencer.vector[20] * 0.1 : 0;

      // Boost based on engagement rate (dim 23 of influencer)
      const engagementBoost =
        influencer.vector.length > 23 ? influencer.vector[23] * 0.1 : 0;

      const score =
        Math.round(
          (similarity * 0.6 + followerBoost + engagementBoost + 0.1) * 10000
        ) / 10000;

      scored.push({
        entityId: influencer.entityId,
        score: Math.min(1, Math.max(0, score)),
        metadata: influencer.metadata,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /**
   * Recommend cross-promotion partners for a business by finding similar
   * businesses that are not identical.
   */
  recommendPartnerships(
    businessId: string,
    limit: number = 10
  ): Array<{
    entityId: string;
    compatibility: number;
    complementary: boolean;
    metadata: Record<string, unknown>;
  }> {
    const record = this.embeddings.get(businessId);
    if (!record) return [];

    const businesses = this.getAll("business");
    const results: Array<{
      entityId: string;
      compatibility: number;
      complementary: boolean;
      metadata: Record<string, unknown>;
    }> = [];

    for (const other of businesses) {
      if (other.entityId === businessId) continue;

      const similarity = VectorMath.cosineSimilarity(
        record.vector,
        other.vector
      );

      // A good partnership is neither too similar (competition) nor too different
      // Ideal range: 0.3 - 0.7 similarity
      const isComplementary = similarity >= 0.3 && similarity <= 0.7;
      const compatibility = isComplementary
        ? // Boost complementary businesses
          0.5 + (1 - Math.abs(similarity - 0.5)) * 0.5
        : // Similar businesses still get a base score
          similarity * 0.7;

      results.push({
        entityId: other.entityId,
        compatibility: Math.round(compatibility * 10000) / 10000,
        complementary: isComplementary,
        metadata: other.metadata,
      });
    }

    results.sort((a, b) => b.compatibility - a.compatibility);
    return results.slice(0, limit);
  }

  // ── Clustering ──────────────────────────────────────────────────────────

  /**
   * K-means clustering of all entities of a given type.
   * Returns k clusters with their centroids and member lists.
   */
  clusterEntities(
    entityType: EmbeddableEntityType,
    k: number = 5,
    maxIterations: number = 50
  ): ClusterResult[] {
    const records = this.getAll(entityType);
    if (records.length === 0) return [];

    // Adjust k if we have fewer entities
    k = Math.min(k, records.length);
    if (k <= 0) return [];

    const vectors = records.map((r) => r.vector);
    const dim = vectors[0].length;

    if (dim === 0) return [];

    const hasMismatch = vectors.some((v) => v.length !== dim);
    if (hasMismatch) {
      throw new Error(
        "Cannot cluster entities with mixed vector dimensions"
      );
    }

    // Initialize centroids using k-means++ style: pick first randomly,
    // then each subsequent centroid is the point farthest from existing centroids
    const centroids: Vector[] = [];
    const usedIndices = new Set<number>();

    // First centroid: deterministic pick (first element)
    centroids.push([...vectors[0]]);
    usedIndices.add(0);

    for (let c = 1; c < k; c++) {
      let maxDist = -1;
      let bestIdx = 0;
      for (let i = 0; i < vectors.length; i++) {
        if (usedIndices.has(i)) continue;
        // Distance to nearest existing centroid
        let minDistToCentroid = Infinity;
        for (const centroid of centroids) {
          const dist = VectorMath.euclideanDistance(vectors[i], centroid);
          if (dist < minDistToCentroid) minDistToCentroid = dist;
        }
        if (minDistToCentroid > maxDist) {
          maxDist = minDistToCentroid;
          bestIdx = i;
        }
      }
      centroids.push([...vectors[bestIdx]]);
      usedIndices.add(bestIdx);
    }

    // Assignments: which cluster each vector belongs to
    let assignments = new Array(vectors.length).fill(0);

    for (let iter = 0; iter < maxIterations; iter++) {
      // Assignment step: assign each vector to nearest centroid
      const newAssignments = vectors.map((vec) => {
        let minDist = Infinity;
        let bestCluster = 0;
        for (let c = 0; c < k; c++) {
          const dist = VectorMath.euclideanDistance(vec, centroids[c]);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = c;
          }
        }
        return bestCluster;
      });

      // Check convergence
      let changed = false;
      for (let i = 0; i < assignments.length; i++) {
        if (assignments[i] !== newAssignments[i]) {
          changed = true;
          break;
        }
      }
      assignments = newAssignments;
      if (!changed) break;

      // Update step: recalculate centroids
      for (let c = 0; c < k; c++) {
        const memberVectors = vectors.filter((_, i) => assignments[i] === c);
        if (memberVectors.length > 0) {
          centroids[c] = VectorMath.mean(memberVectors);
        }
      }
    }

    // Build results
    const clusters: ClusterResult[] = [];
    for (let c = 0; c < k; c++) {
      const memberIndices: number[] = [];
      for (let i = 0; i < assignments.length; i++) {
        if (assignments[i] === c) memberIndices.push(i);
      }

      const members = memberIndices.map((i) => ({
        entityId: records[i].entityId,
        distance: Math.round(
          VectorMath.euclideanDistance(vectors[i], centroids[c]) * 10000
        ) / 10000,
      }));

      // Sort members by distance to centroid (closest first)
      members.sort((a, b) => a.distance - b.distance);

      clusters.push({
        clusterId: c,
        centroid: centroids[c],
        members,
      });
    }

    return clusters;
  }

  // ── Utility ─────────────────────────────────────────────────────────────

  /** Get total count of stored embeddings, optionally by type. */
  count(entityType?: EmbeddableEntityType): number {
    if (!entityType) return this.embeddings.size;
    let count = 0;
    for (const r of this.embeddings.values()) {
      if (r.entityType === entityType) count++;
    }
    return count;
  }

  /** Clear all stored embeddings. Primarily for testing. */
  clear(): void {
    this.embeddings.clear();
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Deterministic hash of a string to a float in [0, 1].
 * Used for encoding categorical features like category names and locations.
 */
function hashStringToFloat(s: string): number {
  if (!s || s.length === 0) return 0;
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) + hash + char) | 0;
  }
  return Math.abs(hash % 10000) / 10000;
}

// ── Singleton Export ────────────────────────────────────────────────────────

export const embeddingEngine = new EmbeddingEngine();
