/**
 * AI Marketing Campaign Agent — Specialized Campaigns
 *
 * Business-type-specific campaign recommendations: transformation showcases,
 * food content, B2B authority, member retention, and contractor programs.
 */

import type { BusinessTraits } from "../ai-engine";
import type { BusinessProfile, BusinessTypeProfile, CampaignRecommendation } from "./types";
import { buildRecommendation } from "./recommendation-builder";

/**
 * Generates business-type-specific campaign recommendations and appends
 * them to the provided recommendations array.
 */
export function addSpecializedCampaigns(
  recommendations: CampaignRecommendation[],
  profile: BusinessProfile,
  typeProfile: BusinessTypeProfile,
  traits: BusinessTraits,
  avgTx: number,
): void {
  const add = (params: Parameters<typeof buildRecommendation>[0]) => {
    recommendations.push(buildRecommendation(params, avgTx, typeProfile, profile.type));
  };

  // ── 6. BUSINESS-TYPE-SPECIFIC CAMPAIGN ──
  if (traits.transform && !recommendations.some(r => r.name.includes("Transformation"))) {
    add({
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
    add({
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
    add({
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
    add({
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
    add({
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
      add({
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
    add({
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
}
