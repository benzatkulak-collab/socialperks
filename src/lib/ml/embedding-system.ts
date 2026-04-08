// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Vector Embedding System
// Real vector store, embedding generator, and similarity-based matching
// ══════════════════════════════════════════════════════════════════════════════

import { PLATFORMS, findAction } from "../platforms";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Fixed embedding dimension for all entity types. */
const EMBEDDING_DIM = 64;

// ─── Feature Index Maps ──────────────────────────────────────────────────────

const PLATFORM_INDEX: Record<string, number> = {};
PLATFORMS.forEach((p, i) => { PLATFORM_INDEX[p.id] = i; });
const NUM_PLATFORMS = PLATFORMS.length; // 15

const ACTION_TYPE_INDEX: Record<string, number> = {
  content: 0,
  review: 1,
  engage: 2,
  share: 3,
  referral: 4,
};
const NUM_ACTION_TYPES = 5;

const TIER_INDEX: Record<string, number> = {
  starter: 0,
  essential: 1,
  growth: 2,
  high_impact: 3,
  premium: 4,
};

const NICHE_INDEX: Record<string, number> = {
  food: 0, fitness: 1, beauty: 2, fashion: 3, travel: 4,
  tech: 5, health: 6, lifestyle: 7, pets: 8, home: 9,
  entertainment: 10, education: 11, business: 12, automotive: 13,
  luxury: 14, family: 15, restaurants: 16, local: 17,
  photography: 18, wellness: 19, yoga: 20, meditation: 21,
  gym: 22, music: 23,
};
const NUM_NICHES = 24;

const SIZE_VALUE: Record<string, number> = {
  solo: 0.2, small: 0.4, medium: 0.7, enterprise: 1.0,
};

const INFLUENCER_TIER_VALUE: Record<string, number> = {
  micro: 0.2, mid: 0.5, macro: 0.8, mega: 1.0,
};

const INDUSTRY_INDEX: Record<string, number> = {
  "food & beverage": 0, wellness: 1, beauty: 2, fitness: 3,
  retail: 4, "professional services": 5, "pet care": 6,
  automotive: 7, healthcare: 8, entertainment: 9,
  "art & body": 10, grocery: 11, education: 12, technology: 13,
};
const NUM_INDUSTRIES = 14;

const BUSINESS_TYPE_TRAITS: Record<string, RegExp> = {
  visual: /salon|spa|tattoo|bakery|florist|restaurant|cafe|coffee|bar|gym|yoga|photo|fashion|boutique|beauty|hotel|art|gallery/i,
  food: /restaurant|cafe|coffee|bakery|bar|brewery|pizza|sushi|taco|burger|food|kitchen|juice|deli|catering|bistro/i,
  service: /law|account|insur|consult|clean|plumb|electric|mechanic|auto|dental|doctor|medical|therapy|vet|tutor|financial/i,
  wellness: /yoga|pilates|gym|fitness|spa|massage|wellness|meditation|health|therapy|dance|martial|crossfit/i,
  retail: /store|shop|boutique|cloth|fashion|jewel|book|toy|pet|garden|hardware|furniture|gift|flower|market/i,
  transform: /salon|barber|tattoo|spa|gym|fitness|yoga|beauty|nail|makeup|personal train|coach/i,
  hospitality: /hotel|motel|inn|resort|airbnb|bed and breakfast|hostel|lodge/i,
  healthcare: /dental|doctor|medical|clinic|hospital|optom|pharmacy|urgent care|chiropract/i,
  entertainment: /arcade|bowling|escape room|movie|theater|karaoke|museum|gallery|club/i,
};
const TRAIT_KEYS = Object.keys(BUSINESS_TYPE_TRAITS);
const NUM_TRAITS = TRAIT_KEYS.length; // 9

// ─── Type Definitions ─────────────────────────────────────────────────────────

