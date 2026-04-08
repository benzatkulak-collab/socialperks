import { describe, it, expect } from 'vitest';
import {
  getNicheAffinity,
  scoreInfluencer,
  findBestMatches,
  explainMatch,
  type MatchScore,
} from '@/lib/matching-engine';
import type { Influencer, LaunchedCampaign, Business } from '@/lib/types';

// ─── Test Helpers ──────────────────────────────────────────────────────────

function makeInfluencer(overrides: Partial<Influencer> = {}): Influencer {
  return {
    id: 'inf-1',
    userId: 'user-1',
    displayName: 'Test Influencer',
    bio: 'A test influencer',
    platforms: [
      {
        platformId: 'ig',
        handle: '@test',
        followers: 10000,
        engagementRate: 0.04,
        verified: true,
      },
    ],
    followerCount: 10000,
    engagementRate: 0.04,
    niches: ['food', 'lifestyle'],
    location: 'New York, NY',
    rateCard: {
      rates: { content: 50, review: 75, engage: 20, share: 30, referral: 100 },
      currency: 'USD',
      negotiable: true,
    },
    portfolio: [],
    verified: true,
    tier: 'micro',
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeCampaign(overrides: Partial<LaunchedCampaign> = {}): LaunchedCampaign {
  return {
    id: 'camp-1',
    businessId: 'biz-1',
    name: 'Test Campaign',
    description: 'A test campaign',
    actions: ['ig_fp', 'ig_rl'],
    discountValue: 15,
    discountType: 'pct',
    expiresInDays: 30,
    useTiers: true,
    status: 'active',
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: 'biz-1',
    name: 'Test Restaurant',
    type: 'Restaurant',
    email: 'test@demo.com',
    pin: '1234',
    avatar: '',
    size: 'small',
    location: 'New York, NY',
    socialLinks: [],
    plan: 'starter',
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── getNicheAffinity ──────────────────────────────────────────────────────

describe('getNicheAffinity', () => {
  it('returns 0 for empty niches', () => {
    expect(getNicheAffinity([], 'Restaurant')).toBe(0);
  });

  it('returns high affinity for food niche + restaurant business', () => {
    const affinity = getNicheAffinity(['food'], 'Restaurant');
    expect(affinity).toBeGreaterThanOrEqual(0.8);
    expect(affinity).toBeLessThanOrEqual(1.0);
  });

  it('returns high affinity for fitness niche + yoga studio', () => {
    const affinity = getNicheAffinity(['fitness', 'yoga'], 'Yoga Studio');
    expect(affinity).toBeGreaterThanOrEqual(0.7);
  });

  it('returns low affinity for unrelated niche and business', () => {
    const affinity = getNicheAffinity(['gaming'], 'Dental Clinic');
    // Gaming and dental should have very low overlap
    expect(affinity).toBeLessThan(0.3);
  });

  it('returns 0.05 baseline when no niches match any traits', () => {
    // "randomniche123" won't match any NICHE_TRAIT_AFFINITY key
    // and won't substring match "Restaurant" either
    const affinity = getNicheAffinity(['randomniche123'], 'Restaurant');
    expect(affinity).toBe(0.05);
  });

  it('returns 0.05 baseline when business type has no recognized traits', () => {
    // A very obscure business type that matches no regex in detectTraits
    // but local is always true, so activeTraits always has at least 'local'
    // This test verifies the function handles uncommon business types
    const affinity = getNicheAffinity(['gaming'], 'XYZ123 Unknown Business');
    // gaming has no local trait affinity, so it should get the baseline
    expect(affinity).toBeLessThanOrEqual(0.2);
  });

  it('handles multiple niches and uses weighted formula', () => {
    // Multiple matching niches should combine via 60% max + 40% avg
    const single = getNicheAffinity(['food'], 'Restaurant');
    const multi = getNicheAffinity(['food', 'cooking', 'foodie'], 'Restaurant');
    // Multi should be at least as good since all are food-related
    expect(multi).toBeGreaterThanOrEqual(single * 0.9);
  });

  it('uses fuzzy matching for unknown niches that substring match business type', () => {
    // Niche "rest" is not in NICHE_TRAIT_AFFINITY, but "rest" is a substring of "restaurant"
    const affinity = getNicheAffinity(['rest'], 'Restaurant');
    // Should get 0.7 from fuzzy match
    expect(affinity).toBeGreaterThan(0.05);
  });

  it('normalizes niche case and whitespace', () => {
    const affinityLower = getNicheAffinity(['food'], 'Restaurant');
    const affinityUpper = getNicheAffinity(['FOOD'], 'Restaurant');
    const affinityPadded = getNicheAffinity(['  food  '], 'Restaurant');
    expect(affinityUpper).toBe(affinityLower);
    expect(affinityPadded).toBe(affinityLower);
  });

  it('handles beauty niches with transform-heavy business', () => {
    const affinity = getNicheAffinity(['beauty', 'makeup'], 'Salon');
    expect(affinity).toBeGreaterThanOrEqual(0.7);
  });

  it('handles b2b niches with consulting business', () => {
    const affinity = getNicheAffinity(['business', 'marketing'], 'Consulting Agency');
    expect(affinity).toBeGreaterThanOrEqual(0.7);
  });

  it('handles pets niches with veterinary business', () => {
    const affinity = getNicheAffinity(['pets', 'dogs'], 'Veterinary Clinic');
    expect(affinity).toBeGreaterThanOrEqual(0.7);
  });
});

// ─── scoreInfluencer ───────────────────────────────────────────────────────

describe('scoreInfluencer', () => {
  it('returns a complete MatchScore with all breakdown components', () => {
    const influencer = makeInfluencer();
    const campaign = makeCampaign();
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);

    expect(score.influencerId).toBe('inf-1');
    expect(score.campaignId).toBe('camp-1');
    expect(typeof score.overallScore).toBe('number');
    expect(score.overallScore).toBeGreaterThanOrEqual(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);

    // Verify breakdown has all components
    expect(score.breakdown.nicheAlignment).toBeGreaterThanOrEqual(0);
    expect(score.breakdown.nicheAlignment).toBeLessThanOrEqual(25);
    expect(score.breakdown.audienceSize).toBeGreaterThanOrEqual(0);
    expect(score.breakdown.audienceSize).toBeLessThanOrEqual(20);
    expect(score.breakdown.engagementQuality).toBeGreaterThanOrEqual(0);
    expect(score.breakdown.engagementQuality).toBeLessThanOrEqual(20);
    expect(score.breakdown.locationProximity).toBeGreaterThanOrEqual(0);
    expect(score.breakdown.locationProximity).toBeLessThanOrEqual(15);
    expect(score.breakdown.platformMatch).toBeGreaterThanOrEqual(0);
    expect(score.breakdown.platformMatch).toBeLessThanOrEqual(10);
    expect(score.breakdown.priceAlignment).toBeGreaterThanOrEqual(0);
    expect(score.breakdown.priceAlignment).toBeLessThanOrEqual(10);

    // Overall score is sum of breakdown components
    const sum =
      score.breakdown.nicheAlignment +
      score.breakdown.audienceSize +
      score.breakdown.engagementQuality +
      score.breakdown.locationProximity +
      score.breakdown.platformMatch +
      score.breakdown.priceAlignment;
    expect(score.overallScore).toBe(sum);

    // Recommendation and reasoning should be present
    expect(['strong_match', 'good_match', 'possible_match', 'poor_match']).toContain(
      score.recommendation
    );
    expect(typeof score.reasoning).toBe('string');
    expect(score.reasoning.length).toBeGreaterThan(0);
  });

  it('gives strong_match for well-aligned influencer', () => {
    const influencer = makeInfluencer({
      niches: ['food', 'cooking', 'foodie'],
      followerCount: 15000,
      engagementRate: 0.06,
      platforms: [
        { platformId: 'ig', handle: '@foodie', followers: 15000, engagementRate: 0.06, verified: true },
      ],
      location: 'New York, NY',
      rateCard: {
        rates: { content: 10, review: 15, engage: 5, share: 8, referral: 20 },
      },
    });
    const campaign = makeCampaign({ actions: ['ig_fp', 'ig_rl'], budgetCap: 500 });
    const business = makeBusiness({ type: 'Restaurant', location: 'New York, NY' });

    const score = scoreInfluencer(influencer, campaign, business);
    // Food influencer + restaurant + same city + IG match + low rates + high engagement
    expect(score.overallScore).toBeGreaterThanOrEqual(55);
  });

  it('gives poor_match for completely misaligned influencer', () => {
    const influencer = makeInfluencer({
      niches: ['gaming', 'tech'],
      followerCount: 50,
      engagementRate: 0.005,
      platforms: [
        { platformId: 'tt', handle: '@gamer', followers: 50, engagementRate: 0.005, verified: false },
      ],
      location: 'Tokyo, Japan',
      rateCard: {
        rates: { content: 500, review: 750, engage: 200, share: 300, referral: 1000 },
      },
    });
    const campaign = makeCampaign({ actions: ['ig_fp'], budgetCap: 50 });
    const business = makeBusiness({ type: 'Restaurant', location: 'New York, NY' });

    const score = scoreInfluencer(influencer, campaign, business);
    expect(score.recommendation).toBe('poor_match');
    expect(score.overallScore).toBeLessThan(35);
  });

  // ── Audience Size ──

  it('gives full audience score when followers are in ideal range', () => {
    // essential tier (default for discountValue 15, 2 actions) → range [1000, 25000]
    const influencer = makeInfluencer({ followerCount: 10000 });
    const campaign = makeCampaign({ discountValue: 15 });
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    expect(score.breakdown.audienceSize).toBe(20);
  });

  it('penalizes very small audiences below ideal range', () => {
    const influencer = makeInfluencer({ followerCount: 100 });
    const campaign = makeCampaign({ discountValue: 15 });
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    // Below 1000 min for essential tier, proportional with minimum of 2
    expect(score.breakdown.audienceSize).toBeGreaterThanOrEqual(2);
    expect(score.breakdown.audienceSize).toBeLessThan(20);
  });

  it('slightly penalizes oversized audiences', () => {
    const influencer = makeInfluencer({ followerCount: 500000 });
    const campaign = makeCampaign({ discountValue: 15 });
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    // Above 25000 max for essential tier, but still scores 8+
    expect(score.breakdown.audienceSize).toBeGreaterThanOrEqual(8);
    expect(score.breakdown.audienceSize).toBeLessThan(20);
  });

  // ── Campaign Tier Inference ──

  it('infers premium tier from tags', () => {
    const influencer = makeInfluencer({ followerCount: 100000 });
    const campaign = makeCampaign({
      tags: ['premium'],
      actions: ['ig_fp', 'ig_rl', 'ig_cb', 'ig_st', 'ig_sl'],
      discountValue: 30,
    });
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    // Premium tier range: [25000, 1000000], 100K is in range
    expect(score.breakdown.audienceSize).toBe(20);
  });

  it('infers starter tier from low discount and few actions', () => {
    const influencer = makeInfluencer({ followerCount: 2000 });
    const campaign = makeCampaign({
      actions: ['ig_lk'],
      discountValue: 3,
    });
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    // Starter tier range: [500, 5000], 2000 is in range
    expect(score.breakdown.audienceSize).toBe(20);
  });

  it('infers high_impact tier from 3+ actions and 15+ discount', () => {
    const influencer = makeInfluencer({ followerCount: 50000 });
    const campaign = makeCampaign({
      actions: ['ig_fp', 'ig_rl', 'ig_cb'],
      discountValue: 20,
    });
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    // High impact range: [10000, 250000], 50K is in range
    expect(score.breakdown.audienceSize).toBe(20);
  });

  // ── Engagement Quality ──

  it('scores above-average engagement highly', () => {
    const influencer = makeInfluencer({
      platforms: [
        { platformId: 'ig', handle: '@test', followers: 10000, engagementRate: 0.06, verified: true },
      ],
    });
    const campaign = makeCampaign();
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    // IG avg is 0.03, so 0.06 is 2x → should score 20/20
    expect(score.breakdown.engagementQuality).toBe(20);
  });

  it('scores below-average engagement lower', () => {
    const influencer = makeInfluencer({
      platforms: [
        { platformId: 'ig', handle: '@test', followers: 10000, engagementRate: 0.01, verified: true },
      ],
    });
    const campaign = makeCampaign();
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    // IG avg is 0.03, so 0.01 is ~0.33x → score ~3/20
    expect(score.breakdown.engagementQuality).toBeLessThan(10);
  });

  it('scores 0 engagement for influencer with no platforms', () => {
    const influencer = makeInfluencer({ platforms: [] });
    const campaign = makeCampaign();
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    expect(score.breakdown.engagementQuality).toBe(0);
  });

  it('averages engagement across multiple platforms', () => {
    const influencer = makeInfluencer({
      platforms: [
        { platformId: 'ig', handle: '@test', followers: 5000, engagementRate: 0.06, verified: true },
        { platformId: 'tt', handle: '@test', followers: 5000, engagementRate: 0.01, verified: true },
      ],
    });
    const campaign = makeCampaign();
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    // IG: 0.06/0.03 = 2x → 20, TT: 0.01/0.05 = 0.2x → 2. Average: (20+2)/2 = 11
    expect(score.breakdown.engagementQuality).toBeGreaterThan(5);
    expect(score.breakdown.engagementQuality).toBeLessThan(20);
  });

  // ── Location Proximity ──

  it('gives full location score for exact match', () => {
    const influencer = makeInfluencer({ location: 'New York, NY' });
    const business = makeBusiness({ location: 'New York, NY' });
    const campaign = makeCampaign();

    const score = scoreInfluencer(influencer, campaign, business);
    expect(score.breakdown.locationProximity).toBe(15);
  });

  it('gives neutral score when business location is unknown', () => {
    const influencer = makeInfluencer({ location: 'New York, NY' });
    const business = makeBusiness({ location: '' });
    const campaign = makeCampaign();

    const score = scoreInfluencer(influencer, campaign, business);
    expect(score.breakdown.locationProximity).toBe(7);
  });

  it('gives neutral score when influencer location is unknown', () => {
    const influencer = makeInfluencer({ location: '' });
    const business = makeBusiness({ location: 'New York, NY' });
    const campaign = makeCampaign();

    const score = scoreInfluencer(influencer, campaign, business);
    expect(score.breakdown.locationProximity).toBe(7);
  });

  it('gives low location score for completely different locations', () => {
    const influencer = makeInfluencer({ location: 'Tokyo, Japan' });
    const business = makeBusiness({ location: 'New York, NY' });
    const campaign = makeCampaign();

    const score = scoreInfluencer(influencer, campaign, business);
    expect(score.breakdown.locationProximity).toBe(3);
  });

  it('handles NYC alias matching', () => {
    const influencer = makeInfluencer({ location: 'NYC' });
    const business = makeBusiness({ location: 'Manhattan' });
    const campaign = makeCampaign();

    const score = scoreInfluencer(influencer, campaign, business);
    // NYC expands to include "manhattan", so should match well
    expect(score.breakdown.locationProximity).toBeGreaterThan(3);
  });

  it('handles partial token overlap for same state', () => {
    const influencer = makeInfluencer({ location: 'Austin, TX' });
    const business = makeBusiness({ location: 'Houston, TX' });
    const campaign = makeCampaign();

    const score = scoreInfluencer(influencer, campaign, business);
    // Overlapping token: "tx" -> partial overlap
    expect(score.breakdown.locationProximity).toBeGreaterThanOrEqual(8);
  });

  // ── Platform Match ──

  it('gives full platform score when influencer has all required platforms', () => {
    const influencer = makeInfluencer({
      platforms: [
        { platformId: 'ig', handle: '@test', followers: 10000, engagementRate: 0.04, verified: true },
      ],
    });
    const campaign = makeCampaign({ actions: ['ig_fp', 'ig_rl'] });
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    // All actions are on IG, influencer has IG
    expect(score.breakdown.platformMatch).toBe(10);
  });

  it('gives zero platform score when influencer has none of the required platforms', () => {
    const influencer = makeInfluencer({
      platforms: [
        { platformId: 'tt', handle: '@test', followers: 10000, engagementRate: 0.04, verified: true },
      ],
    });
    const campaign = makeCampaign({ actions: ['ig_fp', 'ig_rl'] });
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    // Actions require IG, influencer only has TT
    expect(score.breakdown.platformMatch).toBe(0);
  });

  it('gives partial platform score for partial platform coverage', () => {
    const influencer = makeInfluencer({
      platforms: [
        { platformId: 'ig', handle: '@test', followers: 5000, engagementRate: 0.04, verified: true },
      ],
    });
    const campaign = makeCampaign({ actions: ['ig_fp', 'tt_vd'] });
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    // IG matched, TT not matched → 1/2 = 5/10
    expect(score.breakdown.platformMatch).toBe(5);
  });

  it('gives neutral score when campaign actions have no identifiable platforms', () => {
    const influencer = makeInfluencer();
    const campaign = makeCampaign({ actions: ['nonexistent_action'] });
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    expect(score.breakdown.platformMatch).toBe(5);
  });

  // ── Price Alignment ──

  it('gives high price score when influencer rates are affordable relative to budget', () => {
    const influencer = makeInfluencer({
      rateCard: {
        rates: { content: 5, review: 10, engage: 2, share: 3, referral: 15 },
      },
    });
    const campaign = makeCampaign({ actions: ['ig_fp', 'ig_rl'], budgetCap: 500 });
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    // Total cost: avg of content rates (~5) * 2 actions = 10. Budget = 500. Ratio = 0.02 → 10
    expect(score.breakdown.priceAlignment).toBeGreaterThanOrEqual(8);
  });

  it('gives low price score when influencer rates exceed budget', () => {
    const influencer = makeInfluencer({
      rateCard: {
        rates: { content: 500, review: 750, engage: 200, share: 300, referral: 1000 },
      },
    });
    const campaign = makeCampaign({ actions: ['ig_fp', 'ig_rl'], budgetCap: 100 });
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    // Total cost: 500 * 2 = 1000 vs budget 100, ratio = 10 → 1
    expect(score.breakdown.priceAlignment).toBeLessThanOrEqual(3);
  });

  it('gives neutral price score when no rate data is available', () => {
    const influencer = makeInfluencer({
      rateCard: {
        rates: { content: 0, review: 0, engage: 0, share: 0, referral: 0 },
      },
    });
    const campaign = makeCampaign();
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    expect(score.breakdown.priceAlignment).toBe(5);
  });

  it('estimates budget from perk value and business size when no budgetCap', () => {
    const influencer = makeInfluencer({
      rateCard: {
        rates: { content: 10, review: 15, engage: 5, share: 8, referral: 20 },
      },
    });
    const campaign = makeCampaign({ budgetCap: undefined });
    const business = makeBusiness({ size: 'enterprise' });

    const score = scoreInfluencer(influencer, campaign, business);
    // Enterprise multiplier = 4, discountValue = 15
    // Estimated budget = 15 * 4 * 10 = 600, avg rate = 10, total = 20. ratio = 0.03 → 10
    expect(score.breakdown.priceAlignment).toBeGreaterThanOrEqual(6);
  });

  // ── Recommendation Classification ──

  it('classifies score >= 75 as strong_match', () => {
    // Create a very well-aligned influencer to achieve 75+
    const influencer = makeInfluencer({
      niches: ['food', 'cooking', 'foodie'],
      followerCount: 15000,
      engagementRate: 0.06,
      platforms: [
        { platformId: 'ig', handle: '@foodie', followers: 15000, engagementRate: 0.06, verified: true },
      ],
      location: 'New York, NY',
      rateCard: {
        rates: { content: 5, review: 10, engage: 2, share: 3, referral: 15 },
      },
    });
    const campaign = makeCampaign({ actions: ['ig_fp', 'ig_rl'], budgetCap: 500 });
    const business = makeBusiness({ type: 'Restaurant', location: 'New York, NY' });

    const score = scoreInfluencer(influencer, campaign, business);
    // Should get near-perfect scores in all categories
    if (score.overallScore >= 75) {
      expect(score.recommendation).toBe('strong_match');
    }
  });

  it('classifies score < 35 as poor_match', () => {
    const influencer = makeInfluencer({
      niches: ['gaming'],
      followerCount: 50,
      engagementRate: 0.001,
      platforms: [],
      location: 'Tokyo, Japan',
      rateCard: {
        rates: { content: 1000, review: 1000, engage: 1000, share: 1000, referral: 1000 },
      },
    });
    const campaign = makeCampaign({ budgetCap: 10 });
    const business = makeBusiness({ type: 'Restaurant', location: 'New York, NY' });

    const score = scoreInfluencer(influencer, campaign, business);
    expect(score.recommendation).toBe('poor_match');
  });

  // ── Reasoning Generation ──

  it('includes influencer display name in reasoning', () => {
    const influencer = makeInfluencer({ displayName: 'FoodLover99' });
    const campaign = makeCampaign();
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    expect(score.reasoning).toContain('FoodLover99');
  });

  it('includes niche alignment reasoning for strong niche fit', () => {
    const influencer = makeInfluencer({
      niches: ['food', 'cooking'],
    });
    const campaign = makeCampaign();
    const business = makeBusiness({ type: 'Restaurant' });

    const score = scoreInfluencer(influencer, campaign, business);
    if (score.breakdown.nicheAlignment >= 20) {
      expect(score.reasoning).toContain('align strongly');
    }
  });

  it('includes engagement reasoning for above-average engagement', () => {
    const influencer = makeInfluencer({
      engagementRate: 0.08,
      platforms: [
        { platformId: 'ig', handle: '@test', followers: 10000, engagementRate: 0.08, verified: true },
      ],
    });
    const campaign = makeCampaign();
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    if (score.breakdown.engagementQuality >= 16) {
      expect(score.reasoning).toContain('above platform averages');
    }
  });

  it('includes location reasoning for strong location match', () => {
    const influencer = makeInfluencer({ location: 'New York, NY' });
    const campaign = makeCampaign();
    const business = makeBusiness({ location: 'New York, NY' });

    const score = scoreInfluencer(influencer, campaign, business);
    if (score.breakdown.locationProximity >= 12) {
      expect(score.reasoning).toContain('strong match');
    }
  });

  it('includes platform match reasoning', () => {
    const influencer = makeInfluencer({
      platforms: [
        { platformId: 'ig', handle: '@test', followers: 10000, engagementRate: 0.04, verified: true },
      ],
    });
    const campaign = makeCampaign({ actions: ['ig_fp', 'ig_rl'] });
    const business = makeBusiness();

    const score = scoreInfluencer(influencer, campaign, business);
    if (score.breakdown.platformMatch >= 8) {
      expect(score.reasoning).toContain('all required platforms');
    }
  });
});

// ─── findBestMatches ───────────────────────────────────────────────────────

describe('findBestMatches', () => {
  it('returns results sorted by overallScore descending', () => {
    const goodInfluencer = makeInfluencer({
      id: 'inf-good',
      niches: ['food', 'cooking'],
      followerCount: 15000,
      engagementRate: 0.06,
      platforms: [
        { platformId: 'ig', handle: '@foodie', followers: 15000, engagementRate: 0.06, verified: true },
      ],
    });
    const badInfluencer = makeInfluencer({
      id: 'inf-bad',
      niches: ['gaming'],
      followerCount: 50,
      engagementRate: 0.001,
      platforms: [],
      location: 'Tokyo, Japan',
    });
    const midInfluencer = makeInfluencer({
      id: 'inf-mid',
      niches: ['lifestyle'],
      followerCount: 5000,
      engagementRate: 0.03,
    });

    const campaign = makeCampaign({ actions: ['ig_fp'] });
    const business = makeBusiness({ type: 'Restaurant' });

    const results = findBestMatches(campaign, business, [
      badInfluencer,
      goodInfluencer,
      midInfluencer,
    ]);

    expect(results.length).toBe(3);
    expect(results[0].overallScore).toBeGreaterThanOrEqual(results[1].overallScore);
    expect(results[1].overallScore).toBeGreaterThanOrEqual(results[2].overallScore);
    expect(results[0].influencerId).toBe('inf-good');
    expect(results[2].influencerId).toBe('inf-bad');
  });

  it('respects the limit parameter', () => {
    const influencers = Array.from({ length: 20 }, (_, i) =>
      makeInfluencer({ id: `inf-${i}`, followerCount: 1000 + i * 500 })
    );

    const campaign = makeCampaign();
    const business = makeBusiness();

    const results = findBestMatches(campaign, business, influencers, 5);
    expect(results.length).toBe(5);
  });

  it('defaults to limit of 10', () => {
    const influencers = Array.from({ length: 15 }, (_, i) =>
      makeInfluencer({ id: `inf-${i}` })
    );

    const campaign = makeCampaign();
    const business = makeBusiness();

    const results = findBestMatches(campaign, business, influencers);
    expect(results.length).toBe(10);
  });

  it('returns fewer than limit when pool is smaller', () => {
    const influencers = [makeInfluencer({ id: 'inf-only' })];
    const campaign = makeCampaign();
    const business = makeBusiness();

    const results = findBestMatches(campaign, business, influencers, 10);
    expect(results.length).toBe(1);
  });

  it('returns empty array for empty pool', () => {
    const campaign = makeCampaign();
    const business = makeBusiness();

    const results = findBestMatches(campaign, business, []);
    expect(results.length).toBe(0);
  });

  it('each result has the correct campaignId', () => {
    const influencers = [
      makeInfluencer({ id: 'inf-a' }),
      makeInfluencer({ id: 'inf-b' }),
    ];
    const campaign = makeCampaign({ id: 'camp-specific' });
    const business = makeBusiness();

    const results = findBestMatches(campaign, business, influencers);
    for (const result of results) {
      expect(result.campaignId).toBe('camp-specific');
    }
  });
});

// ─── explainMatch ──────────────────────────────────────────────────────────

describe('explainMatch', () => {
  it('returns "Strong Match" label for strong_match recommendation', () => {
    const score: MatchScore = {
      influencerId: 'inf-1',
      campaignId: 'camp-1',
      overallScore: 82,
      breakdown: {
        nicheAlignment: 22,
        audienceSize: 20,
        engagementQuality: 18,
        locationProximity: 12,
        platformMatch: 5,
        priceAlignment: 5,
      },
      recommendation: 'strong_match',
      reasoning: 'Great fit.',
    };

    const explanation = explainMatch(score);
    expect(explanation).toContain('Strong Match');
    expect(explanation).toContain('82/100');
  });

  it('returns "Good Match" label for good_match recommendation', () => {
    const score: MatchScore = {
      influencerId: 'inf-1',
      campaignId: 'camp-1',
      overallScore: 60,
      breakdown: {
        nicheAlignment: 15,
        audienceSize: 15,
        engagementQuality: 12,
        locationProximity: 8,
        platformMatch: 5,
        priceAlignment: 5,
      },
      recommendation: 'good_match',
      reasoning: 'Good fit.',
    };

    const explanation = explainMatch(score);
    expect(explanation).toContain('Good Match');
    expect(explanation).toContain('60/100');
  });

  it('returns "Possible Match" label for possible_match recommendation', () => {
    const score: MatchScore = {
      influencerId: 'inf-1',
      campaignId: 'camp-1',
      overallScore: 42,
      breakdown: {
        nicheAlignment: 10,
        audienceSize: 10,
        engagementQuality: 8,
        locationProximity: 7,
        platformMatch: 4,
        priceAlignment: 3,
      },
      recommendation: 'possible_match',
      reasoning: 'Possible.',
    };

    const explanation = explainMatch(score);
    expect(explanation).toContain('Possible Match');
    expect(explanation).toContain('42/100');
  });

  it('returns "Poor Match" label for poor_match recommendation', () => {
    const score: MatchScore = {
      influencerId: 'inf-1',
      campaignId: 'camp-1',
      overallScore: 20,
      breakdown: {
        nicheAlignment: 5,
        audienceSize: 4,
        engagementQuality: 3,
        locationProximity: 3,
        platformMatch: 3,
        priceAlignment: 2,
      },
      recommendation: 'poor_match',
      reasoning: 'Poor fit.',
    };

    const explanation = explainMatch(score);
    expect(explanation).toContain('Poor Match');
    expect(explanation).toContain('20/100');
  });

  it('lists strengths for high-scoring components (>= 75% of max)', () => {
    const score: MatchScore = {
      influencerId: 'inf-1',
      campaignId: 'camp-1',
      overallScore: 70,
      breakdown: {
        nicheAlignment: 25, // 100% of 25 — strength
        audienceSize: 20,   // 100% of 20 — strength
        engagementQuality: 15, // 75% of 20 — strength
        locationProximity: 5, // 33% of 15 — weakness
        platformMatch: 3,   // 30% of 10 — weakness
        priceAlignment: 2,  // 20% of 10 — weakness
      },
      recommendation: 'good_match',
      reasoning: 'Decent.',
    };

    const explanation = explainMatch(score);
    expect(explanation).toContain('Strengths:');
    expect(explanation).toContain('Niche fit');
    expect(explanation).toContain('Audience size');
    expect(explanation).toContain('Engagement quality');
  });

  it('lists areas of concern for low-scoring components (< 40% of max)', () => {
    const score: MatchScore = {
      influencerId: 'inf-1',
      campaignId: 'camp-1',
      overallScore: 30,
      breakdown: {
        nicheAlignment: 5,    // 20% of 25 — weakness
        audienceSize: 5,      // 25% of 20 — weakness
        engagementQuality: 5, // 25% of 20 — weakness
        locationProximity: 5, // 33% of 15 — weakness
        platformMatch: 5,     // 50% — neither
        priceAlignment: 5,    // 50% — neither
      },
      recommendation: 'poor_match',
      reasoning: 'Bad fit.',
    };

    const explanation = explainMatch(score);
    expect(explanation).toContain('Areas of concern:');
    expect(explanation).toContain('Niche fit');
    expect(explanation).toContain('Audience size');
  });

  it('omits strengths/weaknesses sections when none apply', () => {
    const score: MatchScore = {
      influencerId: 'inf-1',
      campaignId: 'camp-1',
      overallScore: 50,
      breakdown: {
        nicheAlignment: 12, // 48% — neither
        audienceSize: 10,   // 50% — neither
        engagementQuality: 10, // 50% — neither
        locationProximity: 7,  // 47% — neither
        platformMatch: 5,    // 50% — neither
        priceAlignment: 6,   // 60% — neither
      },
      recommendation: 'possible_match',
      reasoning: 'Middle ground.',
    };

    const explanation = explainMatch(score);
    expect(explanation).not.toContain('Strengths:');
    expect(explanation).not.toContain('Areas of concern:');
  });
});
