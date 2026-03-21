import { describe, it, expect } from "vitest";
import {
  marketingAgent,
  type BusinessProfile,
  type CampaignRecommendation,
  type MarketingPlan,
} from "../ai-agent";
import { PLATFORMS } from "../platforms";

// ═══════════════ Test Fixtures ═══════════════

function makeProfile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    businessId: "test-b1",
    name: "Test Business",
    type: "Coffee Shop",
    size: "small",
    industry: "Food & Beverage",
    location: "Washington, DC",
    currentRating: 4.2,
    reviewCount: 35,
    socialPresence: [
      { platform: "ig", followers: 1200, engagement: 3.5 },
    ],
    monthlyBudget: 300,
    memberCount: null,
    averageTransactionValue: 8,
    goals: ["more_reviews", "instagram_growth"],
    ...overrides,
  };
}

function makeYogaProfile(): BusinessProfile {
  return makeProfile({
    businessId: "test-yoga",
    name: "Sunrise Yoga DC",
    type: "Yoga Studio",
    industry: "Wellness",
    currentRating: 4.5,
    reviewCount: 22,
    socialPresence: [
      { platform: "ig", followers: 3500, engagement: 4.8 },
      { platform: "fb", followers: 800, engagement: 2.1 },
    ],
    monthlyBudget: 500,
    memberCount: 150,
    averageTransactionValue: 25,
    goals: ["more_reviews", "instagram_growth", "member_retention"],
  });
}

function makeGymProfile(): BusinessProfile {
  return makeProfile({
    businessId: "test-gym",
    name: "Iron Temple",
    type: "Gym",
    industry: "Fitness",
    currentRating: 4.0,
    reviewCount: 45,
    socialPresence: [
      { platform: "ig", followers: 5000, engagement: 5.2 },
      { platform: "tt", followers: 2000, engagement: 6.0 },
    ],
    monthlyBudget: 600,
    memberCount: 300,
    averageTransactionValue: 60,
    goals: ["instagram_growth", "brand_awareness", "member_retention"],
  });
}

function makeRestaurantProfile(): BusinessProfile {
  return makeProfile({
    businessId: "test-restaurant",
    name: "Taqueria Sol",
    type: "Restaurant",
    industry: "Food & Beverage",
    currentRating: 4.3,
    reviewCount: 120,
    socialPresence: [
      { platform: "ig", followers: 2500, engagement: 3.8 },
    ],
    monthlyBudget: 400,
    memberCount: null,
    averageTransactionValue: 45,
    goals: ["more_reviews", "foot_traffic", "brand_awareness"],
  });
}

function makeLawFirmProfile(): BusinessProfile {
  return makeProfile({
    businessId: "test-law",
    name: "Smith & Co Law",
    type: "Law Firm",
    industry: "Professional Services",
    currentRating: 4.6,
    reviewCount: 18,
    socialPresence: [
      { platform: "li", followers: 1500, engagement: 2.8 },
    ],
    monthlyBudget: 800,
    memberCount: null,
    averageTransactionValue: 500,
    goals: ["more_reviews", "brand_awareness"],
  });
}

// Collect all valid platform IDs from the source of truth
const ALL_PLATFORM_IDS = PLATFORMS.map((p) => p.id);
const ALL_ACTION_IDS = PLATFORMS.flatMap((p) => p.actions.map((a) => a.id));

// ═══════════════ analyzeBusinessType ═══════════════

