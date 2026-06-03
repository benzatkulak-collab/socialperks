/**
 * AI Campaign Engine — BACKEND ONLY
 *
 * This module generates campaign suggestions using trait detection,
 * business size awareness, seasonal relevance, and audience targeting.
 *
 * IMPORTANT: This runs on the server via API routes.
 * The frontend calls /api/v1/ai/generate — it never runs this directly.
 */

import type { CampaignTier } from "./types";

const uid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

// ═══════════════ Trait Detection ═══════════════

export interface BusinessTraits {
  visual: boolean;
  food: boolean;
  service: boolean;
  wellness: boolean;
  retail: boolean;
  b2b: boolean;
  transform: boolean;
  hospitality: boolean;
  healthcare: boolean;
  education: boolean;
  entertainment: boolean;
  automotive: boolean;
  pets: boolean;
  luxury: boolean;
  seasonal: boolean;
  local: boolean;
}

export function detectTraits(businessType: string): BusinessTraits {
  const t = businessType.toLowerCase();
  return {
    visual: /salon|spa|tattoo|bakery|florist|restaurant|cafe|coffee|bar|gym|yoga|dance|art|photo|fashion|boutique|nail|barber|beauty|wedding|hotel|pet|garden|interior|jewel|ice cream|pizza|gallery|museum|architect/i.test(t),
    food: /restaurant|cafe|coffee|bakery|bar|brewery|pizza|sushi|taco|burger|bbq|ice cream|dessert|diner|food|kitchen|juice|deli|catering|food truck|winery|distillery|bistro|brunch|ramen|pho|thai|chinese|mexican|italian|indian|mediterranean|grocer|supermarket|market/i.test(t),
    service: /law|account|insur|consult|clean|plumb|electric|mechanic|auto|car|dental|doctor|medical|therapy|vet|tutor|real estate|financial|tax|moving|roof|paint|hvac|locksmith|landscap|handyman|notary|tailor|dry clean/i.test(t),
    wellness: /yoga|pilates|gym|fitness|spa|massage|wellness|meditation|health|therapy|acupuncture|dance|martial|crossfit|chiro|physical therapy|nutritio|dietitian|mental health|counseling/i.test(t),
    retail: /store|shop|boutique|cloth|fashion|jewel|book|toy|pet|garden|hardware|furniture|home|gift|flower|market|thrift|vintage|antique|craft|supply|grocer|pharmacy|wine shop|liquor|smoke|vape/i.test(t),
    b2b: /consult|agency|market|design|develop|account|law|insur|financial|commercial|saas|tech|recruit|staffing|print|shipping|wholesale|manufacture/i.test(t),
    transform: /salon|barber|tattoo|spa|gym|fitness|yoga|beauty|nail|makeup|personal train|coach|weight|dermat|plastic|cosmetic|orthodont|whiten/i.test(t),
    hospitality: /hotel|motel|inn|resort|airbnb|bed and breakfast|hostel|lodge|vacation rental/i.test(t),
    healthcare: /dental|doctor|medical|clinic|hospital|optom|optic|pharmacy|urgent care|chiropract|dermat|pediatr|cardio|ortho|psych|therap/i.test(t),
    education: /tutor|school|academy|lesson|class|workshop|training|music lesson|art class|dance class|martial art|language|driving school|cooking class/i.test(t),
    entertainment: /arcade|bowling|escape room|movie|theater|karaoke|mini golf|trampoline|laser tag|amusement|museum|gallery|club|lounge|comedy|concert|event/i.test(t),
    automotive: /mechanic|auto|car wash|tire|body shop|detail|oil change|transmission|brake|tow|parking|dealer/i.test(t),
    pets: /vet|veterinar|pet|grooming|kennel|boarding|dog walk|pet sit|aquarium|pet store|animal/i.test(t),
    luxury: /jewel|boutique|spa|resort|salon|fine dining|designer|premium|luxury|high-end|exclusive|private|concierge/i.test(t),
    seasonal: /ice cream|pool|ski|snowboard|christmas|halloween|pumpkin|easter|firework|garden center|tax prep|wedding|prom/i.test(t),
    local: true, // All businesses on platform are local-first
  };
}

