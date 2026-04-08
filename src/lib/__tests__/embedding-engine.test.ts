import { describe, it, expect, beforeEach } from 'vitest';
import {
  VectorMath,
  embeddingEngine,
  type Vector,
  type CampaignInput,
  type BusinessInput,
  type InfluencerInput,
  type ActionInput,
  type EmbeddableEntityType,
} from '@/lib/embedding-engine';

// ─── Test Helpers ──────────────────────────────────────────────────────────

function makeCampaignInput(overrides: Partial<CampaignInput> = {}): CampaignInput {
  return {
    id: 'camp-1',
    name: 'Summer Promo',
    actions: ['ig_fp', 'ig_rl', 'tt_vd'],
    discountValue: 15,
    discountType: 'pct',
    category: 'Restaurant',
    tier: 'essential',
    ...overrides,
  };
}

function makeBusinessInput(overrides: Partial<BusinessInput> = {}): BusinessInput {
  return {
    id: 'biz-1',
    name: 'Test Restaurant',
    type: 'Restaurant',
    size: 'small',
    location: 'New York, NY',
    campaignCount: 5,
    avgRating: 4.2,
    plan: 'starter',
    industry: 'food_service',
    ...overrides,
  };
}

function makeInfluencerInput(overrides: Partial<InfluencerInput> = {}): InfluencerInput {
  return {
    id: 'inf-1',
    displayName: 'Test Influencer',
    niches: ['food', 'lifestyle'],
    platforms: [
      { platformId: 'ig', followers: 8000, engagementRate: 0.04 },
      { platformId: 'tt', followers: 2000, engagementRate: 0.06 },
    ],
    followerCount: 10000,
    engagementRate: 0.04,
    tier: 'micro',
    location: 'New York, NY',
    completionRate: 0.85,
    campaignsCompleted: 12,
    ...overrides,
  };
}

function makeActionInput(overrides: Partial<ActionInput> = {}): ActionInput {
  return {
    id: 'ig_fp',
    label: 'Feed Photo',
    type: 'content',
    effort: 2,
    value: 2.5,
    platformId: 'ig',
    ...overrides,
  };
}

/** Create a simple vector of a given dimension filled with a value */
function filledVector(dim: number, value: number): Vector {
  return new Array(dim).fill(value);
}

/** Create a zero vector of a given dimension */
function zeroVector(dim: number): Vector {
  return new Array(dim).fill(0);
}

// ─── VectorMath ────────────────────────────────────────────────────────────

