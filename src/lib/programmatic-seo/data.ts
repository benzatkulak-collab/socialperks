// ---------------------------------------------------------------------------
// Programmatic SEO data: cities × industries
// ---------------------------------------------------------------------------
//
// Used by /local/* routes to generate one landing page per city × industry
// combination (50 × 20 = 1,000 pages).
//
// Population figures are approximate 2020-census-era estimates rounded to
// the nearest thousand. Region groupings use the U.S. Census Bureau's
// four-region scheme (Northeast / Midwest / South / West).

export interface City {
  slug: string;
  name: string;
  state: string;
  stateCode: string;
  population: number;
  region: "Northeast" | "Midwest" | "South" | "West";
}

export const CITIES: City[] = [
  { slug: "new-york-ny", name: "New York", state: "New York", stateCode: "NY", population: 8336000, region: "Northeast" },
  { slug: "los-angeles-ca", name: "Los Angeles", state: "California", stateCode: "CA", population: 3979000, region: "West" },
  { slug: "chicago-il", name: "Chicago", state: "Illinois", stateCode: "IL", population: 2693000, region: "Midwest" },
  { slug: "houston-tx", name: "Houston", state: "Texas", stateCode: "TX", population: 2320000, region: "South" },
  { slug: "phoenix-az", name: "Phoenix", state: "Arizona", stateCode: "AZ", population: 1681000, region: "West" },
  { slug: "philadelphia-pa", name: "Philadelphia", state: "Pennsylvania", stateCode: "PA", population: 1584000, region: "Northeast" },
  { slug: "san-antonio-tx", name: "San Antonio", state: "Texas", stateCode: "TX", population: 1547000, region: "South" },
  { slug: "san-diego-ca", name: "San Diego", state: "California", stateCode: "CA", population: 1424000, region: "West" },
  { slug: "dallas-tx", name: "Dallas", state: "Texas", stateCode: "TX", population: 1343000, region: "South" },
  { slug: "san-jose-ca", name: "San Jose", state: "California", stateCode: "CA", population: 1027000, region: "West" },
  { slug: "austin-tx", name: "Austin", state: "Texas", stateCode: "TX", population: 978000, region: "South" },
  { slug: "jacksonville-fl", name: "Jacksonville", state: "Florida", stateCode: "FL", population: 911000, region: "South" },
  { slug: "fort-worth-tx", name: "Fort Worth", state: "Texas", stateCode: "TX", population: 909000, region: "South" },
  { slug: "columbus-oh", name: "Columbus", state: "Ohio", stateCode: "OH", population: 898000, region: "Midwest" },
  { slug: "charlotte-nc", name: "Charlotte", state: "North Carolina", stateCode: "NC", population: 885000, region: "South" },
  { slug: "indianapolis-in", name: "Indianapolis", state: "Indiana", stateCode: "IN", population: 876000, region: "Midwest" },
  { slug: "san-francisco-ca", name: "San Francisco", state: "California", stateCode: "CA", population: 881000, region: "West" },
  { slug: "seattle-wa", name: "Seattle", state: "Washington", stateCode: "WA", population: 753000, region: "West" },
  { slug: "denver-co", name: "Denver", state: "Colorado", stateCode: "CO", population: 727000, region: "West" },
  { slug: "washington-dc", name: "Washington", state: "District of Columbia", stateCode: "DC", population: 705000, region: "South" },
  { slug: "nashville-tn", name: "Nashville", state: "Tennessee", stateCode: "TN", population: 670000, region: "South" },
  { slug: "oklahoma-city-ok", name: "Oklahoma City", state: "Oklahoma", stateCode: "OK", population: 655000, region: "South" },
  { slug: "el-paso-tx", name: "El Paso", state: "Texas", stateCode: "TX", population: 681000, region: "South" },
  { slug: "boston-ma", name: "Boston", state: "Massachusetts", stateCode: "MA", population: 692000, region: "Northeast" },
  { slug: "portland-or", name: "Portland", state: "Oregon", stateCode: "OR", population: 654000, region: "West" },
  { slug: "las-vegas-nv", name: "Las Vegas", state: "Nevada", stateCode: "NV", population: 651000, region: "West" },
  { slug: "detroit-mi", name: "Detroit", state: "Michigan", stateCode: "MI", population: 670000, region: "Midwest" },
  { slug: "memphis-tn", name: "Memphis", state: "Tennessee", stateCode: "TN", population: 651000, region: "South" },
  { slug: "louisville-ky", name: "Louisville", state: "Kentucky", stateCode: "KY", population: 617000, region: "South" },
  { slug: "baltimore-md", name: "Baltimore", state: "Maryland", stateCode: "MD", population: 593000, region: "South" },
  { slug: "milwaukee-wi", name: "Milwaukee", state: "Wisconsin", stateCode: "WI", population: 590000, region: "Midwest" },
  { slug: "albuquerque-nm", name: "Albuquerque", state: "New Mexico", stateCode: "NM", population: 560000, region: "West" },
  { slug: "tucson-az", name: "Tucson", state: "Arizona", stateCode: "AZ", population: 548000, region: "West" },
  { slug: "fresno-ca", name: "Fresno", state: "California", stateCode: "CA", population: 542000, region: "West" },
  { slug: "sacramento-ca", name: "Sacramento", state: "California", stateCode: "CA", population: 513000, region: "West" },
  { slug: "mesa-az", name: "Mesa", state: "Arizona", stateCode: "AZ", population: 508000, region: "West" },
  { slug: "atlanta-ga", name: "Atlanta", state: "Georgia", stateCode: "GA", population: 506000, region: "South" },
  { slug: "kansas-city-mo", name: "Kansas City", state: "Missouri", stateCode: "MO", population: 495000, region: "Midwest" },
  { slug: "colorado-springs-co", name: "Colorado Springs", state: "Colorado", stateCode: "CO", population: 478000, region: "West" },
  { slug: "omaha-ne", name: "Omaha", state: "Nebraska", stateCode: "NE", population: 478000, region: "Midwest" },
  { slug: "raleigh-nc", name: "Raleigh", state: "North Carolina", stateCode: "NC", population: 474000, region: "South" },
  { slug: "miami-fl", name: "Miami", state: "Florida", stateCode: "FL", population: 467000, region: "South" },
  { slug: "long-beach-ca", name: "Long Beach", state: "California", stateCode: "CA", population: 462000, region: "West" },
  { slug: "virginia-beach-va", name: "Virginia Beach", state: "Virginia", stateCode: "VA", population: 449000, region: "South" },
  { slug: "oakland-ca", name: "Oakland", state: "California", stateCode: "CA", population: 433000, region: "West" },
  { slug: "minneapolis-mn", name: "Minneapolis", state: "Minnesota", stateCode: "MN", population: 429000, region: "Midwest" },
  { slug: "tulsa-ok", name: "Tulsa", state: "Oklahoma", stateCode: "OK", population: 401000, region: "South" },
  { slug: "tampa-fl", name: "Tampa", state: "Florida", stateCode: "FL", population: 399000, region: "South" },
  { slug: "arlington-tx", name: "Arlington", state: "Texas", stateCode: "TX", population: 398000, region: "South" },
  { slug: "new-orleans-la", name: "New Orleans", state: "Louisiana", stateCode: "LA", population: 390000, region: "South" },
];