// ═══════════════ Business Size Modifiers ═══════════════

type BusinessSize = "solo" | "small" | "medium" | "enterprise";

interface SizeModifiers {
  maxCampaigns: number;
  budgetMultiplier: number;
  complexityMax: CampaignTier[];
  focusAreas: string[];
}

function getSizeModifiers(size: BusinessSize): SizeModifiers {
  switch (size) {
    case "solo":
      return {
        maxCampaigns: 20,
        budgetMultiplier: 0.7,
        complexityMax: ["essential", "starter"],
        focusAreas: ["Reviews", "Engagement", "Referrals"],
      };
    case "small":
      return {
        maxCampaigns: 30,
        budgetMultiplier: 1.0,
        complexityMax: ["essential", "high_impact", "starter", "growth"],
        focusAreas: ["Reviews", "Social", "Referrals", "Engagement"],
      };
    case "medium":
      return {
        maxCampaigns: 40,
        budgetMultiplier: 1.3,
        complexityMax: ["essential", "high_impact", "growth", "premium", "starter"],
        focusAreas: ["Social", "Reviews", "Sharing", "Premium"],
      };
    case "enterprise":
      return {
        maxCampaigns: 50,
        budgetMultiplier: 2.0,
        complexityMax: ["essential", "high_impact", "growth", "premium", "starter"],
        focusAreas: ["Premium", "Social", "Professional", "Sharing"],
      };
  }
}

// ═══════════════ Seasonal Relevance ═══════════════

function getSeasonalCampaigns(traits: BusinessTraits, month: number): GeneratedCampaign[] {
  const campaigns: GeneratedCampaign[] = [];
  const add = makeAdder(campaigns);

  // Holiday seasons
  if (month === 10 || month === 11 || month === 0) {
    // November-December (holiday season) / January (new year)
    add("Holiday Gift Guide Post", "Customer shares your business as a gift idea.", ["ig_fp", "fb_po", "pi_ph"], 15, "pct", "Social", "growth",
      "Holiday gift guides get massive shares. Perfect time for discovery.");
    if (traits.retail)
      add("Gift Card Challenge", "Post about buying/receiving your gift card.", ["ig_st", "tt_vd", "fb_po"], 20, "pct", "Social", "high_impact",
        "Gift card content reaches the recipient's network too.");
  }

  if (month >= 5 && month <= 8) {
    // Summer
    if (traits.food)
      add("Summer Vibes", "Share the summer experience at your spot.", ["ig_rl", "tt_vd", "ig_st"], 15, "pct", "Social", "growth",
        "Summer content gets peak engagement. Outdoor dining + warm weather = shareable moments.");
  }

  if (month === 1) {
    // February
    add("Valentine's Feature", "Tag your valentine at our spot.", ["ig_fp", "fb_po", "ig_st"], 20, "pct", "Social", "growth",
      "Valentine's content has high emotional engagement and tag rates.");
  }

  if (month >= 2 && month <= 4) {
    // Spring
    if (traits.wellness)
      add("Spring Reset Campaign", "Share your spring wellness journey.", ["ig_rl", "tt_vd", "ig_fc"], 20, "pct", "Social", "high_impact",
        "New Year resolutions fade, spring resets are the real commitment season.");
  }

  return campaigns;
}

// ═══════════════ Campaign Generator ═══════════════

export interface GeneratedCampaign {
  id: string;
  name: string;
  description: string;
  actions: string[];
  discountValue: number;
  discountType: "pct" | "dol";
  category: string;
  tier: CampaignTier;
  reason: string;
  tags: string[];
  estimatedReach: number;
  estimatedCompletionRate: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  bestFor: string[];
}

/**
 * Estimate reach from the number and type of actions.
 * Deterministic: based on action count and platform reach multipliers.
 */
function estimateReachFromActions(actions: string[]): number {
  const platformReachMultipliers: Record<string, number> = {
    ig: 1500, tt: 2000, yt: 2500, fb: 800, xw: 600,
    go: 500, yp: 400, li: 700, pi: 600, nd: 300,
    th: 400, sc: 500, rd: 800, ta: 400, rf: 200,
  };
  let reach = 0;
  for (const actionId of actions) {
    const prefix = actionId.split("_")[0];
    reach += platformReachMultipliers[prefix] ?? 500;
  }
  return Math.max(500, reach);
}