describe('VectorMath', () => {
  // ── cosineSimilarity ──

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      const v = [1, 2, 3];
      expect(VectorMath.cosineSimilarity(v, v)).toBeCloseTo(1, 5);
    });

    it('returns 1 for parallel vectors (scalar multiple)', () => {
      const a = [1, 2, 3];
      const b = [2, 4, 6];
      expect(VectorMath.cosineSimilarity(a, b)).toBeCloseTo(1, 5);
    });

    it('returns -1 for opposite vectors', () => {
      const a = [1, 2, 3];
      const b = [-1, -2, -3];
      expect(VectorMath.cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
    });

    it('returns 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(VectorMath.cosineSimilarity(a, b)).toBeCloseTo(0, 5);
    });

    it('returns 0 when either vector is zero', () => {
      const a = [1, 2, 3];
      const zero = [0, 0, 0];
      expect(VectorMath.cosineSimilarity(a, zero)).toBe(0);
      expect(VectorMath.cosineSimilarity(zero, a)).toBe(0);
    });

    it('returns 0 when both vectors are zero', () => {
      const zero = [0, 0, 0];
      expect(VectorMath.cosineSimilarity(zero, zero)).toBe(0);
    });

    it('throws on dimension mismatch', () => {
      expect(() => VectorMath.cosineSimilarity([1, 2], [1, 2, 3])).toThrow(
        'Vector dimension mismatch'
      );
    });

    it('handles single-dimension vectors', () => {
      expect(VectorMath.cosineSimilarity([5], [3])).toBeCloseTo(1, 5);
      expect(VectorMath.cosineSimilarity([5], [-3])).toBeCloseTo(-1, 5);
    });

    it('handles high-dimensional vectors', () => {
      const dim = 1000;
      const a = Array.from({ length: dim }, (_, i) => Math.sin(i));
      const b = Array.from({ length: dim }, (_, i) => Math.sin(i));
      expect(VectorMath.cosineSimilarity(a, b)).toBeCloseTo(1, 5);
    });

    it('is symmetric', () => {
      const a = [1, 3, -2, 4];
      const b = [2, -1, 5, 3];
      expect(VectorMath.cosineSimilarity(a, b)).toBeCloseTo(
        VectorMath.cosineSimilarity(b, a),
        10
      );
    });
  });

  // ── euclideanDistance ──

  describe('euclideanDistance', () => {
    it('returns 0 for identical vectors', () => {
      const v = [1, 2, 3];
      expect(VectorMath.euclideanDistance(v, v)).toBe(0);
    });

    it('computes correct distance for simple vectors', () => {
      // sqrt((3-0)^2 + (4-0)^2) = 5
      expect(VectorMath.euclideanDistance([0, 0], [3, 4])).toBeCloseTo(5, 5);
    });

    it('is symmetric', () => {
      const a = [1, 3, 5];
      const b = [2, 7, 1];
      expect(VectorMath.euclideanDistance(a, b)).toBeCloseTo(
        VectorMath.euclideanDistance(b, a),
        10
      );
    });

    it('throws on dimension mismatch', () => {
      expect(() => VectorMath.euclideanDistance([1], [1, 2])).toThrow(
        'Vector dimension mismatch'
      );
    });

    it('handles zero vectors', () => {
      const zero = [0, 0, 0];
      const v = [3, 4, 0];
      expect(VectorMath.euclideanDistance(zero, v)).toBeCloseTo(5, 5);
    });

    it('returns correct distance for unit vectors along axes', () => {
      // sqrt(1^2 + 1^2) = sqrt(2)
      expect(
        VectorMath.euclideanDistance([1, 0], [0, 1])
      ).toBeCloseTo(Math.sqrt(2), 5);
    });
  });

  // ── dotProduct ──

  describe('dotProduct', () => {
    it('returns correct value for simple vectors', () => {
      expect(VectorMath.dotProduct([1, 2, 3], [4, 5, 6])).toBe(32); // 4+10+18
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(VectorMath.dotProduct([1, 0], [0, 1])).toBe(0);
    });

    it('throws on dimension mismatch', () => {
      expect(() => VectorMath.dotProduct([1, 2], [1])).toThrow(
        'Vector dimension mismatch'
      );
    });

    it('returns 0 for zero vectors', () => {
      expect(VectorMath.dotProduct([0, 0], [5, 10])).toBe(0);
    });

    it('is commutative', () => {
      const a = [2, -3, 7];
      const b = [5, 1, -4];
      expect(VectorMath.dotProduct(a, b)).toBe(VectorMath.dotProduct(b, a));
    });
  });

  // ── normalize ──

  describe('normalize', () => {
    it('produces a unit vector (magnitude 1)', () => {
      const v = [3, 4];
      const n = VectorMath.normalize(v);
      expect(VectorMath.magnitude(n)).toBeCloseTo(1, 5);
    });

    it('preserves direction', () => {
      const v = [3, 4];
      const n = VectorMath.normalize(v);
      expect(VectorMath.cosineSimilarity(v, n)).toBeCloseTo(1, 5);
    });

    it('returns zero vector for zero input', () => {
      const result = VectorMath.normalize([0, 0, 0]);
      expect(result).toEqual([0, 0, 0]);
    });

    it('normalizing a unit vector returns itself', () => {
      const unit = [1, 0, 0];
      const result = VectorMath.normalize(unit);
      expect(result[0]).toBeCloseTo(1, 5);
      expect(result[1]).toBeCloseTo(0, 5);
      expect(result[2]).toBeCloseTo(0, 5);
    });

    it('handles negative values', () => {
      const v = [-3, -4];
      const n = VectorMath.normalize(v);
      expect(VectorMath.magnitude(n)).toBeCloseTo(1, 5);
      expect(n[0]).toBeLessThan(0);
      expect(n[1]).toBeLessThan(0);
    });
  });

  // ── add ──

  describe('add', () => {
    it('adds vectors element-wise', () => {
      expect(VectorMath.add([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
    });

    it('adding zero vector returns original', () => {
      const v = [1, 2, 3];
      expect(VectorMath.add(v, [0, 0, 0])).toEqual(v);
    });

    it('throws on dimension mismatch', () => {
      expect(() => VectorMath.add([1], [1, 2])).toThrow(
        'Vector dimension mismatch'
      );
    });

    it('handles negative values', () => {
      expect(VectorMath.add([5, -3], [-5, 3])).toEqual([0, 0]);
    });
  });

  // ── scale ──

  describe('scale', () => {
    it('multiplies by scalar', () => {
      expect(VectorMath.scale([1, 2, 3], 2)).toEqual([2, 4, 6]);
    });

    it('scaling by 0 produces zero vector', () => {
      expect(VectorMath.scale([1, 2, 3], 0)).toEqual([0, 0, 0]);
    });

    it('scaling by 1 returns original', () => {
      expect(VectorMath.scale([1, 2, 3], 1)).toEqual([1, 2, 3]);
    });

    it('scaling by -1 negates', () => {
      expect(VectorMath.scale([1, -2, 3], -1)).toEqual([-1, 2, -3]);
    });
  });

  // ── magnitude ──

  describe('magnitude', () => {
    it('returns correct magnitude', () => {
      expect(VectorMath.magnitude([3, 4])).toBeCloseTo(5, 5);
    });

    it('returns 0 for zero vector', () => {
      expect(VectorMath.magnitude([0, 0, 0])).toBe(0);
    });

    it('returns 1 for unit vector', () => {
      expect(VectorMath.magnitude([1, 0, 0])).toBe(1);
    });

    it('handles single dimension', () => {
      expect(VectorMath.magnitude([7])).toBe(7);
      expect(VectorMath.magnitude([-7])).toBe(7);
    });
  });

  // ── mean ──

  describe('mean', () => {
    it('returns element-wise average', () => {
      const result = VectorMath.mean([
        [2, 4],
        [6, 8],
      ]);
      expect(result).toEqual([4, 6]);
    });

    it('returns empty array for no vectors', () => {
      expect(VectorMath.mean([])).toEqual([]);
    });

    it('returns the vector itself for a single vector', () => {
      const result = VectorMath.mean([[1, 2, 3]]);
      expect(result).toEqual([1, 2, 3]);
    });

    it('throws on dimension mismatch within array', () => {
      expect(() => VectorMath.mean([[1, 2], [1]])).toThrow(
        'Vector dimension mismatch in mean'
      );
    });

    it('handles negative values', () => {
      const result = VectorMath.mean([
        [4, -2],
        [-4, 6],
      ]);
      expect(result).toEqual([0, 2]);
    });
  });
});

// ─── Embedding Generation ──────────────────────────────────────────────────

describe('EmbeddingEngine - Embedding Generation', () => {
  beforeEach(() => {
    embeddingEngine.clear();
  });

  // ── Campaign Embeddings ──

  describe('generateCampaignEmbedding', () => {
    it('generates a 32-dimensional vector', () => {
      const vec = embeddingEngine.generateCampaignEmbedding(makeCampaignInput());
      expect(vec).toHaveLength(32);
    });

    it('generates a normalized vector (magnitude ~1)', () => {
      const vec = embeddingEngine.generateCampaignEmbedding(makeCampaignInput());
      expect(VectorMath.magnitude(vec)).toBeCloseTo(1, 3);
    });

    it('produces different embeddings for different campaigns', () => {
      const v1 = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ actions: ['ig_fp'], tier: 'starter' })
      );
      const v2 = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ actions: ['yt_rv'], tier: 'premium' })
      );
      const similarity = VectorMath.cosineSimilarity(v1, v2);
      expect(similarity).toBeLessThan(1);
    });

    it('produces similar embeddings for similar campaigns', () => {
      const v1 = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ actions: ['ig_fp', 'ig_rl'], tier: 'essential' })
      );
      const v2 = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ actions: ['ig_fp', 'ig_st'], tier: 'essential' })
      );
      const similarity = VectorMath.cosineSimilarity(v1, v2);
      expect(similarity).toBeGreaterThan(0.5);
    });

    it('encodes tier differences', () => {
      const starter = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ tier: 'starter' })
      );
      const premium = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ tier: 'premium' })
      );
      // Different tiers should produce different embeddings
      const similarity = VectorMath.cosineSimilarity(starter, premium);
      expect(similarity).toBeLessThan(1);
    });

    it('encodes discount type (pct vs dol)', () => {
      const pct = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ discountType: 'pct', discountValue: 20 })
      );
      const dol = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ discountType: 'dol', discountValue: 20 })
      );
      expect(VectorMath.cosineSimilarity(pct, dol)).toBeLessThan(1);
    });

    it('handles empty actions array', () => {
      const vec = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ actions: [] })
      );
      expect(vec).toHaveLength(32);
      // Should still produce a valid vector (from tier, discount, category dims)
      expect(VectorMath.magnitude(vec)).toBeGreaterThan(0);
    });

    it('handles actions with unknown platform prefixes gracefully', () => {
      const vec = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ actions: ['zz_unknown'] })
      );
      expect(vec).toHaveLength(32);
    });

    it('is deterministic', () => {
      const input = makeCampaignInput();
      const v1 = embeddingEngine.generateCampaignEmbedding(input);
      const v2 = embeddingEngine.generateCampaignEmbedding(input);
      expect(v1).toEqual(v2);
    });
  });

  // ── Business Embeddings ──

  describe('generateBusinessEmbedding', () => {
    it('generates a 32-dimensional vector', () => {
      const vec = embeddingEngine.generateBusinessEmbedding(makeBusinessInput());
      expect(vec).toHaveLength(32);
    });

    it('generates a normalized vector', () => {
      const vec = embeddingEngine.generateBusinessEmbedding(makeBusinessInput());
      expect(VectorMath.magnitude(vec)).toBeCloseTo(1, 3);
    });

    it('produces different embeddings for different business types', () => {
      const restaurant = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ type: 'Restaurant' })
      );
      const lawFirm = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ type: 'Law Firm' })
      );
      const similarity = VectorMath.cosineSimilarity(restaurant, lawFirm);
      expect(similarity).toBeLessThan(0.95);
    });

    it('produces similar embeddings for similar business types', () => {
      const restaurant = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ type: 'Restaurant' })
      );
      const cafe = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ type: 'Cafe' })
      );
      const similarity = VectorMath.cosineSimilarity(restaurant, cafe);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('encodes business size', () => {
      const solo = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ size: 'solo' })
      );
      const enterprise = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ size: 'enterprise' })
      );
      expect(VectorMath.cosineSimilarity(solo, enterprise)).toBeLessThan(1);
    });

    it('encodes plan tier', () => {
      const free = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ plan: 'free' })
      );
      const enterprise = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ plan: 'enterprise' })
      );
      expect(VectorMath.cosineSimilarity(free, enterprise)).toBeLessThan(1);
    });

    it('handles missing optional fields', () => {
      const vec = embeddingEngine.generateBusinessEmbedding({
        id: 'biz-minimal',
        name: 'Minimal Biz',
        type: 'Store',
        size: 'small',
      });
      expect(vec).toHaveLength(32);
      expect(VectorMath.magnitude(vec)).toBeGreaterThan(0);
    });

    it('includes cross-features in the embedding', () => {
      // A restaurant (visual + food traits) should have cross-feature at dim 25
      const vec = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ type: 'Restaurant', campaignCount: 10, avgRating: 4.5 })
      );
      // The normalized vector should have non-zero cross-features
      expect(vec).toHaveLength(32);
    });

    it('is deterministic', () => {
      const input = makeBusinessInput();
      const v1 = embeddingEngine.generateBusinessEmbedding(input);
      const v2 = embeddingEngine.generateBusinessEmbedding(input);
      expect(v1).toEqual(v2);
    });
  });

  // ── Influencer Embeddings ──

  describe('generateInfluencerEmbedding', () => {
    it('generates a 32-dimensional vector', () => {
      const vec = embeddingEngine.generateInfluencerEmbedding(makeInfluencerInput());
      expect(vec).toHaveLength(32);
    });

    it('generates a normalized vector', () => {
      const vec = embeddingEngine.generateInfluencerEmbedding(makeInfluencerInput());
      expect(VectorMath.magnitude(vec)).toBeCloseTo(1, 3);
    });

    it('encodes niche features', () => {
      const food = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({ niches: ['food'] })
      );
      const tech = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({ niches: ['tech'] })
      );
      const similarity = VectorMath.cosineSimilarity(food, tech);
      expect(similarity).toBeLessThan(1);
    });

    it('encodes follower count on a log scale', () => {
      const small = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({
          followerCount: 500,
          platforms: [{ platformId: 'ig', followers: 500, engagementRate: 0.04 }],
        })
      );
      const large = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({
          followerCount: 1000000,
          platforms: [{ platformId: 'ig', followers: 1000000, engagementRate: 0.04 }],
        })
      );
      expect(VectorMath.cosineSimilarity(small, large)).toBeLessThan(1);
    });

    it('encodes influencer tier', () => {
      const micro = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({ tier: 'micro' })
      );
      const mega = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({ tier: 'mega' })
      );
      expect(VectorMath.cosineSimilarity(micro, mega)).toBeLessThan(1);
    });

    it('handles empty niches', () => {
      const vec = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({ niches: [] })
      );
      expect(vec).toHaveLength(32);
      expect(VectorMath.magnitude(vec)).toBeGreaterThan(0);
    });

    it('handles empty platforms', () => {
      const vec = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({
          platforms: [],
          followerCount: 0,
        })
      );
      expect(vec).toHaveLength(32);
    });

    it('handles missing optional fields', () => {
      const vec = embeddingEngine.generateInfluencerEmbedding({
        id: 'inf-minimal',
        displayName: 'Minimal Inf',
        niches: ['food'],
        platforms: [{ platformId: 'ig', followers: 1000, engagementRate: 0.03 }],
        followerCount: 1000,
        engagementRate: 0.03,
        tier: 'micro',
      });
      expect(vec).toHaveLength(32);
    });

    it('is deterministic', () => {
      const input = makeInfluencerInput();
      const v1 = embeddingEngine.generateInfluencerEmbedding(input);
      const v2 = embeddingEngine.generateInfluencerEmbedding(input);
      expect(v1).toEqual(v2);
    });
  });

  // ── Action Embeddings ──

  describe('generateActionEmbedding', () => {
    it('generates a 16-dimensional vector', () => {
      const vec = embeddingEngine.generateActionEmbedding(makeActionInput());
      expect(vec).toHaveLength(16);
    });

    it('generates a normalized vector', () => {
      const vec = embeddingEngine.generateActionEmbedding(makeActionInput());
      expect(VectorMath.magnitude(vec)).toBeCloseTo(1, 3);
    });

    it('produces different embeddings for different actions', () => {
      const photo = embeddingEngine.generateActionEmbedding(
        makeActionInput({ id: 'ig_fp', type: 'content', effort: 2, value: 2.5, platformId: 'ig' })
      );
      const review = embeddingEngine.generateActionEmbedding(
        makeActionInput({ id: 'go_rv', type: 'review', effort: 2, value: 5, platformId: 'go' })
      );
      expect(VectorMath.cosineSimilarity(photo, review)).toBeLessThan(1);
    });

    it('encodes effort and value', () => {
      const lowEffort = embeddingEngine.generateActionEmbedding(
        makeActionInput({ effort: 1, value: 1 })
      );
      const highEffort = embeddingEngine.generateActionEmbedding(
        makeActionInput({ effort: 5, value: 12 })
      );
      expect(VectorMath.cosineSimilarity(lowEffort, highEffort)).toBeLessThan(1);
    });

    it('handles zero effort gracefully', () => {
      const vec = embeddingEngine.generateActionEmbedding(
        makeActionInput({ effort: 0, value: 0.1 })
      );
      expect(vec).toHaveLength(16);
      // dim 15 should be 0.5 when effort is 0 (the default)
      expect(VectorMath.magnitude(vec)).toBeGreaterThan(0);
    });

    it('is deterministic', () => {
      const input = makeActionInput();
      const v1 = embeddingEngine.generateActionEmbedding(input);
      const v2 = embeddingEngine.generateActionEmbedding(input);
      expect(v1).toEqual(v2);
    });
  });
});