export interface Industry {
  slug: string;
  singular: string;
  plural: string;
  painPoints: string[];
  platforms: string[];
  campaignIdeas: string[];
}

export const INDUSTRIES: Industry[] = [
  {
    slug: "restaurants",
    singular: "Restaurant",
    plural: "Restaurants",
    painPoints: [
      "Slow weeknight tables eating into already-thin margins",
      "Negative reviews from a single bad service night dragging ratings",
      "Costly delivery-app fees siphoning off direct customer relationships",
    ],
    platforms: ["Instagram", "Google", "TikTok"],
    campaignIdeas: [
      "Free dessert for diners who post a Reel of their main course",
      "10% off the next visit for verified Google reviews with a photo",
      "Featured on the menu wall for the week's best TikTok food clip",
    ],
  },
  {
    slug: "coffee-shops",
    singular: "Coffee Shop",
    plural: "Coffee Shops",
    painPoints: [
      "Heavy morning rush followed by dead afternoons",
      "Hard to differentiate from chain competitors a block away",
      "Loyalty punch cards that customers lose or forget",
    ],
    platforms: ["Instagram", "TikTok", "Yelp"],
    campaignIdeas: [
      "Free pastry with any latte tagged on Instagram Stories",
      "Buy-one-get-one match for posting a TikTok of latte art",
      "Half-price afternoon drink for a fresh five-star Yelp review",
    ],
  },
  {
    slug: "yoga-studios",
    singular: "Yoga Studio",
    plural: "Yoga Studios",
    painPoints: [
      "High class drop-off after the introductory pack ends",
      "Trouble filling weekday off-peak class slots",
      "Boutique price points that scare off price-sensitive newcomers",
    ],
    platforms: ["Instagram", "Facebook", "Google"],
    campaignIdeas: [
      "Free class for sharing a class selfie to Instagram",
      "Friend-referral perk through Facebook event check-ins",
      "Discounted month for a Google review mentioning a favorite teacher",
    ],
  },
  {
    slug: "salons",
    singular: "Salon",
    plural: "Salons",
    painPoints: [
      "Last-minute cancellations killing booked revenue",
      "Hard to showcase before/after work without privacy concerns",
      "Stylists building personal brands that walk out the door",
    ],
    platforms: ["Instagram", "TikTok", "Google"],
    campaignIdeas: [
      "Free deep-conditioning add-on for an Instagram before/after post",
      "Featured on the salon's TikTok for client transformations",
      "$20 credit toward the next visit for a detailed Google review",
    ],
  },
  {
    slug: "spas",
    singular: "Spa",
    plural: "Spas",
    painPoints: [
      "Quiet weekday afternoons between busy weekend bookings",
      "Hard to convey the relaxation experience through ads",
      "Gift-card sales spike at holidays then go dormant",
    ],
    platforms: ["Instagram", "Facebook", "Yelp"],
    campaignIdeas: [
      "Free aromatherapy upgrade for an Instagram Story tag",
      "Friends-and-family discount for a Facebook recommendation",
      "Complimentary hand treatment for a Yelp review with photos",
    ],
  },
  {
    slug: "boutiques",
    singular: "Boutique",
    plural: "Boutiques",
    painPoints: [
      "Foot traffic dropping in favor of online shopping",
      "Limited inventory that's hard to merchandise online",
      "Returning customers but few new faces walking in",
    ],
    platforms: ["Instagram", "TikTok", "Facebook"],
    campaignIdeas: [
      "10% off for an Instagram outfit-of-the-day tag in store",
      "Featured on the boutique's TikTok for a try-on haul",
      "$15 store credit for sharing a Facebook event post",
    ],
  },
  {
    slug: "gyms",
    singular: "Gym",
    plural: "Gyms",
    painPoints: [
      "January sign-up rush followed by spring drop-off",
      "Personal-trainer leads expensive to acquire through paid ads",
      "Member referrals undervalued and hard to track",
    ],
    platforms: ["Instagram", "TikTok", "Facebook"],
    campaignIdeas: [
      "Free week pass for a friend tagged in an Instagram check-in",
      "Featured on the gym's TikTok for a member transformation",
      "Reduced enrollment fee for a Facebook recommendation",
    ],
  },
  {
    slug: "bakeries",
    singular: "Bakery",
    plural: "Bakeries",
    painPoints: [
      "Daily inventory waste from unsold goods",
      "Custom cake orders driven by word of mouth, not search",
      "Hard to compete on price with grocery-store bakery aisles",
    ],
    platforms: ["Instagram", "TikTok", "Google"],
    campaignIdeas: [
      "Free cookie with any order posted to Instagram Stories",
      "Featured cake of the week on TikTok for client posts",
      "5% off custom orders for a Google review with photos",
    ],
  },
  {
    slug: "florists",
    singular: "Florist",
    plural: "Florists",
    painPoints: [
      "Demand spikes around holidays then flatlines",
      "Wire-service competitors capturing high-intent search traffic",
      "Perishable inventory making discounting risky",
    ],
    platforms: ["Instagram", "Google", "Facebook"],
    campaignIdeas: [
      "Free upgraded vase for an Instagram bouquet post",
      "10% off the next order for a Google review with photo",
      "Friends-and-family discount via Facebook event share",
    ],
  },
  {
    slug: "pet-stores",
    singular: "Pet Store",
    plural: "Pet Stores",
    painPoints: [
      "Big-box and online retailers undercutting on price",
      "Customers shopping by brand, not by store",
      "Adoption events drive traffic but not always sales",
    ],
    platforms: ["Instagram", "TikTok", "Facebook"],
    campaignIdeas: [
      "Free pet treat bag for an Instagram pet selfie tagged in store",
      "Featured pet of the week on TikTok for video posts",
      "10% off the next visit for a Facebook recommendation",
    ],
  },
  {
    slug: "bookstores",
    singular: "Bookstore",
    plural: "Bookstores",
    painPoints: [
      "Margin pressure from online discount sellers",
      "Author events draw crowds but not always buyers",
      "Hard to surface curated picks beyond regular customers",
    ],
    platforms: ["Instagram", "TikTok", "Google"],
    campaignIdeas: [
      "Free bookmark with any title posted to Instagram",
      "Featured on the BookTok shelf for TikTok reviewers",
      "10% off the next book for a Google review of the store",
    ],
  },
  {
    slug: "tattoo-shops",
    singular: "Tattoo Shop",
    plural: "Tattoo Shops",
    painPoints: [
      "Booking calendars dependent on each artist's personal following",
      "Walk-in traffic unpredictable and hard to forecast",
      "Touch-up policies eating into paid-appointment slots",
    ],
    platforms: ["Instagram", "TikTok", "Google"],
    campaignIdeas: [
      "Free aftercare kit for an Instagram healed-tattoo post",
      "Featured on the shop's TikTok for client process videos",
      "Discount on next session for a detailed Google review",
    ],
  },
  {
    slug: "auto-shops",
    singular: "Auto Shop",
    plural: "Auto Shops",
    painPoints: [
      "Trust gap with new customers comparing dealership pricing",
      "Hard to showcase technical work that customers don't see",
      "Repeat business hinges on a single positive experience",
    ],
    platforms: ["Google", "Facebook", "Yelp"],
    campaignIdeas: [
      "Free tire rotation for a five-star Google review",
      "10% off labor for a Facebook recommendation",
      "Free inspection for a detailed Yelp review with photos",
    ],
  },
  {
    slug: "dentists",
    singular: "Dentist",
    plural: "Dentists",
    painPoints: [
      "Patient acquisition costs rising as insurance networks tighten",
      "Hard to differentiate from chain dental groups",
      "Recall appointments missed and hard to reschedule",
    ],
    platforms: ["Google", "Facebook", "Instagram"],
    campaignIdeas: [
      "Free whitening touch-up for a Google review",
      "Family discount for a Facebook recommendation",
      "Featured smile on Instagram for patient before/after posts",
    ],
  },
  {
    slug: "med-spas",
    singular: "Med Spa",
    plural: "Med Spas",
    painPoints: [
      "Treatment results customers don't always want to share publicly",
      "High customer acquisition cost with long consideration cycles",
      "Stiff competition from new entrants opening monthly",
    ],
    platforms: ["Instagram", "TikTok", "Google"],
    campaignIdeas: [
      "Free product sample for an Instagram skincare-routine post",
      "Featured client on the med spa's TikTok for video testimonials",
      "Discount on next service for a detailed Google review",
    ],
  },
  {
    slug: "bars",
    singular: "Bar",
    plural: "Bars",
    painPoints: [
      "Slow early-week nights with high fixed staffing costs",
      "Hard to break through on noisy weekend nightlife search",
      "Customers ordering drinks they can get anywhere",
    ],
    platforms: ["Instagram", "TikTok", "Google"],
    campaignIdeas: [
      "Free shot for an Instagram cocktail-of-the-night post",
      "Featured drink on TikTok for video reviews",
      "10% off the next tab for a Google review with photos",
    ],
  },
  {
    slug: "breweries",
    singular: "Brewery",
    plural: "Breweries",
    painPoints: [
      "Taproom traffic competing with grocery-store six-packs",
      "Distribution wins that don't translate to local awareness",
      "Limited-release beers that sell out before fans hear about them",
    ],
    platforms: ["Instagram", "TikTok", "Untappd" ],
    campaignIdeas: [
      "Free pour for an Instagram tap-list tag",
      "Featured beer of the week on TikTok for video reviews",
      "Merch discount for an Untappd check-in with rating",
    ],
  },
  {
    slug: "gift-shops",
    singular: "Gift Shop",
    plural: "Gift Shops",
    painPoints: [
      "Highly seasonal traffic concentrated in a few months",
      "Tourist-dependent foot traffic shifting to online ordering",
      "Inventory turning slowly outside peak gifting periods",
    ],
    platforms: ["Instagram", "Facebook", "Google"],
    campaignIdeas: [
      "Free wrapping for an Instagram unboxing Story",
      "10% off for a Facebook recommendation tagging the shop",
      "Loyalty perk for a Google review with shop photos",
    ],
  },
  {
    slug: "photographers",
    singular: "Photographer",
    plural: "Photographers",
    painPoints: [
      "Highly seasonal demand around weddings and family portraits",
      "Hard to stand out in a saturated local search market",
      "Word-of-mouth referrals slow to translate into bookings",
    ],
    platforms: ["Instagram", "TikTok", "Google"],
    campaignIdeas: [
      "Free print for a tagged Instagram gallery post",
      "Featured shoot on the photographer's TikTok",
      "Print-credit perk for a Google review with sample images",
    ],
  },
  {
    slug: "massage-therapists",
    singular: "Massage Therapist",
    plural: "Massage Therapists",
    painPoints: [
      "Booking calendars heavily reliant on word-of-mouth referrals",
      "Hard to convey relaxation results in social-first formats",
      "Membership models with high churn after first month",
    ],
    platforms: ["Instagram", "Google", "Facebook"],
    campaignIdeas: [
      "Free aromatherapy add-on for an Instagram session selfie",
      "Discount on next session for a Google review",
      "Friends-and-family pricing through a Facebook recommendation",
    ],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export const CITY_MAP = new Map<string, City>(
  CITIES.map((c) => [c.slug, c]),
);

export const INDUSTRY_MAP = new Map<string, Industry>(
  INDUSTRIES.map((i) => [i.slug, i]),
);

export const CITY_SLUGS = CITIES.map((c) => c.slug);
export const INDUSTRY_SLUGS = INDUSTRIES.map((i) => i.slug);

/** Five "nearby" cities — same region, different city, deterministic pick. */
export function getNearbyCities(citySlug: string, limit = 5): City[] {
  const city = CITY_MAP.get(citySlug);
  if (!city) return [];
  const sameRegion = CITIES.filter(
    (c) => c.region === city.region && c.slug !== city.slug,
  );
  // Sort by population so the picks are stable across builds.
  sameRegion.sort((a, b) => b.population - a.population);
  // If region is sparse, top up with next-largest cities outside it.
  if (sameRegion.length < limit) {
    const rest = CITIES.filter(
      (c) => c.region !== city.region && c.slug !== city.slug,
    ).sort((a, b) => b.population - a.population);
    return [...sameRegion, ...rest].slice(0, limit);
  }
  return sameRegion.slice(0, limit);
}

/** Five "other" industries — deterministic, excludes the current one. */
export function getOtherIndustries(
  industrySlug: string,
  limit = 5,
): Industry[] {
  const idx = INDUSTRIES.findIndex((i) => i.slug === industrySlug);
  if (idx === -1) return INDUSTRIES.slice(0, limit);
  // Rotate the list so picks vary by industry but stay deterministic.
  const rotated = [
    ...INDUSTRIES.slice(idx + 1),
    ...INDUSTRIES.slice(0, idx),
  ];
  return rotated.slice(0, limit);
}
