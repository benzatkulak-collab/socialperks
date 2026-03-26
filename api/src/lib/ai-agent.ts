/**
 * AI Marketing Campaign Agent — BACKEND ONLY
 *
 * A sophisticated marketing agent that analyzes a business profile and
 * generates a complete, tailored marketing plan with campaign recommendations,
 * competitive insights, ROI projections, and phased implementation.
 *
 * This module is imported by API routes only.
 * The frontend calls /api/v1/ai/campaign-agent — it never runs this directly.
 */

import { PLATFORMS } from "./platforms";
import { detectTraits, type BusinessTraits } from "./ai-engine";
import { legalGuard, isActionIncentivizable } from "./legal-compliance";

// ═══════════════ Types ═══════════════

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

// ═══════════════ Helpers ═══════════════

const uid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

function findPlatform(id: string) {
  return PLATFORMS.find((p) => p.id === id);
}

function findAction(platformId: string, actionId: string) {
  const platform = findPlatform(platformId);
  if (!platform) return null;
  return platform.actions.find((a) => a.id === actionId) ?? null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ═══════════════ Business Type Profiles ═══════════════

interface BusinessTypeProfile {
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

const BUSINESS_TYPE_PROFILES: Record<string, BusinessTypeProfile> = {
  "yoga studio": {
    traits: ["visual", "wellness", "transform", "community"],
    typicalCustomer: "Health-conscious individuals aged 25-55 seeking mind-body wellness",
    visitFrequency: "weekly",
    avgTransactionValue: 25,
    bestChannels: ["ig", "tt", "go", "fb", "yt"],
    contentTypes: ["before/after transformations", "class previews", "instructor spotlights", "student progress", "mindfulness tips"],
    marketingStrengths: ["visual transformation content", "community building", "wellness lifestyle aspiration"],
    keyMetrics: ["class attendance", "membership retention", "new student signups"],
    membershipBased: true,
    seasonalPeaks: ["January (resolutions)", "March-April (spring reset)", "September (back to routine)"],
  },
  "coffee shop": {
    traits: ["food", "visual", "local", "community"],
    typicalCustomer: "Daily coffee drinkers, remote workers, students aged 18-45",
    visitFrequency: "daily",
    avgTransactionValue: 7,
    bestChannels: ["ig", "tt", "go", "fb", "gm"],
    contentTypes: ["latte art", "barista skills", "cozy atmosphere", "seasonal drinks", "food pairings"],
    marketingStrengths: ["high visit frequency", "photogenic products", "community gathering spot"],
    keyMetrics: ["daily transactions", "average ticket size", "repeat customer rate"],
    membershipBased: false,
    seasonalPeaks: ["Fall (PSL season)", "Winter (cozy drinks)", "Summer (iced drinks)"],
  },
  restaurant: {
    traits: ["food", "visual", "hospitality", "local"],
    typicalCustomer: "Diners looking for experiences, couples, families, food enthusiasts aged 25-60",
    visitFrequency: "biweekly",
    avgTransactionValue: 45,
    bestChannels: ["ig", "tt", "go", "yp", "fb", "gm"],
    contentTypes: ["food photography", "chef features", "behind-the-scenes", "taste reactions", "seasonal menus"],
    marketingStrengths: ["highly shareable food content", "review-driven discovery", "special occasion marketing"],
    keyMetrics: ["covers per night", "average check size", "review rating", "repeat visits"],
    membershipBased: false,
    seasonalPeaks: ["Valentine's Day", "Mother's Day", "Holiday season", "Summer patios"],
  },
  gym: {
    traits: ["wellness", "transform", "visual", "community"],
    typicalCustomer: "Fitness enthusiasts, transformation seekers aged 18-50",
    visitFrequency: "weekly",
    avgTransactionValue: 60,
    bestChannels: ["ig", "tt", "go", "yt", "fb"],
    contentTypes: ["transformation stories", "workout clips", "trainer spotlights", "community events", "progress updates"],
    marketingStrengths: ["dramatic visual transformations", "high engagement community", "goal-oriented content"],
    keyMetrics: ["membership count", "retention rate", "class attendance", "new signups"],
    membershipBased: true,
    seasonalPeaks: ["January (resolutions)", "March-May (summer prep)", "September (back to routine)"],
  },
  salon: {
    traits: ["visual", "transform", "luxury", "local"],
    typicalCustomer: "Style-conscious individuals, special occasion clients aged 20-60",
    visitFrequency: "monthly",
    avgTransactionValue: 75,
    bestChannels: ["ig", "tt", "go", "fb", "pi"],
    contentTypes: ["before/after reveals", "color transformations", "styling tutorials", "trend showcases", "client reveals"],
    marketingStrengths: ["dramatic transformations", "highly visual results", "aspirational content"],
    keyMetrics: ["booking rate", "average service value", "rebooking rate", "review rating"],
    membershipBased: false,
    seasonalPeaks: ["Prom season", "Wedding season", "Holiday parties", "Back to school"],
  },
  "tattoo parlor": {
    traits: ["visual", "transform", "art", "local"],
    typicalCustomer: "Art lovers, self-expression seekers aged 18-45",
    visitFrequency: "quarterly",
    avgTransactionValue: 200,
    bestChannels: ["ig", "tt", "go", "pi", "rd"],
    contentTypes: ["process videos", "finished pieces", "artist portfolios", "flash events", "healing progress"],
    marketingStrengths: ["unique visual content", "artist-driven following", "portfolio-based marketing"],
    keyMetrics: ["booking rate", "average piece value", "portfolio reach", "artist wait time"],
    membershipBased: false,
    seasonalPeaks: ["Friday the 13th flash sales", "Convention season", "Holiday gift certificates"],
  },
  "dental practice": {
    traits: ["healthcare", "service", "transform", "local"],
    typicalCustomer: "Families, professionals seeking routine and cosmetic care aged 25-65",
    visitFrequency: "quarterly",
    avgTransactionValue: 150,
    bestChannels: ["go", "fb", "gm", "ig", "nd"],
    contentTypes: ["smile transformations", "patient testimonials", "dental tips", "office tours", "team introductions"],
    marketingStrengths: ["trust-building through reviews", "before/after results", "community presence"],
    keyMetrics: ["new patient signups", "patient retention", "review rating", "case acceptance rate"],
    membershipBased: false,
    seasonalPeaks: ["Back to school", "New year (insurance reset)", "Spring cleaning"],
  },
  veterinarian: {
    traits: ["pets", "healthcare", "service", "local"],
    typicalCustomer: "Pet owners who treat their animals like family, aged 25-60",
    visitFrequency: "quarterly",
    avgTransactionValue: 120,
    bestChannels: ["ig", "fb", "go", "gm", "tt"],
    contentTypes: ["cute pet photos", "recovery stories", "pet health tips", "team with animals", "adoption events"],
    marketingStrengths: ["emotionally powerful pet content", "trust through care stories", "community events"],
    keyMetrics: ["new clients", "client retention", "review rating", "average visit value"],
    membershipBased: false,
    seasonalPeaks: ["Puppy season (spring)", "Holiday boarding", "Adopt a pet month"],
  },
  florist: {
    traits: ["visual", "retail", "seasonal", "local"],
    typicalCustomer: "Gift buyers, event planners, home decor enthusiasts aged 25-55",
    visitFrequency: "monthly",
    avgTransactionValue: 55,
    bestChannels: ["ig", "pi", "go", "fb", "tt"],
    contentTypes: ["arrangement showcases", "behind-the-scenes", "seasonal collections", "wedding features", "DIY tips"],
    marketingStrengths: ["extremely photogenic product", "occasion-driven purchases", "gift-giving shares"],
    keyMetrics: ["order volume", "average order value", "event bookings", "repeat customers"],
    membershipBased: false,
    seasonalPeaks: ["Valentine's Day", "Mother's Day", "Wedding season", "Holiday season"],
  },
  "auto mechanic": {
    traits: ["automotive", "service", "local"],
    typicalCustomer: "Vehicle owners seeking trustworthy service, all ages",
    visitFrequency: "quarterly",
    avgTransactionValue: 180,
    bestChannels: ["go", "gm", "fb", "nd", "yp"],
    contentTypes: ["repair explanations", "honest assessments", "before/after repairs", "maintenance tips", "team expertise"],
    marketingStrengths: ["trust-building reviews", "educational content", "neighborhood presence"],
    keyMetrics: ["new customers", "repeat rate", "average repair value", "review rating"],
    membershipBased: false,
    seasonalPeaks: ["Pre-winter prep", "Spring road trip season", "Back to school"],
  },
  "law firm": {
    traits: ["b2b", "service", "local"],
    typicalCustomer: "Individuals and businesses needing legal representation, aged 30-65",
    visitFrequency: "yearly",
    avgTransactionValue: 500,
    bestChannels: ["go", "li", "fb", "gm", "nd"],
    contentTypes: ["legal tips", "case study insights", "team credentials", "community involvement", "FAQ answers"],
    marketingStrengths: ["authority building", "trust through expertise", "professional network effects"],
    keyMetrics: ["new clients", "case volume", "referral rate", "review rating"],
    membershipBased: false,
    seasonalPeaks: ["Tax season", "New year (resolutions)", "Estate planning season"],
  },
  bakery: {
    traits: ["food", "visual", "retail", "local"],
    typicalCustomer: "Treat seekers, special occasion buyers, foodies aged 20-55",
    visitFrequency: "weekly",
    avgTransactionValue: 15,
    bestChannels: ["ig", "tt", "go", "fb", "pi"],
    contentTypes: ["baking process", "decorating reveals", "seasonal specials", "custom order showcases", "taste tests"],
    marketingStrengths: ["visually stunning products", "shareable content", "gift-driven purchases"],
    keyMetrics: ["daily sales", "custom order volume", "social shares", "repeat customers"],
    membershipBased: false,
    seasonalPeaks: ["Holiday season", "Valentine's Day", "Wedding season", "Back to school"],
  },
  "escape room": {
    traits: ["entertainment", "visual", "local"],
    typicalCustomer: "Friend groups, team builders, experience seekers aged 18-45",
    visitFrequency: "quarterly",
    avgTransactionValue: 35,
    bestChannels: ["ig", "tt", "go", "fb", "gm"],
    contentTypes: ["group reaction videos", "escape celebrations", "puzzle teases", "team building events", "behind-the-scenes"],
    marketingStrengths: ["group experience sharing", "FOMO-driven content", "corporate team building"],
    keyMetrics: ["bookings per week", "group size", "review rating", "rebooking rate"],
    membershipBased: false,
    seasonalPeaks: ["Team building season (Q1/Q3)", "Holiday parties", "Summer activities"],
  },
  "pizza chain": {
    traits: ["food", "visual", "local"],
    typicalCustomer: "Everyone — families, students, office workers, all ages",
    visitFrequency: "weekly",
    avgTransactionValue: 22,
    bestChannels: ["ig", "tt", "go", "fb", "gm", "yp"],
    contentTypes: ["pizza making", "cheese pulls", "taste tests", "delivery moments", "specials announcements"],
    marketingStrengths: ["universally loved product", "highly visual (cheese pulls!)", "frequent purchases"],
    keyMetrics: ["daily orders", "average order value", "delivery vs dine-in", "repeat rate"],
    membershipBased: false,
    seasonalPeaks: ["Super Bowl", "Friday nights year-round", "Back to school"],
  },
  spa: {
    traits: ["wellness", "luxury", "visual", "transform"],
    typicalCustomer: "Self-care seekers, gift recipients, stressed professionals aged 25-60",
    visitFrequency: "monthly",
    avgTransactionValue: 120,
    bestChannels: ["ig", "go", "fb", "pi", "tt"],
    contentTypes: ["relaxation environments", "treatment showcases", "before/after skin", "self-care tips", "gift packages"],
    marketingStrengths: ["aspirational lifestyle content", "gift-driven marketing", "visual relaxation"],
    keyMetrics: ["booking rate", "package sales", "gift card revenue", "retention rate"],
    membershipBased: true,
    seasonalPeaks: ["Valentine's Day", "Mother's Day", "Holiday gifting", "New year reset"],
  },
  boutique: {
    traits: ["retail", "visual", "luxury", "local"],
    typicalCustomer: "Fashion-forward shoppers seeking unique pieces, aged 20-50",
    visitFrequency: "biweekly",
    avgTransactionValue: 65,
    bestChannels: ["ig", "tt", "pi", "fb", "go"],
    contentTypes: ["styling tips", "new arrivals", "try-on hauls", "outfit of the day", "behind-the-scenes sourcing"],
    marketingStrengths: ["curated aesthetic", "influencer collaboration potential", "trend-driven content"],
    keyMetrics: ["foot traffic", "average sale", "online inquiries", "social followers"],
    membershipBased: false,
    seasonalPeaks: ["Fashion weeks", "Holiday shopping", "Spring collections", "Back to school"],
  },
  brewery: {
    traits: ["food", "visual", "entertainment", "local"],
    typicalCustomer: "Craft beer enthusiasts, social groups, foodies aged 21-50",
    visitFrequency: "biweekly",
    avgTransactionValue: 35,
    bestChannels: ["ig", "tt", "go", "fb", "yp"],
    contentTypes: ["brew process", "tasting flights", "new release announcements", "taproom vibes", "pairing suggestions"],
    marketingStrengths: ["passionate niche audience", "event marketing", "community culture"],
    keyMetrics: ["taproom visits", "average tab", "event attendance", "distribution growth"],
    membershipBased: false,
    seasonalPeaks: ["Oktoberfest", "Summer patios", "St. Patrick's Day", "Holiday releases"],
  },
  "real estate": {
    traits: ["b2b", "service", "visual", "local"],
    typicalCustomer: "Home buyers, sellers, investors aged 28-65",
    visitFrequency: "yearly",
    avgTransactionValue: 1000,
    bestChannels: ["ig", "fb", "go", "li", "yt"],
    contentTypes: ["listing tours", "market updates", "homebuyer tips", "just-sold celebrations", "neighborhood guides"],
    marketingStrengths: ["high-value transaction marketing", "visual property content", "referral-driven"],
    keyMetrics: ["listings", "closings", "referral rate", "average sale price"],
    membershipBased: false,
    seasonalPeaks: ["Spring market", "Back to school moves", "Year-end tax moves"],
  },
  roofer: {
    traits: ["visual", "service", "transform"],
    typicalCustomer: "Homeowners needing roof repair or replacement, aged 30-70",
    visitFrequency: "once",
    avgTransactionValue: 12000,
    bestChannels: ["go", "gm", "nd", "fb", "ig"],
    contentTypes: ["before_after_photos", "drone_footage", "video_testimonial", "detailed_review", "neighborhood_recommendation"],
    marketingStrengths: ["dramatic visual transformations", "high-value word-of-mouth", "neighborhood clustering effect"],
    keyMetrics: ["lead volume", "close rate", "average job value", "review rating"],
    membershipBased: false,
    seasonalPeaks: ["Spring", "Summer", "Fall"],
  },
  plumber: {
    traits: ["service"],
    typicalCustomer: "Homeowners and renters needing plumbing repair, all ages",
    visitFrequency: "rare",
    avgTransactionValue: 800,
    bestChannels: ["go", "gm", "nd", "fb"],
    contentTypes: ["before_after_photos", "video_testimonial", "review"],
    marketingStrengths: ["trust-critical service", "emergency search dominance", "neighborhood referral networks"],
    keyMetrics: ["call volume", "average job value", "review rating", "response time"],
    membershipBased: false,
    seasonalPeaks: ["Winter", "Spring"],
  },
  hvac: {
    traits: ["service"],
    typicalCustomer: "Homeowners needing heating/cooling service or installation, aged 30-70",
    visitFrequency: "seasonal",
    avgTransactionValue: 3000,
    bestChannels: ["go", "gm", "nd", "fb"],
    contentTypes: ["review", "video_testimonial", "before_after_photos"],
    marketingStrengths: ["seasonal demand spikes", "maintenance contract potential", "emergency search presence"],
    keyMetrics: ["service calls", "install jobs", "maintenance contracts", "review rating"],
    membershipBased: false,
    seasonalPeaks: ["Summer", "Winter"],
  },
  landscaper: {
    traits: ["visual", "service", "transform"],
    typicalCustomer: "Homeowners seeking lawn care, landscaping design, or hardscaping, aged 30-65",
    visitFrequency: "recurring",
    avgTransactionValue: 2500,
    bestChannels: ["ig", "go", "gm", "nd", "fb", "tt"],
    contentTypes: ["before_after_photos", "timelapse", "drone_footage", "seasonal_showcase"],
    marketingStrengths: ["highly visual transformations", "seasonal content calendar", "neighborhood visibility"],
    keyMetrics: ["recurring clients", "project value", "review rating", "referral rate"],
    membershipBased: false,
    seasonalPeaks: ["Spring", "Summer"],
  },
  electrician: {
    traits: ["service"],
    typicalCustomer: "Homeowners and businesses needing electrical work, all ages",
    visitFrequency: "rare",
    avgTransactionValue: 1500,
    bestChannels: ["go", "gm", "nd", "fb"],
    contentTypes: ["review", "before_after_photos"],
    marketingStrengths: ["trust-critical service", "project-based referrals", "safety expertise content"],
    keyMetrics: ["job volume", "average project value", "review rating", "referral rate"],
    membershipBased: false,
    seasonalPeaks: ["Spring", "Fall"],
  },
  "general contractor": {
    traits: ["visual", "service", "transform"],
    typicalCustomer: "Homeowners planning major renovations or new construction, aged 30-65",
    visitFrequency: "once",
    avgTransactionValue: 50000,
    bestChannels: ["ig", "go", "gm", "fb", "yt", "pi"],
    contentTypes: ["before_after_photos", "project_timelapse", "video_walkthrough", "detailed_review", "drone_footage"],
    marketingStrengths: ["portfolio-driven sales", "dramatic transformation content", "high-value referrals"],
    keyMetrics: ["project pipeline", "average project value", "review rating", "portfolio reach"],
    membershipBased: false,
    seasonalPeaks: ["Spring", "Summer", "Fall"],
  },
  painter: {
    traits: ["visual", "service", "transform"],
    typicalCustomer: "Homeowners seeking interior or exterior painting, aged 25-65",
    visitFrequency: "rare",
    avgTransactionValue: 4000,
    bestChannels: ["ig", "go", "gm", "nd", "fb", "pi"],
    contentTypes: ["before_after_photos", "color_reveal", "timelapse", "review"],
    marketingStrengths: ["highly visual color transformations", "aspirational home content", "neighborhood word-of-mouth"],
    keyMetrics: ["jobs per month", "average project value", "review rating", "referral rate"],
    membershipBased: false,
    seasonalPeaks: ["Spring", "Summer"],
  },
};

function getBusinessTypeProfile(type: string): BusinessTypeProfile {
  const lower = type.toLowerCase();

  // Direct match
  if (BUSINESS_TYPE_PROFILES[lower]) return BUSINESS_TYPE_PROFILES[lower];

  // Partial match
  for (const [key, profile] of Object.entries(BUSINESS_TYPE_PROFILES)) {
    if (lower.includes(key) || key.includes(lower)) return profile;
  }

  // Trait-based fallback
  const traits = detectTraits(type);
  const bestChannels: string[] = ["go", "ig", "fb"];
  if (traits.visual) bestChannels.push("tt", "pi");
  if (traits.food) bestChannels.push("tt", "yp");
  if (traits.b2b) bestChannels.push("li");
  if (traits.entertainment) bestChannels.push("tt");
  if (traits.pets) bestChannels.push("tt");

  return {
    traits: Object.entries(traits).filter(([, v]) => v === true).map(([k]) => k),
    typicalCustomer: "Local customers in the area seeking quality service",
    visitFrequency: traits.food ? "weekly" : traits.service ? "quarterly" : "monthly",
    avgTransactionValue: traits.luxury ? 100 : traits.food ? 20 : traits.service ? 80 : 40,
    bestChannels: [...new Set(bestChannels)].slice(0, 5),
    contentTypes: ["customer experiences", "behind-the-scenes", "product/service showcases", "team highlights", "customer testimonials"],
    marketingStrengths: ["local presence", "customer relationships", "authentic content"],
    keyMetrics: ["new customers", "repeat rate", "review rating", "revenue growth"],
    membershipBased: false,
    seasonalPeaks: ["Holiday season", "New year", "Summer"],
  };
}

// ═══════════════ Marketing Agent Class ═══════════════

class MarketingAgent {
  // ── Business Analysis ──

  analyzeBusinessType(type: string): {
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

  analyzeGoals(goals: string[]): {
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

  analyzeCompetition(type: string, _location: string): {
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

  analyzeSocialPresence(socialPresence: BusinessProfile["socialPresence"]): {
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

  analyzeBudget(
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

  // ── Recommendation Engine ──

  generateRecommendations(profile: BusinessProfile): CampaignRecommendation[] {
    const { profile: typeProfile, traits, insights } = this.analyzeBusinessType(profile.type);
    const goalAnalysis = this.analyzeGoals(profile.goals);
    const budgetAnalysis = this.analyzeBudget(
      profile.monthlyBudget,
      profile.averageTransactionValue,
      profile.memberCount
    );
    const socialAnalysis = this.analyzeSocialPresence(profile.socialPresence);

    const recommendations: CampaignRecommendation[] = [];
    const avgTx = profile.averageTransactionValue ?? typeProfile.avgTransactionValue;

    // Helper to build a recommendation
    const addRecommendation = (params: {
      name: string;
      description: string;
      type: CampaignRecommendation["type"];
      priority: CampaignRecommendation["priority"];
      platformIds: string[];
      actionSpecs: { id: string; reason: string }[];
      tiers: CampaignRecommendation["suggestedTiers"];
      cycle: CampaignRecommendation["suggestedCycle"];
      duration: string;
      launchTime: string;
      reasoning: string;
      dataPoints: string[];
      risks: string[];
      confidence: number;
      monthlyPosts: number;
      monthlyReviews: number;
      reachMultiplier: number;
    }) => {
      const platforms = params.platformIds.map((pid) => {
        const p = findPlatform(pid);
        const channelIndex = typeProfile.bestChannels.indexOf(pid);
        const reason = channelIndex >= 0
          ? `#${channelIndex + 1} recommended channel for ${profile.type} businesses`
          : `Extends reach to ${p?.name ?? pid} audience`;
        return { id: pid, name: p?.name ?? pid, reason };
      });

      const actions = params.actionSpecs.map((spec) => {
        const prefix = spec.id.split("_")[0];
        const p = findPlatform(prefix);
        const a = p ? findAction(prefix, spec.id) : null;
        return {
          id: spec.id,
          label: a?.label ?? spec.id,
          platform: p?.name ?? prefix,
          reason: spec.reason,
        };
      });

      // ROI calculation
      const totalActionValue = params.actionSpecs.reduce((sum, spec) => {
        const prefix = spec.id.split("_")[0];
        const a = findAction(prefix, spec.id);
        return sum + (a?.value ?? 2);
      }, 0);

      const monthlyDiscountCost = params.tiers.reduce((sum, tier) => {
        const rewardValue = tier.reward.type === "percentage" ? (avgTx * tier.reward.value / 100) : tier.reward.value;
        const estimatedRedemptions = Math.max(2, Math.round(15 / tier.requiredActions));
        return sum + rewardValue * estimatedRedemptions;
      }, 0);

      const estimatedReach = Math.round(totalActionValue * params.reachMultiplier * 100);
      const estimatedNewCustomers = Math.max(2, Math.round(estimatedReach * 0.012));
      const estimatedROI = monthlyDiscountCost > 0
        ? Math.round((estimatedNewCustomers * avgTx) / monthlyDiscountCost * 10) / 10
        : 3.0;
      const costPerAcquisition = estimatedNewCustomers > 0
        ? Math.round(monthlyDiscountCost / estimatedNewCustomers * 100) / 100
        : 0;

      recommendations.push({
        id: uid(),
        name: params.name,
        description: params.description,
        type: params.type,
        priority: params.priority,
        platforms,
        actions,
        suggestedTiers: params.tiers,
        suggestedCycle: params.cycle,
        suggestedDuration: params.duration,
        bestLaunchTime: params.launchTime,
        projectedResults: {
          monthlyPosts: params.monthlyPosts,
          monthlyReviews: params.monthlyReviews,
          estimatedReach,
          estimatedNewCustomers,
          estimatedROI: Math.max(1.2, estimatedROI),
          costPerAcquisition: Math.max(1, costPerAcquisition),
        },
        reasoning: params.reasoning,
        dataPoints: params.dataPoints,
        risks: params.risks,
        confidence: clamp(params.confidence, 0, 1),
      });
    };

    // ── 1. REVIEW & SOCIAL PROOF FOUNDATION (always #1 for local businesses) ──
    // LEGAL COMPLIANCE: Never include non-incentivizable review actions (Google, Yelp, TripAdvisor reviews).
    // Instead, recommend incentivizable alternatives: photos, Q&A, Facebook Recommendations, social content.
    const hasReviewGoal = profile.goals.includes("more_reviews") || profile.goals.includes("foot_traffic");
    const lowReviews = (profile.reviewCount ?? 0) < 50;
    const lowRating = (profile.currentRating ?? 0) < 4.2;

    if (hasReviewGoal || lowReviews || lowRating || recommendations.length === 0) {
      const reviewPlatforms = ["go"];
      const reviewActions: { id: string; reason: string }[] = [
        { id: "go_ph", reason: "Google Photos uploads improve your listing visibility and SEO without violating review policies" },
        { id: "go_qa", reason: "Answering Google Q&A boosts your listing engagement and local search ranking" },
      ];

      if (traits.food) {
        reviewPlatforms.push("yp");
        // Yelp prohibits incentivized reviews — only include safe Yelp actions
        reviewActions.push({ id: "yp_ph", reason: "Yelp photos increase business page engagement (Yelp prohibits incentivized reviews)" });
        reviewActions.push({ id: "yp_ci", reason: "Yelp check-ins build social proof without violating review policies" });
      }
      if (traits.hospitality) {
        // TripAdvisor prohibits incentivized reviews — recommend social content instead
        reviewActions.push({ id: "ig_rl", reason: "Instagram Reels of the experience drive discovery better than incentivized TripAdvisor reviews (which are prohibited)" });
      }

      reviewPlatforms.push("fb");
      reviewActions.push({ id: "fb_rc", reason: "Facebook Recommendations are legally incentivizable with disclosure and appear when friends search for similar businesses" });

      // Add Google Maps safe actions
      reviewPlatforms.push("gm");
      reviewActions.push({ id: "gm_ph", reason: "Google Maps photo uploads improve your Maps listing without violating review policies" });

      addRecommendation({
        name: "Social Proof & Discovery Engine",
        description: `Build your online presence through incentivized photo uploads, check-ins, and Facebook Recommendations for ${profile.type} businesses. Reviews on Google/Yelp/TripAdvisor are requested separately (not incentivized) after customers complete their social actions.`,
        type: "perk_program",
        priority: "critical",
        platformIds: reviewPlatforms,
        actionSpecs: reviewActions,
        tiers: [
          {
            name: "Quick Review",
            requiredActions: 1,
            reward: avgTx > 100
              ? { type: "dollar", value: Math.round(avgTx * 0.05), description: `$${Math.round(avgTx * 0.05)} off your next visit` }
              : { type: "percentage", value: 10, description: "10% off your next visit" },
            reason: "Low barrier gets volume",
          },
          {
            name: "Detailed Review + Photos",
            requiredActions: 2,
            reward: avgTx > 100
              ? { type: "dollar", value: Math.round(avgTx * 0.1), description: `$${Math.round(avgTx * 0.1)} off your next visit` }
              : { type: "percentage", value: 15, description: "15% off your next visit" },
            reason: "Photo reviews drive significantly more engagement",
          },
          {
            name: "Multi-Platform Reviewer",
            requiredActions: 3,
            reward: avgTx > 100
              ? { type: "dollar", value: Math.round(avgTx * 0.15), description: `$${Math.round(avgTx * 0.15)} off` }
              : { type: "percentage", value: 20, description: "20% off your next visit" },
            reason: "Presence on multiple review platforms compounds trust",
          },
        ],
        cycle: "monthly",
        duration: "ongoing",
        launchTime: "immediately",
        reasoning: `Social proof is the single most important marketing asset for a ${profile.type}. ${lowReviews ? `With only ${profile.reviewCount ?? 0} reviews, you are behind the area average of ${this.analyzeCompetition(profile.type, profile.location).averageReviewCountInArea}.` : "Maintaining a steady stream of social proof keeps you competitive."} Important: Google, Yelp, and TripAdvisor prohibit incentivized reviews. Instead, this program incentivizes photo uploads, check-ins, and Facebook Recommendations. After customers complete these actions, separately ask for Google/Yelp reviews without tying to any reward — customers who just posted about you are more likely to also leave a review.`,
        dataPoints: [
          "93% of consumers read reviews before visiting a local business",
          "Businesses with 50+ reviews earn 266% more leads",
          "Google/Yelp photo uploads improve listing visibility by 35%",
          `The average ${profile.type.toLowerCase()} in your area has ${this.analyzeCompetition(profile.type, profile.location).averageReviewCountInArea} reviews`,
          "Customers who post about a business on social media are 3x more likely to leave organic reviews",
        ],
        risks: [
          "Review velocity that seems unnatural can trigger platform flags",
          "Negative reviews are possible — respond professionally to build trust",
          "Never tie rewards directly to reviews on Google, Yelp, or TripAdvisor — this violates their TOS",
        ],
        confidence: 0.95,
        monthlyPosts: 0,
        monthlyReviews: Math.round(12 * (typeProfile.visitFrequency === "daily" ? 2 : 1)),
        reachMultiplier: 8,
      });
    }

    // ── 2. INSTAGRAM CONTENT MACHINE ──
    const hasInstagramGoal = profile.goals.includes("instagram_growth") || profile.goals.includes("brand_awareness");
    const isVisual = traits.visual || traits.food || traits.transform;

    if (hasInstagramGoal || isVisual || recommendations.length < 2) {
      const igActions: { id: string; reason: string }[] = [
        { id: "ig_st", reason: "Stories have the lowest friction — most customers will do this willingly" },
      ];

      if (traits.visual || traits.food) {
        igActions.push({ id: "ig_rl", reason: "Reels get 2x the reach of static posts — essential for discovery" });
      }
      if (traits.transform) {
        igActions.push({ id: "ig_fc", reason: "Carousels are perfect for before/after transformations, the #1 format for your industry" });
      } else {
        igActions.push({ id: "ig_fp", reason: "Feed posts create permanent, searchable content on your profile" });
      }

      igActions.push({ id: "ig_cm", reason: "Comments boost algorithm visibility — more valuable than likes" });

      const contentIdeas = traits.transform
        ? "before/after transformations, class previews, instructor spotlights"
        : traits.food
          ? "food photography, preparation videos, seasonal specials"
          : traits.visual
            ? "product showcases, behind-the-scenes, customer spotlights"
            : "customer experiences, team spotlights, service highlights";

      addRecommendation({
        name: `Instagram Content Engine`,
        description: `Turn every customer visit into Instagram content. Focus on ${contentIdeas}.`,
        type: "perk_program",
        priority: hasInstagramGoal ? "critical" : "high",
        platformIds: ["ig"],
        actionSpecs: igActions,
        tiers: [
          {
            name: "Story Sharer",
            requiredActions: 1,
            reward: avgTx > 100
              ? { type: "dollar", value: Math.round(avgTx * 0.03), description: `$${Math.round(avgTx * 0.03)} off` }
              : { type: "percentage", value: 5, description: "5% off your next visit" },
            reason: "Low effort for customers, consistent content for you",
          },
          {
            name: "Content Creator",
            requiredActions: 2,
            reward: avgTx > 100
              ? { type: "dollar", value: Math.round(avgTx * 0.08), description: `$${Math.round(avgTx * 0.08)} off` }
              : { type: "percentage", value: 10, description: "10% off your next visit" },
            reason: "Feed posts and Reels drive discovery by new audiences",
          },
          {
            name: "Brand Ambassador",
            requiredActions: 3,
            reward: avgTx > 100
              ? { type: "dollar", value: Math.round(avgTx * 0.12), description: `$${Math.round(avgTx * 0.12)} off` }
              : { type: "percentage", value: 15, description: "15% off your next visit" },
            reason: "Multiple content pieces create compounding reach over time",
          },
        ],
        cycle: typeProfile.visitFrequency === "daily" ? "weekly" : typeProfile.visitFrequency === "weekly" ? "biweekly" : "monthly",
        duration: "ongoing",
        launchTime: "monday morning",
        reasoning: `Instagram is ${typeProfile.bestChannels.includes("ig") ? "the top recommended" : "an important"} marketing channel for ${profile.type} businesses. ${traits.visual ? "Your business is highly visual — every customer interaction is a content opportunity." : "Authentic customer content outperforms polished brand posts."} ${socialAnalysis.gaps.some(g => g.includes("Instagram")) ? "You currently don't have an Instagram presence — this campaign helps build one organically." : "This campaign turns your existing Instagram presence into a content engine."}`,
        dataPoints: [
          "Instagram Reels reach 2x more non-followers than feed posts",
          "User-generated content receives 4x higher engagement than brand content",
          `${profile.type} businesses on Instagram see 30-40% more foot traffic`,
          "Stories have 85%+ view rates from followers",
        ],
        risks: [
          "Content quality varies — but authentic content outperforms polished",
          "Requires monitoring for brand-inappropriate content",
        ],
        confidence: traits.visual ? 0.92 : 0.82,
        monthlyPosts: Math.round(15 * (typeProfile.visitFrequency === "daily" ? 2.5 : 1)),
        monthlyReviews: 0,
        reachMultiplier: 12,
      });
    }

    // ── 3. TIKTOK / SHORT-FORM VIDEO ──
    const hasTikTokGrowth = profile.goals.includes("brand_awareness") || profile.goals.includes("tiktok_growth");
    const tikTokRelevant = traits.food || traits.visual || traits.transform || traits.entertainment || traits.pets;

    if (hasTikTokGrowth || tikTokRelevant) {
      const ttActions: { id: string; reason: string }[] = [
        { id: "tt_vd", reason: "Original TikTok videos have the highest organic reach potential of any platform" },
      ];

      if (traits.food) {
        ttActions.push({ id: "tt_rv", reason: "Food reaction videos are TikTok's most shareable format" });
      } else {
        ttActions.push({ id: "tt_du", reason: "Duets with your content let customers add their authentic reaction" });
      }

      ttActions.push({ id: "tt_fo", reason: "Build your TikTok following for compounding reach" });

      const tiktokContent = traits.food
        ? "taste reactions, cooking behind-the-scenes, dish reveals"
        : traits.transform
          ? "transformation reveals, time-lapse results, process videos"
          : traits.entertainment
            ? "experience highlights, group reactions, behind-the-scenes"
            : traits.pets
              ? "cute animal moments, pet reactions, heartwarming recoveries"
              : "customer experiences, day-in-the-life, authentic moments";

      addRecommendation({
        name: "TikTok Discovery Campaign",
        description: `Tap into TikTok's massive organic reach with ${tiktokContent}. One video can bring hundreds of new customers.`,
        type: "perk_program",
        priority: hasTikTokGrowth ? "high" : "medium",
        platformIds: ["tt"],
        actionSpecs: ttActions,
        tiers: [
          {
            name: "TikTok Creator",
            requiredActions: 1,
            reward: avgTx > 100
              ? { type: "dollar", value: Math.round(avgTx * 0.08), description: `$${Math.round(avgTx * 0.08)} off` }
              : { type: "percentage", value: 15, description: "15% off your next visit" },
            reason: "TikTok videos require more effort — reward accordingly",
          },
          {
            name: "Viral Creator",
            requiredActions: 2,
            reward: avgTx > 100
              ? { type: "dollar", value: Math.round(avgTx * 0.15), description: `$${Math.round(avgTx * 0.15)} off` }
              : { type: "percentage", value: 20, description: "20% off your next visit" },
            reason: "Multiple TikTok videos multiply your chances of one going viral",
          },
        ],
        cycle: "monthly",
        duration: "ongoing",
        launchTime: "immediately",
        reasoning: `TikTok has the highest organic reach of any social platform. For ${profile.type} businesses, ${tiktokContent} consistently perform well. ${traits.food ? "Food content is the #1 category on TikTok — your business type has a built-in advantage." : traits.pets ? "Pet content goes viral faster than any other category on TikTok." : "Authentic local business content resonates strongly with the TikTok audience."} Even a modest following can produce breakthrough viral moments.`,
        dataPoints: [
          "TikTok has the highest organic reach of any social platform",
          "Local business content on TikTok has a 3-5% engagement rate vs 0.5% on other platforms",
          `${traits.food ? "Food" : traits.pets ? "Pet" : "Local business"} content is among the top-performing categories on TikTok`,
          "67% of TikTok users say they discovered new businesses through the app",
        ],
        risks: [
          "Video content requires more effort from customers — expect lower completion rates",
          "Content is unpredictable — viral potential comes with less control over messaging",
        ],
        confidence: tikTokRelevant ? 0.85 : 0.7,
        monthlyPosts: Math.round(6 * (tikTokRelevant ? 1.5 : 1)),
        monthlyReviews: 0,
        reachMultiplier: 20,
      });
    }

    // ── 4. REFERRAL & FOOT TRAFFIC PROGRAM ──
    const hasFootTrafficGoal = profile.goals.includes("foot_traffic") || profile.goals.includes("increase_revenue");

    if (hasFootTrafficGoal || recommendations.length < 3) {
      addRecommendation({
        name: "Referral Growth Engine",
        description: `Turn your happiest customers into your sales team. Every referral brings a pre-sold customer who trusts your business before they walk in.`,
        type: "perk_program",
        priority: hasFootTrafficGoal ? "high" : "medium",
        platformIds: ["rf", "fb", "wa"],
        actionSpecs: [
          { id: "rf_fr", reason: "Friend referrals have the highest lifetime value of any acquisition channel" },
          { id: "rf_ip", reason: "In-person referrals (bringing a friend) have the highest conversion rate" },
          { id: "rf_gc", reason: "Group chat recommendations feel personal and reach engaged networks" },
          { id: "fb_tg", reason: "Facebook tags create notifications that drive discovery" },
        ],
        tiers: [
          {
            name: "Social Sharer",
            requiredActions: 1,
            reward: avgTx > 100
              ? { type: "dollar", value: Math.round(avgTx * 0.05), description: `$${Math.round(avgTx * 0.05)} off for you` }
              : { type: "percentage", value: 10, description: "10% off for you" },
            reason: "Easy sharing action gets your name in front of friends",
          },
          {
            name: "Friend Referrer",
            requiredActions: 2,
            reward: avgTx > 100
              ? { type: "dollar", value: Math.round(avgTx * 0.12), description: `$${Math.round(avgTx * 0.12)} off for you and your friend` }
              : { type: "percentage", value: 15, description: "15% off for you and your friend" },
            reason: "Both-earn referrals create accountability and urgency",
          },
          {
            name: "Community Builder",
            requiredActions: 3,
            reward: avgTx > 100
              ? { type: "dollar", value: Math.round(avgTx * 0.2), description: `$${Math.round(avgTx * 0.2)} off your next purchase` }
              : { type: "percentage", value: 20, description: "20% off your next visit" },
            reason: "Top referrers are your most valuable customers — reward generously",
          },
        ],
        cycle: "monthly",
        duration: "ongoing",
        launchTime: "start of month",
        reasoning: `Referrals are the highest-ROI customer acquisition channel for ${profile.type} businesses. Referred customers come pre-sold — they trust the recommendation. ${profile.memberCount ? `With ${profile.memberCount} members, you have a built-in referral army.` : "Your satisfied customers are the best marketing channel you have."} The dual reward structure (both referrer and friend get perks) creates urgency and accountability.`,
        dataPoints: [
          "Referred customers have 16% higher lifetime value than other customers",
          "Referral programs have the lowest cost per acquisition of any channel",
          "Word-of-mouth drives 20-50% of purchasing decisions",
          `${profile.type} customers trust personal recommendations 12x more than advertising`,
        ],
        risks: [
          "Referral fraud (people referring themselves) — verify with unique codes",
          "Takes time to build momentum — not an overnight fix",
        ],
        confidence: 0.88,
        monthlyPosts: 0,
        monthlyReviews: 0,
        reachMultiplier: 6,
      });
    }

    // ── 5. LOCAL DISCOVERY CAMPAIGN ──
    const hasLocalGoal = profile.goals.includes("foot_traffic") || profile.goals.includes("brand_awareness");

    if (hasLocalGoal || recommendations.length < 4) {
      const localPlatforms = ["gm", "nd", "fb"];
      const localActions: { id: string; reason: string }[] = [
        { id: "gm_rv", reason: "Google Maps reviews directly drive local discovery and foot traffic" },
        { id: "gm_ph", reason: "Photos on Google Maps increase click-through rates significantly" },
        { id: "nd_rc", reason: "Nextdoor recommendations reach your actual neighbors — hyperlocal trust" },
        { id: "fb_ci", reason: "Facebook check-ins create social proof in friends' feeds" },
      ];

      addRecommendation({
        name: "Local Discovery Booster",
        description: `Dominate local search results and neighborhood recommendations. Make sure anyone searching for a ${profile.type.toLowerCase()} in ${profile.location} finds you first.`,
        type: "perk_program",
        priority: hasLocalGoal ? "high" : "medium",
        platformIds: localPlatforms,
        actionSpecs: localActions,
        tiers: [
          {
            name: "Local Advocate",
            requiredActions: 1,
            reward: avgTx > 100
              ? { type: "dollar", value: Math.round(avgTx * 0.05), description: `$${Math.round(avgTx * 0.05)} off` }
              : { type: "percentage", value: 10, description: "10% off your next visit" },
            reason: "Single local action — easy for any customer",
          },
          {
            name: "Neighborhood Champion",
            requiredActions: 3,
            reward: avgTx > 100
              ? { type: "dollar", value: Math.round(avgTx * 0.12), description: `$${Math.round(avgTx * 0.12)} off` }
              : { type: "percentage", value: 15, description: "15% off your next visit" },
            reason: "Multi-platform local presence compounds your visibility",
          },
        ],
        cycle: "monthly",
        duration: "ongoing",
        launchTime: "immediately",
        reasoning: `Local discovery is the lifeblood of a ${profile.type}. When someone in ${profile.location} searches for "${profile.type.toLowerCase()} near me", your Google Maps reviews, Nextdoor recommendations, and Facebook presence determine if they choose you or a competitor. This campaign systematically builds your local digital presence.`,
        dataPoints: [
          "46% of Google searches have local intent",
          "88% of local mobile searches result in a visit within 24 hours",
          "Nextdoor recommendations are seen by verified neighbors within a mile radius",
          "Facebook check-ins generate an average of 3 impressions per friend connection",
        ],
        risks: [
          "Local campaigns build slowly — results compound over months, not days",
        ],
        confidence: 0.9,
        monthlyPosts: 5,
        monthlyReviews: 8,
        reachMultiplier: 7,
      });
    }

    // ── 6. BUSINESS-TYPE-SPECIFIC CAMPAIGN ──
    if (traits.transform && !recommendations.some(r => r.name.includes("Transformation"))) {
      addRecommendation({
        name: "Transformation Showcase",
        description: `Harness the power of before/after content. ${traits.wellness ? "Student/client progress stories" : "Visual transformations"} are the most compelling marketing format for ${profile.type} businesses.`,
        type: "one_time_campaign",
        priority: "high",
        platformIds: ["ig", "tt", "yt"],
        actionSpecs: [
          { id: "ig_rl", reason: "Reels are the perfect format for dramatic visual reveals" },
          { id: "ig_fc", reason: "Carousels let customers show the full journey in multiple slides" },
          { id: "tt_vd", reason: "TikTok transformation videos have the highest viral potential" },
        ],
        tiers: [
          {
            name: "Progress Post",
            requiredActions: 1,
            reward: { type: "percentage", value: 15, description: "15% off your next session" },
            reason: "Encourage any kind of visual sharing of results",
          },
          {
            name: "Full Transformation Story",
            requiredActions: 2,
            reward: { type: "percentage", value: 25, description: "25% off your next session" },
            reason: "Multi-part transformation content is premium marketing value",
          },
        ],
        cycle: "monthly",
        duration: "3 months",
        launchTime: "start of month",
        reasoning: `Before/after content is the #1 performing format for ${profile.type} businesses. It combines social proof, emotional storytelling, and visual impact. ${traits.wellness ? "Wellness transformations inspire others to start their journey — every piece of content is a potential new customer." : "Visual transformations stop the scroll and drive shares."} This campaign format consistently outperforms all other content types.`,
        dataPoints: [
          "Before/after content receives 3-5x more engagement than standard posts",
          "Transformation stories drive 40% higher share rates",
          `${profile.type} businesses using transformation content see 2x new customer inquiries`,
        ],
        risks: [
          "Requires customer consent — always get permission before featuring transformations",
          "Results vary — set expectations about natural variations",
        ],
        confidence: 0.91,
        monthlyPosts: 8,
        monthlyReviews: 0,
        reachMultiplier: 18,
      });
    }

    if (traits.food && !recommendations.some(r => r.name.includes("TikTok"))) {
      addRecommendation({
        name: "Food Content Blitz",
        description: `Food content is the king of social media. Leverage taste tests, preparation videos, and plating reveals across Instagram and TikTok.`,
        type: "perk_program",
        priority: "high",
        platformIds: ["ig", "tt"],
        actionSpecs: [
          { id: "ig_rl", reason: "Food Reels get the highest engagement of any content type on Instagram" },
          { id: "tt_rv", reason: "Taste test videos are the most shared food content on TikTok" },
          { id: "ig_st", reason: "Quick Stories of the meal create consistent daily content" },
        ],
        tiers: [
          {
            name: "Quick Shot",
            requiredActions: 1,
            reward: avgTx < 15
              ? { type: "custom", value: 0, description: "Free drink or side with next order" }
              : { type: "percentage", value: 10, description: "10% off your next order" },
            reason: "Low effort — a photo while eating",
          },
          {
            name: "Content Creator",
            requiredActions: 2,
            reward: avgTx < 15
              ? { type: "custom", value: 0, description: "Free entree upgrade" }
              : { type: "percentage", value: 15, description: "15% off your next order" },
            reason: "Videos drive significantly more reach than photos",
          },
        ],
        cycle: "weekly",
        duration: "ongoing",
        launchTime: "immediately",
        reasoning: `Food content dominates social media engagement. ${profile.type} businesses have a natural advantage — every meal is a content opportunity. Customers are already photographing their food; this campaign channels that behavior into structured marketing with consistent reach.`,
        dataPoints: [
          "Food is the #1 content category on Instagram and TikTok",
          "82% of diners photograph their meals before eating",
          "Food content on TikTok averages 5% engagement rate vs 2% for other categories",
        ],
        risks: [
          "Quality varies with phone cameras and lighting — consider table lighting",
        ],
        confidence: 0.93,
        monthlyPosts: 20,
        monthlyReviews: 0,
        reachMultiplier: 15,
      });
    }

    if (traits.b2b && !recommendations.some(r => r.name.includes("LinkedIn"))) {
      addRecommendation({
        name: "Professional Authority Builder",
        description: `Build professional credibility through LinkedIn endorsements, detailed Google reviews, and thought leadership content.`,
        type: "perk_program",
        priority: "high",
        platformIds: ["li", "go"],
        actionSpecs: [
          { id: "li_po", reason: "LinkedIn posts from clients carry the highest B2B credibility" },
          { id: "li_ar", reason: "LinkedIn articles establish thought leadership and domain expertise" },
          { id: "go_rd", reason: "Detailed Google reviews are essential for professional service discovery" },
        ],
        tiers: [
          {
            name: "Endorser",
            requiredActions: 1,
            reward: { type: "percentage", value: 10, description: "10% off your next engagement" },
            reason: "Single LinkedIn or Google action builds your professional presence",
          },
          {
            name: "Professional Advocate",
            requiredActions: 2,
            reward: { type: "percentage", value: 20, description: "20% off your next engagement" },
            reason: "Cross-platform professional endorsement maximizes credibility",
          },
        ],
        cycle: "monthly",
        duration: "ongoing",
        launchTime: "monday morning",
        reasoning: `B2B businesses like ${profile.type} rely on professional credibility. LinkedIn endorsements from satisfied clients are the highest-ROI marketing for professional services. Combined with detailed Google reviews, this creates an authoritative digital presence that converts prospects into clients.`,
        dataPoints: [
          "LinkedIn content from satisfied clients gets 10x more engagement than brand posts",
          "80% of B2B buyers check reviews before engaging a service provider",
          "Professional endorsements on LinkedIn have an average 6.5x ROI for B2B services",
        ],
        risks: [
          "B2B clients may be slower to post — patience required",
          "Professional content needs to maintain appropriate tone",
        ],
        confidence: 0.86,
        monthlyPosts: 4,
        monthlyReviews: 3,
        reachMultiplier: 10,
      });
    }

    // ── 7. MEMBER RETENTION (if applicable) ──
    if (profile.memberCount && profile.memberCount > 0 && profile.goals.includes("member_retention")) {
      addRecommendation({
        name: "Member Loyalty Program",
        description: `Keep your ${profile.memberCount} members engaged and sharing. Turn ongoing membership into ongoing marketing through consistent social engagement rewards.`,
        type: "perk_program",
        priority: "high",
        platformIds: ["ig", "fb", "go"],
        actionSpecs: [
          { id: "ig_st", reason: "Weekly stories from members create authentic social proof" },
          { id: "ig_fp", reason: "Monthly progress posts build community and attract new members" },
          { id: "fb_ci", reason: "Regular check-ins show active membership to friends" },
          { id: "go_rv", reason: "Member reviews carry the most authentic trust signals" },
        ],
        tiers: [
          {
            name: "Active Member",
            requiredActions: 2,
            reward: { type: "percentage", value: 5, description: "5% off next month membership" },
            reason: "Low barrier keeps the majority of members engaged in the program",
          },
          {
            name: "Community Champion",
            requiredActions: 4,
            reward: { type: "percentage", value: 10, description: "10% off next month membership" },
            reason: "Consistent engagement from champions drives community culture",
          },
          {
            name: "Brand Ambassador",
            requiredActions: 6,
            reward: { type: "percentage", value: 15, description: "15% off next month membership or free add-on class" },
            reason: "Your most active promoters deserve premium recognition",
          },
        ],
        cycle: "monthly",
        duration: "ongoing",
        launchTime: "start of month",
        reasoning: `With ${profile.memberCount} members, you have a built-in marketing army. Members who share their experience are 67% less likely to churn, and each piece of content they create attracts potential new members. This program turns membership into a virtuous cycle of retention and acquisition.`,
        dataPoints: [
          "Members who post about their membership are 67% less likely to cancel",
          `${profile.memberCount} active members could generate ${Math.round(profile.memberCount * 0.3)} posts per month`,
          "Social accountability through posting increases visit frequency by 23%",
          "Membership businesses with loyalty programs have 40% higher retention",
        ],
        risks: [
          "Some members may feel obligated — keep it voluntary and positive",
          "Program fatigue after 6 months — rotate rewards to keep it fresh",
        ],
        confidence: 0.89,
        monthlyPosts: Math.round(profile.memberCount * 0.25),
        monthlyReviews: Math.round(profile.memberCount * 0.05),
        reachMultiplier: 5,
      });
    }

    // ── 8. HIGH-TICKET CONTRACTOR / ONE-TIME SERVICE CAMPAIGNS ──
    const contractorTypes = ["roofer", "plumber", "hvac", "landscaper", "electrician", "general contractor", "painter"];
    const lowerType = profile.type.toLowerCase();
    const isContractor = contractorTypes.some((ct) => lowerType.includes(ct));
    const isHighTicketService = isContractor || (typeProfile.visitFrequency === "once" || typeProfile.visitFrequency === "rare");

    if (isHighTicketService && traits.service) {
      const cashBackPct = avgTx > 5000 ? 3 : avgTx > 1000 ? 4 : 5;
      const cashBackAmount = Math.round(avgTx * cashBackPct / 100);

      // Cash back one-time program for contractors
      addRecommendation({
        name: "Customer Cash Back Program",
        description: `Offer $${cashBackAmount} cash back (${cashBackPct}% of ~$${avgTx} job value) when customers complete marketing actions after their service. One-time payout — not a recurring discount.`,
        type: "one_time_campaign",
        priority: "critical",
        platformIds: typeProfile.bestChannels.slice(0, 4),
        actionSpecs: [
          { id: "go_rv", reason: "Google Reviews are the #1 factor homeowners use when choosing contractors" },
          { id: "go_rp", reason: "Photo reviews of completed work are the most convincing proof for new customers" },
          { id: "gm_rv", reason: "Google Maps reviews drive hyperlocal discovery when homeowners search 'near me'" },
          { id: "nd_rc", reason: "Nextdoor recommendations reach the exact neighbors who are your best prospects" },
        ],
        tiers: [
          {
            name: "Quick Reviewer",
            requiredActions: 2,
            reward: { type: "cash_back", value: Math.round(cashBackAmount * 0.5), description: `$${Math.round(cashBackAmount * 0.5)} cash back` },
            reason: "Two review actions on key platforms — gets volume",
          },
          {
            name: "Full Advocate",
            requiredActions: 4,
            reward: { type: "cash_back", value: cashBackAmount, description: `$${cashBackAmount} cash back via your preferred payment method` },
            reason: "Complete advocacy across multiple platforms maximizes your visibility",
          },
        ],
        cycle: "one_time",
        duration: "90 days after service",
        launchTime: "immediately after job completion",
        reasoning: `For ${profile.type} businesses, each customer is a high-value marketing opportunity. At ~$${avgTx} per job, a $${cashBackAmount} cash back (${cashBackPct}%) is a tiny fraction of job value but a meaningful reward for the customer. Unlike recurring discounts, one-time cash back works perfectly for one-time services. Reviews from verified customers on Google, Google Maps, and Nextdoor are the #1 way homeowners find and choose contractors.`,
        dataPoints: [
          "97% of homeowners read reviews before hiring a contractor",
          "Contractors with 50+ Google reviews get 3x more leads than those with fewer than 10",
          "Nextdoor is the #1 platform for local contractor recommendations among homeowners",
          `At $${avgTx} average job value, a ${cashBackPct}% cash back pays for itself with one new customer`,
          "Before/after photos in reviews increase click-through rate by 150%",
        ],
        risks: [
          "Cash back must be paid out — budget accordingly per job",
          "Track payouts carefully to maintain profitability",
        ],
        confidence: 0.94,
        monthlyPosts: 0,
        monthlyReviews: 6,
        reachMultiplier: 10,
      });

      // Before/after photo campaign for visual contractors
      if (traits.visual || traits.transform) {
        addRecommendation({
          name: "Before & After Portfolio Builder",
          description: `Get customers to share dramatic before/after photos of their completed ${lowerType} project on Instagram and Nextdoor. Every project is a portfolio piece.`,
          type: "one_time_campaign",
          priority: "high",
          platformIds: ["ig", "nd", "fb"],
          actionSpecs: [
            { id: "ig_fp", reason: "Instagram feed posts create a permanent visual portfolio of your work" },
            { id: "ig_rl", reason: "Reels showcasing transformations have the highest organic reach" },
            { id: "nd_rc", reason: "Nextdoor project showcases reach verified homeowners in the neighborhood" },
          ],
          tiers: [
            {
              name: "Photo Sharer",
              requiredActions: 1,
              reward: { type: "cash_back", value: Math.round(cashBackAmount * 0.3), description: `$${Math.round(cashBackAmount * 0.3)} cash back for sharing photos` },
              reason: "Before/after photos are the most convincing marketing for contractors",
            },
            {
              name: "Video Creator",
              requiredActions: 2,
              reward: { type: "cash_back", value: Math.round(cashBackAmount * 0.6), description: `$${Math.round(cashBackAmount * 0.6)} cash back for video content` },
              reason: "Video transformations drive 3x more engagement than photos alone",
            },
          ],
          cycle: "one_time",
          duration: "60 days after service",
          launchTime: "immediately after job completion",
          reasoning: `Visual transformation content is the most powerful marketing tool for ${profile.type} businesses. Every completed project is a portfolio piece. When customers share their before/after photos on Instagram and Nextdoor, it reaches exactly the audience most likely to need the same service — homeowners in the same area.`,
          dataPoints: [
            "Before/after content gets 3-5x more engagement than standard posts",
            "Homeowners are 4x more likely to hire a contractor with a visual portfolio",
            "Neighborhood-posted project photos generate an average of 2 direct inquiries each",
          ],
          risks: [
            "Not all customers are comfortable sharing — make it optional and easy",
            "Ensure customer consent for all shared content",
          ],
          confidence: 0.88,
          monthlyPosts: 4,
          monthlyReviews: 0,
          reachMultiplier: 15,
        });
      }

      // Neighborhood Ambassador program
      addRecommendation({
        name: "Neighborhood Ambassador",
        description: `Turn satisfied customers into neighborhood ambassadors. When they recommend you on Nextdoor and local Facebook groups, they reach verified homeowners who are your ideal prospects.`,
        type: "one_time_campaign",
        priority: "high",
        platformIds: ["nd", "fb", "rf"],
        actionSpecs: [
          { id: "nd_rc", reason: "Nextdoor recommendations are seen by verified neighbors — the highest-converting referral channel for home services" },
          { id: "fb_rc", reason: "Facebook Recommendations appear when friends search for similar services" },
          { id: "rf_fr", reason: "Direct friend referrals have the highest lifetime value" },
        ],
        tiers: [
          {
            name: "Recommender",
            requiredActions: 1,
            reward: { type: "cash_back", value: Math.round(cashBackAmount * 0.4), description: `$${Math.round(cashBackAmount * 0.4)} cash back for recommending us` },
            reason: "A single neighborhood recommendation can generate multiple leads",
          },
          {
            name: "Neighborhood Ambassador",
            requiredActions: 3,
            reward: { type: "cash_back", value: Math.round(cashBackAmount * 0.8), description: `$${Math.round(cashBackAmount * 0.8)} cash back for full ambassador actions` },
            reason: "Multi-platform recommendations create a blanket of trust in the neighborhood",
          },
        ],
        cycle: "one_time",
        duration: "90 days after service",
        launchTime: "1 week after job completion",
        reasoning: `Home service customers cluster geographically — one roof replacement often leads to neighbors getting the same work done. Nextdoor is uniquely powerful for ${profile.type} businesses because posts reach verified homeowners within a specific radius. When a customer recommends you on Nextdoor, it's the digital equivalent of a yard sign that never comes down.`,
        dataPoints: [
          "Nextdoor recommendations for home services generate 5x more leads than Google Ads per dollar",
          "78% of homeowners ask neighbors for contractor recommendations before searching online",
          "A single Nextdoor recommendation averages 2.3 direct inquiries for home service businesses",
        ],
        risks: [
          "Nextdoor adoption varies by neighborhood — works best in active communities",
          "Timing matters — ask when satisfaction is highest (right after completion)",
        ],
        confidence: 0.91,
        monthlyPosts: 2,
        monthlyReviews: 3,
        reachMultiplier: 8,
      });
    }

    // Sort by priority and confidence
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => {
      const pDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (pDiff !== 0) return pDiff;
      return b.confidence - a.confidence;
    });

    // Return 3-5 recommendations
    return recommendations.slice(0, 5);
  }

  // ── Plan Generation ──

  generatePlan(profile: BusinessProfile): MarketingPlan {
    const recommendations = this.generateRecommendations(profile);
    const { insights } = this.analyzeBusinessType(profile.type);
    const goalAnalysis = this.analyzeGoals(profile.goals);
    const budgetAnalysis = this.analyzeBudget(
      profile.monthlyBudget,
      profile.averageTransactionValue,
      profile.memberCount
    );
    const competitive = this.analyzeCompetition(profile.type, profile.location);

    // Calculate strategy metrics
    const totalMonthlyBudget = budgetAnalysis.effectiveBudget;
    const avgROI = recommendations.reduce((sum, r) => sum + r.projectedResults.estimatedROI, 0) / recommendations.length;

    const primaryGoal = goalAnalysis.prioritized[0]?.goal ?? "brand_awareness";
    const criticalRecs = recommendations.filter(r => r.priority === "critical" || r.priority === "high");

    const strategy = {
      summary: `Your ${profile.type} marketing plan focuses on ${this._goalLabel(primaryGoal)} through ${recommendations.length} coordinated campaigns. ${criticalRecs.length > 0 ? `Start with "${criticalRecs[0].name}" as your foundation, then layer on additional campaigns.` : "Build momentum by launching campaigns in phases."} Expected ROI: ${avgROI.toFixed(1)}x within the first 3 months.`,
      primaryGoal: this._goalLabel(primaryGoal),
      timeline: "3-6 months for full implementation, results visible within 2-4 weeks",
      totalMonthlyBudget,
      expectedMonthlyROI: Math.round(avgROI * 10) / 10,
      keyInsights: insights.slice(0, 5),
    };

    // Build implementation phases
    const implementationOrder: MarketingPlan["implementationOrder"] = [];

    // Phase 1: Foundation (Week 1)
    const foundationCampaigns = recommendations.filter(r => r.priority === "critical");
    if (foundationCampaigns.length > 0) {
      implementationOrder.push({
        phase: "Week 1 — Foundation",
        actions: foundationCampaigns.map(r => `Launch "${r.name}" campaign`),
        expectedOutcome: "Establish review generation and core social presence",
      });
    }

    // Phase 2: Growth (Month 1)
    const foundationIds = new Set(foundationCampaigns.map(r => r.id));
    const growthCampaigns = recommendations.filter(r => r.priority === "high" && !foundationIds.has(r.id));
    if (growthCampaigns.length > 0) {
      implementationOrder.push({
        phase: "Month 1 — Growth",
        actions: growthCampaigns.map(r => `Launch "${r.name}" campaign`),
        expectedOutcome: "Build multi-channel presence and content pipeline",
      });
    }

    // Phase 3: Scale (Month 2-3)
    const scaleCampaigns = recommendations.filter(r => r.priority === "medium" || r.priority === "low");
    if (scaleCampaigns.length > 0) {
      implementationOrder.push({
        phase: "Month 2-3 — Scale",
        actions: scaleCampaigns.map(r => `Launch "${r.name}" campaign`),
        expectedOutcome: "Full marketing engine running across all recommended channels",
      });
    }

    // Phase 4: Optimize (Month 3+)
    implementationOrder.push({
      phase: "Month 3+ — Optimize",
      actions: [
        "Review campaign performance data and adjust rewards",
        "Increase rewards for top-performing campaigns",
        "Sunset or revise underperforming campaigns",
        "Explore advanced campaigns (seasonal, influencer collabs)",
      ],
      expectedOutcome: "Continuous improvement loop that compounds results over time",
    });

    // Generate legal briefing
    const briefing = legalGuard.getLegalBriefing(profile.type);

    return {
      id: uid(),
      businessId: profile.businessId,
      businessProfile: profile,
      generatedAt: new Date().toISOString(),
      recommendations,
      strategy,
      competitiveInsights: competitive,
      implementationOrder,
      legalBriefing: {
        incentivizableActions: briefing.incentivizableActions,
        nonIncentivizableActions: briefing.nonIncentivizableActions,
        explanation: briefing.explanation,
        reviewStrategy: briefing.reviewStrategy,
      },
    };
  }

  generateQuickStart(profile: BusinessProfile): CampaignRecommendation {
    const recommendations = this.generateRecommendations(profile);
    // Return the highest priority, highest confidence recommendation
    return recommendations[0];
  }

  revisePlan(
    plan: MarketingPlan,
    feedback: { removeIds?: string[]; adjustBudget?: number; addGoals?: string[]; notes?: string }
  ): MarketingPlan {
    const updatedProfile = { ...plan.businessProfile };

    if (feedback.adjustBudget !== undefined) {
      updatedProfile.monthlyBudget = feedback.adjustBudget;
    }
    if (feedback.addGoals) {
      updatedProfile.goals = [...new Set([...updatedProfile.goals, ...feedback.addGoals])];
    }

    // Regenerate with updated profile
    const newPlan = this.generatePlan(updatedProfile);

    // Remove explicitly rejected recommendations
    if (feedback.removeIds && feedback.removeIds.length > 0) {
      newPlan.recommendations = newPlan.recommendations.filter(
        (r) => !feedback.removeIds!.includes(r.id)
      );
    }

    return newPlan;
  }

  // ── ROI Projections ──

  projectROI(
    recommendation: CampaignRecommendation,
    profile: BusinessProfile
  ): {
    conservative: { roi: number; newCustomers: number; revenue: number };
    realistic: { roi: number; newCustomers: number; revenue: number };
    optimistic: { roi: number; newCustomers: number; revenue: number };
  } {
    const base = recommendation.projectedResults;
    const avgTx = profile.averageTransactionValue ?? 30;

    const monthlyCost = recommendation.suggestedTiers.reduce((sum, tier) => {
      const rewardValue = tier.reward.type === "percentage"
        ? (avgTx * tier.reward.value / 100)
        : tier.reward.value;
      const estimatedRedemptions = Math.max(1, Math.round(10 / tier.requiredActions));
      return sum + rewardValue * estimatedRedemptions;
    }, 0);

    return {
      conservative: {
        roi: Math.round(base.estimatedROI * 0.6 * 10) / 10,
        newCustomers: Math.round(base.estimatedNewCustomers * 0.5),
        revenue: Math.round(base.estimatedNewCustomers * 0.5 * avgTx),
      },
      realistic: {
        roi: base.estimatedROI,
        newCustomers: base.estimatedNewCustomers,
        revenue: Math.round(base.estimatedNewCustomers * avgTx),
      },
      optimistic: {
        roi: Math.round(base.estimatedROI * 1.8 * 10) / 10,
        newCustomers: Math.round(base.estimatedNewCustomers * 2),
        revenue: Math.round(base.estimatedNewCustomers * 2 * avgTx),
      },
    };
  }

  calculateCostPerAcquisition(
    recommendation: CampaignRecommendation,
    profile: BusinessProfile
  ): {
    costPerAcquisition: number;
    comparisonToIndustryAvg: string;
    verdict: string;
  } {
    const cpa = recommendation.projectedResults.costPerAcquisition;
    const avgTx = profile.averageTransactionValue ?? 30;

    // Industry average CPA benchmarks (simulated)
    const traits = detectTraits(profile.type);
    let industryAvgCPA = 25;
    if (traits.food) industryAvgCPA = 18;
    if (traits.wellness) industryAvgCPA = 35;
    if (traits.service) industryAvgCPA = 45;
    if (traits.b2b) industryAvgCPA = 80;
    if (traits.healthcare) industryAvgCPA = 60;

    const comparisonRatio = cpa / industryAvgCPA;
    let comparisonToIndustryAvg: string;
    let verdict: string;

    if (comparisonRatio < 0.5) {
      comparisonToIndustryAvg = `${Math.round((1 - comparisonRatio) * 100)}% below industry average`;
      verdict = "Excellent — significantly below typical acquisition costs for your industry";
    } else if (comparisonRatio < 0.8) {
      comparisonToIndustryAvg = `${Math.round((1 - comparisonRatio) * 100)}% below industry average`;
      verdict = "Good — below average cost per acquisition";
    } else if (comparisonRatio < 1.2) {
      comparisonToIndustryAvg = "In line with industry average";
      verdict = "Acceptable — typical cost for your industry";
    } else {
      comparisonToIndustryAvg = `${Math.round((comparisonRatio - 1) * 100)}% above industry average`;
      verdict = "Consider adjusting — higher than typical for your industry";
    }

    return { costPerAcquisition: cpa, comparisonToIndustryAvg, verdict };
  }

  // ── Private helpers ──

  private _goalLabel(goal: string): string {
    const labels: Record<string, string> = {
      more_reviews: "building your review presence",
      instagram_growth: "growing your Instagram following",
      foot_traffic: "driving foot traffic",
      brand_awareness: "increasing brand awareness",
      member_retention: "improving member retention",
      tiktok_growth: "building your TikTok presence",
      increase_revenue: "driving revenue growth",
    };
    return labels[goal] ?? "growing your business";
  }
}

// ═══════════════ Export Singleton ═══════════════

export const marketingAgent = new MarketingAgent();