// ─── Storage (Index Management) ────────────────────────────────────────────

describe('EmbeddingEngine - Storage', () => {
  beforeEach(() => {
    embeddingEngine.clear();
  });

  describe('store', () => {
    it('stores and retrieves an embedding', () => {
      const vec = [0.1, 0.2, 0.3];
      const record = embeddingEngine.store('ent-1', 'campaign', vec, { name: 'Test' });

      expect(record.entityId).toBe('ent-1');
      expect(record.entityType).toBe('campaign');
      expect(record.vector).toEqual(vec);
      expect(record.metadata).toEqual({ name: 'Test' });
      expect(record.id).toMatch(/^emb_/);
      expect(record.createdAt).toBeTruthy();
    });

    it('overwrites on duplicate entityId', () => {
      embeddingEngine.store('ent-1', 'campaign', [1, 2, 3]);
      embeddingEngine.store('ent-1', 'campaign', [4, 5, 6]);

      const result = embeddingEngine.get('ent-1');
      expect(result?.vector).toEqual([4, 5, 6]);
      expect(embeddingEngine.count()).toBe(1);
    });

    it('stores with default empty metadata', () => {
      const record = embeddingEngine.store('ent-1', 'business', [1]);
      expect(record.metadata).toEqual({});
    });
  });

  describe('get', () => {
    it('returns null for non-existent entity', () => {
      expect(embeddingEngine.get('nonexistent')).toBeNull();
    });

    it('returns the stored record', () => {
      embeddingEngine.store('ent-1', 'influencer', [1, 2, 3]);
      const record = embeddingEngine.get('ent-1');
      expect(record).not.toBeNull();
      expect(record!.entityId).toBe('ent-1');
    });
  });

  describe('remove', () => {
    it('removes an existing embedding and returns true', () => {
      embeddingEngine.store('ent-1', 'campaign', [1, 2, 3]);
      expect(embeddingEngine.remove('ent-1')).toBe(true);
      expect(embeddingEngine.get('ent-1')).toBeNull();
    });

    it('returns false for non-existent entity', () => {
      expect(embeddingEngine.remove('nonexistent')).toBe(false);
    });

    it('does not affect other entities', () => {
      embeddingEngine.store('ent-1', 'campaign', [1, 2, 3]);
      embeddingEngine.store('ent-2', 'campaign', [4, 5, 6]);
      embeddingEngine.remove('ent-1');
      expect(embeddingEngine.get('ent-2')).not.toBeNull();
      expect(embeddingEngine.count()).toBe(1);
    });
  });

  describe('getAll', () => {
    it('returns all embeddings when no type specified', () => {
      embeddingEngine.store('c-1', 'campaign', [1]);
      embeddingEngine.store('b-1', 'business', [2]);
      embeddingEngine.store('i-1', 'influencer', [3]);
      expect(embeddingEngine.getAll()).toHaveLength(3);
    });

    it('filters by entity type', () => {
      embeddingEngine.store('c-1', 'campaign', [1]);
      embeddingEngine.store('c-2', 'campaign', [2]);
      embeddingEngine.store('b-1', 'business', [3]);

      const campaigns = embeddingEngine.getAll('campaign');
      expect(campaigns).toHaveLength(2);
      expect(campaigns.every((r) => r.entityType === 'campaign')).toBe(true);
    });

    it('returns empty array when no embeddings exist', () => {
      expect(embeddingEngine.getAll()).toEqual([]);
      expect(embeddingEngine.getAll('campaign')).toEqual([]);
    });
  });

  describe('count', () => {
    it('returns 0 for empty engine', () => {
      expect(embeddingEngine.count()).toBe(0);
    });

    it('returns total count without type filter', () => {
      embeddingEngine.store('c-1', 'campaign', [1]);
      embeddingEngine.store('b-1', 'business', [2]);
      expect(embeddingEngine.count()).toBe(2);
    });

    it('returns filtered count by type', () => {
      embeddingEngine.store('c-1', 'campaign', [1]);
      embeddingEngine.store('c-2', 'campaign', [2]);
      embeddingEngine.store('b-1', 'business', [3]);
      expect(embeddingEngine.count('campaign')).toBe(2);
      expect(embeddingEngine.count('business')).toBe(1);
      expect(embeddingEngine.count('influencer')).toBe(0);
    });
  });

  describe('clear', () => {
    it('removes all embeddings', () => {
      embeddingEngine.store('c-1', 'campaign', [1]);
      embeddingEngine.store('b-1', 'business', [2]);
      embeddingEngine.clear();
      expect(embeddingEngine.count()).toBe(0);
      expect(embeddingEngine.getAll()).toEqual([]);
    });
  });
});