describe("analyzeBusinessType", () => {
  it("returns traits, profile, and insights for Yoga Studio", () => {
    const result = marketingAgent.analyzeBusinessType("Yoga Studio");
    expect(result.traits).toBeDefined();
    expect(result.traits.wellness).toBe(true);
    expect(result.traits.visual).toBe(true);
    expect(result.profile).toBeDefined();
    expect(result.profile.bestChannels.length).toBeGreaterThan(0);
    expect(result.insights.length).toBeGreaterThan(0);
  });

  it("returns traits for Coffee Shop", () => {
    const result = marketingAgent.analyzeBusinessType("Coffee Shop");
    expect(result.traits.food).toBe(true);
    expect(result.traits.visual).toBe(true);
    expect(result.profile.visitFrequency).toBe("daily");
  });

  it("returns traits for Restaurant", () => {
    const result = marketingAgent.analyzeBusinessType("Restaurant");
    expect(result.traits.food).toBe(true);
  });

  it("returns traits for Gym", () => {
    const result = marketingAgent.analyzeBusinessType("Gym");
    expect(result.traits.wellness).toBe(true);
    expect(result.traits.transform).toBe(true);
  });

  it("returns traits for Veterinarian", () => {
    const result = marketingAgent.analyzeBusinessType("Veterinarian");
    expect(result.traits.pets).toBe(true);
    expect(result.traits.service).toBe(true);
  });

  it("returns traits for Law Firm (B2B)", () => {
    const result = marketingAgent.analyzeBusinessType("Law Firm");
    expect(result.traits.b2b).toBe(true);
    expect(result.traits.service).toBe(true);
  });

  it("returns a fallback profile for unknown business types", () => {
    const result = marketingAgent.analyzeBusinessType("Quantum Teleportation Services");
    expect(result.profile).toBeDefined();
    expect(result.profile.bestChannels.length).toBeGreaterThan(0);
    expect(result.profile.contentTypes.length).toBeGreaterThan(0);
  });
});

// ═══════════════ generateRecommendations ═══════════════

