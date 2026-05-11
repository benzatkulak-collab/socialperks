// ---------------------------------------------------------------------------
// Programmatic SEO data: US states × industries
// ---------------------------------------------------------------------------
//
// Used by /state/* routes to generate one landing page per state × industry
// combination (50 × 8 = 400 pages). Population figures are approximate
// 2020-census-era estimates rounded to the nearest thousand. Region groupings
// use the U.S. Census Bureau's four-region scheme (Northeast / Midwest /
// South / West).

export type StateRegion = "northeast" | "midwest" | "south" | "west";

export interface State {
  slug: string;
  name: string;
  abbreviation: string;
  capital: string;
  largestCity: string;
  population: number;
  region: StateRegion;
  /** 1-2 sentences about the state's small-business climate. */
  businessClimate: string;
  /** 1-2 word evocative phrase used in hero copy and taglines. */
  tourismTaglineWord: string;
}

export const STATES: State[] = [
  {
    slug: "alabama",
    name: "Alabama",
    abbreviation: "AL",
    capital: "Montgomery",
    largestCity: "Huntsville",
    population: 5074000,
    region: "south",
    businessClimate:
      "Alabama small businesses benefit from low operating costs and growing aerospace and auto-manufacturing corridors. Hospitality and college-town retail lead the local main-street economy.",
    tourismTaglineWord: "sweet home",
  },
  {
    slug: "alaska",
    name: "Alaska",
    abbreviation: "AK",
    capital: "Juneau",
    largestCity: "Anchorage",
    population: 733000,
    region: "west",
    businessClimate:
      "Alaska's economy leans on tourism, fishing, and seasonal travel, with a tight-knit small-business community in Anchorage and Fairbanks. Short summer seasons mean every booked tour, table, or treatment counts.",
    tourismTaglineWord: "frontier",
  },
  {
    slug: "arizona",
    name: "Arizona",
    abbreviation: "AZ",
    capital: "Phoenix",
    largestCity: "Phoenix",
    population: 7359000,
    region: "west",
    businessClimate:
      "Arizona has one of the fastest-growing populations in the country, with Phoenix and Tucson powering retail, hospitality, and wellness sectors. Snowbird tourism creates a clear winter spike for local businesses.",
    tourismTaglineWord: "desert",
  },
  {
    slug: "arkansas",
    name: "Arkansas",
    abbreviation: "AR",
    capital: "Little Rock",
    largestCity: "Little Rock",
    population: 3046000,
    region: "south",
    businessClimate:
      "Arkansas combines a low cost of doing business with strong main-street economies in Little Rock, Fayetteville, and Bentonville. Walmart's footprint also attracts a steady stream of corporate visitors who eat and shop local.",
    tourismTaglineWord: "natural",
  },
  {
    slug: "california",
    name: "California",
    abbreviation: "CA",
    capital: "Sacramento",
    largestCity: "Los Angeles",
    population: 39030000,
    region: "west",
    businessClimate:
      "California is the largest small-business market in the country and the most competitive. Margins are thin, rents are high, and customers expect a strong digital storefront before they walk in.",
    tourismTaglineWord: "golden",
  },
  {
    slug: "colorado",
    name: "Colorado",
    abbreviation: "CO",
    capital: "Denver",
    largestCity: "Denver",
    population: 5839000,
    region: "west",
    businessClimate:
      "Colorado pairs a fast-growing population with a strong outdoor-recreation economy. Denver, Boulder, and the mountain resort corridor make wellness, food, and experience businesses some of the most competitive in the West.",
    tourismTaglineWord: "rocky",
  },
  {
    slug: "connecticut",
    name: "Connecticut",
    abbreviation: "CT",
    capital: "Hartford",
    largestCity: "Bridgeport",
    population: 3626000,
    region: "northeast",
    businessClimate:
      "Connecticut's small businesses serve a high-income suburban customer base across the New York and Boston commuter belts. Independent retail and dining cluster in towns like Greenwich, New Haven, and Westport.",
    tourismTaglineWord: "shoreline",
  },
  {
    slug: "delaware",
    name: "Delaware",
    abbreviation: "DE",
    capital: "Dover",
    largestCity: "Wilmington",
    population: 1019000,
    region: "south",
    businessClimate:
      "Delaware combines a friendly tax climate with a compact, high-density customer base. Beach-town tourism in Rehoboth and Bethany drives a strong summer season for restaurants and boutiques.",
    tourismTaglineWord: "first state",
  },
  {
    slug: "florida",
    name: "Florida",
    abbreviation: "FL",
    capital: "Tallahassee",
    largestCity: "Jacksonville",
    population: 22245000,
    region: "south",
    businessClimate:
      "Florida is a tourism juggernaut with no state income tax and a year-round visitor flow that supports restaurants, bars, and salons across coastal cities. The trade-off is a constantly rotating customer base.",
    tourismTaglineWord: "sunshine",
  },
  {
    slug: "georgia",
    name: "Georgia",
    abbreviation: "GA",
    capital: "Atlanta",
    largestCity: "Atlanta",
    population: 10912000,
    region: "south",
    businessClimate:
      "Georgia's economy revolves around Atlanta — one of the country's largest hospitality markets — plus growing college-town economies in Athens and Savannah. Film, conference, and convention traffic add a steady out-of-towner stream.",
    tourismTaglineWord: "peach",
  },
  {
    slug: "hawaii",
    name: "Hawaii",
    abbreviation: "HI",
    capital: "Honolulu",
    largestCity: "Honolulu",
    population: 1440000,
    region: "west",
    businessClimate:
      "Hawaii's small businesses are almost entirely tourism-driven, with locals and visitors paying premium prices for everything from coffee to yoga. Inventory and rent are among the highest in the country.",
    tourismTaglineWord: "paradise",
  },
  {
    slug: "idaho",
    name: "Idaho",
    abbreviation: "ID",
    capital: "Boise",
    largestCity: "Boise",
    population: 1939000,
    region: "west",
    businessClimate:
      "Idaho is one of the fastest-growing states in the country, with Boise's tech and outdoor-recreation crossover bringing in younger, social-media-fluent customers. Coeur d'Alene and Sun Valley anchor a strong seasonal tourism trade.",
    tourismTaglineWord: "gem",
  },
  {
    slug: "illinois",
    name: "Illinois",
    abbreviation: "IL",
    capital: "Springfield",
    largestCity: "Chicago",
    population: 12582000,
    region: "midwest",
    businessClimate:
      "Illinois is anchored by Chicago — one of the largest urban small-business markets in the U.S. — with strong neighborhood economies and dense competition. Downstate, college towns like Champaign and Bloomington drive smaller but loyal local scenes.",
    tourismTaglineWord: "prairie",
  },
  {
    slug: "indiana",
    name: "Indiana",
    abbreviation: "IN",
    capital: "Indianapolis",
    largestCity: "Indianapolis",
    population: 6833000,
    region: "midwest",
    businessClimate:
      "Indiana pairs a low cost of doing business with strong manufacturing employment and a large college-town network anchored by Bloomington, West Lafayette, and Notre Dame. Game-day weekends drive predictable spikes for food and retail.",
    tourismTaglineWord: "hoosier",
  },
  {
    slug: "iowa",
    name: "Iowa",
    abbreviation: "IA",
    capital: "Des Moines",
    largestCity: "Des Moines",
    population: 3200000,
    region: "midwest",
    businessClimate:
      "Iowa's small businesses serve a steady, recession-resistant base in Des Moines, Iowa City, and Cedar Rapids. Word-of-mouth in tight-knit communities still drives more revenue than paid social ads.",
    tourismTaglineWord: "heartland",
  },
  {
    slug: "kansas",
    name: "Kansas",
    abbreviation: "KS",
    capital: "Topeka",
    largestCity: "Wichita",
    population: 2937000,
    region: "midwest",
    businessClimate:
      "Kansas has a stable, family-oriented customer base spread across Wichita, Topeka, and the Kansas City suburbs. Local sports loyalty (K-State, KU) is a real and underused marketing lever.",
    tourismTaglineWord: "wide open",
  },
  {
    slug: "kentucky",
    name: "Kentucky",
    abbreviation: "KY",
    capital: "Frankfort",
    largestCity: "Louisville",
    population: 4513000,
    region: "south",
    businessClimate:
      "Kentucky's economy is driven by Louisville and Lexington, with bourbon and horse-racing tourism injecting predictable visitor spikes. Independent restaurants and bars punch above their weight on social.",
    tourismTaglineWord: "bluegrass",
  },
  {
    slug: "louisiana",
    name: "Louisiana",
    abbreviation: "LA",
    capital: "Baton Rouge",
    largestCity: "New Orleans",
    population: 4574000,
    region: "south",
    businessClimate:
      "Louisiana — and especially New Orleans — has one of the most distinctive small-business cultures in the country, with food, music, and tourism deeply intertwined. Festival seasons create dramatic revenue spikes and lulls.",
    tourismTaglineWord: "bayou",
  },
  {
    slug: "maine",
    name: "Maine",
    abbreviation: "ME",
    capital: "Augusta",
    largestCity: "Portland",
    population: 1385000,
    region: "northeast",
    businessClimate:
      "Maine's small businesses live on a short, intense summer season, with coastal tourism driving the year for Portland, Bar Harbor, and Kennebunkport. Off-season survival depends on year-round local regulars.",
    tourismTaglineWord: "vacationland",
  },
  {
    slug: "maryland",
    name: "Maryland",
    abbreviation: "MD",
    capital: "Annapolis",
    largestCity: "Baltimore",
    population: 6165000,
    region: "south",
    businessClimate:
      "Maryland combines a high-income D.C. commuter belt with strong Baltimore neighborhood economies and waterfront tourism in Annapolis and Ocean City. Customers expect a polished digital experience to match.",
    tourismTaglineWord: "chesapeake",
  },
  {
    slug: "massachusetts",
    name: "Massachusetts",
    abbreviation: "MA",
    capital: "Boston",
    largestCity: "Boston",
    population: 6981000,
    region: "northeast",
    businessClimate:
      "Massachusetts is one of the densest small-business markets in the country, with Boston, Cambridge, and a string of college towns driving competitive food, fitness, and beauty scenes. Customer expectations are high and reviews matter.",
    tourismTaglineWord: "bay state",
  },
  {
    slug: "michigan",
    name: "Michigan",
    abbreviation: "MI",
    capital: "Lansing",
    largestCity: "Detroit",
    population: 10034000,
    region: "midwest",
    businessClimate:
      "Michigan pairs Detroit's revitalized neighborhood economy with strong college towns in Ann Arbor and East Lansing and a beloved summer lake-tourism season. Hometown pride is a powerful marketing engine.",
    tourismTaglineWord: "great lakes",
  },
  {
    slug: "minnesota",
    name: "Minnesota",
    abbreviation: "MN",
    capital: "Saint Paul",
    largestCity: "Minneapolis",
    population: 5717000,
    region: "midwest",
    businessClimate:
      "Minnesota's customer base is loyal, polite, and increasingly online — Twin Cities residents support local food, fitness, and retail at unusually high rates. Long winters concentrate spending into indoor experiences.",
    tourismTaglineWord: "north star",
  },
  {
    slug: "mississippi",
    name: "Mississippi",
    abbreviation: "MS",
    capital: "Jackson",
    largestCity: "Jackson",
    population: 2941000,
    region: "south",
    businessClimate:
      "Mississippi small businesses serve a community-oriented customer base where personal recommendations carry serious weight. Coastal casino tourism and college-town economies in Oxford and Starkville drive much of the local spending.",
    tourismTaglineWord: "magnolia",
  },
  {
    slug: "missouri",
    name: "Missouri",
    abbreviation: "MO",
    capital: "Jefferson City",
    largestCity: "Kansas City",
    population: 6178000,
    region: "midwest",
    businessClimate:
      "Missouri's economy balances Kansas City's barbecue-and-brewery scene against St. Louis's neighborhood restaurants and bars. Branson tourism adds a third leg with year-round visitor traffic.",
    tourismTaglineWord: "show me",
  },
  {
    slug: "montana",
    name: "Montana",
    abbreviation: "MT",
    capital: "Helena",
    largestCity: "Billings",
    population: 1122000,
    region: "west",
    businessClimate:
      "Montana's small-business economy runs on outdoor tourism — Yellowstone, Glacier, and the ski resorts — plus a growing remote-worker influx in Bozeman and Missoula. Short seasons mean every booking matters.",
    tourismTaglineWord: "big sky",
  },
  {
    slug: "nebraska",
    name: "Nebraska",
    abbreviation: "NE",
    capital: "Lincoln",
    largestCity: "Omaha",
    population: 1968000,
    region: "midwest",
    businessClimate:
      "Nebraska's small businesses serve a stable, college-town-and-Omaha customer base where Cornhusker football weekends rival many states' biggest holidays. Loyalty runs deep and reviews stick.",
    tourismTaglineWord: "good life",
  },
  {
    slug: "nevada",
    name: "Nevada",
    abbreviation: "NV",
    capital: "Carson City",
    largestCity: "Las Vegas",
    population: 3178000,
    region: "west",
    businessClimate:
      "Nevada's economy is dominated by Las Vegas tourism, but a fast-growing residential customer base in Henderson and Reno is changing the mix. Off-Strip neighborhoods are now some of the most competitive small-business markets in the West.",
    tourismTaglineWord: "silver",
  },
  {
    slug: "new-hampshire",
    name: "New Hampshire",
    abbreviation: "NH",
    capital: "Concord",
    largestCity: "Manchester",
    population: 1395000,
    region: "northeast",
    businessClimate:
      "New Hampshire's no-sales-tax retail draws in-state and out-of-state spending, with strong fall foliage and ski tourism layered on top. Portsmouth and the Lakes Region drive the most competitive small-business scenes.",
    tourismTaglineWord: "live free",
  },
  {
    slug: "new-jersey",
    name: "New Jersey",
    abbreviation: "NJ",
    capital: "Trenton",
    largestCity: "Newark",
    population: 9261000,
    region: "northeast",
    businessClimate:
      "New Jersey is one of the densest small-business markets in the country, with Shore tourism, NYC commuters, and high-income suburbs all converging. Online reviews and Instagram presence are table stakes.",
    tourismTaglineWord: "garden",
  },
  {
    slug: "new-mexico",
    name: "New Mexico",
    abbreviation: "NM",
    capital: "Santa Fe",
    largestCity: "Albuquerque",
    population: 2113000,
    region: "west",
    businessClimate:
      "New Mexico's small-business economy is anchored by Santa Fe's art-and-food tourism and Albuquerque's growing film and tech scene. Distinctive local culture is a real marketing asset on social.",
    tourismTaglineWord: "enchantment",
  },
  {
    slug: "new-york",
    name: "New York",
    abbreviation: "NY",
    capital: "Albany",
    largestCity: "New York City",
    population: 19571000,
    region: "northeast",
    businessClimate:
      "New York is the most competitive small-business market in the country, with NYC neighborhoods, Hudson Valley tourism, and upstate college towns each demanding a distinct playbook. Customer expectations and rent are both at the top of the national chart.",
    tourismTaglineWord: "empire",
  },
  {
    slug: "north-carolina",
    name: "North Carolina",
    abbreviation: "NC",
    capital: "Raleigh",
    largestCity: "Charlotte",
    population: 10698000,
    region: "south",
    businessClimate:
      "North Carolina is among the fastest-growing states, with Charlotte's finance crowd, the Research Triangle's tech workers, and Asheville's tourism economy each driving demand for local restaurants, fitness, and retail.",
    tourismTaglineWord: "tar heel",
  },
  {
    slug: "north-dakota",
    name: "North Dakota",
    abbreviation: "ND",
    capital: "Bismarck",
    largestCity: "Fargo",
    population: 779000,
    region: "midwest",
    businessClimate:
      "North Dakota's small-business economy rides on energy-sector cycles plus a steady customer base in Fargo, Bismarck, and Grand Forks. Tight-knit communities mean word-of-mouth and reviews dominate.",
    tourismTaglineWord: "rough rider",
  },
  {
    slug: "ohio",
    name: "Ohio",
    abbreviation: "OH",
    capital: "Columbus",
    largestCity: "Columbus",
    population: 11756000,
    region: "midwest",
    businessClimate:
      "Ohio's economy balances three competitive metros — Columbus, Cleveland, and Cincinnati — with strong neighborhood food, brewery, and fitness scenes. Buckeye football and Bengals home weekends drive predictable spikes.",
    tourismTaglineWord: "buckeye",
  },
  {
    slug: "oklahoma",
    name: "Oklahoma",
    abbreviation: "OK",
    capital: "Oklahoma City",
    largestCity: "Oklahoma City",
    population: 4019000,
    region: "south",
    businessClimate:
      "Oklahoma's economy runs on energy plus growing food and entertainment scenes in OKC and Tulsa. Customer loyalty is strong and personal recommendations carry serious weight.",
    tourismTaglineWord: "sooner",
  },
  {
    slug: "oregon",
    name: "Oregon",
    abbreviation: "OR",
    capital: "Salem",
    largestCity: "Portland",
    population: 4240000,
    region: "west",
    businessClimate:
      "Oregon's small-business culture is built on craft and independence — Portland's food, coffee, and brewery scenes are among the most photographed in the country. Sustainability and origin stories are part of the standard sales pitch.",
    tourismTaglineWord: "evergreen",
  },
  {
    slug: "pennsylvania",
    name: "Pennsylvania",
    abbreviation: "PA",
    capital: "Harrisburg",
    largestCity: "Philadelphia",
    population: 13003000,
    region: "northeast",
    businessClimate:
      "Pennsylvania pairs Philadelphia's dense neighborhood economies with Pittsburgh's revitalized food and tech scenes and a strong rural tourism trade. Local sports pride — Eagles, Steelers, Penn State — is everywhere on social.",
    tourismTaglineWord: "keystone",
  },
  {
    slug: "rhode-island",
    name: "Rhode Island",
    abbreviation: "RI",
    capital: "Providence",
    largestCity: "Providence",
    population: 1093000,
    region: "northeast",
    businessClimate:
      "Rhode Island packs a dense small-business scene into a tiny footprint, with Providence's restaurants and Newport's summer tourism leading the way. Customers move between cities easily, so reviews spread fast.",
    tourismTaglineWord: "ocean",
  },
  {
    slug: "south-carolina",
    name: "South Carolina",
    abbreviation: "SC",
    capital: "Columbia",
    largestCity: "Charleston",
    population: 5283000,
    region: "south",
    businessClimate:
      "South Carolina's economy leans on Charleston's restaurant scene, Myrtle Beach tourism, and Greenville's growing food and retail corridor. Hospitality and Southern charm are part of the brand.",
    tourismTaglineWord: "palmetto",
  },
  {
    slug: "south-dakota",
    name: "South Dakota",
    abbreviation: "SD",
    capital: "Pierre",
    largestCity: "Sioux Falls",
    population: 909000,
    region: "midwest",
    businessClimate:
      "South Dakota's small-business economy is concentrated in Sioux Falls and Rapid City, with summer Black Hills tourism providing a clear annual revenue spike. Tight communities and stable customer bases keep reviews honest.",
    tourismTaglineWord: "mount rushmore",
  },
  {
    slug: "tennessee",
    name: "Tennessee",
    abbreviation: "TN",
    capital: "Nashville",
    largestCity: "Nashville",
    population: 7051000,
    region: "south",
    businessClimate:
      "Tennessee's economy is anchored by Nashville's tourism boom, Memphis's music-and-food scene, and Knoxville's college-town energy. Bachelorette weekends alone drive measurable spikes for many Nashville businesses.",
    tourismTaglineWord: "volunteer",
  },
  {
    slug: "texas",
    name: "Texas",
    abbreviation: "TX",
    capital: "Austin",
    largestCity: "Houston",
    population: 30030000,
    region: "south",
    businessClimate:
      "Texas is the second-largest small-business market in the country, with Houston, Dallas, Austin, and San Antonio each running a distinct economy. Brand loyalty is strong, portions are big, and local pride is a real marketing asset.",
    tourismTaglineWord: "big",
  },
  {
    slug: "utah",
    name: "Utah",
    abbreviation: "UT",
    capital: "Salt Lake City",
    largestCity: "Salt Lake City",
    population: 3380000,
    region: "west",
    businessClimate:
      "Utah pairs one of the youngest populations in the country with booming outdoor-recreation tourism in Park City, Moab, and the Mighty 5 corridor. Family-oriented marketing and large group sizes drive much of the spending.",
    tourismTaglineWord: "beehive",
  },
  {
    slug: "vermont",
    name: "Vermont",
    abbreviation: "VT",
    capital: "Montpelier",
    largestCity: "Burlington",
    population: 647000,
    region: "northeast",
    businessClimate:
      "Vermont's economy lives on a four-season tourism cycle — fall foliage, winter skiing, summer lakes — built around small main streets in Burlington, Stowe, and Woodstock. Locally-sourced everything is part of the standard story.",
    tourismTaglineWord: "green mountain",
  },
  {
    slug: "virginia",
    name: "Virginia",
    abbreviation: "VA",
    capital: "Richmond",
    largestCity: "Virginia Beach",
    population: 8684000,
    region: "south",
    businessClimate:
      "Virginia's economy blends Northern Virginia's high-income tech corridor with Richmond's food scene and a strong coastal tourism trade in Virginia Beach. Customer expectations vary widely by region.",
    tourismTaglineWord: "old dominion",
  },
  {
    slug: "washington",
    name: "Washington",
    abbreviation: "WA",
    capital: "Olympia",
    largestCity: "Seattle",
    population: 7785000,
    region: "west",
    businessClimate:
      "Washington's small-business culture is shaped by Seattle's tech-fueled spending and a deep coffee and craft-food tradition. Strong sustainability values and visible sourcing stories are nearly required for new entrants.",
    tourismTaglineWord: "evergreen",
  },
  {
    slug: "west-virginia",
    name: "West Virginia",
    abbreviation: "WV",
    capital: "Charleston",
    largestCity: "Charleston",
    population: 1775000,
    region: "south",
    businessClimate:
      "West Virginia's small businesses serve tight, loyal communities anchored by Charleston, Morgantown, and outdoor-tourism towns in the New River Gorge. Word-of-mouth marketing still beats most paid channels.",
    tourismTaglineWord: "mountaineer",
  },
  {
    slug: "wisconsin",
    name: "Wisconsin",
    abbreviation: "WI",
    capital: "Madison",
    largestCity: "Milwaukee",
    population: 5893000,
    region: "midwest",
    businessClimate:
      "Wisconsin pairs Milwaukee's brewery and restaurant economy with Madison's college-town culture and a strong Door County and Northwoods tourism trade. Game-day weekends and supper-club traditions still drive much of the revenue.",
    tourismTaglineWord: "badger",
  },
  {
    slug: "wyoming",
    name: "Wyoming",
    abbreviation: "WY",
    capital: "Cheyenne",
    largestCity: "Cheyenne",
    population: 581000,
    region: "west",
    businessClimate:
      "Wyoming's small-business economy is concentrated around Yellowstone, Grand Teton, and Jackson Hole tourism, with Cheyenne and Casper serving steady year-round populations. Short seasons make every booking and table count.",
    tourismTaglineWord: "cowboy",
  },
];