// ─── Similarity Search ─────────────────────────────────────────────────────

describe('EmbeddingEngine - Similarity Search', () => {
  beforeEach(() => {
    embeddingEngine.clear();
  });

  describe('findSimilar', () => {
    it('returns most similar entities sorted by similarity descending', () => {
      const target = [1, 0, 0];
      embeddingEngine.store('close', 'campaign', [0.9, 0.1, 0]);
      embeddingEngine.store('far', 'campaign', [0, 0, 1]);
      embeddingEngine.store('medium', 'campaign', [0.5, 0.5, 0]);

      const results = embeddingEngine.findSimilar(target, 'campaign', 10);
      expect(results.length).toBe(3);
      expect(results[0].entityId).toBe('close');
      expect(results[results.length - 1].entityId).toBe('far');
    });

    it('respects limit parameter', () => {
      for (let i = 0; i < 20; i++) {
        embeddingEngine.store(`c-${i}`, 'campaign', [Math.random(), Math.random(), Math.random()]);
      }
      const results = embeddingEngine.findSimilar([1, 0, 0], 'campaign', 5);
      expect(results.length).toBe(5);
    });

    it('respects minSimilarity threshold', () => {
      embeddingEngine.store('similar', 'campaign', [1, 0, 0]);
      embeddingEngine.store('dissimilar', 'campaign', [-1, 0, 0]);

      const results = embeddingEngine.findSimilar([1, 0, 0], 'campaign', 10, 0.5);
      expect(results.length).toBe(1);
      expect(results[0].entityId).toBe('similar');
    });

    it('only returns entities of the specified type', () => {
      embeddingEngine.store('c-1', 'campaign', [1, 0, 0]);
      embeddingEngine.store('b-1', 'business', [1, 0, 0]);

      const results = embeddingEngine.findSimilar([1, 0, 0], 'campaign', 10);
      expect(results.length).toBe(1);
      expect(results[0].entityId).toBe('c-1');
    });

    it('skips vectors with mismatched dimensions', () => {
      embeddingEngine.store('match', 'campaign', [1, 0, 0]);
      embeddingEngine.store('wrong-dim', 'campaign', [1, 0]); // different dimension

      const results = embeddingEngine.findSimilar([1, 0, 0], 'campaign', 10);
      expect(results.length).toBe(1);
      expect(results[0].entityId).toBe('match');
    });

    it('returns empty array when no entities exist', () => {
      const results = embeddingEngine.findSimilar([1, 0, 0], 'campaign', 10);
      expect(results).toEqual([]);
    });

    it('returns similarity rounded to 4 decimal places', () => {
      embeddingEngine.store('ent', 'campaign', [1, 0, 0]);
      const results = embeddingEngine.findSimilar([1, 0, 0], 'campaign', 10);
      const sim = results[0].similarity;
      // Check rounding: should have at most 4 decimal places
      expect(sim).toBe(Math.round(sim * 10000) / 10000);
    });

    it('includes metadata in results', () => {
      embeddingEngine.store('ent', 'campaign', [1, 0, 0], { name: 'Test Campaign' });
      const results = embeddingEngine.findSimilar([1, 0, 0], 'campaign', 10);
      expect(results[0].metadata).toEqual({ name: 'Test Campaign' });
    });
  });

  describe('findSimilarCampaigns', () => {
    it('finds similar campaigns excluding the source', () => {
      const vec = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ id: 'camp-1', actions: ['ig_fp', 'ig_rl'] })
      );
      embeddingEngine.store('camp-1', 'campaign', vec);

      const vec2 = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ id: 'camp-2', actions: ['ig_fp', 'ig_st'] })
      );
      embeddingEngine.store('camp-2', 'campaign', vec2);

      const vec3 = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ id: 'camp-3', actions: ['yt_rv'], tier: 'premium' })
      );
      embeddingEngine.store('camp-3', 'campaign', vec3);

      const results = embeddingEngine.findSimilarCampaigns('camp-1');
      expect(results.every((r) => r.entityId !== 'camp-1')).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty for non-existent campaign', () => {
      expect(embeddingEngine.findSimilarCampaigns('nonexistent')).toEqual([]);
    });

    it('respects limit', () => {
      const baseVec = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ id: 'camp-0' })
      );
      embeddingEngine.store('camp-0', 'campaign', baseVec);

      for (let i = 1; i <= 15; i++) {
        const vec = embeddingEngine.generateCampaignEmbedding(
          makeCampaignInput({ id: `camp-${i}`, discountValue: i * 3 })
        );
        embeddingEngine.store(`camp-${i}`, 'campaign', vec);
      }

      const results = embeddingEngine.findSimilarCampaigns('camp-0', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe('findSimilarBusinesses', () => {
    it('finds similar businesses excluding the source', () => {
      const v1 = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ id: 'biz-1', type: 'Restaurant' })
      );
      embeddingEngine.store('biz-1', 'business', v1);

      const v2 = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ id: 'biz-2', type: 'Cafe' })
      );
      embeddingEngine.store('biz-2', 'business', v2);

      const results = embeddingEngine.findSimilarBusinesses('biz-1');
      expect(results.every((r) => r.entityId !== 'biz-1')).toBe(true);
      expect(results.length).toBe(1);
    });

    it('returns empty for non-existent business', () => {
      expect(embeddingEngine.findSimilarBusinesses('nonexistent')).toEqual([]);
    });
  });

  describe('findSimilarInfluencers', () => {
    it('finds similar influencers excluding the source', () => {
      const v1 = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({ id: 'inf-1', niches: ['food', 'lifestyle'] })
      );
      embeddingEngine.store('inf-1', 'influencer', v1);

      const v2 = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({ id: 'inf-2', niches: ['food', 'cooking'] })
      );
      embeddingEngine.store('inf-2', 'influencer', v2);

      const v3 = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({ id: 'inf-3', niches: ['tech', 'business'] })
      );
      embeddingEngine.store('inf-3', 'influencer', v3);

      const results = embeddingEngine.findSimilarInfluencers('inf-1');
      expect(results.every((r) => r.entityId !== 'inf-1')).toBe(true);
      // Food influencer should be more similar to food/cooking than tech/business
      expect(results[0].entityId).toBe('inf-2');
    });

    it('returns empty for non-existent influencer', () => {
      expect(embeddingEngine.findSimilarInfluencers('nonexistent')).toEqual([]);
    });
  });
});