describe("generateRecommendations", () => {
  it("returns 3-5 recommendations", () => {
    const recs = marketingAgent.generateRecommendations(makeProfile());
    expect(recs.length).toBeGreaterThanOrEqual(3);
    expect(recs.length).toBeLessThanOrEqual(5);
  });

  it("each recommendation has all required fields", () => {
    const recs = marketingAgent.generateRecommendations(makeProfile());
    for (const rec of recs) {
      expect(rec.id).toBeTruthy();
      expect(rec.name).toBeTruthy();
      expect(rec.description).toBeTruthy();
      expect(["perk_program", "one_time_campaign", "seasonal", "launch"]).toContain(rec.type);
      expect(["critical", "high", "medium", "low"]).toContain(rec.priority);
      expect(rec.platforms.length).toBeGreaterThan(0);
      expect(rec.actions.length).toBeGreaterThan(0);
      expect(rec.suggestedTiers.length).toBeGreaterThan(0);
      expect(["weekly", "biweekly", "monthly"]).toContain(rec.suggestedCycle);
      expect(rec.suggestedDuration).toBeTruthy();
      expect(rec.bestLaunchTime).toBeTruthy();
      expect(rec.projectedResults).toBeDefined();
      expect(rec.reasoning).toBeTruthy();
      expect(rec.dataPoints.length).toBeGreaterThan(0);
      expect(rec.risks.length).toBeGreaterThan(0);
    }
  });

  it("yoga studio gets Instagram and Google recommendations", () => {
    const recs = marketingAgent.generateRecommendations(makeYogaProfile());
    const platformIds = recs.flatMap((r) => r.platforms.map((p) => p.id));
    expect(platformIds).toContain("ig");
    expect(platformIds).toContain("go");
  });

  it("coffee shop gets different recommendations than gym", () => {
    const coffeeRecs = marketingAgent.generateRecommendations(makeProfile());
    const gymRecs = marketingAgent.generateRecommendations(makeGymProfile());
    const coffeeNames = coffeeRecs.map((r) => r.name).sort();
    const gymNames = gymRecs.map((r) => r.name).sort();
    // They should not be identical
    expect(coffeeNames).not.toEqual(gymNames);
  });

  it("recommendations include valid platform IDs", () => {
    const recs = marketingAgent.generateRecommendations(makeProfile());
    for (const rec of recs) {
      for (const platform of rec.platforms) {
        expect(ALL_PLATFORM_IDS).toContain(platform.id);
      }
    }
  });

  it("recommendation tiers are sorted by requiredActions", () => {
    const recs = marketingAgent.generateRecommendations(makeProfile());
    for (const rec of recs) {
      for (let i = 1; i < rec.suggestedTiers.length; i++) {
        expect(rec.suggestedTiers[i].requiredActions).toBeGreaterThanOrEqual(
          rec.suggestedTiers[i - 1].requiredActions
        );
      }
    }
  });

  it("ROI projections are positive", () => {
    const recs = marketingAgent.generateRecommendations(makeProfile());
    for (const rec of recs) {
      expect(rec.projectedResults.estimatedROI).toBeGreaterThan(0);
      expect(rec.projectedResults.estimatedReach).toBeGreaterThan(0);
      expect(rec.projectedResults.estimatedNewCustomers).toBeGreaterThan(0);
    }
  });

  it("confidence scores are between 0 and 1", () => {
    const recs = marketingAgent.generateRecommendations(makeProfile());
    for (const rec of recs) {
      expect(rec.confidence).toBeGreaterThanOrEqual(0);
      expect(rec.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("restaurant recommendations prioritize food platforms", () => {
    const recs = marketingAgent.generateRecommendations(makeRestaurantProfile());
    const allActionIds = recs.flatMap((r) => r.actions.map((a) => a.id));
    // Restaurant should get food-related review or TikTok actions
    const hasFoodRelevant = allActionIds.some(
      (id) => id.startsWith("go_") || id.startsWith("ig_") || id.startsWith("tt_")
    );
    expect(hasFoodRelevant).toBe(true);
  });

  it("law firm gets LinkedIn recommendations", () => {
    const recs = marketingAgent.generateRecommendations(makeLawFirmProfile());
    const platformIds = recs.flatMap((r) => r.platforms.map((p) => p.id));
    expect(platformIds).toContain("li");
  });

  it("membership business with member_retention goal gets loyalty program", () => {
    const recs = marketingAgent.generateRecommendations(makeYogaProfile());
    const hasLoyalty = recs.some(
      (r) => r.name.toLowerCase().includes("loyalty") || r.name.toLowerCase().includes("member")
    );
    expect(hasLoyalty).toBe(true);
  });

  it("unknown business type still produces recommendations", () => {
    const profile = makeProfile({ type: "Artisanal Candle Workshop" });
    const recs = marketingAgent.generateRecommendations(profile);
    expect(recs.length).toBeGreaterThanOrEqual(3);
  });

  it("actions reference valid action IDs from platforms", () => {
    const recs = marketingAgent.generateRecommendations(makeProfile());
    for (const rec of recs) {
      for (const action of rec.actions) {
        expect(ALL_ACTION_IDS).toContain(action.id);
      }
    }
  });
});

// ═══════════════ generatePlan ═══════════════

describe("generatePlan", () => {
  it("produces a complete MarketingPlan", () => {
    const plan = marketingAgent.generatePlan(makeProfile());
    expect(plan.id).toBeTruthy();
    expect(plan.businessId).toBe("test-b1");
    expect(plan.generatedAt).toBeTruthy();
    expect(plan.recommendations.length).toBeGreaterThanOrEqual(3);
  });

  it("includes strategy with summary and insights", () => {
    const plan = marketingAgent.generatePlan(makeProfile());
    expect(plan.strategy.summary.length).toBeGreaterThan(20);
    expect(plan.strategy.primaryGoal).toBeTruthy();
    expect(plan.strategy.timeline).toBeTruthy();
    expect(plan.strategy.totalMonthlyBudget).toBeGreaterThan(0);
    expect(plan.strategy.expectedMonthlyROI).toBeGreaterThan(0);
    expect(plan.strategy.keyInsights.length).toBeGreaterThan(0);
  });

  it("includes competitive insights", () => {
    const plan = marketingAgent.generatePlan(makeProfile());
    expect(plan.competitiveInsights.averageRatingInArea).toBeGreaterThan(0);
    expect(plan.competitiveInsights.averageRatingInArea).toBeLessThanOrEqual(5);
    expect(plan.competitiveInsights.averageReviewCountInArea).toBeGreaterThan(0);
    expect(plan.competitiveInsights.topCompetitorStrengths.length).toBeGreaterThan(0);
    expect(plan.competitiveInsights.yourAdvantages.length).toBeGreaterThan(0);
    expect(plan.competitiveInsights.gapAnalysis.length).toBeGreaterThan(20);
  });

  it("includes implementation phases", () => {
    const plan = marketingAgent.generatePlan(makeProfile());
    expect(plan.implementationOrder.length).toBeGreaterThanOrEqual(2);
    for (const phase of plan.implementationOrder) {
      expect(phase.phase).toBeTruthy();
      expect(phase.actions.length).toBeGreaterThan(0);
      expect(phase.expectedOutcome).toBeTruthy();
    }
  });

  it("preserves the business profile in the plan", () => {
    const profile = makeYogaProfile();
    const plan = marketingAgent.generatePlan(profile);
    expect(plan.businessProfile.businessId).toBe(profile.businessId);
    expect(plan.businessProfile.type).toBe(profile.type);
  });
});

// ═══════════════ generateQuickStart ═══════════════

describe("generateQuickStart", () => {
  it("returns a single recommendation", () => {
    const rec = marketingAgent.generateQuickStart(makeProfile());
    expect(rec).toBeDefined();
    expect(rec.id).toBeTruthy();
    expect(rec.name).toBeTruthy();
  });

  it("returns the highest priority recommendation", () => {
    const rec = marketingAgent.generateQuickStart(makeProfile());
    // Quick start should return a critical or high priority recommendation
    expect(["critical", "high"]).toContain(rec.priority);
  });

  it("works with minimal profile (just businessType)", () => {
    const profile: BusinessProfile = {
      businessId: "qs",
      name: "Quick Biz",
      type: "Bakery",
      size: "small",
      industry: "",
      location: "",
      currentRating: null,
      reviewCount: null,
      socialPresence: [],
      monthlyBudget: null,
      memberCount: null,
      averageTransactionValue: null,
      goals: [],
    };
    const rec = marketingAgent.generateQuickStart(profile);
    expect(rec).toBeDefined();
    expect(rec.name).toBeTruthy();
  });
});

// ═══════════════ Budget Analysis ═══════════════

describe("analyzeBudget", () => {
  it("respects budget constraints", () => {
    const result = marketingAgent.analyzeBudget(200, 30, null);
    expect(result.effectiveBudget).toBe(200);
    expect(result.maxDiscountPercent).toBeGreaterThan(0);
    expect(result.maxDiscountPercent).toBeLessThanOrEqual(25);
  });

  it("generates higher dollar discounts for high-ticket businesses", () => {
    const highTicket = marketingAgent.analyzeBudget(500, 150, null);
    const lowTicket = marketingAgent.analyzeBudget(500, 10, null);
    expect(highTicket.maxDiscountDollar).toBeGreaterThan(lowTicket.maxDiscountDollar);
  });

  it("provides fallback budget when null", () => {
    const result = marketingAgent.analyzeBudget(null, null, null);
    expect(result.effectiveBudget).toBeGreaterThan(0);
  });

  it("handles membership businesses differently", () => {
    const memberResult = marketingAgent.analyzeBudget(400, 25, 200);
    expect(memberResult.discountStrategy).toContain("membership");
  });
});

// ═══════════════ ROI Projections ═══════════════

describe("projectROI", () => {
  it("returns conservative, realistic, and optimistic projections", () => {
    const profile = makeProfile();
    const recs = marketingAgent.generateRecommendations(profile);
    const roi = marketingAgent.projectROI(recs[0], profile);

    expect(roi.conservative).toBeDefined();
    expect(roi.realistic).toBeDefined();
    expect(roi.optimistic).toBeDefined();
  });

  it("conservative is lower than realistic is lower than optimistic", () => {
    const profile = makeProfile();
    const recs = marketingAgent.generateRecommendations(profile);
    const roi = marketingAgent.projectROI(recs[0], profile);

    expect(roi.conservative.roi).toBeLessThanOrEqual(roi.realistic.roi);
    expect(roi.realistic.roi).toBeLessThanOrEqual(roi.optimistic.roi);
    expect(roi.conservative.newCustomers).toBeLessThanOrEqual(roi.realistic.newCustomers);
    expect(roi.realistic.newCustomers).toBeLessThanOrEqual(roi.optimistic.newCustomers);
  });

  it("all projections are positive", () => {
    const profile = makeRestaurantProfile();
    const recs = marketingAgent.generateRecommendations(profile);
    const roi = marketingAgent.projectROI(recs[0], profile);

    expect(roi.conservative.roi).toBeGreaterThan(0);
    expect(roi.conservative.newCustomers).toBeGreaterThan(0);
    expect(roi.conservative.revenue).toBeGreaterThan(0);
  });
});

// ═══════════════ Cost Per Acquisition ═══════════════

describe("calculateCostPerAcquisition", () => {
  it("returns CPA with comparison and verdict", () => {
    const profile = makeProfile();
    const recs = marketingAgent.generateRecommendations(profile);
    const cpa = marketingAgent.calculateCostPerAcquisition(recs[0], profile);

    expect(cpa.costPerAcquisition).toBeGreaterThanOrEqual(0);
    expect(cpa.comparisonToIndustryAvg).toBeTruthy();
    expect(cpa.verdict).toBeTruthy();
  });
});

// ═══════════════ Competitive Insights ═══════════════

describe("analyzeCompetition", () => {
  it("generates competitive insights for known types", () => {
    const result = marketingAgent.analyzeCompetition("Yoga Studio", "Washington, DC");
    expect(result.averageRatingInArea).toBeGreaterThan(0);
    expect(result.averageRatingInArea).toBeLessThanOrEqual(5);
    expect(result.averageReviewCountInArea).toBeGreaterThan(0);
    expect(result.topCompetitorStrengths.length).toBeGreaterThan(0);
    expect(result.yourAdvantages.length).toBeGreaterThan(0);
    expect(result.gapAnalysis.length).toBeGreaterThan(0);
  });

  it("returns different insights for different business types", () => {
    const yogaInsights = marketingAgent.analyzeCompetition("Yoga Studio", "DC");
    const mechInsights = marketingAgent.analyzeCompetition("Auto Mechanic", "DC");
    expect(yogaInsights.gapAnalysis).not.toBe(mechInsights.gapAnalysis);
  });
});

// ═══════════════ Social Presence Analysis ═══════════════

describe("analyzeSocialPresence", () => {
  it("identifies strengths for established presence", () => {
    const result = marketingAgent.analyzeSocialPresence([
      { platform: "ig", followers: 10000, engagement: 6.0 },
    ]);
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  it("identifies weaknesses for small presence", () => {
    const result = marketingAgent.analyzeSocialPresence([
      { platform: "ig", followers: 100, engagement: 1.0 },
    ]);
    expect(result.weaknesses.length).toBeGreaterThan(0);
  });

  it("identifies gaps when essential platforms are missing", () => {
    const result = marketingAgent.analyzeSocialPresence([]);
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.weaknesses.length).toBeGreaterThan(0);
  });
});

// ═══════════════ Goal Analysis ═══════════════

describe("analyzeGoals", () => {
  it("prioritizes goals and provides actionable objectives", () => {
    const result = marketingAgent.analyzeGoals(["more_reviews", "instagram_growth"]);
    expect(result.prioritized.length).toBe(2);
    expect(result.prioritized[0].priority).toBeGreaterThanOrEqual(result.prioritized[1].priority);
    expect(result.prioritized[0].actionableObjectives.length).toBeGreaterThan(0);
  });

  it("suggests additional goals", () => {
    const result = marketingAgent.analyzeGoals(["instagram_growth"]);
    expect(result.suggestedAdditional.length).toBeGreaterThan(0);
  });
});

// ═══════════════ revisePlan ═══════════════

describe("revisePlan", () => {
  it("regenerates plan with updated budget", () => {
    const plan = marketingAgent.generatePlan(makeProfile());
    const revised = marketingAgent.revisePlan(plan, { adjustBudget: 1000 });
    expect(revised.recommendations.length).toBeGreaterThan(0);
    expect(revised.businessProfile.monthlyBudget).toBe(1000);
  });

  it("removes rejected recommendations", () => {
    const plan = marketingAgent.generatePlan(makeProfile());
    const idToRemove = plan.recommendations[0].id;
    const revised = marketingAgent.revisePlan(plan, { removeIds: [idToRemove] });
    const revisedIds = revised.recommendations.map((r) => r.id);
    expect(revisedIds).not.toContain(idToRemove);
  });
});