// ---------------------------------------------------------------------------
// Industries (8) — state-page specific subset
// ---------------------------------------------------------------------------

export type StateIndustrySlug =
  | "restaurants"
  | "coffee-shops"
  | "yoga-studios"
  | "salons"
  | "boutiques"
  | "gyms"
  | "bars"
  | "bakeries";

export interface StateIndustry {
  slug: StateIndustrySlug;
  singular: string;
  plural: string;
  /** Reasonable per-state density factor (businesses per 100k residents). */
  perCapita: number;
  /** Share of businesses with under 5 employees (0-1). */
  smallShopShare: number;
  platforms: [string, string, string];
}

export const STATE_INDUSTRIES: StateIndustry[] = [
  {
    slug: "restaurants",
    singular: "Restaurant",
    plural: "Restaurants",
    perCapita: 195,
    smallShopShare: 0.31,
    platforms: ["Instagram", "Google", "TikTok"],
  },
  {
    slug: "coffee-shops",
    singular: "Coffee Shop",
    plural: "Coffee Shops",
    perCapita: 22,
    smallShopShare: 0.58,
    platforms: ["Instagram", "TikTok", "Yelp"],
  },
  {
    slug: "yoga-studios",
    singular: "Yoga Studio",
    plural: "Yoga Studios",
    perCapita: 9,
    smallShopShare: 0.72,
    platforms: ["Instagram", "Facebook", "Google"],
  },
  {
    slug: "salons",
    singular: "Salon",
    plural: "Salons",
    perCapita: 88,
    smallShopShare: 0.66,
    platforms: ["Instagram", "TikTok", "Google"],
  },
  {
    slug: "boutiques",
    singular: "Boutique",
    plural: "Boutiques",
    perCapita: 41,
    smallShopShare: 0.74,
    platforms: ["Instagram", "TikTok", "Facebook"],
  },
  {
    slug: "gyms",
    singular: "Gym",
    plural: "Gyms",
    perCapita: 12,
    smallShopShare: 0.49,
    platforms: ["Instagram", "TikTok", "Facebook"],
  },
  {
    slug: "bars",
    singular: "Bar",
    plural: "Bars",
    perCapita: 18,
    smallShopShare: 0.44,
    platforms: ["Instagram", "TikTok", "Google"],
  },
  {
    slug: "bakeries",
    singular: "Bakery",
    plural: "Bakeries",
    perCapita: 7,
    smallShopShare: 0.62,
    platforms: ["Instagram", "TikTok", "Google"],
  },
];

