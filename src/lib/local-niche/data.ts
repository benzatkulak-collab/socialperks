// Programmatic SEO data: niche × city × outcome grid (8 × 15 × 5 = 600 pages)

export interface LocalNiche {
  slug: string;
  name: string; // singular display
  plural: string; // "yoga studios"
  shortPlural: string; // "studios" — for variety
  audience: string; // "local yogis and wellness seekers"
  avgTicket: string; // "$25 drop-in / $150 monthly"
}

export interface LocalCity {
  slug: string;
  name: string;
  stateCode: string;
  state: string;
  population: string;
  vibe: string;
  flavor: string; // ~2 sentence local marketing flavor
}

export interface LocalOutcome {
  slug: string;
  name: string; // "Instagram Marketing"
  pretty: string; // "Instagram marketing"
  short: string; // "Instagram"
  benefit: string; // primary outcome the page promises
  channel: string; // primary channel/tactic
}

export const LOCAL_NICHES: LocalNiche[] = [
  {
    slug: "yoga-studios",
    name: "yoga studio",
    plural: "yoga studios",
    shortPlural: "studios",
    audience: "local yogis, wellness seekers, and lapsed members",
    avgTicket: "$25 drop-in or $150 unlimited monthly",
  },
  {
    slug: "coffee-shops",
    name: "coffee shop",
    plural: "coffee shops",
    shortPlural: "shops",
    audience: "morning regulars, remote workers, and weekend wanderers",
    avgTicket: "$6 latte plus $4 pastry add-on",
  },
  {
    slug: "restaurants",
    name: "restaurant",
    plural: "restaurants",
    shortPlural: "restaurants",
    audience: "date-night couples, foodies, and lunchtime locals",
    avgTicket: "$45 average dinner check per guest",
  },
  {
    slug: "salons",
    name: "salon",
    plural: "salons",
    shortPlural: "salons",
    audience: "style-conscious clients and referral-driven regulars",
    avgTicket: "$95 cut-and-color average ticket",
  },
  {
    slug: "gyms",
    name: "gym",
    plural: "gyms",
    shortPlural: "gyms",
    audience: "fitness newcomers, dedicated members, and January resolvers",
    avgTicket: "$89 monthly membership",
  },
  {
    slug: "bakeries",
    name: "bakery",
    plural: "bakeries",
    shortPlural: "bakeries",
    audience: "weekend brunchers, birthday parents, and gift shoppers",
    avgTicket: "$18 average per visit, $75 custom cake",
  },
  {
    slug: "boutiques",
    name: "boutique",
    plural: "boutiques",
    shortPlural: "boutiques",
    audience: "tastemakers, gift-givers, and repeat dressing-room regulars",
    avgTicket: "$110 average basket size",
  },
  {
    slug: "dental-practices",
    name: "dental practice",
    plural: "dental practices",
    shortPlural: "practices",
    audience: "families, new movers, and insurance-shoppers",
    avgTicket: "$320 cleaning + exam, $1,800 lifetime value year one",
  },
];