/**
 * Estimate completion rate from campaign tier.
 * Deterministic: higher tiers have lower completion rates.
 */
function estimateCompletionRate(tier: CampaignTier): number {
  const tierRates: Record<CampaignTier, number> = {
    starter: 65,
    essential: 55,
    growth: 45,
    high_impact: 35,
    premium: 25,
  };
  return tierRates[tier] ?? 40;
}

function makeAdder(campaigns: GeneratedCampaign[]) {
  return function add(
    name: string,
    description: string,
    actions: string[],
    discountValue: number,
    discountType: "pct" | "dol",
    category: string,
    tier: CampaignTier,
    reason: string,
    opts?: Partial<Pick<GeneratedCampaign, "tags" | "estimatedReach" | "estimatedCompletionRate" | "difficulty" | "bestFor">>
  ) {
    campaigns.push({
      id: uid(),
      name,
      description,
      actions,
      discountValue,
      discountType,
      category,
      tier,
      reason,
      tags: opts?.tags ?? [],
      estimatedReach: opts?.estimatedReach ?? estimateReachFromActions(actions),
      estimatedCompletionRate: opts?.estimatedCompletionRate ?? estimateCompletionRate(tier),
      difficulty: opts?.difficulty ?? "beginner",
      bestFor: opts?.bestFor ?? [],
    });
  };
}

export interface GenerateOptions {
  businessType: string;
  businessSize?: BusinessSize;
  budget?: "low" | "medium" | "high";
  preferences?: string[];
  excludeCategories?: string[];
  includeSeasonal?: boolean;
}