/** A single entry in the vector store. */
export interface VectorEntry {
  id: string;
  entityType: "influencer" | "campaign" | "business" | "content";
  entityId: string;
  vector: Float32Array;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

/** Result of a similarity search. */
export interface SearchResult {
  entry: VectorEntry;
  similarity: number;
}

/** Filter criteria for metadata-based search. */
export interface MetadataFilter {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";
  value: unknown;
}

/** Input for generating an influencer embedding. */
export interface InfluencerEmbeddingInput {
  id: string;
  niches: string[];
  followerCount: number;
  engagementRate: number;
  platforms: Array<{ platformId: string; followers: number }>;
  tier: "micro" | "mid" | "macro" | "mega";
  location?: string;
  completionRate?: number;
  campaignsCompleted?: number;
}

/** Input for generating a campaign embedding. */
export interface CampaignEmbeddingInput {
  id: string;
  actions: string[];
  tier: string;
  discountValue: number;
  discountType: "pct" | "dol";
  businessType?: string;
  category?: string;
  tags?: string[];
}

/** Input for generating a business embedding. */
export interface BusinessEmbeddingInput {
  id: string;
  type: string;
  size: "solo" | "small" | "medium" | "enterprise";
  industry?: string;
  location?: string;
  campaignCount?: number;
  avgRating?: number;
}

/** A recommendation from the matching service. */
export interface Recommendation {
  entityId: string;
  entityType: "influencer" | "campaign" | "business";
  score: number;
  reasons: string[];
  metadata: Record<string, unknown>;
}

// ─── Deterministic Hash Utilities ─────────────────────────────────────────────

/**
 * FNV-1a 32-bit hash for strings. Deterministic — same input always produces
 * the same hash value.
 */
function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Hash a string to a float in [0, 1]. Deterministic.
 */
function hashToFloat(str: string): number {
  return (fnv1aHash(str) % 100000) / 100000;
}

/**
 * Hash a string into multiple float values spread across a vector segment.
 * Produces `count` deterministic values in [0, 1].
 */
function hashToFloats(str: string, count: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    result.push(hashToFloat(`${str}_${i}`));
  }
  return result;
}

// ─── Vector Math ──────────────────────────────────────────────────────────────

/**
 * Cosine similarity between two Float32Arrays.
 * Returns a value from -1 (opposite) to 1 (identical direction).
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
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
 * Normalize a Float32Array to unit length.
 */