// ─── Recommendations ───────────────────────────────────────────────────────

describe('EmbeddingEngine - Recommendations', () => {
  beforeEach(() => {
    embeddingEngine.clear();
  });

  describe('recommendCampaignsForInfluencer', () => {
    it('returns scored campaign recommendations for an influencer', () => {
      const infVec = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({ id: 'inf-1', niches: ['food'] })
      );
      embeddingEngine.store('inf-1', 'influencer', infVec);

      const campVec1 = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ id: 'camp-1', category: 'Restaurant', actions: ['ig_fp'] })
      );
      embeddingEngine.store('camp-1', 'campaign', campVec1);

      const campVec2 = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ id: 'camp-2', category: 'Auto Shop', actions: ['yt_rv'] })
      );
      embeddingEngine.store('camp-2', 'campaign', campVec2);

      const results = embeddingEngine.recommendCampaignsForInfluencer('inf-1');
      expect(results.length).toBe(2);
      // Each result should have entityId, score, metadata
      for (const r of results) {
        expect(r.entityId).toBeTruthy();
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      }
    });

    it('returns empty for non-existent influencer', () => {
      expect(embeddingEngine.recommendCampaignsForInfluencer('nonexistent')).toEqual([]);
    });

    it('respects limit', () => {
      const infVec = embeddingEngine.generateInfluencerEmbedding(makeInfluencerInput());
      embeddingEngine.store('inf-1', 'influencer', infVec);

      for (let i = 0; i < 20; i++) {
        const vec = embeddingEngine.generateCampaignEmbedding(
          makeCampaignInput({ id: `camp-${i}`, discountValue: i + 1 })
        );
        embeddingEngine.store(`camp-${i}`, 'campaign', vec);
      }

      const results = embeddingEngine.recommendCampaignsForInfluencer('inf-1', 5);
      expect(results.length).toBe(5);
    });

    it('sorts by score descending', () => {
      const infVec = embeddingEngine.generateInfluencerEmbedding(makeInfluencerInput());
      embeddingEngine.store('inf-1', 'influencer', infVec);

      for (let i = 0; i < 5; i++) {
        const vec = embeddingEngine.generateCampaignEmbedding(
          makeCampaignInput({ id: `camp-${i}`, tier: ['starter', 'essential', 'growth', 'high_impact', 'premium'][i] })
        );
        embeddingEngine.store(`camp-${i}`, 'campaign', vec);
      }

      const results = embeddingEngine.recommendCampaignsForInfluencer('inf-1');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('clamps scores between 0 and 1', () => {
      const infVec = embeddingEngine.generateInfluencerEmbedding(makeInfluencerInput());
      embeddingEngine.store('inf-1', 'influencer', infVec);

      const campVec = embeddingEngine.generateCampaignEmbedding(makeCampaignInput());
      embeddingEngine.store('camp-1', 'campaign', campVec);

      const results = embeddingEngine.recommendCampaignsForInfluencer('inf-1');
      for (const r of results) {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('recommendInfluencersForCampaign', () => {
    it('returns scored influencer recommendations for a campaign', () => {
      const campVec = embeddingEngine.generateCampaignEmbedding(
        makeCampaignInput({ id: 'camp-1', actions: ['ig_fp'] })
      );
      embeddingEngine.store('camp-1', 'campaign', campVec);

      const infVec1 = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({
          id: 'inf-1',
          niches: ['food'],
          platforms: [{ platformId: 'ig', followers: 10000, engagementRate: 0.05 }],
          followerCount: 10000,
        })
      );
      embeddingEngine.store('inf-1', 'influencer', infVec1);

      const infVec2 = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({
          id: 'inf-2',
          niches: ['tech'],
          platforms: [{ platformId: 'yt', followers: 5000, engagementRate: 0.02 }],
          followerCount: 5000,
        })
      );
      embeddingEngine.store('inf-2', 'influencer', infVec2);

      const results = embeddingEngine.recommendInfluencersForCampaign('camp-1');
      expect(results.length).toBe(2);
      for (const r of results) {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      }
    });

    it('returns empty for non-existent campaign', () => {
      expect(embeddingEngine.recommendInfluencersForCampaign('nonexistent')).toEqual([]);
    });

    it('includes follower and engagement boosts', () => {
      const campVec = embeddingEngine.generateCampaignEmbedding(makeCampaignInput());
      embeddingEngine.store('camp-1', 'campaign', campVec);

      // High follower + high engagement influencer
      const highVec = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({
          id: 'inf-high',
          followerCount: 500000,
          engagementRate: 0.15,
          tier: 'macro',
          platforms: [{ platformId: 'ig', followers: 500000, engagementRate: 0.15 }],
        })
      );
      embeddingEngine.store('inf-high', 'influencer', highVec);

      // Low follower + low engagement influencer
      const lowVec = embeddingEngine.generateInfluencerEmbedding(
        makeInfluencerInput({
          id: 'inf-low',
          followerCount: 100,
          engagementRate: 0.01,
          tier: 'micro',
          platforms: [{ platformId: 'ig', followers: 100, engagementRate: 0.01 }],
        })
      );
      embeddingEngine.store('inf-low', 'influencer', lowVec);

      const results = embeddingEngine.recommendInfluencersForCampaign('camp-1');
      expect(results.length).toBe(2);
      // Higher follower/engagement should have higher score due to boosts
      const highResult = results.find((r) => r.entityId === 'inf-high')!;
      const lowResult = results.find((r) => r.entityId === 'inf-low')!;
      expect(highResult.score).toBeGreaterThan(lowResult.score);
    });
  });

  describe('recommendPartnerships', () => {
    it('recommends cross-promotion partners for a business', () => {
      const v1 = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ id: 'biz-1', type: 'Restaurant' })
      );
      embeddingEngine.store('biz-1', 'business', v1);

      const v2 = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ id: 'biz-2', type: 'Yoga Studio' })
      );
      embeddingEngine.store('biz-2', 'business', v2);

      const v3 = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ id: 'biz-3', type: 'Cafe' })
      );
      embeddingEngine.store('biz-3', 'business', v3);

      const results = embeddingEngine.recommendPartnerships('biz-1');
      expect(results.length).toBe(2);
      expect(results.every((r) => r.entityId !== 'biz-1')).toBe(true);
      for (const r of results) {
        expect(typeof r.compatibility).toBe('number');
        expect(typeof r.complementary).toBe('boolean');
      }
    });

    it('returns empty for non-existent business', () => {
      expect(embeddingEngine.recommendPartnerships('nonexistent')).toEqual([]);
    });

    it('identifies complementary businesses (similarity 0.3-0.7)', () => {
      // Store businesses that will have varying similarity
      const v1 = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ id: 'biz-1', type: 'Restaurant', size: 'small' })
      );
      embeddingEngine.store('biz-1', 'business', v1);

      const v2 = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ id: 'biz-2', type: 'Law Firm', size: 'enterprise' })
      );
      embeddingEngine.store('biz-2', 'business', v2);

      const results = embeddingEngine.recommendPartnerships('biz-1');
      expect(results.length).toBe(1);
      // The complementary flag should be set correctly based on similarity range
      const r = results[0];
      const similarity = VectorMath.cosineSimilarity(v1, v2);
      if (similarity >= 0.3 && similarity <= 0.7) {
        expect(r.complementary).toBe(true);
      } else {
        expect(r.complementary).toBe(false);
      }
    });

    it('sorts by compatibility descending', () => {
      const v1 = embeddingEngine.generateBusinessEmbedding(
        makeBusinessInput({ id: 'biz-1', type: 'Restaurant' })
      );
      embeddingEngine.store('biz-1', 'business', v1);

      for (let i = 2; i <= 6; i++) {
        const types = ['Cafe', 'Yoga Studio', 'Law Firm', 'Pet Grooming', 'Bookstore'];
        const v = embeddingEngine.generateBusinessEmbedding(
          makeBusinessInput({ id: `biz-${i}`, type: types[i - 2] })
        );
        embeddingEngine.store(`biz-${i}`, 'business', v);
      }

      const results = embeddingEngine.recommendPartnerships('biz-1');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].compatibility).toBeGreaterThanOrEqual(results[i].compatibility);
      }
    });

    it('respects limit', () => {
      const v1 = embeddingEngine.generateBusinessEmbedding(makeBusinessInput({ id: 'biz-1' }));
      embeddingEngine.store('biz-1', 'business', v1);

      for (let i = 2; i <= 15; i++) {
        const v = embeddingEngine.generateBusinessEmbedding(
          makeBusinessInput({ id: `biz-${i}`, campaignCount: i })
        );
        embeddingEngine.store(`biz-${i}`, 'business', v);
      }

      const results = embeddingEngine.recommendPartnerships('biz-1', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });
});