export const LOCAL_CITIES: LocalCity[] = [
  {
    slug: "austin",
    name: "Austin",
    stateCode: "TX",
    state: "Texas",
    population: "975,000",
    vibe: "creative, outdoorsy, festival-driven",
    flavor:
      "Austin's audience lives on Instagram Stories and rewards businesses that feel local-first and weirdly authentic. SXSW, ACL, and a year-round food-truck culture mean shareable moments win over polished ads.",
  },
  {
    slug: "denver",
    name: "Denver",
    stateCode: "CO",
    state: "Colorado",
    population: "713,000",
    vibe: "active, mountain-adjacent, health-forward",
    flavor:
      "Denver locals respond to brands that show up at trailheads, breweries, and neighborhood block parties. Word-of-mouth and Strava-style social proof matter more than glossy production.",
  },
  {
    slug: "nashville",
    name: "Nashville",
    stateCode: "TN",
    state: "Tennessee",
    population: "689,000",
    vibe: "music-driven, tourist-heavy, hospitality-first",
    flavor:
      "Nashville flips between locals and bachelorette tourists every weekend, so businesses need content that wins both. Storytelling and Southern warmth outperform discounting.",
  },
  {
    slug: "portland",
    name: "Portland",
    stateCode: "OR",
    state: "Oregon",
    population: "652,000",
    vibe: "independent, artisanal, anti-corporate",
    flavor:
      "Portland customers smell inauthenticity from a mile away and reward small, weird, owner-led brands. Maker stories and sourcing transparency convert better than promo codes.",
  },
  {
    slug: "miami",
    name: "Miami",
    stateCode: "FL",
    state: "Florida",
    population: "449,000",
    vibe: "visual, bilingual, nightlife-driven",
    flavor:
      "Miami runs on Reels, Spanish-language captions, and aspirational lifestyle imagery. High-energy visuals and influencer collabs are table stakes.",
  },
  {
    slug: "seattle",
    name: "Seattle",
    stateCode: "WA",
    state: "Washington",
    population: "750,000",
    vibe: "tech-savvy, rainy, neighborhood-loyal",
    flavor:
      "Seattle customers research before they buy and trust Google reviews more than Instagram polish. Hyper-local neighborhood targeting (Ballard vs Cap Hill) drives the best returns.",
  },
  {
    slug: "boston",
    name: "Boston",
    stateCode: "MA",
    state: "Massachusetts",
    population: "654,000",
    vibe: "academic, neighborhood-tribal, traditional",
    flavor:
      "Boston's student turnover every September plus its tight-knit neighborhoods reward consistent presence and referral-driven growth. Skip the gimmicks — locals reward earned trust.",
  },
  {
    slug: "atlanta",
    name: "Atlanta",
    stateCode: "GA",
    state: "Georgia",
    population: "498,000",
    vibe: "culture-defining, creator-economy hub",
    flavor:
      "Atlanta is one of the top creator economies in the US, so micro-influencer partnerships convert at unusually high rates. Black-owned-business networks and culture-led content carry real weight.",
  },
  {
    slug: "brooklyn",
    name: "Brooklyn",
    stateCode: "NY",
    state: "New York",
    population: "2,560,000",
    vibe: "hyper-local, taste-led, neighborhood-fragmented",
    flavor:
      "Brooklyn isn't one market — Williamsburg, Park Slope, and Bed-Stuy each behave like separate cities. Neighborhood-specific Instagram presence beats borough-wide spend every time.",
  },
  {
    slug: "chicago",
    name: "Chicago",
    stateCode: "IL",
    state: "Illinois",
    population: "2,665,000",
    vibe: "neighborhood-proud, four-season, value-aware",
    flavor:
      "Chicago locals are fiercely loyal to neighborhood favorites and reward businesses that lean into local pride. Seasonal campaigns (patio season, holiday markets) carry outsized weight.",
  },
  {
    slug: "los-angeles",
    name: "Los Angeles",
    stateCode: "CA",
    state: "California",
    population: "3,820,000",
    vibe: "image-driven, influencer-saturated, trend-setting",
    flavor:
      "LA is the most competitive social media market in the country — production value, aesthetic consistency, and creator partnerships are non-negotiable. Niche down geographically (Silver Lake vs Santa Monica) to stand out.",
  },
  {
    slug: "philadelphia",
    name: "Philadelphia",
    stateCode: "PA",
    state: "Pennsylvania",
    population: "1,550,000",
    vibe: "blue-collar, neighborhood-rooted, sports-obsessed",
    flavor:
      "Philly customers reward authenticity and local sports tie-ins more than aspirational lifestyle content. Eagles, Phillies, and Sixers moments are marketing windows you can't fake.",
  },
  {
    slug: "phoenix",
    name: "Phoenix",
    stateCode: "AZ",
    state: "Arizona",
    population: "1,640,000",
    vibe: "fast-growing, transplant-heavy, suburban-spread",
    flavor:
      "Phoenix has one of the highest new-mover rates in the US, so first-impression marketing and Google reviews carry outsized weight. Indoor/outdoor seasonality drives campaign timing.",
  },
  {
    slug: "san-diego",
    name: "San Diego",
    stateCode: "CA",
    state: "California",
    population: "1,390,000",
    vibe: "beach-lifestyle, military-friendly, laid-back",
    flavor:
      "San Diego's coastal lifestyle and military communities reward family-friendly, value-clear messaging. Beach-tied seasonal moments and military discounts both pull strong engagement.",
  },
  {
    slug: "minneapolis",
    name: "Minneapolis",
    stateCode: "MN",
    state: "Minnesota",
    population: "430,000",
    vibe: "civic-minded, four-season, community-led",
    flavor:
      "Minneapolis-St. Paul customers are loyalty-prone and reward community involvement over flash. Indoor-season campaigns (Nov-Mar) often outperform summer pushes because attention is higher.",
  },
];

export const LOCAL_OUTCOMES: LocalOutcome[] = [
  {
    slug: "instagram-marketing",
    name: "Instagram Marketing",
    pretty: "Instagram marketing",
    short: "Instagram",
    benefit: "consistent reach, follower growth, and visit-driving content",
    channel: "Instagram Reels, Stories, and feed posts",
  },
  {
    slug: "google-reviews",
    name: "Google Reviews",
    pretty: "Google reviews",
    short: "Google reviews",
    benefit: "more 5-star reviews, higher map-pack ranking, and review velocity",
    channel: "Google Business Profile and review request flows",
  },
  {
    slug: "tiktok-marketing",
    name: "TikTok Marketing",
    pretty: "TikTok marketing",
    short: "TikTok",
    benefit: "discovery from new audiences and viral local moments",
    channel: "TikTok short-form video and creator collabs",
  },
  {
    slug: "referral-program",
    name: "Referral Program",
    pretty: "referral program",
    short: "referrals",
    benefit: "predictable word-of-mouth growth at a known cost-per-acquisition",
    channel: "customer referral flows with trackable perks",
  },
  {
    slug: "customer-loyalty",
    name: "Customer Loyalty",
    pretty: "customer loyalty",
    short: "loyalty",
    benefit: "higher visit frequency and lifetime value from existing customers",
    channel: "perk-based loyalty programs and re-engagement",
  },
];

export function getNiche(slug: string) {
  return LOCAL_NICHES.find((n) => n.slug === slug);
}
export function getCity(slug: string) {
  return LOCAL_CITIES.find((c) => c.slug === slug);
}
export function getOutcome(slug: string) {
  return LOCAL_OUTCOMES.find((o) => o.slug === slug);
}
