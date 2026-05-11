// ══════════════════════════════════════════════════════════════════════════════
// Onboarding Campaign Templates
//
// Returns a sensible default campaign for the onboarding wizard's Step 4
// based on the industry the user selected in Step 2. Lets brand-new users
// see a realistic, fillable campaign before they've ever thought about
// what to ask customers for.
// ══════════════════════════════════════════════════════════════════════════════

export interface CampaignTemplate {
  /** Display name of the campaign — pre-filled but editable */
  name: string;
  /** The marketing action customers perform (CTA wording) */
  action: string;
  /** The reward the business gives in exchange */
  perk: string;
  /** Default platform (matches the four platform slugs from Step 3) */
  platform: "instagram" | "google" | "tiktok" | "facebook";
  /** One-line description used as a placeholder/help text */
  description: string;
}

const DEFAULT_TEMPLATE: CampaignTemplate = {
  name: "Share & save",
  action: "Tag us in a post about your visit",
  perk: "10% off your next visit",
  platform: "instagram",
  description: "Reward customers for posting about your business.",
};

const TEMPLATES: Record<string, CampaignTemplate> = {
  restaurant: {
    name: "Post-a-plate",
    action: "Post a photo of your meal and tag us",
    perk: "10% off your next visit",
    platform: "instagram",
    description: "Diners love sharing food photos — reward them for it.",
  },
  "coffee-shop": {
    name: "Latte love",
    action: "Tag us on Instagram in a story or post",
    perk: "Free latte upgrade",
    platform: "instagram",
    description: "Coffee runs are the most photographed moment of the day.",
  },
  "yoga-studio": {
    name: "Class to class",
    action: "Post about your class on Instagram",
    perk: "Free week trial for a friend",
    platform: "instagram",
    description: "Yoga grows on word-of-mouth — make sharing automatic.",
  },
  salon: {
    name: "Transformation Tuesday",
    action: "Share your new look (before/after welcome!)",
    perk: "$10 off your next service",
    platform: "instagram",
    description: "Hair and beauty are made for sharing. Reward the post.",
  },
  gym: {
    name: "Gains for gains",
    action: "Post a gym selfie or workout clip and tag us",
    perk: "One free guest pass",
    platform: "instagram",
    description: "Members already post their progress — give them a reason.",
  },
  "retail-boutique": {
    name: "Outfit of the day",
    action: "Share your haul or OOTD and tag the shop",
    perk: "15% off your next purchase",
    platform: "instagram",
    description: "Style content gets shared — make sure you're credited.",
  },
  bakery: {
    name: "Sweet share",
    action: "Post a photo of your treat and tag us",
    perk: "Free pastry with your next coffee",
    platform: "instagram",
    description: "Baked goods are scroll candy. Reward the photo.",
  },
  florist: {
    name: "Bloom & share",
    action: "Share your bouquet on Instagram",
    perk: "10% off your next arrangement",
    platform: "instagram",
    description: "Flowers are the most-photographed purchase. Turn it into reach.",
  },
  dentist: {
    name: "Smile and tell",
    action: "Leave us a Google review about your visit",
    perk: "$25 off your next cleaning",
    platform: "google",
    description: "Reviews drive new-patient bookings more than anything else.",
  },
  photographer: {
    name: "Tag the artist",
    action: "Credit & tag the studio when you post your photos",
    perk: "Free 8x10 print on your next session",
    platform: "instagram",
    description: "Clients post their photos anyway — make sure you're tagged.",
  },
  "food-truck": {
    name: "Truck spotting",
    action: "Post a story showing where the truck is parked",
    perk: "Free side with your next order",
    platform: "instagram",
    description: "Stories drive same-day walk-ups. Turn customers into a beacon.",
  },
  brewery: {
    name: "Pint and post",
    action: "Share a photo from the taproom and tag us",
    perk: "$2 off your next pint",
    platform: "instagram",
    description: "Beer pics are bar-none the best organic ad you can get.",
  },
  bar: {
    name: "Cheers to you",
    action: "Tag us in a story from the bar",
    perk: "Free appetizer on your next visit",
    platform: "instagram",
    description: "Nightlife runs on social proof. Reward the tag.",
  },
  "pet-store": {
    name: "Pet of the week",
    action: "Post a pic of your pet with their new gear",
    perk: "10% off your next pet supply order",
    platform: "instagram",
    description: "Pet content is the most-shared content on the internet.",
  },
  bookstore: {
    name: "Shelfie share",
    action: "Post a photo of your new book and tag the shop",
    perk: "$5 off your next book",
    platform: "instagram",
    description: "Bookstagram is real — and it's free advertising waiting to happen.",
  },
};

/**
 * Returns a sensible campaign template for a given industry slug.
 * Falls back to a generic "post and tag" template if the industry isn't known.
 *
 * @param industry — slug like "coffee-shop", "yoga-studio", etc.
 */
export function getCampaignTemplate(industry: string): CampaignTemplate {
  if (!industry) return DEFAULT_TEMPLATE;
  const normalized = industry.toLowerCase().trim();
  return TEMPLATES[normalized] ?? DEFAULT_TEMPLATE;
}

/** List of industry slugs the wizard's industry dropdown should show. */
export const ONBOARDING_INDUSTRIES: { slug: string; label: string }[] = [
  { slug: "restaurant", label: "Restaurant" },
  { slug: "coffee-shop", label: "Coffee Shop" },
  { slug: "yoga-studio", label: "Yoga Studio" },
  { slug: "salon", label: "Salon / Barbershop" },
  { slug: "gym", label: "Gym / Fitness Studio" },
  { slug: "retail-boutique", label: "Retail Boutique" },
  { slug: "bakery", label: "Bakery" },
  { slug: "florist", label: "Florist" },
  { slug: "dentist", label: "Dentist / Medical Practice" },
  { slug: "photographer", label: "Photographer" },
  { slug: "food-truck", label: "Food Truck" },
  { slug: "brewery", label: "Brewery" },
  { slug: "bar", label: "Bar / Nightlife" },
  { slug: "pet-store", label: "Pet Store / Groomer" },
  { slug: "bookstore", label: "Bookstore" },
  { slug: "spa", label: "Spa / Wellness" },
  { slug: "tattoo-shop", label: "Tattoo / Piercing Studio" },
  { slug: "auto-shop", label: "Auto Shop / Detailer" },
  { slug: "real-estate", label: "Real Estate" },
  { slug: "other", label: "Other" },
];
