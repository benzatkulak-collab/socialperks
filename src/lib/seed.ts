/**
 * Seed Data — Extended for all audiences
 *
 * Includes demo businesses across sizes, demo influencers,
 * and realistic platform stats.
 */

export interface SeedBusiness {
  id: string;
  name: string;
  type: string;
  email: string;
  pin: string;
  avatar: string;
  size: "solo" | "small" | "medium" | "enterprise";
  location: string;
  industry: string;
}

export interface SeedInfluencer {
  id: string;
  displayName: string;
  email: string;
  pin: string;
  avatar: string;
  bio: string;
  tier: "micro" | "mid" | "macro" | "mega";
  niches: string[];
  followerCount: number;
  engagementRate: number;
  platforms: { platformId: string; handle: string; followers: number }[];
  location: string;
}

export interface SeedStats {
  businessesActive: number;
  influencersActive: number;
  reviewsGenerated: number;
  socialPostsCreated: number;
  referralsMade: number;
  totalPerksEarned: number;
  totalMarketingValue: number;
  actionsCompleted: number;
  platformsConnected: number;
  campaignsRunning: number;
}

export interface SeedData {
  businesses: SeedBusiness[];
  influencers: SeedInfluencer[];
  campaigns: Record<string, unknown>[];
  stats: SeedStats;
}

export function createSeedData(): SeedData {
  return {
    businesses: [
      // Mom & Pop — Solo/Small
      { id: "b1", name: "Sunrise Yoga DC", type: "Yoga Studio", email: "yoga@demo.com", pin: "1234", avatar: "🧘", size: "solo", location: "Washington, DC", industry: "Wellness" },
      { id: "b2", name: "Taqueria Sol", type: "Restaurant", email: "sol@demo.com", pin: "1234", avatar: "🌮", size: "small", location: "Washington, DC", industry: "Food & Beverage" },
      { id: "b3", name: "Glow Studio", type: "Salon", email: "glow@demo.com", pin: "1234", avatar: "💇", size: "small", location: "Arlington, VA", industry: "Beauty" },
      { id: "b4", name: "Iron Temple", type: "Gym", email: "iron@demo.com", pin: "1234", avatar: "🏋️", size: "small", location: "Bethesda, MD", industry: "Fitness" },
      { id: "b5", name: "Baked & Wired", type: "Coffee Shop", email: "baked@demo.com", pin: "1234", avatar: "☕", size: "small", location: "Georgetown, DC", industry: "Food & Beverage" },
      { id: "b6", name: "Ink Masters DC", type: "Tattoo Parlor", email: "ink@demo.com", pin: "1234", avatar: "🎨", size: "solo", location: "Adams Morgan, DC", industry: "Art & Body" },
      { id: "b7", name: "Happy Paws Vet", type: "Veterinarian", email: "vet@demo.com", pin: "1234", avatar: "🐾", size: "small", location: "Silver Spring, MD", industry: "Pet Care" },
      { id: "b8", name: "Bloom Florist", type: "Florist", email: "bloom@demo.com", pin: "1234", avatar: "💐", size: "solo", location: "Dupont Circle, DC", industry: "Retail" },
      { id: "b9", name: "Smith & Co Law", type: "Law Firm", email: "smith@demo.com", pin: "1234", avatar: "⚖️", size: "small", location: "K Street, DC", industry: "Professional Services" },
      { id: "b10", name: "Spark Auto", type: "Auto Mechanic", email: "spark@demo.com", pin: "1234", avatar: "🔧", size: "small", location: "Falls Church, VA", industry: "Automotive" },

      // Medium businesses
      { id: "b11", name: "District Dental", type: "Dental Practice", email: "dental@demo.com", pin: "1234", avatar: "🦷", size: "medium", location: "Washington, DC", industry: "Healthcare" },
      { id: "b12", name: "Potomac Pizza Co", type: "Pizza Chain", email: "pizza@demo.com", pin: "1234", avatar: "🍕", size: "medium", location: "DMV Area", industry: "Food & Beverage" },
      { id: "b13", name: "Urban Escape Rooms", type: "Escape Room", email: "escape@demo.com", pin: "1234", avatar: "🔐", size: "medium", location: "Washington, DC", industry: "Entertainment" },

      // Enterprise
      { id: "b14", name: "FreshFit Gyms", type: "Gym Chain", email: "enterprise@demo.com", pin: "1234", avatar: "💪", size: "enterprise", location: "East Coast", industry: "Fitness" },
      { id: "b15", name: "GreenLeaf Organic Market", type: "Grocery Chain", email: "organic@demo.com", pin: "1234", avatar: "🥬", size: "enterprise", location: "Mid-Atlantic", industry: "Grocery" },
    ],

    influencers: [
      { id: "i1", displayName: "Priya Eats DC", email: "priya@demo.com", pin: "1234", avatar: "🍜", bio: "Food blogger exploring the DC dining scene", tier: "mid", niches: ["food", "restaurants", "local"], followerCount: 45000, engagementRate: 4.2, platforms: [{ platformId: "ig", handle: "@priya.eats.dc", followers: 35000 }, { platformId: "tt", handle: "@priyaeatsdc", followers: 10000 }], location: "Washington, DC" },
      { id: "i2", displayName: "FitWithMarcus", email: "marcus@demo.com", pin: "1234", avatar: "💪", bio: "Certified trainer & fitness content creator", tier: "mid", niches: ["fitness", "wellness", "gym"], followerCount: 78000, engagementRate: 5.1, platforms: [{ platformId: "ig", handle: "@fitwithmarcus", followers: 50000 }, { platformId: "tt", handle: "@fitwithmarcus", followers: 28000 }], location: "Arlington, VA" },
      { id: "i3", displayName: "DCStyleDiary", email: "style@demo.com", pin: "1234", avatar: "👗", bio: "Fashion & lifestyle in the capital", tier: "micro", niches: ["fashion", "lifestyle", "beauty"], followerCount: 8500, engagementRate: 6.8, platforms: [{ platformId: "ig", handle: "@dcstylediary", followers: 8500 }], location: "Washington, DC" },
      { id: "i4", displayName: "LocalLens Photography", email: "photo@demo.com", pin: "1234", avatar: "📷", bio: "Capturing DC's best businesses and hidden gems", tier: "micro", niches: ["photography", "local", "food"], followerCount: 12000, engagementRate: 7.2, platforms: [{ platformId: "ig", handle: "@locallens.dc", followers: 12000 }], location: "Washington, DC" },
      { id: "i5", displayName: "TheWellnessWitch", email: "wellness@demo.com", pin: "1234", avatar: "🧙‍♀️", bio: "Yoga, meditation & holistic wellness journey", tier: "macro", niches: ["wellness", "yoga", "meditation", "health"], followerCount: 230000, engagementRate: 3.4, platforms: [{ platformId: "ig", handle: "@thewellnesswitch", followers: 150000 }, { platformId: "tt", handle: "@wellnesswitch", followers: 60000 }, { platformId: "yt", handle: "@TheWellnessWitch", followers: 20000 }], location: "Bethesda, MD" },
    ],

    campaigns: [],

    stats: {
      businessesActive: 312,
      influencersActive: 2400,
      reviewsGenerated: 18900,
      socialPostsCreated: 45200,
      referralsMade: 6800,
      totalPerksEarned: 142000,
      totalMarketingValue: 892000,
      actionsCompleted: 71900,
      platformsConnected: 15,
      campaignsRunning: 2340,
    },
  };
}