// ─── Clustering ────────────────────────────────────────────────────────────

describe('EmbeddingEngine - Clustering', () => {
  beforeEach(() => {
    embeddingEngine.clear();
  });

  describe('clusterEntities', () => {
    it('clusters entities into k groups', () => {
      // Store 6 campaigns in 2 clusters
      // Cluster A: Instagram-heavy
      for (let i = 0; i < 3; i++) {
        const vec = embeddingEngine.generateCampaignEmbedding(
          makeCampaignInput({
            id: `camp-ig-${i}`,
            actions: ['ig_fp', 'ig_rl', 'ig_st'],
            tier: 'essential',
          })
        );
        embeddingEngine.store(`camp-ig-${i}`, 'campaign', vec);
      }

      // Cluster B: YouTube-heavy
      for (let i = 0; i < 3; i++) {
        const vec = embeddingEngine.generateCampaignEmbedding(
          makeCampaignInput({
            id: `camp-yt-${i}`,
            actions: ['yt_vd', 'yt_rv'],
            tier: 'premium',
          })
        );
        embeddingEngine.store(`camp-yt-${i}`, 'campaign', vec);
      }

      const clusters = embeddingEngine.clusterEntities('campaign', 2);
      expect(clusters).toHaveLength(2);

      // Each cluster should have a centroid and members
      for (const cluster of clusters) {
        expect(cluster.clusterId).toBeGreaterThanOrEqual(0);
        expect(cluster.centroid).toBeTruthy();
        expect(cluster.members.length).toBeGreaterThan(0);
        // Members should have entityId and distance
        for (const member of cluster.members) {
          expect(member.entityId).toBeTruthy();
          expect(member.distance).toBeGreaterThanOrEqual(0);
        }
      }

      // Total members across clusters should equal total stored entities of type
      const totalMembers = clusters.reduce((sum, c) => sum + c.members.length, 0);
      expect(totalMembers).toBe(6);
    });

    it('sorts members by distance to centroid (closest first)', () => {
      for (let i = 0; i < 10; i++) {
        const vec = embeddingEngine.generateCampaignEmbedding(
          makeCampaignInput({
            id: `camp-${i}`,
            discountValue: (i + 1) * 5,
            actions: i < 5 ? ['ig_fp'] : ['yt_rv'],
          })
        );
        embeddingEngine.store(`camp-${i}`, 'campaign', vec);
      }

      const clusters = embeddingEngine.clusterEntities('campaign', 2);
      for (const cluster of clusters) {
        for (let i = 1; i < cluster.members.length; i++) {
          expect(cluster.members[i - 1].distance).toBeLessThanOrEqual(
            cluster.members[i].distance
          );
        }
      }
    });

    it('returns empty array when no entities of type exist', () => {
      const clusters = embeddingEngine.clusterEntities('campaign', 3);
      expect(clusters).toEqual([]);
    });

    it('adjusts k when fewer entities than k', () => {
      embeddingEngine.store('c-1', 'campaign', filledVector(32, 0.5));
      embeddingEngine.store('c-2', 'campaign', filledVector(32, 0.3));

      const clusters = embeddingEngine.clusterEntities('campaign', 5);
      expect(clusters.length).toBeLessThanOrEqual(2);
    });

    it('handles k=1 (all entities in one cluster)', () => {
      for (let i = 0; i < 5; i++) {
        embeddingEngine.store(`c-${i}`, 'campaign', [i * 0.1, i * 0.2, i * 0.3]);
      }

      const clusters = embeddingEngine.clusterEntities('campaign', 1);
      expect(clusters).toHaveLength(1);
      expect(clusters[0].members.length).toBe(5);
    });

    it('throws on mixed vector dimensions', () => {
      embeddingEngine.store('c-1', 'campaign', [1, 2, 3]);
      embeddingEngine.store('c-2', 'campaign', [1, 2]); // different dim

      expect(() => embeddingEngine.clusterEntities('campaign', 2)).toThrow(
        'Cannot cluster entities with mixed vector dimensions'
      );
    });

    it('handles single entity', () => {
      embeddingEngine.store('c-1', 'campaign', [1, 2, 3]);

      const clusters = embeddingEngine.clusterEntities('campaign', 1);
      expect(clusters).toHaveLength(1);
      expect(clusters[0].members.length).toBe(1);
      expect(clusters[0].members[0].entityId).toBe('c-1');
    });

    it('only clusters entities of the specified type', () => {
      embeddingEngine.store('c-1', 'campaign', [1, 0, 0]);
      embeddingEngine.store('c-2', 'campaign', [0, 1, 0]);
      embeddingEngine.store('b-1', 'business', [0, 0, 1]);

      const clusters = embeddingEngine.clusterEntities('campaign', 2);
      const allMembers = clusters.flatMap((c) => c.members.map((m) => m.entityId));
      expect(allMembers).not.toContain('b-1');
      expect(allMembers).toContain('c-1');
      expect(allMembers).toContain('c-2');
    });

    it('converges in fewer iterations when data is well-separated', () => {
      // Two clearly separated groups
      for (let i = 0; i < 5; i++) {
        embeddingEngine.store(`a-${i}`, 'campaign', [1 + i * 0.01, 0, 0]);
        embeddingEngine.store(`b-${i}`, 'campaign', [0, 0, 1 + i * 0.01]);
      }

      const clusters = embeddingEngine.clusterEntities('campaign', 2, 50);
      expect(clusters).toHaveLength(2);

      // Verify the clustering separated the groups
      const clusterAMembers = clusters[0].members.map((m) => m.entityId);
      const clusterBMembers = clusters[1].members.map((m) => m.entityId);

      // All 'a-*' should be in one cluster and 'b-*' in the other
      const aInFirst = clusterAMembers.filter((id) => id.startsWith('a-')).length;
      const aInSecond = clusterBMembers.filter((id) => id.startsWith('a-')).length;
      expect(Math.max(aInFirst, aInSecond)).toBe(5);
    });
  });
});

