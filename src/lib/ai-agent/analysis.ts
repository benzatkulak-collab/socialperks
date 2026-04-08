/**
 * AI Marketing Campaign Agent — Business Analysis
 *
 * Functions that analyze a business's type, goals, competition,
 * social presence, and budget to inform campaign recommendations.
 */

import { detectTraits, type BusinessTraits } from "../ai-engine";
import type { BusinessProfile, BusinessTypeProfile } from "./types";
import { getBusinessTypeProfile } from "./business-profiles";
import { findPlatform, clamp } from "./helpers";

// ── Business Type Analysis ──

export function analyzeBusinessType(type: string): {
  profile: BusinessTypeProfile;
  traits: BusinessTraits;
  insights: string[];
} {
  const profile = getBusinessTypeProfile(type);
  const traits = detectTraits(type);

  const insights: string[] = [];

  if (traits.visual) insights.push(`${type} businesses thrive on visual content — Instagram Reels and TikTok should be primary channels`);
  if (traits.food) insights.push("Food businesses see 55% higher completion rates on social campaigns compared to average");
  if (traits.transform) insights.push("Before/after transformation content is the #1 performing format for this business type");
  if (traits.wellness) insights.push("Wellness businesses benefit from community-building campaigns that encourage recurring visits");
  if (traits.service) insights.push("Service businesses rely heavily on trust — reviews are 3x more impactful than social posts");
  if (traits.b2b) insights.push("B2B businesses get highest ROI from LinkedIn and professional endorsement campaigns");
  if (traits.retail) insights.push("Retail businesses see best results from Instagram Shopping integration and visual discovery");
  if (traits.healthcare) insights.push("Healthcare reviews are the #1 factor patients use when choosing a provider");
  if (traits.pets) insights.push("Pet content consistently outperforms all other content types on social media by 2-3x");
  if (traits.luxury) insights.push("Luxury businesses benefit from aspirational content that creates desire and exclusivity");
  if (traits.entertainment) insights.push("Entertainment businesses thrive on FOMO-driven content and group sharing");
  if (traits.automotive) insights.push("Auto service businesses live and die by reviews — trust is the #1 purchasing factor");
  if (traits.hospitality) insights.push("Hospitality businesses see highest impact from detailed photo reviews on Google and TripAdvisor");
  if (traits.education) insights.push("Education businesses benefit most from student success stories and transformation content");
  if (traits.seasonal) insights.push("This business has strong seasonal peaks — timing campaigns around them will maximize ROI");
  if (profile.membershipBased) insights.push("Membership-based businesses should focus on retention campaigns alongside acquisition");

  return { profile, traits, insights };
}

// ── Goal Analysis ──

export function analyzeGoals(goals: string[]): {
  prioritized: { goal: string; priority: number; actionableObjectives: string[] }[];
  suggestedAdditional: string[];
} {
  const goalDetails: Record<string, { priority: number; objectives: string[] }> = {
    more_reviews: {
      priority: 95,
      objectives: [
        "Launch Google Review campaign as foundation",
        "Add photo reviews for maximum SEO impact",
        "Expand to Facebook Recommendations for social proof",
        "Build Nextdoor presence for hyperlocal trust",
      ],
    },
    instagram_growth: {
      priority: 85,
      objectives: [
        "Start with Instagram Stories — lowest friction entry point",
        "Add Reels campaigns for maximum reach (2x static posts)",
        "Build carousel content for highest save rates",
        "Launch follow/engagement campaigns to build base",
      ],
    },
    foot_traffic: {
      priority: 90,
      objectives: [
        "Prioritize local discovery campaigns (Google, Nextdoor, Facebook)",
        "Launch check-in programs to create social proof",
        "Create referral program with in-person component",
        "Run seasonal promotions tied to local events",
      ],
    },
    brand_awareness: {
      priority: 80,
      objectives: [
        "Multi-platform content creation for widest reach",
        "TikTok campaigns for organic discovery",
        "Influencer collaboration for credibility",
        "Community group engagement for local awareness",
      ],
    },
    member_retention: {
      priority: 88,
      objectives: [
        "Ongoing perk program rewarding repeat engagement",
        "Community content series (member spotlights)",
        "Social accountability campaigns (check-ins, progress sharing)",
        "Exclusive member-only perks for social sharing",
      ],
    },
    tiktok_growth: {
      priority: 75,
      objectives: [
        "Video content campaigns targeting trending formats",
        "Duet and stitch campaigns for viral potential",
        "Hashtag challenge creation",
        "Regular posting incentive program",
      ],
    },
    increase_revenue: {
      priority: 92,
      objectives: [
        "Referral program to drive new customers",
        "Review campaigns to improve discovery ranking",
        "Social proof campaigns to increase conversion rates",
        "Upsell campaigns for existing customers",
      ],
    },
  };

  const prioritized = goals.map((goal) => {
    const details = goalDetails[goal] ?? { priority: 50, objectives: ["Build general marketing presence"] };
    return {
      goal,
      priority: details.priority,
      actionableObjectives: details.objectives,
    };
  }).sort((a, b) => b.priority - a.priority);

  // Suggest goals that are universally important and not already listed
  const universalGoals = ["more_reviews", "brand_awareness", "foot_traffic"];
  const suggestedAdditional = universalGoals.filter((g) => !goals.includes(g));

  return { prioritized, suggestedAdditional };
}

