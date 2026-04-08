/**
 * AI Marketing Campaign Agent — Type Definitions
 *
 * All interfaces used by the marketing agent system.
 */

export interface BusinessProfile {
  businessId: string;
  name: string;
  type: string; // "Yoga Studio", "Coffee Shop", etc.
  size: "solo" | "small" | "medium" | "large";
  industry: string;
  location: string;
  currentRating: number | null; // Google rating
  reviewCount: number | null;
  socialPresence: { platform: string; followers: number; engagement: number }[];
  monthlyBudget: number | null; // how much they can spend on discounts per month
  memberCount: number | null; // for membership businesses
  averageTransactionValue: number | null;
  goals: string[]; // "more_reviews", "instagram_growth", "foot_traffic", "brand_awareness", "member_retention"
}

export interface CampaignRecommendation {
  id: string;
  name: string;
  description: string;
  type: "perk_program" | "one_time_campaign" | "seasonal" | "launch";
  priority: "critical" | "high" | "medium" | "low";

  // What to do
  platforms: { id: string; name: string; reason: string }[];
  actions: { id: string; label: string; platform: string; reason: string }[];

  // How much to offer
  suggestedTiers: {
    name: string;
    requiredActions: number;
    reward: { type: "percentage" | "dollar" | "cash_back" | "custom"; value: number; description: string };
    reason: string;
  }[];

  // Timing
  suggestedCycle: "weekly" | "biweekly" | "monthly" | "one_time";
  suggestedDuration: string; // "ongoing", "3 months", "seasonal"
  bestLaunchTime: string; // "immediately", "monday morning", "start of month"

  // Projections
  projectedResults: {
    monthlyPosts: number;
    monthlyReviews: number;
    estimatedReach: number;
    estimatedNewCustomers: number;
    estimatedROI: number; // multiplier, e.g., 3.5x
    costPerAcquisition: number;
  };

  // Reasoning
  reasoning: string; // detailed explanation of why this recommendation
  dataPoints: string[]; // specific facts that support the recommendation
  risks: string[]; // potential downsides

  confidence: number; // 0-1
}

export interface MarketingPlan {
  id: string;
  businessId: string;
  businessProfile: BusinessProfile;
  generatedAt: string;

  // The recommendations
  recommendations: CampaignRecommendation[];

  // Overall strategy
  strategy: {
    summary: string;
    primaryGoal: string;
    timeline: string;
    totalMonthlyBudget: number;
    expectedMonthlyROI: number;
    keyInsights: string[];
  };

  // Competitive analysis
  competitiveInsights: {
    averageRatingInArea: number;
    averageReviewCountInArea: number;
    topCompetitorStrengths: string[];
    yourAdvantages: string[];
    gapAnalysis: string;
  };

  // Implementation order
  implementationOrder: {
    phase: string;
    actions: string[];
    expectedOutcome: string;
  }[];

  // Legal compliance briefing
  legalBriefing: {
    incentivizableActions: string[];
    nonIncentivizableActions: string[];
    explanation: string;
    reviewStrategy: string;
  };
}

export interface BusinessTypeProfile {
  traits: string[];
  typicalCustomer: string;
  visitFrequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "once" | "rare" | "seasonal" | "recurring";
  avgTransactionValue: number;
  bestChannels: string[]; // platform IDs
  contentTypes: string[];
  marketingStrengths: string[];
  keyMetrics: string[];
  membershipBased: boolean;
  seasonalPeaks: string[];
}