// ─── Edge Cases ────────────────────────────────────────────────────────────

describe('EmbeddingEngine - Edge Cases', () => {
  beforeEach(() => {
    embeddingEngine.clear();
  });

  it('handles very high dimensional vectors in VectorMath', () => {
    const dim = 10000;
    const a = Array.from({ length: dim }, (_, i) => Math.sin(i * 0.1));
    const b = Array.from({ length: dim }, (_, i) => Math.cos(i * 0.1));

    // These should compute without errors
    const similarity = VectorMath.cosineSimilarity(a, b);
    expect(typeof similarity).toBe('number');
    expect(similarity).toBeGreaterThanOrEqual(-1);
    expect(similarity).toBeLessThanOrEqual(1);

    const distance = VectorMath.euclideanDistance(a, b);
    expect(distance).toBeGreaterThanOrEqual(0);
  });

  it('handles zero vector in embedding generation gracefully', () => {
    // A campaign with no actions, unknown tier, zero discount, empty category
    // This tests behavior of normalizing a near-zero vector
    const vec = embeddingEngine.generateCampaignEmbedding({
      id: 'empty-camp',
      name: '',
      actions: [],
      discountValue: 0,
      discountType: 'pct',
      category: '',
      tier: 'unknown_tier',
    });
    expect(vec).toHaveLength(32);
    // The discount type dim (30) is 1.0 for pct, so the vector won't be all zeros
    // but the function should still handle gracefully
  });

  it('multiple store/remove cycles work correctly', () => {
    for (let i = 0; i < 50; i++) {
      embeddingEngine.store(`ent-${i}`, 'campaign', [i * 0.1, i * 0.2]);
    }
    expect(embeddingEngine.count()).toBe(50);

    for (let i = 0; i < 25; i++) {
      embeddingEngine.remove(`ent-${i}`);
    }
    expect(embeddingEngine.count()).toBe(25);

    // Re-store some
    for (let i = 0; i < 10; i++) {
      embeddingEngine.store(`ent-${i}`, 'campaign', [i * 0.3, i * 0.4]);
    }
    expect(embeddingEngine.count()).toBe(35);
  });

  it('handles unknown niches in influencer embedding', () => {
    const vec = embeddingEngine.generateInfluencerEmbedding(
      makeInfluencerInput({ niches: ['underwater_basket_weaving', 'extreme_ironing'] })
    );
    expect(vec).toHaveLength(32);
    expect(VectorMath.magnitude(vec)).toBeGreaterThan(0);
  });

  it('handles unknown business type with minimal traits', () => {
    const vec = embeddingEngine.generateBusinessEmbedding(
      makeBusinessInput({ type: 'Quantum Computing Lab' })
    );
    expect(vec).toHaveLength(32);
    // Should still produce a valid normalized embedding
    expect(VectorMath.magnitude(vec)).toBeGreaterThan(0);
  });

  it('generates unique embedding IDs across multiple stores', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const record = embeddingEngine.store(`ent-${i}`, 'campaign', [i]);
      ids.add(record.id);
    }
    expect(ids.size).toBe(100);
  });

  it('findSimilar with minSimilarity=1.0 only returns exact matches', () => {
    const vec = VectorMath.normalize([1, 2, 3]);
    embeddingEngine.store('exact', 'campaign', vec);
    embeddingEngine.store('different', 'campaign', VectorMath.normalize([3, 2, 1]));

    const results = embeddingEngine.findSimilar(vec, 'campaign', 10, 1.0);
    expect(results.length).toBe(1);
    expect(results[0].entityId).toBe('exact');
  });

  it('recommendation methods handle no campaigns/influencers stored', () => {
    const infVec = embeddingEngine.generateInfluencerEmbedding(makeInfluencerInput());
    embeddingEngine.store('inf-1', 'influencer', infVec);

    // No campaigns stored
    const campRecs = embeddingEngine.recommendCampaignsForInfluencer('inf-1');
    expect(campRecs).toEqual([]);

    const campVec = embeddingEngine.generateCampaignEmbedding(makeCampaignInput());
    embeddingEngine.store('camp-1', 'campaign', campVec);

    // Clear influencers, keep campaigns
    embeddingEngine.remove('inf-1');
    embeddingEngine.store('camp-only', 'campaign', campVec);

    const infRecs = embeddingEngine.recommendInfluencersForCampaign('camp-only');
    expect(infRecs).toEqual([]);
  });
});