// ── Competitive Analysis ──

export function analyzeCompetition(type: string, _location: string): {
  averageRatingInArea: number;
  averageReviewCountInArea: number;
  topCompetitorStrengths: string[];
  yourAdvantages: string[];
  gapAnalysis: string;
} {
  const profile = getBusinessTypeProfile(type);
  const traits = detectTraits(type);

  // Simulated competitive data based on business type
  let avgRating = 4.2;
  let avgReviewCount = 85;

  if (traits.food) { avgRating = 4.1; avgReviewCount = 120; }
  if (traits.healthcare) { avgRating = 4.3; avgReviewCount = 65; }
  if (traits.wellness) { avgRating = 4.4; avgReviewCount = 55; }
  if (traits.service) { avgRating = 4.0; avgReviewCount = 45; }
  if (traits.entertainment) { avgRating = 4.1; avgReviewCount = 95; }
  if (traits.luxury) { avgRating = 4.5; avgReviewCount = 40; }
  if (traits.automotive) { avgRating = 3.9; avgReviewCount = 70; }

  const strengths: string[] = [];
  if (traits.food) strengths.push("Established delivery presence", "Loyalty programs", "Menu variety");
  if (traits.wellness) strengths.push("Online class offerings", "Wellness app integration", "Workshop programs");
  if (traits.service) strengths.push("Established referral networks", "Professional accreditations", "Online booking");
  if (traits.retail) strengths.push("E-commerce presence", "Loyalty programs", "Social media advertising");
  if (traits.healthcare) strengths.push("Insurance network presence", "Online scheduling", "Telehealth options");
  if (strengths.length === 0) strengths.push("Established presence", "Larger marketing budgets", "More reviews");

  const advantages = [
    "Social Perks gives you a systematic marketing advantage competitors lack",
    `Authentic customer-generated content outperforms paid ads for ${type} businesses`,
    "Early adoption of perk-based marketing creates a moat",
  ];

  if (profile.membershipBased) {
    advantages.push("Membership businesses can leverage existing community for powerful advocacy");
  }

  const gapAnalysis = traits.food
    ? "Most competitors rely on paid ads and delivery apps. Few have systematic review generation or authentic social content programs. Social Perks fills this gap by turning satisfied customers into marketers."
    : traits.wellness
      ? "Competitors focus on class scheduling and pricing. Few leverage authentic transformation stories or community content. Your customer outcomes are your best marketing — Social Perks unlocks that."
      : traits.service
        ? "Service businesses in your area mostly rely on word-of-mouth and basic websites. Systematic review generation and professional social proof are massively underused competitive advantages."
        : traits.healthcare
          ? "Healthcare providers in your area average fewer reviews than other industries. Patients heavily rely on reviews — a systematic program puts you ahead."
          : "Most competitors in your space rely on traditional marketing or sporadic social posts. A structured perk-for-marketing program creates systematic word-of-mouth that compounds over time.";

  return {
    averageRatingInArea: avgRating,
    averageReviewCountInArea: avgReviewCount,
    topCompetitorStrengths: strengths.slice(0, 3),
    yourAdvantages: advantages.slice(0, 3),
    gapAnalysis,
  };
}

// ── Social Presence Analysis ──