export function generateCampaigns(options: GenerateOptions): GeneratedCampaign[] {
  const {
    businessType,
    businessSize = "small",
    includeSeasonal = true,
  } = options;

  const traits = detectTraits(businessType);
  const sizeMods = getSizeModifiers(businessSize);
  const campaigns: GeneratedCampaign[] = [];
  const add = makeAdder(campaigns);

  // ── REVIEWS (universal — the foundation for any business) ──
  add("Google Review Drive", `Collect Google reviews from ${businessType} customers.`,
    ["go_rv", "go_ph"], Math.round(5 * sizeMods.budgetMultiplier), "dol", "Reviews", "essential",
    "Google reviews are #1 for local search ranking. Run this always.",
    { tags: ["seo", "local", "evergreen"], estimatedReach: 2000, estimatedCompletionRate: 65, difficulty: "beginner", bestFor: ["all"] });

  add("Detailed Reviews + Photos", "In-depth reviews with photos for maximum SEO impact.",
    ["go_rd", "go_rp"], Math.round(10 * sizeMods.budgetMultiplier), "dol", "Reviews", "high_impact",
    "Photo reviews get 2x clicks. Detailed reviews boost search relevance.",
    { tags: ["seo", "photos", "high-value"], estimatedReach: 3000, estimatedCompletionRate: 45, difficulty: "intermediate" });

  if (!traits.b2b)
    add("Yelp Presence Builder", "Build Yelp presence with photos and check-ins (Yelp prohibits incentivized reviews).",
      ["yp_ph", "yp_ci"], Math.round(5 * sizeMods.budgetMultiplier), "dol", "Engagement", "essential",
      "Yelp photos and check-ins are allowed. Yelp prohibits incentivized reviews, so this campaign uses non-review actions only.",
      { tags: ["local", "discovery", "evergreen"], difficulty: "beginner" });

  add("Facebook Recommendations", "Get recommended on Facebook.",
    ["fb_rc", "fb_lp"], 10, "pct", "Reviews", "growth",
    "Facebook recs appear when friends search for similar businesses.",
    { tags: ["social-proof", "friends"], difficulty: "beginner" });

  add("Nextdoor Advocate", "Get recommended where neighbors look.",
    ["nd_rc", "nd_po"], 15, "pct", "Reviews", "high_impact",
    "Nextdoor is hyperlocal — your actual neighbors see these.",
    { tags: ["hyperlocal", "neighborhood"], estimatedCompletionRate: 55, difficulty: "beginner", bestFor: ["local"] });

  if (traits.food)
    add("TripAdvisor Boost", "Build TripAdvisor for visitor discovery.",
      ["ta_rv", "ta_rp"], Math.round(10 * sizeMods.budgetMultiplier), "dol", "Reviews", "growth",
      "Essential for tourist areas. Drives walk-in traffic.",
      { tags: ["tourism", "discovery"], difficulty: "intermediate" });

  if (traits.healthcare)
    add("Patient Review Program", "Encourage patients to share their experience.",
      ["go_rv", "go_rp", "fb_rc"], Math.round(10 * sizeMods.budgetMultiplier), "dol", "Reviews", "essential",
      "Healthcare reviews are the #1 factor in choosing a provider.",
      { tags: ["healthcare", "trust"], estimatedCompletionRate: 40, difficulty: "beginner" });

  if (traits.automotive)
    add("Honest Mechanic Reviews", "Build trust through transparent reviews.",
      ["go_rd", "go_rp", "yp_rv"], Math.round(10 * sizeMods.budgetMultiplier), "dol", "Reviews", "essential",
      "Auto service lives and dies by reviews. Trust is everything.",
      { tags: ["trust", "automotive"], difficulty: "beginner" });

  // ── SOCIAL CONTENT ──
  add("Instagram Stories", `Quick Story about your ${businessType}.`,
    ["ig_st", "ig_sl"], 10, "pct", "Social", "essential",
    "Lowest friction content. Most customers will do this gladly.",
    { tags: ["low-effort", "stories", "quick-win"], estimatedCompletionRate: 70, difficulty: "beginner" });

  add("Instagram Feed Post", "Permanent feed post for lasting reach.",
    ["ig_fp"], 15, "pct", "Social", "essential",
    "Feed posts live forever, discoverable via hashtags and explore.",
    { tags: ["permanent", "hashtags", "evergreen"], difficulty: "beginner" });

  if (traits.visual) {
    add("Carousel Showcase", "Multi-photo carousel of the experience.",
      ["ig_fc"], 20, "pct", "Social", "high_impact",
      `${businessType}s are visual. Carousels get highest save rates.`,
      { tags: ["visual", "saves", "high-engagement"], difficulty: "intermediate" });

    add("Reel", "Short video — highest reach format.",
      ["ig_rl"], 20, "pct", "Social", "high_impact",
      "Reels get 2x reach of static posts. Best for new audiences.",
      { tags: ["video", "reach", "discovery"], difficulty: "intermediate" });
  }

  add("TikTok Video", `Original TikTok about your ${businessType}.`,
    ["tt_vd"], 20, "pct", "Social", "high_impact",
    "TikTok has highest organic reach. One video can go viral.",
    { tags: ["viral-potential", "organic", "discovery"], difficulty: "intermediate" });

  if (traits.food)
    add("TikTok Taste Test", "Genuine reaction trying your food.",
      ["tt_rv"], 20, "pct", "Social", "premium",
      "Food reaction videos are TikTok's most shareable format.",
      { tags: ["food", "reaction", "shareable"], difficulty: "intermediate" });

  if (traits.transform)
    add("Before/After Transformation", "Before and after content.",
      ["ig_rl", "tt_vd", "ig_fc"], 25, "pct", "Social", "premium",
      "Highest-performing format for transformation businesses.",
      { tags: ["transformation", "high-impact", "visual"], estimatedReach: 8000, difficulty: "advanced" });

  add("Facebook Story + Check-in", "Story with location check-in.",
    ["fb_sy", "fb_ci"], 10, "pct", "Social", "starter",
    "Check-ins in friends' feeds + visual Story context.",
    { tags: ["check-in", "local", "easy"], difficulty: "beginner" });

  add("X Shout-out", "Tweet about the experience.",
    ["xw_po", "xw_pp"], 10, "pct", "Social", "growth",
    "Real-time buzz. Shows up in search.",
    { tags: ["real-time", "searchable"], difficulty: "beginner" });

  add("YouTube Short", "Quick Short for long-term reach.",
    ["yt_sh"], 20, "pct", "Social", "premium",
    "YouTube Shorts have massive reach and live forever.",
    { tags: ["long-term", "video", "evergreen"], estimatedReach: 10000, difficulty: "advanced" });

  if (traits.visual)
    add("Pinterest Pin", "Evergreen visual discovery.",
      ["pi_ph", "pi_id"], 15, "pct", "Social", "growth",
      "Pins drive traffic for years.",
      { tags: ["evergreen", "discovery", "visual"], difficulty: "intermediate" });

  add("Threads Post", "Post on Meta's text platform.",
    ["th_po", "th_pp"], 10, "pct", "Social", "starter",
    "Growing fast. Early presence builds audience.",
    { tags: ["emerging", "text-based"], difficulty: "beginner" });

  add("Snapchat Moment", "Snap with location filter.",
    ["sc_sn", "sc_sy"], 10, "pct", "Social", "starter",
    "Reaches younger demographics others miss.",
    { tags: ["youth", "location", "ephemeral"], difficulty: "beginner" });

  add("Reddit Recommendation", "Post in local subreddits.",
    ["rd_po", "rd_cm"], 15, "pct", "Social", "growth",
    "Reddit recs carry high trust in local subs.",
    { tags: ["community", "trust", "local"], difficulty: "intermediate" });

  if (traits.entertainment)
    add("Event Hype Reel", "Create buzz for events and experiences.",
      ["ig_rl", "tt_vd", "fb_rl", "ig_st"], 20, "pct", "Social", "high_impact",
      "Event content creates FOMO that drives future visits.",
      { tags: ["events", "fomo", "video"], estimatedReach: 6000, difficulty: "intermediate" });

  if (traits.pets)
    add("Pet Content Campaign", "Customers share their pets at your business.",
      ["ig_fp", "ig_rl", "tt_vd"], 15, "pct", "Social", "high_impact",
      "Pet content consistently outperforms all other content types on social media.",
      { tags: ["pets", "viral-potential", "cute"], estimatedReach: 7000, difficulty: "beginner" });

  if (traits.education)
    add("Student Success Showcase", "Students share their progress and results.",
      ["ig_fp", "ig_rl", "fb_po"], 15, "pct", "Social", "high_impact",
      "Proof of results is the best marketing for education businesses.",
      { tags: ["results", "testimonial", "social-proof"], difficulty: "intermediate" });

  // ── ENGAGEMENT ──
  add("Follow & Like Pack", "Build follower count across platforms.",
    ["ig_fo", "fb_lp", "fb_fw", "tt_fo"], 5, "pct", "Engagement", "starter",
    "Bigger follower count = more credibility for visitors.",
    { tags: ["followers", "credibility", "easy"], estimatedCompletionRate: 80, difficulty: "beginner" });

  add("Comment Boost", "Meaningful comments on business posts.",
    ["ig_cm", "fb_cm", "tt_cm"], 10, "pct", "Engagement", "growth",
    "Comments boost algorithm visibility. More valuable than likes.",
    { tags: ["algorithm", "engagement", "visibility"], difficulty: "beginner" });

  add("Save & Bookmark", "Save content to boost signals.",
    ["ig_sv", "ig_lk"], 5, "pct", "Engagement", "starter",
    "Saves are a hidden algorithm signal for reach.",
    { tags: ["algorithm", "hidden-signal"], difficulty: "beginner" });

  add("Check-in Culture", "Check in on every platform.",
    ["fb_cp", "yp_ci", "ig_sl"], 10, "pct", "Engagement", "essential",
    "Social proof in friends' feeds across platforms.",
    { tags: ["check-in", "social-proof", "local"], estimatedCompletionRate: 65, difficulty: "beginner" });

  if (traits.hospitality)
    add("Guest Experience Share", "Guests share their stay experience.",
      ["ig_fc", "ig_rl", "go_rp", "ta_rp"], 20, "pct", "Engagement", "high_impact",
      "Hospitality thrives on visual social proof from actual guests.",
      { tags: ["hospitality", "visual", "review"], difficulty: "intermediate" });

  // ── SHARING ──
  add("Share to Friends", "DMs, story reshares, group chats.",
    ["ig_sd", "ig_ss", "fb_sh", "tt_sh"], 10, "pct", "Sharing", "growth",
    "Direct shares have highest conversion — personal rec.",
    { tags: ["personal", "high-conversion", "word-of-mouth"], difficulty: "beginner" });

  add("Tag Friends", "Tag friends who'd enjoy this.",
    ["fb_tg", "ig_cm"], 10, "pct", "Sharing", "growth",
    "Tags create notifications to potential new customers.",
    { tags: ["notifications", "discovery", "friends"], difficulty: "beginner" });

  add("Local Group Ambassador", "Post in local groups and Reddit.",
    ["fb_gr", "rd_po"], 15, "pct", "Sharing", "high_impact",
    "Local groups reach neighbors looking for recs.",
    { tags: ["local", "community", "groups"], difficulty: "intermediate" });

  // ── REFERRALS ──
  add("Friend Referral", "Refer a friend. Both earn perks.",
    ["rf_fr"], 20, "pct", "Referrals", "high_impact",
    "Referred customers have 16% higher lifetime value.",
    { tags: ["referral", "lifetime-value", "both-earn"], estimatedCompletionRate: 35, difficulty: "beginner" });

  add("Bring a Buddy", "Bring a friend in person.",
    ["rf_ip", "fb_ci"], 25, "pct", "Referrals", "premium",
    "In-person referrals have highest conversion rate.",
    { tags: ["in-person", "high-conversion"], estimatedCompletionRate: 40, difficulty: "beginner" });

  add("Group Chat Blast", "Share in group chats.",
    ["rf_gc", "rf_em"], 10, "pct", "Referrals", "growth",
    "Group chat recs feel personal. High impact.",
    { tags: ["personal", "group", "easy"], difficulty: "beginner" });

  // ── PREMIUM MULTI-PLATFORM ──
  add("Full Social Takeover", `Post about your ${businessType} everywhere at once.`,
    ["ig_rl", "tt_vd", "fb_po", "ig_st", "go_rv", "nd_rc", "xw_po"], 30, "pct", "Premium", "premium",
    "Maximum reach. All channels simultaneously.",
    { tags: ["multi-platform", "maximum-reach"], estimatedReach: 15000, estimatedCompletionRate: 20, difficulty: "advanced" });

  add("Content Creator Package", "Video content across platforms.",
    ["ig_rl", "tt_vd", "yt_sh", "fb_rl"], 30, "pct", "Premium", "premium",
    "Video on 4 platforms = compounding reach.",
    { tags: ["video", "multi-platform", "creator"], estimatedReach: 12000, difficulty: "advanced" });

  if (traits.b2b)
    add("Professional Endorsement", "LinkedIn endorsement.",
      ["li_po", "li_ar", "go_rd"], 20, "pct", "Professional", "high_impact",
      "LinkedIn carries most weight for B2B.",
      { tags: ["b2b", "professional", "linkedin"], difficulty: "intermediate" });

  if (traits.luxury)
    add("VIP Experience Share", "Exclusive content from your premium experience.",
      ["ig_fc", "ig_rl", "tt_vd", "pi_ph"], 25, "pct", "Premium", "premium",
      "Luxury brands benefit from aspirational content that creates desire.",
      { tags: ["luxury", "aspirational", "exclusive"], estimatedReach: 10000, difficulty: "advanced" });

  // ── SEASONAL ──
  if (includeSeasonal) {
    const currentMonth = new Date().getMonth();
    campaigns.push(...getSeasonalCampaigns(traits, currentMonth));
  }

  // Apply size limits
  return campaigns.slice(0, sizeMods.maxCampaigns);
}

