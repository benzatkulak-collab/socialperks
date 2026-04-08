/**
 * AI Marketing Campaign Agent — Core Recommendations
 *
 * Generates universal campaign recommendations (review/social proof,
 * Instagram, TikTok, referral, local discovery) and delegates to
 * specialized-campaigns.ts for business-type-specific ones.
 */

import type { BusinessProfile, CampaignRecommendation } from "./types";
import { buildRecommendation } from "./recommendation-builder";
import { addSpecializedCampaigns } from "./specialized-campaigns";
import {
  analyzeBusinessType,
  analyzeSocialPresence,
  analyzeCompetition,
} from "./analysis";

export function generateRecommendations(profile: BusinessProfile): CampaignRecommendation[] {
  const { profile: typeProfile, traits } = analyzeBusinessType(profile.type);
  const socialAnalysis = analyzeSocialPresence(profile.socialPresence);

  const recommendations: CampaignRecommendation[] = [];
  const avgTx = profile.averageTransactionValue ?? typeProfile.avgTransactionValue;

  const add = (params: Parameters<typeof buildRecommendation>[0]) => {
    recommendations.push(buildRecommendation(params, avgTx, typeProfile, profile.type));
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

    add({
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
      reasoning: `Social proof is the single most important marketing asset for a ${profile.type}. ${lowReviews ? `With only ${profile.reviewCount ?? 0} reviews, you are behind the area average of ${analyzeCompetition(profile.type, profile.location).averageReviewCountInArea}.` : "Maintaining a steady stream of social proof keeps you competitive."} Important: Google, Yelp, and TripAdvisor prohibit incentivized reviews. Instead, this program incentivizes photo uploads, check-ins, and Facebook Recommendations. After customers complete these actions, separately ask for Google/Yelp reviews without tying to any reward — customers who just posted about you are more likely to also leave a review.`,
      dataPoints: [
        "93% of consumers read reviews before visiting a local business",
        "Businesses with 50+ reviews earn 266% more leads",
        "Google/Yelp photo uploads improve listing visibility by 35%",
        `The average ${profile.type.toLowerCase()} in your area has ${analyzeCompetition(profile.type, profile.location).averageReviewCountInArea} reviews`,
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

    add({
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

    add({
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
    add({
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

    add({
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

  // ── 6-8. Business-type-specific, member retention, and contractor campaigns ──
  addSpecializedCampaigns(recommendations, profile, typeProfile, traits, avgTx);

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