export function analyzeSocialPresence(socialPresence: BusinessProfile["socialPresence"]): {
  strengths: string[];
  weaknesses: string[];
  gaps: string[];
  recommendations: string[];
} {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const gaps: string[] = [];
  const recommendations: string[] = [];

  const presentPlatformIds = socialPresence.map((p) => p.platform);
  const essentialPlatforms = ["ig", "go", "fb"];
  const growthPlatforms = ["tt", "li", "pi"];

  // Identify present platforms
  for (const sp of socialPresence) {
    if (sp.followers > 5000) {
      strengths.push(`Strong presence on ${sp.platform} (${sp.followers.toLocaleString()} followers)`);
    } else if (sp.followers > 1000) {
      strengths.push(`Growing presence on ${sp.platform} (${sp.followers.toLocaleString()} followers)`);
    } else {
      weaknesses.push(`Small audience on ${sp.platform} (${sp.followers} followers) — room to grow`);
    }

    if (sp.engagement > 5) {
      strengths.push(`Excellent engagement rate on ${sp.platform} (${sp.engagement}%)`);
    } else if (sp.engagement < 2) {
      weaknesses.push(`Low engagement on ${sp.platform} (${sp.engagement}%) — content may not resonate`);
    }
  }

  // Identify missing essential platforms
  for (const pid of essentialPlatforms) {
    if (!presentPlatformIds.includes(pid)) {
      const platform = findPlatform(pid);
      if (platform) {
        gaps.push(`Not on ${platform.name} — an essential platform for local businesses`);
        recommendations.push(`Create a ${platform.name} presence to capture this audience`);
      }
    }
  }

  // Identify growth opportunities
  for (const pid of growthPlatforms) {
    if (!presentPlatformIds.includes(pid)) {
      const platform = findPlatform(pid);
      if (platform) {
        gaps.push(`Missing from ${platform.name} — a growing discovery channel`);
      }
    }
  }

  if (socialPresence.length === 0) {
    weaknesses.push("No social media presence detected — starting from scratch");
    recommendations.push("Start with Google Business Profile and Instagram as your foundation");
  }

  if (recommendations.length === 0) {
    recommendations.push("Continue building on your existing platforms while exploring new channels");
  }

  return { strengths, weaknesses, gaps, recommendations };
}

// ── Budget Analysis ──

export function analyzeBudget(
  budget: number | null,
  avgTransaction: number | null,
  memberCount: number | null
): {
  effectiveBudget: number;
  discountStrategy: string;
  maxDiscountPercent: number;
  maxDiscountDollar: number;
  tierRecommendation: string;
} {
  const effectiveBudget = budget ?? (avgTransaction ? avgTransaction * 20 : 300);
  const avgTx = avgTransaction ?? 30;

  // Never recommend more than 25% of transaction value
  const maxDiscountPercent = Math.min(25, Math.round((effectiveBudget / (avgTx * 30)) * 100));
  const maxDiscountDollar = Math.round(avgTx * 0.2);

  let discountStrategy: string;
  let tierRecommendation: string;

  if (memberCount && memberCount > 0) {
    // Membership businesses can offer smaller discounts more frequently
    discountStrategy = "Monthly membership perks with escalating rewards for consistent engagement";
    tierRecommendation = `With ${memberCount} members, offer small ongoing perks (5-10% off add-ons) for social activity, with larger monthly rewards (15-20% off next month) for top contributors`;
  } else if (avgTx > 100) {
    // High-ticket businesses: dollar discounts feel more impactful
    discountStrategy = "Dollar-value discounts on high-ticket services feel more impactful than percentages";
    tierRecommendation = `At $${avgTx} average transaction, offer $${Math.round(avgTx * 0.05)}-$${maxDiscountDollar} off based on effort level`;
  } else if (avgTx < 15) {
    // Low-ticket (coffee, bakery): percentage or flat small dollar
    discountStrategy = "Free add-ons or next-visit discounts work better than percentages at this price point";
    tierRecommendation = `At $${avgTx} average, offer free add-ons for simple actions and $${Math.max(2, Math.round(avgTx * 0.15))} off for higher-effort content`;
  } else {
    // Mid-range: percentage discounts feel generous
    discountStrategy = "Percentage-based discounts feel generous at this transaction level";
    tierRecommendation = `Offer 10% for quick actions, 15% for medium effort, 20% for high-effort campaigns`;
  }

  return {
    effectiveBudget,
    discountStrategy,
    maxDiscountPercent: clamp(maxDiscountPercent, 5, 25),
    maxDiscountDollar: Math.max(2, maxDiscountDollar),
    tierRecommendation,
  };
}