// ---------------------------------------------------------------------------
// Lookups & helpers
// ---------------------------------------------------------------------------

export const STATE_MAP = new Map<string, State>(
  STATES.map((s) => [s.slug, s]),
);

export const STATE_INDUSTRY_MAP = new Map<string, StateIndustry>(
  STATE_INDUSTRIES.map((i) => [i.slug, i]),
);

export const STATE_SLUGS = STATES.map((s) => s.slug);
export const STATE_INDUSTRY_SLUGS = STATE_INDUSTRIES.map((i) => i.slug);

/** Five "nearby" states — same region, deterministic order. */
export function getNearbyStates(stateSlug: string, limit = 5): State[] {
  const state = STATE_MAP.get(stateSlug);
  if (!state) return [];
  const sameRegion = STATES.filter(
    (s) => s.region === state.region && s.slug !== state.slug,
  ).sort((a, b) => b.population - a.population);
  if (sameRegion.length < limit) {
    const rest = STATES.filter(
      (s) => s.region !== state.region && s.slug !== state.slug,
    ).sort((a, b) => b.population - a.population);
    return [...sameRegion, ...rest].slice(0, limit);
  }
  return sameRegion.slice(0, limit);
}

/** All other industries — deterministic rotation, excludes current. */
export function getOtherStateIndustries(
  industrySlug: string,
  limit = 7,
): StateIndustry[] {
  const idx = STATE_INDUSTRIES.findIndex((i) => i.slug === industrySlug);
  if (idx === -1) return STATE_INDUSTRIES.slice(0, limit);
  const rotated = [
    ...STATE_INDUSTRIES.slice(idx + 1),
    ...STATE_INDUSTRIES.slice(0, idx),
  ];
  return rotated.slice(0, limit);
}

/** Round a count to a friendly multiple (1,000 → "1,000"; 76,234 → "76,000"). */
export function roundFriendly(n: number): number {
  if (n >= 100000) return Math.round(n / 1000) * 1000;
  if (n >= 10000) return Math.round(n / 500) * 500;
  if (n >= 1000) return Math.round(n / 100) * 100;
  return Math.round(n / 10) * 10;
}

/** Estimated number of businesses of an industry in a state. */
export function estimateBusinessCount(
  state: State,
  industry: StateIndustry,
): number {
  const raw = (state.population / 100000) * industry.perCapita;
  return roundFriendly(raw);
}

export function regionLabel(region: StateRegion): string {
  return region === "northeast"
    ? "Northeast"
    : region === "midwest"
      ? "Midwest"
      : region === "south"
        ? "South"
        : "West";
}