function normalizeVector(v: Float32Array): Float32Array {
  let magnitude = 0;
  for (let i = 0; i < v.length; i++) {
    magnitude += v[i] * v[i];
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude === 0) return new Float32Array(v.length);

  const result = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) {
    result[i] = v[i] / magnitude;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Vector Store
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * In-memory vector store with brute-force KNN search using cosine similarity.
 * Stores Float32Array vectors and supports metadata-based filtering.
 */
export class VectorStore {
  private entries: Map<string, VectorEntry> = new Map();
  private entityIndex: Map<string, Set<string>> = new Map();

  /** Total number of entries in the store. */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Add or update a vector entry. If an entry with the same ID exists,
   * it is replaced.
   */
  upsert(
    id: string,
    entityType: VectorEntry["entityType"],
    entityId: string,
    vector: Float32Array,
    metadata: Record<string, unknown> = {}
  ): VectorEntry {
    if (vector.length !== EMBEDDING_DIM) {
      throw new Error(
        `Vector dimension must be ${EMBEDDING_DIM}, got ${vector.length}`
      );
    }

    // Remove old entity index entry if replacing
    const existing = this.entries.get(id);
    if (existing) {
      const key = `${existing.entityType}:${existing.entityId}`;
      this.entityIndex.get(key)?.delete(id);
    }

    const entry: VectorEntry = {
      id,
      entityType,
      entityId,
      vector: normalizeVector(vector),
      metadata,
      updatedAt: new Date().toISOString(),
    };

    this.entries.set(id, entry);

    // Maintain entity index for fast lookups
    const entityKey = `${entityType}:${entityId}`;
    if (!this.entityIndex.has(entityKey)) {
      this.entityIndex.set(entityKey, new Set());
    }
    this.entityIndex.get(entityKey)!.add(id);

    return entry;
  }

  /**
   * K-nearest-neighbors search using cosine similarity.
   * Returns the top-k most similar entries sorted by descending similarity.
   */
  search(
    query: Float32Array,
    k: number = 10,
    entityType?: VectorEntry["entityType"]
  ): SearchResult[] {
    if (query.length !== EMBEDDING_DIM) {
      throw new Error(
        `Query vector dimension must be ${EMBEDDING_DIM}, got ${query.length}`
      );
    }

    const normalizedQuery = normalizeVector(query);
    const results: SearchResult[] = [];

    for (const entry of this.entries.values()) {
      if (entityType && entry.entityType !== entityType) continue;

      const similarity = cosineSimilarity(normalizedQuery, entry.vector);
      results.push({ entry, similarity });
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, k);
  }

  /**
   * K-nearest-neighbors search with metadata filtering.
   * Filters are applied before similarity ranking.
   */
  searchWithFilter(
    query: Float32Array,
    filters: MetadataFilter[],
    k: number = 10,
    entityType?: VectorEntry["entityType"]
  ): SearchResult[] {
    if (query.length !== EMBEDDING_DIM) {
      throw new Error(
        `Query vector dimension must be ${EMBEDDING_DIM}, got ${query.length}`
      );
    }

    const normalizedQuery = normalizeVector(query);
    const results: SearchResult[] = [];

    for (const entry of this.entries.values()) {
      if (entityType && entry.entityType !== entityType) continue;
      if (!this.matchesFilters(entry, filters)) continue;

      const similarity = cosineSimilarity(normalizedQuery, entry.vector);
      results.push({ entry, similarity });
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, k);
  }

  /**
   * Delete an entry by its store ID.
   */
  delete(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    const entityKey = `${entry.entityType}:${entry.entityId}`;
    this.entityIndex.get(entityKey)?.delete(id);
    if (this.entityIndex.get(entityKey)?.size === 0) {
      this.entityIndex.delete(entityKey);
    }

    this.entries.delete(id);
    return true;
  }

  /**
   * Delete all entries for a given entity type and ID.
   */
  deleteByEntity(entityType: VectorEntry["entityType"], entityId: string): number {
    const entityKey = `${entityType}:${entityId}`;
    const ids = this.entityIndex.get(entityKey);
    if (!ids) return 0;

    let count = 0;
    for (const id of ids) {
      this.entries.delete(id);
      count++;
    }

    this.entityIndex.delete(entityKey);
    return count;
  }

  /**
   * Get a specific entry by ID.
   */
  get(id: string): VectorEntry | null {
    return this.entries.get(id) ?? null;
  }

  /**
   * Get all entries for a given entity.
   */
  getByEntity(entityType: VectorEntry["entityType"], entityId: string): VectorEntry[] {
    const entityKey = `${entityType}:${entityId}`;
    const ids = this.entityIndex.get(entityKey);
    if (!ids) return [];

    const results: VectorEntry[] = [];
    for (const id of ids) {
      const entry = this.entries.get(id);
      if (entry) results.push(entry);
    }
    return results;
  }

  /**
   * Clear all entries from the store.
   */
  clear(): void {
    this.entries.clear();
    this.entityIndex.clear();
  }

  /**
   * Get all entries, optionally filtered by entity type.
   */
  getAll(entityType?: VectorEntry["entityType"]): VectorEntry[] {
    const all = [...this.entries.values()];
    if (!entityType) return all;
    return all.filter((e) => e.entityType === entityType);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private matchesFilters(entry: VectorEntry, filters: MetadataFilter[]): boolean {
    for (const filter of filters) {
      const value = entry.metadata[filter.field];
      if (!this.matchesFilter(value, filter)) return false;
    }
    return true;
  }

  private matchesFilter(value: unknown, filter: MetadataFilter): boolean {
    switch (filter.operator) {
      case "eq":
        return value === filter.value;
      case "neq":
        return value !== filter.value;
      case "gt":
        return typeof value === "number" && typeof filter.value === "number" && value > filter.value;
      case "gte":
        return typeof value === "number" && typeof filter.value === "number" && value >= filter.value;
      case "lt":
        return typeof value === "number" && typeof filter.value === "number" && value < filter.value;
      case "lte":
        return typeof value === "number" && typeof filter.value === "number" && value <= filter.value;
      case "in":
        return Array.isArray(filter.value) && filter.value.includes(value);
      case "contains":
        return (
          typeof value === "string" &&
          typeof filter.value === "string" &&
          value.toLowerCase().includes(filter.value.toLowerCase())
        );
      default:
        return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Embedding Generator
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates fixed-dimension (64) Float32Array vectors from entity data.
 * Uses deterministic hashing so the same input always produces the same vector.
 *
 * Dimension layout (64 total):
 *
 * Influencer:
 *   [0-23]   Niche one-hot (24 dims)
 *   [24-38]  Platform presence one-hot (15 dims)
 *   [39]     Normalized follower count (log scale)
 *   [40]     Engagement rate normalized
 *   [41]     Influencer tier value
 *   [42]     Completion rate
 *   [43]     Campaigns completed (log normalized)
 *   [44-47]  Platform follower distribution (top 4)
 *   [48-51]  Location hash features
 *   [52-63]  Reserved / cross-features
 *
 * Campaign:
 *   [0-14]   Platform action distribution (15 dims)
 *   [15-19]  Action type distribution (5 dims)
 *   [20-24]  Tier one-hot (5 dims)
 *   [25]     Average effort normalized
 *   [26]     Effort variance normalized
 *   [27]     Average value normalized
 *   [28]     Total value normalized
 *   [29]     Discount value normalized
 *   [30]     Discount type (pct=1, dol=0)
 *   [31-34]  Business type hash features
 *   [35-38]  Category hash features
 *   [39-42]  Tag hash features
 *   [43-63]  Reserved / cross-features
 *
 * Business:
 *   [0-8]    Business type trait features (9 dims)
 *   [9]      Size value
 *   [10-23]  Industry one-hot (14 dims)
 *   [24-27]  Location hash features
 *   [28]     Campaign count normalized
 *   [29]     Average rating normalized
 *   [30-63]  Business type hash + cross-features
 */
export class EmbeddingGenerator {
  /** The fixed dimension of all generated embeddings. */
  readonly dimension = EMBEDDING_DIM;

  /**
   * Create an embedding vector for an influencer.
   * Encodes niches, follower count, engagement rate, platform presence, tier,
   * and location into a 64-dimensional normalized vector.
   */
  embedInfluencer(input: InfluencerEmbeddingInput): Float32Array {
    const vec = new Float32Array(EMBEDDING_DIM);

    // Dims 0-23: Niche one-hot encoding
    for (const niche of input.niches) {
      const idx = NICHE_INDEX[niche.toLowerCase()];
      if (idx !== undefined && idx < NUM_NICHES) {
        vec[idx] = 1.0;
      }
    }

    // Dims 24-38: Platform presence one-hot
    for (const platform of input.platforms) {
      const idx = PLATFORM_INDEX[platform.platformId];
      if (idx !== undefined) {
        vec[24 + idx] = 1.0;
      }
    }

    // Dim 39: Follower count (log-normalized to 0-1 range)
    // log10(1) = 0, log10(10M) ~ 7, so divide by 7
    vec[39] = Math.min(1.0, Math.log10(Math.max(1, input.followerCount)) / 7);

    // Dim 40: Engagement rate normalized (typical range 0-15%, divide by 15)
    vec[40] = Math.min(1.0, (input.engagementRate ?? 0) / 15);

    // Dim 41: Influencer tier value
    vec[41] = INFLUENCER_TIER_VALUE[input.tier] ?? 0.5;

    // Dim 42: Completion rate (0-1 already)
    vec[42] = Math.min(1.0, input.completionRate ?? 0.8);

    // Dim 43: Campaigns completed (log-normalized)
    vec[43] = Math.min(1.0, Math.log10(Math.max(1, input.campaignsCompleted ?? 1)) / 4);

    // Dims 44-47: Platform follower distribution (top 4 platforms by followers)
    const sortedPlatforms = [...input.platforms].sort((a, b) => b.followers - a.followers);
    const totalFollowers = Math.max(1, input.platforms.reduce((s, p) => s + p.followers, 0));
    for (let i = 0; i < Math.min(4, sortedPlatforms.length); i++) {
      vec[44 + i] = sortedPlatforms[i].followers / totalFollowers;
    }

    // Dims 48-51: Location hash features
    if (input.location) {
      const locFloats = hashToFloats(input.location.toLowerCase(), 4);
      for (let i = 0; i < 4; i++) {
        vec[48 + i] = locFloats[i];
      }
    }

    // Dims 52-55: Cross-features (niche-platform interaction)
    // Encode how many niches are active, how diverse the platform spread is
    vec[52] = Math.min(1.0, input.niches.length / 6); // Niche diversity
    vec[53] = Math.min(1.0, input.platforms.length / NUM_PLATFORMS); // Platform diversity

    // Engagement-follower interaction: high engagement + high followers = premium
    vec[54] = vec[39] * vec[40];

    // Tier-engagement consistency
    vec[55] = vec[41] * vec[40];

    // Dims 56-63: Extended location and demographic hash features
    if (input.location) {
      const extLocFloats = hashToFloats(`ext_${input.location.toLowerCase()}`, 8);
      for (let i = 0; i < 8; i++) {
        vec[56 + i] = extLocFloats[i];
      }
    }

    return normalizeVector(vec);
  }

  /**
   * Create an embedding vector for a campaign.
   * Encodes action platforms, action types, tier, effort/value stats,
   * discount info, and business context into a 64-dimensional normalized vector.
   */
  embedCampaign(input: CampaignEmbeddingInput): Float32Array {
    const vec = new Float32Array(EMBEDDING_DIM);

    // Gather action metadata
    const platformCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    let totalEffort = 0;
    let totalValue = 0;
    const efforts: number[] = [];

    for (const actionId of input.actions) {
      const platformId = actionId.split("_")[0];
      platformCounts[platformId] = (platformCounts[platformId] ?? 0) + 1;

      const action = findAction(actionId);
      if (action) {
        typeCounts[action.type] = (typeCounts[action.type] ?? 0) + 1;
        totalEffort += action.effort;
        totalValue += action.value;
        efforts.push(action.effort);
      }
    }

    const numActions = Math.max(1, input.actions.length);

    // Dims 0-14: Platform action distribution
    for (const [pid, count] of Object.entries(platformCounts)) {
      const idx = PLATFORM_INDEX[pid];
      if (idx !== undefined && idx < NUM_PLATFORMS) {
        vec[idx] = count / numActions;
      }
    }

    // Dims 15-19: Action type distribution
    for (const [type, count] of Object.entries(typeCounts)) {
      const idx = ACTION_TYPE_INDEX[type];
      if (idx !== undefined) {
        vec[15 + idx] = count / numActions;
      }
    }

    // Dims 20-24: Tier one-hot
    const tierIdx = TIER_INDEX[input.tier];
    if (tierIdx !== undefined) {
      vec[20 + tierIdx] = 1.0;
    }

    // Dim 25: Average effort normalized (max effort = 5)
    const avgEffort = totalEffort / numActions;
    vec[25] = avgEffort / 5;

    // Dim 26: Effort variance normalized
    if (efforts.length > 1) {
      const effortVariance =
        efforts.reduce((sum, e) => sum + (e - avgEffort) ** 2, 0) / efforts.length;
      vec[26] = Math.min(1.0, effortVariance / 5);
    }

    // Dim 27: Average value normalized (max single action ~12)
    vec[27] = Math.min(1.0, (totalValue / numActions) / 12);

    // Dim 28: Total value normalized
    vec[28] = Math.min(1.0, totalValue / 50);

    // Dim 29: Discount value normalized
    vec[29] = Math.min(1.0, input.discountValue / 50);

    // Dim 30: Discount type encoding
    vec[30] = input.discountType === "pct" ? 1.0 : 0.0;

    // Dims 31-34: Business type hash features
    if (input.businessType) {
      const btFloats = hashToFloats(input.businessType.toLowerCase(), 4);
      for (let i = 0; i < 4; i++) {
        vec[31 + i] = btFloats[i];
      }
    }

    // Dims 35-38: Category hash features
    if (input.category) {
      const catFloats = hashToFloats(input.category.toLowerCase(), 4);
      for (let i = 0; i < 4; i++) {
        vec[35 + i] = catFloats[i];
      }
    }

    // Dims 39-42: Tag hash features (aggregate of all tags)
    if (input.tags && input.tags.length > 0) {
      const tagStr = input.tags.sort().join("|").toLowerCase();
      const tagFloats = hashToFloats(tagStr, 4);
      for (let i = 0; i < 4; i++) {
        vec[39 + i] = tagFloats[i];
      }
    }

    // Dims 43-47: Cross-features
    vec[43] = Math.min(1.0, numActions / 10); // Action count normalized
    vec[44] = Object.keys(platformCounts).length / NUM_PLATFORMS; // Platform diversity
    vec[45] = Object.keys(typeCounts).length / NUM_ACTION_TYPES; // Type diversity
    vec[46] = vec[25] * vec[27]; // Effort-value interaction
    vec[47] = vec[29] * (vec[20] + vec[21] + vec[22] + vec[23] + vec[24]); // Discount-tier interaction

    // Dims 48-63: Extended business type trait detection
    if (input.businessType) {
      const bt = input.businessType.toLowerCase();
      TRAIT_KEYS.forEach((trait, i) => {
        if (i < 9 && 48 + i < EMBEDDING_DIM) {
          vec[48 + i] = BUSINESS_TYPE_TRAITS[trait].test(bt) ? 1.0 : 0.0;
        }
      });
    }

    // Remaining dims (57-63): hash-based features from combined inputs
    const combined = `${input.tier}_${input.businessType ?? ""}_${input.category ?? ""}`;
    const combinedFloats = hashToFloats(combined.toLowerCase(), 7);
    for (let i = 0; i < 7; i++) {
      vec[57 + i] = combinedFloats[i];
    }

    return normalizeVector(vec);
  }

  /**
   * Create an embedding vector for a business.
   * Encodes business type traits, size, industry, location, and activity
   * metrics into a 64-dimensional normalized vector.
   */
  embedBusiness(input: BusinessEmbeddingInput): Float32Array {
    const vec = new Float32Array(EMBEDDING_DIM);

    // Dims 0-8: Business type trait features
    const bt = input.type.toLowerCase();
    TRAIT_KEYS.forEach((trait, i) => {
      if (i < NUM_TRAITS) {
        vec[i] = BUSINESS_TYPE_TRAITS[trait].test(bt) ? 1.0 : 0.0;
      }
    });

    // Dim 9: Size value
    vec[9] = SIZE_VALUE[input.size] ?? 0.5;

    // Dims 10-23: Industry one-hot encoding
    if (input.industry) {
      const idx = INDUSTRY_INDEX[input.industry.toLowerCase()];
      if (idx !== undefined && idx < NUM_INDUSTRIES) {
        vec[10 + idx] = 1.0;
      }
    }

    // Dims 24-27: Location hash features
    if (input.location) {
      const locFloats = hashToFloats(input.location.toLowerCase(), 4);
      for (let i = 0; i < 4; i++) {
        vec[24 + i] = locFloats[i];
      }
    }

    // Dim 28: Campaign count normalized (log scale)
    vec[28] = Math.min(1.0, Math.log10(Math.max(1, input.campaignCount ?? 0)) / 4);

    // Dim 29: Average rating normalized (0-5 scale)
    vec[29] = (input.avgRating ?? 0) / 5;

    // Dims 30-37: Business type hash features (more granular than traits)
    const typeFloats = hashToFloats(bt, 8);
    for (let i = 0; i < 8; i++) {
      vec[30 + i] = typeFloats[i];
    }

    // Dims 38-41: Industry hash features (complement to one-hot)
    if (input.industry) {
      const indFloats = hashToFloats(input.industry.toLowerCase(), 4);
      for (let i = 0; i < 4; i++) {
        vec[38 + i] = indFloats[i];
      }
    }

    // Dims 42-45: Cross-features
    vec[42] = vec[9] * vec[28]; // Size-activity interaction
    vec[43] = vec[9] * vec[29]; // Size-rating interaction
    vec[44] = vec[28] * vec[29]; // Activity-rating interaction

    // Sum of trait features as "business complexity" signal
    let traitSum = 0;
    for (let i = 0; i < NUM_TRAITS; i++) {
      traitSum += vec[i];
    }
    vec[45] = Math.min(1.0, traitSum / NUM_TRAITS);

    // Dims 46-55: Extended location hash features
    if (input.location) {
      const extLocFloats = hashToFloats(`ext_biz_${input.location.toLowerCase()}`, 10);
      for (let i = 0; i < 10; i++) {
        vec[46 + i] = extLocFloats[i];
      }
    }

    // Dims 56-63: Combined hash features for holistic representation
    const combined = `${input.type}_${input.size}_${input.industry ?? ""}`;
    const combinedFloats = hashToFloats(combined.toLowerCase(), 8);
    for (let i = 0; i < 8; i++) {
      vec[56 + i] = combinedFloats[i];
    }

    return normalizeVector(vec);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Matching Service
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * High-level matching service that combines the VectorStore and EmbeddingGenerator
 * to provide influencer-campaign-business matching and recommendations.
 */
export class MatchingService {
  private store: VectorStore;
  private generator: EmbeddingGenerator;

  constructor(store?: VectorStore, generator?: EmbeddingGenerator) {
    this.store = store ?? new VectorStore();
    this.generator = generator ?? new EmbeddingGenerator();
  }

  /** Access the underlying vector store for direct operations. */
  getStore(): VectorStore {
    return this.store;
  }

  /** Access the embedding generator. */
  getGenerator(): EmbeddingGenerator {
    return this.generator;
  }

  // ── Index Entities ──────────────────────────────────────────────────────────

  /**
   * Index an influencer into the vector store.
   */
  indexInfluencer(input: InfluencerEmbeddingInput): VectorEntry {
    const vector = this.generator.embedInfluencer(input);
    return this.store.upsert(
      `inf_${input.id}`,
      "influencer",
      input.id,
      vector,
      {
        niches: input.niches,
        followerCount: input.followerCount,
        engagementRate: input.engagementRate,
        tier: input.tier,
        location: input.location ?? "",
        platformIds: input.platforms.map((p) => p.platformId),
      }
    );
  }

  /**
   * Index a campaign into the vector store.
   */
  indexCampaign(input: CampaignEmbeddingInput): VectorEntry {
    const vector = this.generator.embedCampaign(input);
    return this.store.upsert(
      `cmp_${input.id}`,
      "campaign",
      input.id,
      vector,
      {
        tier: input.tier,
        discountValue: input.discountValue,
        discountType: input.discountType,
        businessType: input.businessType ?? "",
        category: input.category ?? "",
        actionCount: input.actions.length,
        platformIds: [...new Set(input.actions.map((a) => a.split("_")[0]))],
      }
    );
  }

  /**
   * Index a business into the vector store.
   */
  indexBusiness(input: BusinessEmbeddingInput): VectorEntry {
    const vector = this.generator.embedBusiness(input);
    return this.store.upsert(
      `biz_${input.id}`,
      "business",
      input.id,
      vector,
      {
        type: input.type,
        size: input.size,
        industry: input.industry ?? "",
        location: input.location ?? "",
        campaignCount: input.campaignCount ?? 0,
        avgRating: input.avgRating ?? 0,
      }
    );
  }

  // ── Similarity Searches ─────────────────────────────────────────────────────

  /**
   * Find influencers similar to a given influencer.
   * Returns ranked list excluding the query influencer.
   */
  findSimilarInfluencers(
    influencer: InfluencerEmbeddingInput,
    k: number = 10,
    filters?: MetadataFilter[]
  ): SearchResult[] {
    const queryVector = this.generator.embedInfluencer(influencer);

    let results: SearchResult[];
    if (filters && filters.length > 0) {
      results = this.store.searchWithFilter(queryVector, filters, k + 1, "influencer");
    } else {
      results = this.store.search(queryVector, k + 1, "influencer");
    }

    // Exclude the query influencer itself
    return results
      .filter((r) => r.entry.entityId !== influencer.id)
      .slice(0, k);
  }

  /**
   * Find campaigns that match an influencer's profile.
   * Matches based on the influencer's embedding compared to campaign embeddings.
   */
  findMatchingCampaigns(
    influencer: InfluencerEmbeddingInput,
    k: number = 10,
    filters?: MetadataFilter[]
  ): SearchResult[] {
    const queryVector = this.generator.embedInfluencer(influencer);

    if (filters && filters.length > 0) {
      return this.store.searchWithFilter(queryVector, filters, k, "campaign");
    }
    return this.store.search(queryVector, k, "campaign");
  }

  /**
   * Find influencers that match a campaign's requirements.
   * Matches based on the campaign's embedding compared to influencer embeddings.
   */
  findMatchingInfluencers(
    campaign: CampaignEmbeddingInput,
    k: number = 10,
    filters?: MetadataFilter[]
  ): SearchResult[] {
    const queryVector = this.generator.embedCampaign(campaign);

    if (filters && filters.length > 0) {
      return this.store.searchWithFilter(queryVector, filters, k, "influencer");
    }
    return this.store.search(queryVector, k, "influencer");
  }

  /**
   * Get combined recommendations for an influencer.
   * Returns scored and ranked recommendations across campaigns and businesses,
   * with human-readable reasons explaining each match.
   */
  getRecommendations(
    influencer: InfluencerEmbeddingInput,
    options: {
      maxCampaigns?: number;
      maxBusinesses?: number;
      minScore?: number;
    } = {}
  ): Recommendation[] {
    const {
      maxCampaigns = 5,
      maxBusinesses = 3,
      minScore = 0.1,
    } = options;

    const recommendations: Recommendation[] = [];

    // Find matching campaigns
    const campaignMatches = this.findMatchingCampaigns(influencer, maxCampaigns * 2);
    for (const match of campaignMatches) {
      if (match.similarity < minScore) continue;

      const reasons = this.generateCampaignMatchReasons(influencer, match);
      recommendations.push({
        entityId: match.entry.entityId,
        entityType: "campaign",
        score: match.similarity,
        reasons,
        metadata: match.entry.metadata,
      });
    }

    // Find matching businesses
    const businessMatches = this.store.search(
      this.generator.embedInfluencer(influencer),
      maxBusinesses * 2,
      "business"
    );
    for (const match of businessMatches) {
      if (match.similarity < minScore) continue;

      const reasons = this.generateBusinessMatchReasons(influencer, match);
      recommendations.push({
        entityId: match.entry.entityId,
        entityType: "business",
        score: match.similarity,
        reasons,
        metadata: match.entry.metadata,
      });
    }

    // Sort all recommendations by score descending
    recommendations.sort((a, b) => b.score - a.score);

    // Apply limits
    const campaignRecs = recommendations
      .filter((r) => r.entityType === "campaign")
      .slice(0, maxCampaigns);
    const businessRecs = recommendations
      .filter((r) => r.entityType === "business")
      .slice(0, maxBusinesses);

    return [...campaignRecs, ...businessRecs].sort((a, b) => b.score - a.score);
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private generateCampaignMatchReasons(
    influencer: InfluencerEmbeddingInput,
    match: SearchResult
  ): string[] {
    const reasons: string[] = [];
    const meta = match.entry.metadata;

    // Check platform overlap
    const infPlatforms = new Set(influencer.platforms.map((p) => p.platformId));
    const cmpPlatforms = meta.platformIds as string[] | undefined;
    if (cmpPlatforms) {
      const overlap = cmpPlatforms.filter((p) => infPlatforms.has(p));
      if (overlap.length > 0) {
        const names = overlap.map((id) => PLATFORMS.find((p) => p.id === id)?.name ?? id);
        reasons.push(`Active on matching platforms: ${names.join(", ")}`);
      }
    }

    // Check niche relevance
    const cmpBusinessType = (meta.businessType as string) ?? "";
    const cmpCategory = (meta.category as string) ?? "";
    for (const niche of influencer.niches) {
      if (
        cmpBusinessType.toLowerCase().includes(niche.toLowerCase()) ||
        cmpCategory.toLowerCase().includes(niche.toLowerCase())
      ) {
        reasons.push(`Niche "${niche}" aligns with campaign focus`);
        break;
      }
    }

    // Check tier compatibility
    const cmpTier = meta.tier as string;
    if (cmpTier === "premium" && (influencer.tier === "macro" || influencer.tier === "mega")) {
      reasons.push("Premium campaign suited for high-reach influencers");
    } else if (cmpTier === "starter" && influencer.tier === "micro") {
      reasons.push("Starter campaign ideal for growing micro-influencers");
    }

    // Similarity-based reason
    if (match.similarity > 0.8) {
      reasons.push("Exceptionally strong profile-campaign alignment");
    } else if (match.similarity > 0.6) {
      reasons.push("Strong profile-campaign alignment");
    } else if (match.similarity > 0.4) {
      reasons.push("Good profile-campaign alignment");
    }

    if (reasons.length === 0) {
      reasons.push("Potential match based on overall profile similarity");
    }

    return reasons;
  }

  private generateBusinessMatchReasons(
    influencer: InfluencerEmbeddingInput,
    match: SearchResult
  ): string[] {
    const reasons: string[] = [];
    const meta = match.entry.metadata;

    // Check location match
    const bizLocation = (meta.location as string) ?? "";
    if (
      influencer.location &&
      bizLocation &&
      influencer.location.toLowerCase().includes(bizLocation.toLowerCase().split(",")[0])
    ) {
      reasons.push(`Both located in ${bizLocation}`);
    }

    // Check industry-niche overlap
    const bizIndustry = (meta.industry as string) ?? "";
    const bizType = (meta.type as string) ?? "";
    for (const niche of influencer.niches) {
      if (
        bizIndustry.toLowerCase().includes(niche.toLowerCase()) ||
        bizType.toLowerCase().includes(niche.toLowerCase())
      ) {
        reasons.push(`Your "${niche}" niche matches this business's focus`);
        break;
      }
    }

    // Check business activity
    const campaignCount = (meta.campaignCount as number) ?? 0;
    if (campaignCount > 5) {
      reasons.push("Active business with multiple campaigns");
    }

    // Rating-based reason
    const avgRating = (meta.avgRating as number) ?? 0;
    if (avgRating >= 4.5) {
      reasons.push("Highly rated business");
    }

    if (reasons.length === 0) {
      reasons.push("Potential match based on overall business-influencer compatibility");
    }

    return reasons;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════════

/** Shared singleton instances for convenience. */
export const vectorStore = new VectorStore();
export const embeddingGenerator = new EmbeddingGenerator();
export const matchingService = new MatchingService(vectorStore, embeddingGenerator);

/** Re-export the embedding dimension constant. */
export const VECTOR_DIMENSION = EMBEDDING_DIM;

/** Utility: compute cosine similarity between two Float32Arrays. */
export { cosineSimilarity, normalizeVector };