// ═══════════════ Campaign Recommendation Engine ═══════════════

export interface RecommendationInput {
  businessType: string;
  businessSize: BusinessSize;
  activeCampaigns: string[];
  completionHistory: { campaignName: string; completions: number; category: string }[];
  goals: ("reviews" | "social-reach" | "referrals" | "engagement" | "brand-awareness")[];
}

export interface Recommendation {
  campaignId: string;
  campaignName: string;
  score: number;
  reason: string;
  expectedImpact: string;
  priority: "high" | "medium" | "low";
}

export function getRecommendations(input: RecommendationInput): Recommendation[] {
  const campaigns = generateCampaigns({
    businessType: input.businessType,
    businessSize: input.businessSize,
  });

  const recommendations: Recommendation[] = [];

  for (const campaign of campaigns) {
    if (input.activeCampaigns.includes(campaign.name)) continue;

    let score = 0;
    const reasons: string[] = [];

    // Goal alignment
    if (input.goals.includes("reviews") && campaign.category === "Reviews") {
      score += 30;
      reasons.push("Aligns with your review generation goal");
    }
    if (input.goals.includes("social-reach") && campaign.category === "Social") {
      score += 30;
      reasons.push("Aligns with your social reach goal");
    }
    if (input.goals.includes("referrals") && campaign.category === "Referrals") {
      score += 30;
      reasons.push("Aligns with your referral goal");
    }
    if (input.goals.includes("engagement") && campaign.category === "Engagement") {
      score += 25;
      reasons.push("Boosts engagement metrics");
    }
    if (input.goals.includes("brand-awareness") && campaign.category === "Sharing") {
      score += 25;
      reasons.push("Increases brand awareness");
    }

    // Tier bonus (essential campaigns are always recommended)
    if (campaign.tier === "essential") {
      score += 20;
      reasons.push("Essential campaign for any business");
    }

    // Completion rate bonus
    score += campaign.estimatedCompletionRate * 0.3;

    // Past success in similar categories
    const pastInCategory = input.completionHistory.filter(h => h.category === campaign.category);
    if (pastInCategory.length > 0) {
      const avgCompletions = pastInCategory.reduce((s, h) => s + h.completions, 0) / pastInCategory.length;
      if (avgCompletions > 10) {
        score += 15;
        reasons.push("You've had success with similar campaigns");
      }
    }

    if (score > 20) {
      recommendations.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        score,
        reason: reasons.join(". ") + ".",
        expectedImpact: campaign.estimatedReach > 5000 ? "High reach potential" : "Steady growth builder",
        priority: score > 60 ? "high" : score > 40 ? "medium" : "low",
      });
    }
  }

  return recommendations.sort((a, b) => b.score - a.score).slice(0, 10);
}

