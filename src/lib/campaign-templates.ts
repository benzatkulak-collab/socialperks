/**
 * Pre-built Campaign Templates
 *
 * Industry-specific one-click campaign templates that businesses can
 * use to quickly launch proven marketing campaigns. Each template
 * maps to real platform IDs and action IDs from platforms.ts.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CampaignTemplate {
  id: string;
  name: string;
  industry: string;
  platform: string;
  platformName: string;
  actionId: string;
  actionLabel: string;
  description: string;
  guidelines: string;
  discountType: "pct" | "dol";
  discountValue: number;
  expiresInDays: number;
  maxCompletions: number;
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  estimatedRoi: string;
  icon: string;
}

// ─── Templates ──────────────────────────────────────────────────────────────

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [

  // ═══════════════ Restaurants ═══════════════

  {
    id: "rest-google-review",
    name: "Google Review for Diners",
    industry: "restaurant",
    platform: "go",
    platformName: "Google",
    actionId: "go_rv",
    actionLabel: "Review",
    description: "Customers leave an honest Google review after dining and receive a discount on their next visit.",
    guidelines: "Share your genuine dining experience. Mention the dish you tried and the atmosphere. Photos are welcome but not required.",
    discountType: "pct",
    discountValue: 15,
    expiresInDays: 30,
    maxCompletions: 200,
    tags: ["reviews", "seo", "local"],
    difficulty: "easy",
    estimatedRoi: "8x",
    icon: "⭐",
  },
  {
    id: "rest-ig-story",
    name: "Instagram Story: Tag Us",
    industry: "restaurant",
    platform: "ig",
    platformName: "Instagram",
    actionId: "ig_st",
    actionLabel: "Story Tag",
    description: "Customers post an Instagram Story tagging your restaurant while dining.",
    guidelines: "Tag our account and add a location sticker. Show your food, the vibe, or your table. Stories must be visible for 24 hours.",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 14,
    maxCompletions: 500,
    tags: ["social", "awareness", "visual"],
    difficulty: "easy",
    estimatedRoi: "5x",
    icon: "📸",
  },
  {
    id: "rest-tiktok-video",
    name: "TikTok Food Video",
    industry: "restaurant",
    platform: "tt",
    platformName: "TikTok",
    actionId: "tt_vd",
    actionLabel: "Video",
    description: "Customers create a short TikTok video showcasing their meal or dining experience.",
    guidelines: "Film your food, the first bite reaction, or the restaurant ambiance. Tag our account and use our branded hashtag. Minimum 15 seconds.",
    discountType: "dol",
    discountValue: 10,
    expiresInDays: 30,
    maxCompletions: 100,
    tags: ["viral", "video", "food"],
    difficulty: "medium",
    estimatedRoi: "10x",
    icon: "🎬",
  },
  {
    id: "rest-fb-checkin",
    name: "Facebook Check-in",
    industry: "restaurant",
    platform: "fb",
    platformName: "Facebook",
    actionId: "fb_ci",
    actionLabel: "Check-in",
    description: "Customers check in on Facebook when they visit your restaurant.",
    guidelines: "Check in at our location on Facebook. A short comment about your visit is appreciated but not required.",
    discountType: "pct",
    discountValue: 5,
    expiresInDays: 7,
    maxCompletions: 1000,
    tags: ["local", "awareness", "easy"],
    difficulty: "easy",
    estimatedRoi: "4x",
    icon: "👍",
  },

  // ═══════════════ Coffee Shops ═══════════════

  {
    id: "coffee-ig-photo",
    name: "Instagram Latte Art Photo",
    industry: "coffee_shop",
    platform: "ig",
    platformName: "Instagram",
    actionId: "ig_fp",
    actionLabel: "Feed Photo",
    description: "Customers post a photo of their drink on Instagram, tagging your coffee shop.",
    guidelines: "Post a photo of your drink or our space. Tag our account in the photo and caption. Use our branded hashtag.",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 14,
    maxCompletions: 300,
    tags: ["visual", "social", "coffee"],
    difficulty: "easy",
    estimatedRoi: "6x",
    icon: "📸",
  },
  {
    id: "coffee-google-review",
    name: "Google Review for Coffee Lovers",
    industry: "coffee_shop",
    platform: "go",
    platformName: "Google",
    actionId: "go_rv",
    actionLabel: "Review",
    description: "Regulars and new visitors leave an honest Google review about their experience.",
    guidelines: "Share your honest experience. Mention your favorite drink, the atmosphere, or the staff. Every review helps us improve.",
    discountType: "dol",
    discountValue: 2,
    expiresInDays: 30,
    maxCompletions: 200,
    tags: ["reviews", "seo", "local"],
    difficulty: "easy",
    estimatedRoi: "8x",
    icon: "⭐",
  },
  {
    id: "coffee-tiktok-bts",
    name: "TikTok Behind-the-Scenes",
    industry: "coffee_shop",
    platform: "tt",
    platformName: "TikTok",
    actionId: "tt_vd",
    actionLabel: "Video",
    description: "Customers film a behind-the-counter or latte art process video at your shop.",
    guidelines: "Film the barista making your drink, latte art, or the cozy ambiance. Tag our account and use our hashtag. Minimum 15 seconds.",
    discountType: "dol",
    discountValue: 5,
    expiresInDays: 21,
    maxCompletions: 75,
    tags: ["viral", "video", "bts"],
    difficulty: "medium",
    estimatedRoi: "10x",
    icon: "🎬",
  },

  // ═══════════════ Salons / Barbershops ═══════════════

  {
    id: "salon-ig-before-after",
    name: "Instagram Before & After",
    industry: "salon",
    platform: "ig",
    platformName: "Instagram",
    actionId: "ig_fc",
    actionLabel: "Carousel",
    description: "Clients post a before/after carousel of their new look, tagging the salon.",
    guidelines: "Post a carousel with your before and after photos. Tag our account and stylist. Include what service you got in the caption.",
    discountType: "pct",
    discountValue: 15,
    expiresInDays: 21,
    maxCompletions: 150,
    tags: ["transformation", "visual", "social"],
    difficulty: "medium",
    estimatedRoi: "8x",
    icon: "📸",
  },
  {
    id: "salon-google-review",
    name: "Google Review for Salon Clients",
    industry: "salon",
    platform: "go",
    platformName: "Google",
    actionId: "go_rp",
    actionLabel: "Review + Photos",
    description: "Happy clients leave a Google review with a photo of their results.",
    guidelines: "Leave an honest review about your experience. Include a photo of your new style. Mention your stylist by name.",
    discountType: "pct",
    discountValue: 20,
    expiresInDays: 30,
    maxCompletions: 100,
    tags: ["reviews", "seo", "photos"],
    difficulty: "easy",
    estimatedRoi: "10x",
    icon: "⭐",
  },
  {
    id: "salon-tiktok-transformation",
    name: "TikTok Glow-Up Video",
    industry: "salon",
    platform: "tt",
    platformName: "TikTok",
    actionId: "tt_vd",
    actionLabel: "Video",
    description: "Clients film a transformation/glow-up TikTok at the salon.",
    guidelines: "Film the before, the process (with permission), and the reveal. Use a trending audio. Tag our account and use our hashtag.",
    discountType: "dol",
    discountValue: 15,
    expiresInDays: 30,
    maxCompletions: 50,
    tags: ["viral", "transformation", "video"],
    difficulty: "hard",
    estimatedRoi: "15x",
    icon: "🎬",
  },

  // ═══════════════ Gyms / Fitness ═══════════════

  {
    id: "gym-ig-story",
    name: "Instagram Gym Story",
    industry: "gym",
    platform: "ig",
    platformName: "Instagram",
    actionId: "ig_st",
    actionLabel: "Story Tag",
    description: "Members post an Instagram Story from the gym, tagging your account.",
    guidelines: "Post a story from the gym floor, a class, or your post-workout moment. Tag our account and add a location sticker.",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 14,
    maxCompletions: 500,
    tags: ["social", "fitness", "awareness"],
    difficulty: "easy",
    estimatedRoi: "5x",
    icon: "📸",
  },
  {
    id: "gym-tiktok-workout",
    name: "TikTok Workout Video",
    industry: "gym",
    platform: "tt",
    platformName: "TikTok",
    actionId: "tt_vd",
    actionLabel: "Video",
    description: "Members create a workout clip or gym tour TikTok featuring your facility.",
    guidelines: "Film a workout, a class highlight, or a gym tour. Tag our account and use our hashtag. Must show our facility clearly. Minimum 15 seconds.",
    discountType: "dol",
    discountValue: 10,
    expiresInDays: 30,
    maxCompletions: 75,
    tags: ["viral", "fitness", "video"],
    difficulty: "medium",
    estimatedRoi: "10x",
    icon: "🎬",
  },
  {
    id: "gym-google-review",
    name: "Google Review for Members",
    industry: "gym",
    platform: "go",
    platformName: "Google",
    actionId: "go_rv",
    actionLabel: "Review",
    description: "Members leave an honest review about the gym, classes, or trainers.",
    guidelines: "Share your genuine experience. Mention classes, equipment, trainers, or the community. Honest feedback helps us improve.",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 30,
    maxCompletions: 200,
    tags: ["reviews", "seo", "local"],
    difficulty: "easy",
    estimatedRoi: "8x",
    icon: "⭐",
  },

  // ═══════════════ Yoga Studios ═══════════════

  {
    id: "yoga-ig-story",
    name: "Instagram Yoga Story",
    industry: "yoga_studio",
    platform: "ig",
    platformName: "Instagram",
    actionId: "ig_st",
    actionLabel: "Story Tag",
    description: "Students post an Instagram Story from class or the studio, tagging your account.",
    guidelines: "Share your pre-class, in-class, or post-class moment. Tag our account and location. No pressure to show your practice if you prefer the space.",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 14,
    maxCompletions: 300,
    tags: ["wellness", "social", "awareness"],
    difficulty: "easy",
    estimatedRoi: "5x",
    icon: "📸",
  },
  {
    id: "yoga-google-review",
    name: "Google Review for Yogis",
    industry: "yoga_studio",
    platform: "go",
    platformName: "Google",
    actionId: "go_rv",
    actionLabel: "Review",
    description: "Students leave a Google review sharing their experience with your studio.",
    guidelines: "Share your honest experience with our classes, instructors, and studio environment. Mention which class you attend if you like.",
    discountType: "pct",
    discountValue: 15,
    expiresInDays: 30,
    maxCompletions: 150,
    tags: ["reviews", "seo", "wellness"],
    difficulty: "easy",
    estimatedRoi: "8x",
    icon: "⭐",
  },
  {
    id: "yoga-fb-post",
    name: "Facebook Studio Shoutout",
    industry: "yoga_studio",
    platform: "fb",
    platformName: "Facebook",
    actionId: "fb_po",
    actionLabel: "Post",
    description: "Students write a Facebook post about their yoga journey at your studio.",
    guidelines: "Share a post about your experience at our studio. Tag our page. Photos are welcome but optional. Genuine stories resonate the most.",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 21,
    maxCompletions: 100,
    tags: ["social", "storytelling", "community"],
    difficulty: "medium",
    estimatedRoi: "6x",
    icon: "👍",
  },

  // ═══════════════ Dentists / Doctors ═══════════════

  {
    id: "dentist-google-review",
    name: "Google Review for Patients",
    industry: "dentist",
    platform: "go",
    platformName: "Google",
    actionId: "go_rv",
    actionLabel: "Review",
    description: "Patients leave an honest Google review after their appointment.",
    guidelines: "Share your experience with our practice. Mention the staff, wait time, comfort level, or treatment quality. Your feedback helps other patients choose confidently.",
    discountType: "dol",
    discountValue: 10,
    expiresInDays: 60,
    maxCompletions: 150,
    tags: ["reviews", "seo", "healthcare"],
    difficulty: "easy",
    estimatedRoi: "12x",
    icon: "⭐",
  },
  {
    id: "dentist-fb-recommendation",
    name: "Facebook Recommendation",
    industry: "dentist",
    platform: "fb",
    platformName: "Facebook",
    actionId: "fb_rc",
    actionLabel: "Recommendation",
    description: "Happy patients recommend your practice on Facebook.",
    guidelines: "Recommend our practice on Facebook. Share what makes us different or why you trust us. Tag our page so friends can find us easily.",
    discountType: "dol",
    discountValue: 10,
    expiresInDays: 60,
    maxCompletions: 100,
    tags: ["reviews", "trust", "referral"],
    difficulty: "easy",
    estimatedRoi: "10x",
    icon: "👍",
  },

  // ═══════════════ Veterinarians ═══════════════

  {
    id: "vet-google-review",
    name: "Google Review from Pet Parents",
    industry: "veterinarian",
    platform: "go",
    platformName: "Google",
    actionId: "go_rp",
    actionLabel: "Review + Photos",
    description: "Pet parents leave a Google review with a photo of their happy pet.",
    guidelines: "Share your visit experience and include a photo of your pet (at the clinic or after). Mention the vet or staff who helped. Honest reviews help other pet parents.",
    discountType: "dol",
    discountValue: 10,
    expiresInDays: 30,
    maxCompletions: 150,
    tags: ["reviews", "seo", "pets"],
    difficulty: "easy",
    estimatedRoi: "10x",
    icon: "⭐",
  },
  {
    id: "vet-ig-pet-photo",
    name: "Instagram Pet Photo",
    industry: "veterinarian",
    platform: "ig",
    platformName: "Instagram",
    actionId: "ig_fp",
    actionLabel: "Feed Photo",
    description: "Pet parents post a photo of their pet on Instagram tagging your clinic.",
    guidelines: "Post a cute photo of your pet (at the clinic or showing off their health). Tag our account. Use our hashtag. Pet tax is always appreciated!",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 21,
    maxCompletions: 200,
    tags: ["visual", "social", "pets"],
    difficulty: "easy",
    estimatedRoi: "6x",
    icon: "📸",
  },

  // ═══════════════ Auto Repair ═══════════════

  {
    id: "auto-google-review",
    name: "Google Review for Auto Shop",
    industry: "auto_repair",
    platform: "go",
    platformName: "Google",
    actionId: "go_rv",
    actionLabel: "Review",
    description: "Customers leave a Google review after their car service is completed.",
    guidelines: "Share your honest experience. Mention the service quality, pricing transparency, turnaround time, or staff friendliness. Helps other drivers find a trusted shop.",
    discountType: "dol",
    discountValue: 15,
    expiresInDays: 30,
    maxCompletions: 100,
    tags: ["reviews", "seo", "auto"],
    difficulty: "easy",
    estimatedRoi: "10x",
    icon: "⭐",
  },
  {
    id: "auto-yelp-review",
    name: "Yelp Review for Auto Shop",
    industry: "auto_repair",
    platform: "yp",
    platformName: "Yelp",
    actionId: "yp_rv",
    actionLabel: "Review",
    description: "Customers leave a Yelp review after getting their car serviced.",
    guidelines: "Share your experience on Yelp. Mention the service, pricing, or staff. Yelp reviews help local drivers find reliable mechanics.",
    discountType: "dol",
    discountValue: 15,
    expiresInDays: 30,
    maxCompletions: 75,
    tags: ["reviews", "local", "auto"],
    difficulty: "easy",
    estimatedRoi: "10x",
    icon: "🔴",
  },
  {
    id: "auto-fb-recommendation",
    name: "Facebook Recommendation",
    industry: "auto_repair",
    platform: "fb",
    platformName: "Facebook",
    actionId: "fb_rc",
    actionLabel: "Recommendation",
    description: "Customers recommend your auto shop on Facebook.",
    guidelines: "Recommend our shop on Facebook. Mention the service you got and why you trust us. Tag our page so friends looking for a mechanic can find us.",
    discountType: "dol",
    discountValue: 10,
    expiresInDays: 30,
    maxCompletions: 100,
    tags: ["reviews", "trust", "referral"],
    difficulty: "easy",
    estimatedRoi: "8x",
    icon: "👍",
  },

  // ═══════════════ Retail / Boutiques ═══════════════

  {
    id: "retail-ig-product",
    name: "Instagram Product Photo",
    industry: "retail",
    platform: "ig",
    platformName: "Instagram",
    actionId: "ig_fp",
    actionLabel: "Feed Photo",
    description: "Shoppers post a photo of their purchase on Instagram, tagging your shop.",
    guidelines: "Post a photo of your purchase styled or in use. Tag our account in the photo and caption. Show off your find!",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 21,
    maxCompletions: 200,
    tags: ["visual", "social", "shopping"],
    difficulty: "easy",
    estimatedRoi: "6x",
    icon: "📸",
  },
  {
    id: "retail-tiktok-haul",
    name: "TikTok Shopping Haul",
    industry: "retail",
    platform: "tt",
    platformName: "TikTok",
    actionId: "tt_vd",
    actionLabel: "Video",
    description: "Shoppers create a TikTok haul or unboxing video featuring products from your store.",
    guidelines: "Film an unboxing or haul of your purchases. Show each item and share your thoughts. Tag our account and use our hashtag. Minimum 15 seconds.",
    discountType: "pct",
    discountValue: 20,
    expiresInDays: 30,
    maxCompletions: 50,
    tags: ["viral", "video", "haul"],
    difficulty: "medium",
    estimatedRoi: "12x",
    icon: "🎬",
  },
  {
    id: "retail-pinterest-pin",
    name: "Pinterest Product Pin",
    industry: "retail",
    platform: "pi",
    platformName: "Pinterest",
    actionId: "pi_ph",
    actionLabel: "Pin Photo",
    description: "Shoppers pin a styled photo of their purchase to Pinterest.",
    guidelines: "Create a Pinterest pin featuring your purchase. Use a well-lit, styled photo. Link back to our shop if possible. Add relevant keywords in the description.",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 30,
    maxCompletions: 150,
    tags: ["visual", "discovery", "evergreen"],
    difficulty: "medium",
    estimatedRoi: "7x",
    icon: "📌",
  },

  // ═══════════════ Hotels / BnBs ═══════════════

  {
    id: "hotel-tripadvisor-review",
    name: "TripAdvisor Guest Review",
    industry: "hotel",
    platform: "ta",
    platformName: "TripAdvisor",
    actionId: "ta_rv",
    actionLabel: "Review",
    description: "Guests leave a TripAdvisor review after their stay.",
    guidelines: "Share your stay experience on TripAdvisor. Mention the room, amenities, location, or staff. Honest reviews help future travelers decide.",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 60,
    maxCompletions: 200,
    tags: ["reviews", "travel", "trust"],
    difficulty: "easy",
    estimatedRoi: "12x",
    icon: "🦉",
  },
  {
    id: "hotel-ig-story",
    name: "Instagram Stay Story",
    industry: "hotel",
    platform: "ig",
    platformName: "Instagram",
    actionId: "ig_st",
    actionLabel: "Story Tag",
    description: "Guests post Instagram Stories during their stay, tagging your property.",
    guidelines: "Share stories of the room, views, amenities, or local area. Tag our account and add a location sticker. Multiple stories welcome!",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 14,
    maxCompletions: 300,
    tags: ["social", "travel", "visual"],
    difficulty: "easy",
    estimatedRoi: "5x",
    icon: "📸",
  },
  {
    id: "hotel-google-review",
    name: "Google Review for Guests",
    industry: "hotel",
    platform: "go",
    platformName: "Google",
    actionId: "go_rp",
    actionLabel: "Review + Photos",
    description: "Guests leave a Google review with photos of their stay.",
    guidelines: "Share your stay experience with photos of the room, views, or breakfast. Mention what stood out. Helps future guests know what to expect.",
    discountType: "pct",
    discountValue: 15,
    expiresInDays: 60,
    maxCompletions: 150,
    tags: ["reviews", "seo", "photos"],
    difficulty: "easy",
    estimatedRoi: "10x",
    icon: "⭐",
  },

  // ═══════════════ Bakeries ═══════════════

  {
    id: "bakery-ig-photo",
    name: "Instagram Baked Goods Photo",
    industry: "bakery",
    platform: "ig",
    platformName: "Instagram",
    actionId: "ig_fp",
    actionLabel: "Feed Photo",
    description: "Customers post a drool-worthy photo of their pastry or baked goods on Instagram.",
    guidelines: "Post a photo of your pastry, cake, or bread. Tag our account. Good lighting makes everything look tastier. Use our hashtag.",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 14,
    maxCompletions: 300,
    tags: ["visual", "food", "social"],
    difficulty: "easy",
    estimatedRoi: "6x",
    icon: "📸",
  },
  {
    id: "bakery-tiktok-process",
    name: "TikTok Baking Process Video",
    industry: "bakery",
    platform: "tt",
    platformName: "TikTok",
    actionId: "tt_vd",
    actionLabel: "Video",
    description: "Customers film the baking process, decorating, or their first-bite reaction.",
    guidelines: "Film the cake decorating, bread scoring, or your first bite. Tag our account and use our hashtag. Satisfying visuals perform best. Minimum 15 seconds.",
    discountType: "dol",
    discountValue: 5,
    expiresInDays: 30,
    maxCompletions: 50,
    tags: ["viral", "video", "food"],
    difficulty: "medium",
    estimatedRoi: "10x",
    icon: "🎬",
  },
  {
    id: "bakery-google-review",
    name: "Google Review for Bakery",
    industry: "bakery",
    platform: "go",
    platformName: "Google",
    actionId: "go_rv",
    actionLabel: "Review",
    description: "Customers leave a Google review about their favorite baked goods.",
    guidelines: "Share your honest experience. Mention your favorite item, the freshness, or the service. Every review helps neighbors discover us.",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 30,
    maxCompletions: 200,
    tags: ["reviews", "seo", "local"],
    difficulty: "easy",
    estimatedRoi: "8x",
    icon: "⭐",
  },

  // ═══════════════ Breweries ═══════════════

  {
    id: "brewery-ig-story",
    name: "Instagram Brewery Story",
    industry: "brewery",
    platform: "ig",
    platformName: "Instagram",
    actionId: "ig_st",
    actionLabel: "Story Tag",
    description: "Visitors post an Instagram Story from the taproom, tagging your brewery.",
    guidelines: "Share a story of your pour, the taproom, or the flight. Tag our account and add a location sticker. Cheers!",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 14,
    maxCompletions: 400,
    tags: ["social", "awareness", "local"],
    difficulty: "easy",
    estimatedRoi: "5x",
    icon: "📸",
  },
  {
    id: "brewery-yelp-review",
    name: "Yelp Review for Brewery",
    industry: "brewery",
    platform: "yp",
    platformName: "Yelp",
    actionId: "yp_rv",
    actionLabel: "Review",
    description: "Visitors leave a Yelp review about the beers, atmosphere, and experience.",
    guidelines: "Share your experience on Yelp. Mention your favorite beer, the atmosphere, or the food pairings. Honest reviews help beer lovers find us.",
    discountType: "pct",
    discountValue: 10,
    expiresInDays: 30,
    maxCompletions: 100,
    tags: ["reviews", "local", "craft"],
    difficulty: "easy",
    estimatedRoi: "8x",
    icon: "🔴",
  },
  {
    id: "brewery-fb-checkin",
    name: "Facebook Brewery Check-in",
    industry: "brewery",
    platform: "fb",
    platformName: "Facebook",
    actionId: "fb_ci",
    actionLabel: "Check-in",
    description: "Visitors check in on Facebook when visiting the taproom.",
    guidelines: "Check in at our brewery on Facebook. Add a comment about what you are drinking if you like!",
    discountType: "pct",
    discountValue: 5,
    expiresInDays: 7,
    maxCompletions: 800,
    tags: ["local", "awareness", "easy"],
    difficulty: "easy",
    estimatedRoi: "4x",
    icon: "👍",
  },
];

// ─── Industry display names (for UI) ────────────────────────────────────────

export const INDUSTRY_MAP: Record<string, string> = {
  restaurant: "Restaurant",
  coffee_shop: "Coffee Shop",
  salon: "Salon / Barbershop",
  gym: "Gym / Fitness",
  yoga_studio: "Yoga Studio",
  dentist: "Dentist / Doctor",
  veterinarian: "Veterinarian",
  auto_repair: "Auto Repair",
  retail: "Retail / Boutique",
  hotel: "Hotel / BnB",
  bakery: "Bakery",
  brewery: "Brewery",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

import { findAction } from "./platforms";

/**
 * Filter templates that point at actions banned by platform ToS
 * (Google reviews, Yelp reviews, Tripadvisor reviews). Without this,
 * users see a quick-start template, click it, and the campaign launch
 * route 422s. Worse, they may not understand why and bounce.
 *
 * Single source of truth is `findAction(actionId).incentivizable`.
 */