// ─── Integration: Full Workflow ────────────────────────────────────────────

describe('EmbeddingEngine - Integration', () => {
  beforeEach(() => {
    embeddingEngine.clear();
  });

  it('complete workflow: generate, store, search, recommend, cluster', () => {
    // Step 1: Generate and store campaign embeddings
    const campaigns = [
      makeCampaignInput({ id: 'camp-food-1', category: 'Restaurant', actions: ['ig_fp', 'ig_rl'], tier: 'essential' }),
      makeCampaignInput({ id: 'camp-food-2', category: 'Cafe', actions: ['ig_fp', 'ig_st'], tier: 'essential' }),
      makeCampaignInput({ id: 'camp-tech-1', category: 'Tech', actions: ['yt_vd', 'li_po'], tier: 'premium' }),
      makeCampaignInput({ id: 'camp-tech-2', category: 'SaaS', actions: ['yt_rv', 'li_ar'], tier: 'premium' }),
    ];

    for (const c of campaigns) {
      const vec = embeddingEngine.generateCampaignEmbedding(c);
      embeddingEngine.store(c.id, 'campaign', vec, { name: c.name, category: c.category });
    }

    // Step 2: Generate and store influencer embeddings
    const influencers = [
      makeInfluencerInput({ id: 'inf-food', niches: ['food', 'lifestyle'], followerCount: 15000 }),
      makeInfluencerInput({ id: 'inf-tech', niches: ['tech', 'business'], followerCount: 50000, tier: 'mid' }),
    ];

    for (const inf of influencers) {
      const vec = embeddingEngine.generateInfluencerEmbedding(inf);
      embeddingEngine.store(inf.id, 'influencer', vec, { name: inf.displayName });
    }

    // Step 3: Verify counts
    expect(embeddingEngine.count()).toBe(6);
    expect(embeddingEngine.count('campaign')).toBe(4);
    expect(embeddingEngine.count('influencer')).toBe(2);

    // Step 4: Find similar campaigns
    const similarToCampFood1 = embeddingEngine.findSimilarCampaigns('camp-food-1', 3);
    expect(similarToCampFood1.length).toBe(3);
    // camp-food-2 should be the most similar (same category style + IG actions)
    expect(similarToCampFood1[0].entityId).toBe('camp-food-2');

    // Step 5: Recommend campaigns for influencer
    const recsForFoodInf = embeddingEngine.recommendCampaignsForInfluencer('inf-food');
    expect(recsForFoodInf.length).toBe(4);

    // Step 6: Recommend influencers for campaign
    const recsForTechCamp = embeddingEngine.recommendInfluencersForCampaign('camp-tech-1');
    expect(recsForTechCamp.length).toBe(2);

    // Step 7: Cluster campaigns
    const clusters = embeddingEngine.clusterEntities('campaign', 2);
    expect(clusters).toHaveLength(2);
    const totalClustered = clusters.reduce((sum, c) => sum + c.members.length, 0);
    expect(totalClustered).toBe(4);
  });

  it('update workflow: re-store updates the embedding for search', () => {
    const vec1 = VectorMath.normalize([1, 0, 0]);
    embeddingEngine.store('entity-1', 'campaign', vec1);

    // Query should find it
    let results = embeddingEngine.findSimilar([1, 0, 0], 'campaign', 10);
    expect(results.length).toBe(1);
    expect(results[0].similarity).toBeCloseTo(1, 3);

    // Update: change direction entirely
    const vec2 = VectorMath.normalize([0, 0, 1]);
    embeddingEngine.store('entity-1', 'campaign', vec2);

    // New query in the updated direction should find it
    results = embeddingEngine.findSimilar([0, 0, 1], 'campaign', 10);
    expect(results.length).toBe(1);
    expect(results[0].similarity).toBeCloseTo(1, 3);

    // Old direction query should have low similarity now
    results = embeddingEngine.findSimilar([1, 0, 0], 'campaign', 10);
    expect(results[0].similarity).toBeCloseTo(0, 3);
  });
});