// ═══════════════ Pricing Oracle ═══════════════

export interface PricingEstimate {
  actionId: string;
  marketRate: number;
  suggestedPerk: { value: number; type: "pct" | "dol" };
  completionRate: number;
  roi: number;
  confidence: "high" | "medium" | "low";
}

export function estimatePricing(
  actionId: string,
  businessType: string,
  _businessSize: BusinessSize = "small"
): PricingEstimate {
  // Base pricing from the action's value field
  // In production, this would query historical transaction data
  const traits = detectTraits(businessType);

  // Value multipliers based on business traits
  let multiplier = 1.0;
  if (traits.luxury) multiplier *= 1.5;
  if (traits.food) multiplier *= 1.1;
  if (traits.b2b) multiplier *= 1.3;

  // Simulated market data (would come from DB in production)
  const baseValue = getActionBaseValue(actionId);
  const marketRate = baseValue * multiplier;

  return {
    actionId,
    marketRate: Math.round(marketRate * 100) / 100,
    suggestedPerk: {
      value: Math.round(marketRate * 2.5),
      type: marketRate > 5 ? "dol" : "pct",
    },
    completionRate: Math.min(85, Math.max(20, 70 - baseValue * 5)),
    roi: Math.round(marketRate * 3.2 * 100) / 100,
    confidence: baseValue > 0 ? "medium" : "low",
  };
}