function isCompliantTemplate(template: CampaignTemplate): boolean {
  const action = findAction(template.actionId);
  if (!action) return false;
  return action.incentivizable !== false;
}

/** Get templates filtered by industry slug, with prohibited actions removed. */
export function getTemplatesByIndustry(industry: string): CampaignTemplate[] {
  const normalized = industry.toLowerCase().replace(/[\s/&]+/g, "_");
  return CAMPAIGN_TEMPLATES
    .filter((t) => t.industry === normalized)
    .filter(isCompliantTemplate);
}

/**
 * Get the most popular/versatile compliant templates.
 * The previous popular list led with `rest-google-review`,
 * `dentist-google-review`, `auto-google-review`, `hotel-tripadvisor-review` —
 * all banned. Those have been removed and replaced with safe alternatives
 * (Instagram, TikTok, Facebook).
 */
export function getPopularTemplates(limit = 6): CampaignTemplate[] {
  const popularIds = [
    "rest-ig-story",
    "salon-ig-before-after",
    "coffee-ig-photo",
    "gym-tiktok-workout",
    "retail-tiktok-haul",
    "bakery-ig-photo",
    "vet-ig-pet-photo",
    "brewery-ig-story",
  ];
  const result: CampaignTemplate[] = [];
  for (const id of popularIds) {
    if (result.length >= limit) break;
    const tpl = CAMPAIGN_TEMPLATES.find((t) => t.id === id);
    if (tpl && isCompliantTemplate(tpl)) result.push(tpl);
  }
  return result;
}

/** Get a single template by ID — returns null if it's not compliant. */
export function getTemplateById(id: string): CampaignTemplate | null {
  const tpl = CAMPAIGN_TEMPLATES.find((t) => t.id === id);
  if (!tpl) return null;
  return isCompliantTemplate(tpl) ? tpl : null;
}

/** Full list, prohibited actions removed. Use this when you need everything. */
export function getAllCompliantTemplates(): CampaignTemplate[] {
  return CAMPAIGN_TEMPLATES.filter(isCompliantTemplate);
}