function getActionBaseValue(actionId: string): number {
  // Quick lookup table for action base values
  const values: Record<string, number> = {
    ig_st: 1.5, ig_sl: 1.2, ig_sp: 2, ig_fp: 2.5, ig_fc: 3.5, ig_rl: 4, ig_cb: 5,
    ig_lv: 3, ig_gd: 3.5, ig_hl: 2, ig_fo: 0.3, ig_lk: 0.1, ig_cm: 0.8, ig_sv: 0.5,
    ig_sd: 1, ig_ss: 1.5, tt_vd: 3.5, tt_rv: 4, tt_du: 3, tt_st: 3, tt_ph: 2.5,
    tt_fo: 0.3, tt_lk: 0.1, tt_cm: 0.5, tt_sh: 1, go_rv: 5, go_rd: 8, go_rp: 10,
    go_ph: 2, go_qa: 1.5, fb_po: 1.5, fb_sy: 1, fb_rl: 3, fb_ci: 0.5, fb_cp: 1.5,
    fb_rc: 4, fb_lp: 0.3, fb_fw: 0.3, fb_sh: 1, fb_cm: 0.5, fb_ev: 0.5, fb_gr: 3,
    fb_tg: 1, xw_po: 1, xw_pp: 1.5, xw_pv: 2.5, xw_th: 3, xw_rp: 0.5, xw_qt: 1.5,
    xw_fo: 0.3, xw_lk: 0.1, xw_ry: 0.5, yt_sh: 4, yt_vd: 8, yt_rv: 12, yt_sb: 0.5,
    yt_lk: 0.1, yt_cm: 0.5, yp_rv: 5, yp_rp: 8, yp_ph: 1.5, yp_ci: 0.3,
    li_po: 2.5, li_ar: 5, li_sh: 1, li_fo: 0.3, li_cm: 0.5, pi_ph: 1.5, pi_vd: 2.5,
    pi_id: 3, pi_sv: 0.3, pi_fo: 0.2, nd_rc: 4, nd_po: 3, nd_ev: 1.5,
    th_po: 1, th_pp: 1.5, th_rp: 0.5, th_fo: 0.2, sc_sn: 1, sc_sy: 1.5, sc_sp: 3,
    ta_rv: 5, ta_rp: 8, rd_po: 2.5, rd_cm: 1.5, rd_up: 0.2,
    rf_fr: 8, rf_ip: 10, rf_gc: 2, rf_em: 1.5,
  };
  return values[actionId] ?? 1;
}

// ═══════════════ Benchmark Data ═══════════════

export interface Benchmark {
  businessType: string;
  avgCompletionRate: number;
  avgPerkValue: number;
  topPlatforms: string[];
  topCampaignTypes: string[];
  avgROI: number;
  monthlyActions: number;
  /** "estimate" — these are illustrative category defaults, not measured industry data. */
  basis: "estimate";
  disclaimer: string;
}

export function getBenchmarks(businessType: string): Benchmark {
  const traits = detectTraits(businessType);

  let avgCompletionRate = 45;
  let avgPerkValue = 12;
  const topPlatforms: string[] = ["Instagram", "Google"];
  const topCampaignTypes: string[] = ["Reviews", "Social"];
  let avgROI = 3.2;

  if (traits.food) {
    avgCompletionRate = 55;
    avgPerkValue = 10;
    topPlatforms.push("TikTok", "Yelp");
    topCampaignTypes.push("Engagement");
    avgROI = 4.1;
  }
  if (traits.visual) {
    avgCompletionRate = 50;
    topPlatforms.push("TikTok", "Pinterest");
    avgROI = 3.8;
  }
  if (traits.service) {
    avgCompletionRate = 40;
    avgPerkValue = 15;
    topCampaignTypes.push("Referrals");
    avgROI = 5.2;
  }
  if (traits.b2b) {
    avgCompletionRate = 35;
    avgPerkValue = 20;
    topPlatforms.push("LinkedIn");
    topCampaignTypes.push("Professional");
    avgROI = 6.5;
  }

  return {
    businessType,
    avgCompletionRate,
    avgPerkValue,
    topPlatforms: [...new Set(topPlatforms)].slice(0, 4),
    topCampaignTypes: [...new Set(topCampaignTypes)].slice(0, 4),
    avgROI,
    monthlyActions: Math.floor(avgCompletionRate * 4.5),
    basis: "estimate",
    disclaimer:
      "Illustrative category estimates, not measured industry data. Pre-launch defaults — " +
      "replace with real cohort data once available.",
  };
}
