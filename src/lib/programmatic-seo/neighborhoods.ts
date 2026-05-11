// ---------------------------------------------------------------------------
// Programmatic SEO data: neighborhoods × industries
// ---------------------------------------------------------------------------
//
// Used by /neighborhood/* routes to generate one landing page per
// neighborhood × industry combination (30 × 8 = 240 pages).
//
// Three target cities: New York, Los Angeles, Chicago.
// Each city has 10 neighborhoods with local color, landmarks, and an
// estimated count of "active" businesses for that area.

export interface Neighborhood {
  slug: string;
  name: string;
  citySlug: string;
  cityName: string;
  state: string;
  stateCode: string;
  vibe: string;
  landmarks: [string, string, string];
  industriesActive: number;
}

export const NEIGHBORHOODS: Neighborhood[] = [
  // ---- New York ----------------------------------------------------------
  {
    slug: "soho",
    name: "SoHo",
    citySlug: "new-york-ny",
    cityName: "New York",
    state: "New York",
    stateCode: "NY",
    vibe: "SoHo is Manhattan's flagship-retail and gallery district, where cast-iron lofts double as designer boutiques and tourist foot traffic spikes on weekends. The fashion-forward crowd here lives on Instagram and expects every block to feel curated.",
    landmarks: ["Broadway shopping corridor", "Spring Street boutiques", "The Apple Store on Prince"],
    industriesActive: 312,
  },
  {
    slug: "williamsburg",
    name: "Williamsburg",
    citySlug: "new-york-ny",
    cityName: "New York",
    state: "New York",
    stateCode: "NY",
    vibe: "Brooklyn's creative hub known for indie coffee shops, rooftop bars, and a 20-something crowd that posts everything. Bedford Avenue is the spine — anything on it gets seen, anything one block off has to fight for visibility.",
    landmarks: ["McCarren Park", "Bedford Avenue", "Domino Park waterfront"],
    industriesActive: 287,
  },
  {
    slug: "brooklyn-heights",
    name: "Brooklyn Heights",
    citySlug: "new-york-ny",
    cityName: "New York",
    state: "New York",
    stateCode: "NY",
    vibe: "A leafy, family-heavy enclave of brownstones with the city's best skyline view. Customers skew older, wealthier, and loyal — they pick favorites and stick with them for a decade.",
    landmarks: ["Brooklyn Heights Promenade", "Montague Street", "Brooklyn Bridge Park"],
    industriesActive: 168,
  },
  {
    slug: "upper-east-side",
    name: "Upper East Side",
    citySlug: "new-york-ny",
    cityName: "New York",
    state: "New York",
    stateCode: "NY",
    vibe: "Old-money Manhattan with museum-mile foot traffic and a private-school parent demographic. Service expectations are high and price sensitivity is low, but new customers are hard to pry away from their existing favorites.",
    landmarks: ["The Met", "Madison Avenue", "Central Park East"],
    industriesActive: 245,
  },
  {
    slug: "lower-east-side",
    name: "Lower East Side",
    citySlug: "new-york-ny",
    cityName: "New York",
    state: "New York",
    stateCode: "NY",
    vibe: "Nightlife-driven and constantly turning over — new bars, vintage stores, and tasting menus open and close every season. The crowd is young, social-native, and chasing whatever's getting tagged this week.",
    landmarks: ["Orchard Street", "Tenement Museum", "Essex Market"],
    industriesActive: 221,
  },
  {
    slug: "park-slope",
    name: "Park Slope",
    citySlug: "new-york-ny",
    cityName: "New York",
    state: "New York",
    stateCode: "NY",
    vibe: "Stroller capital of Brooklyn with brownstone blocks and a fiercely local 'shop small' ethos. Word of mouth and the neighborhood parent Facebook group can make or break a new business.",
    landmarks: ["Prospect Park", "Fifth Avenue retail strip", "Grand Army Plaza"],
    industriesActive: 198,
  },
  {
    slug: "astoria",
    name: "Astoria",
    citySlug: "new-york-ny",
    cityName: "New York",
    state: "New York",
    stateCode: "NY",
    vibe: "Queens' most diverse neighborhood — Greek tavernas, Egyptian shisha lounges, and Brazilian bakeries within three blocks. Customers are deeply loyal to authenticity and skeptical of anything that feels chain-y.",
    landmarks: ["Astoria Park", "30th Avenue", "Steinway Street"],
    industriesActive: 184,
  },
  {
    slug: "long-island-city",
    name: "Long Island City",
    citySlug: "new-york-ny",
    cityName: "New York",
    state: "New York",
    stateCode: "NY",
    vibe: "Glass-tower Queens with a rapidly growing young-professional population priced out of Manhattan. New restaurants and gyms are opening monthly and competition for the post-work crowd is fierce.",
    landmarks: ["Gantry Plaza State Park", "Court Square", "MoMA PS1"],
    industriesActive: 152,
  },
  {
    slug: "harlem",
    name: "Harlem",
    citySlug: "new-york-ny",
    cityName: "New York",
    state: "New York",
    stateCode: "NY",
    vibe: "Culturally rich uptown neighborhood with deep music and food traditions and a fast-changing retail strip on 125th. Authenticity matters here more than almost anywhere — customers can spot a transplant brand instantly.",
    landmarks: ["Apollo Theater", "125th Street", "Marcus Garvey Park"],
    industriesActive: 176,
  },
  {
    slug: "dumbo",
    name: "DUMBO",
    citySlug: "new-york-ny",
    cityName: "New York",
    state: "New York",
    stateCode: "NY",
    vibe: "Cobblestoned waterfront between the Brooklyn and Manhattan Bridges — a magnet for tourists chasing the iconic Washington Street photo and tech workers in the converted warehouses above. High foot traffic but low repeat rates without a hook.",
    landmarks: ["Washington Street view", "Jane's Carousel", "Brooklyn Bridge Park"],
    industriesActive: 134,
  },

  // ---- Los Angeles -------------------------------------------------------
  {
    slug: "silver-lake",
    name: "Silver Lake",
    citySlug: "los-angeles-ca",
    cityName: "Los Angeles",
    state: "California",
    stateCode: "CA",
    vibe: "Hilltop East-side LA defined by indie coffee, vintage shops, and creative-class regulars. The crowd is camera-ready and Sunset Boulevard is the runway — but the customer base is small enough that a few influencer posts move real revenue.",
    landmarks: ["Silver Lake Reservoir", "Sunset Junction", "Sunset Triangle Plaza"],
    industriesActive: 192,
  },
  {
    slug: "echo-park",
    name: "Echo Park",
    citySlug: "los-angeles-ca",
    cityName: "Los Angeles",
    state: "California",
    stateCode: "CA",
    vibe: "Sunset-strip-adjacent LA hipster country with paddle boats, mariachi music, and a creative-but-broke 20s crowd. Cheap eats and dive bars rule — but a perk-driven post can fill the room on a Tuesday.",
    landmarks: ["Echo Park Lake", "Sunset Boulevard", "Dodger Stadium"],
    industriesActive: 168,
  },
  {
    slug: "west-hollywood",
    name: "West Hollywood",
    citySlug: "los-angeles-ca",
    cityName: "Los Angeles",
    state: "California",
    stateCode: "CA",
    vibe: "Nightlife capital of LA with the Sunset Strip, a vibrant LGBTQ+ scene, and design-district showrooms. Customers expect polish and exclusivity — generic perks fall flat, but a velvet-rope-feel campaign performs.",
    landmarks: ["Sunset Strip", "Pacific Design Center", "Melrose Avenue"],
    industriesActive: 234,
  },
  {
    slug: "venice",
    name: "Venice",
    citySlug: "los-angeles-ca",
    cityName: "Los Angeles",
    state: "California",
    stateCode: "CA",
    vibe: "Beach-bohemian with a Silicon-Beach overlay — surf shops next door to fintech offices. Abbot Kinney is the retail strip; the boardwalk is the chaos. Tourists post, locals refuse to acknowledge them.",
    landmarks: ["Venice Beach boardwalk", "Abbot Kinney Boulevard", "Venice Canals"],
    industriesActive: 215,
  },
  {
    slug: "santa-monica",
    name: "Santa Monica",
    citySlug: "los-angeles-ca",
    cityName: "Los Angeles",
    state: "California",
    stateCode: "CA",
    vibe: "Beachfront LA with the Pier as a tourist magnet and Third Street Promenade as the open-air mall. Wealthier and more family-friendly than Venice, with strong year-round foot traffic but heavy chain competition.",
    landmarks: ["Santa Monica Pier", "Third Street Promenade", "Palisades Park"],
    industriesActive: 268,
  },
  {
    slug: "downtown-la",
    name: "Downtown LA",
    citySlug: "los-angeles-ca",
    cityName: "Los Angeles",
    state: "California",
    stateCode: "CA",
    vibe: "A revitalized urban core split between the Arts District's converted warehouses, the Historic Core's loft conversions, and the Financial District's lunch-rush office crowd. Weekday-weekend traffic patterns are night and day.",
    landmarks: ["Grand Central Market", "The Broad", "Arts District"],
    industriesActive: 256,
  },
  {
    slug: "koreatown",
    name: "Koreatown",
    citySlug: "los-angeles-ca",
    cityName: "Los Angeles",
    state: "California",
    stateCode: "CA",
    vibe: "Densest neighborhood in LA — 24-hour Korean BBQ, karaoke bars, and skincare boutiques stacked into mid-century towers. The customer base is young, multicultural, and lives on Instagram and TikTok.",
    landmarks: ["Wilshire Boulevard", "Madang Plaza", "Robert F. Kennedy Park"],
    industriesActive: 223,
  },
  {
    slug: "los-feliz",
    name: "Los Feliz",
    citySlug: "los-angeles-ca",
    cityName: "Los Angeles",
    state: "California",
    stateCode: "CA",
    vibe: "Mediterranean-style homes, indie movie theaters, and a writers'-and-actors' crowd that walks Vermont Avenue every weekend. Customers want craft, not chain — and they'll happily wait 45 minutes for the right brunch.",
    landmarks: ["Griffith Observatory", "Vermont Avenue", "Hillhurst Avenue"],
    industriesActive: 161,
  },
  {
    slug: "beverly-hills",
    name: "Beverly Hills",
    citySlug: "los-angeles-ca",
    cityName: "Los Angeles",
    state: "California",
    stateCode: "CA",
    vibe: "Rodeo Drive luxury and old-Hollywood gravitas. The bar is high, the prices are higher, and discount perks read as cheap — but exclusivity-coded perks (private events, VIP previews) move the needle.",
    landmarks: ["Rodeo Drive", "Beverly Gardens Park", "Wilshire Boulevard"],
    industriesActive: 198,
  },
  {
    slug: "manhattan-beach",
    name: "Manhattan Beach",
    citySlug: "los-angeles-ca",
    cityName: "Los Angeles",
    state: "California",
    stateCode: "CA",
    vibe: "South Bay surf town with a young-family demographic, six-figure incomes, and a tight-knit downtown strip on Manhattan Beach Boulevard. Customers value local-owned and word-of-mouth travels fast on the Nextdoor circuit.",
    landmarks: ["The Strand", "Manhattan Beach Pier", "Downtown Manhattan Beach"],
    industriesActive: 142,
  },

  // ---- Chicago -----------------------------------------------------------
  {
    slug: "wicker-park",
    name: "Wicker Park",
    citySlug: "chicago-il",
    cityName: "Chicago",
    state: "Illinois",
    stateCode: "IL",
    vibe: "Chicago's indie-music and craft-everything neighborhood — vinyl shops, tattoo parlors, and natural-wine bars cluster around the Six Corners intersection. The crowd is young, opinionated, and allergic to anything that feels corporate.",
    landmarks: ["The Flat Iron Building", "Damen and Milwaukee", "Wicker Park itself"],
    industriesActive: 198,
  },
  {
    slug: "lincoln-park",
    name: "Lincoln Park",
    citySlug: "chicago-il",
    cityName: "Chicago",
    state: "Illinois",
    stateCode: "IL",
    vibe: "Upscale north-side Chicago with DePaul University students mixed with young professionals and families in the brownstone blocks. Armitage Avenue is the boutique strip; Halsted is the bar strip.",
    landmarks: ["Lincoln Park Zoo", "Armitage Avenue", "DePaul University"],
    industriesActive: 234,
  },
  {
    slug: "river-north",
    name: "River North",
    citySlug: "chicago-il",
    cityName: "Chicago",
    state: "Illinois",
    stateCode: "IL",
    vibe: "Downtown Chicago's gallery and steakhouse district with a heavy convention-tourist overlay. Weeknights are big-spender business travelers; weekends shift to bachelor parties and date nights.",
    landmarks: ["Merchandise Mart", "Hubbard Street", "Magnificent Mile north end"],
    industriesActive: 245,
  },
  {
    slug: "west-loop",
    name: "West Loop",
    citySlug: "chicago-il",
    cityName: "Chicago",
    state: "Illinois",
    stateCode: "IL",
    vibe: "Restaurant Row Chicago — Randolph Street is a foodie pilgrimage and the meatpacking-era warehouses now house tech offices and tasting menus. Reservation-driven culture and very photogenic spaces.",
    landmarks: ["Restaurant Row on Randolph", "Fulton Market", "Mary Bartelme Park"],
    industriesActive: 212,
  },
  {
    slug: "logan-square",
    name: "Logan Square",
    citySlug: "chicago-il",
    cityName: "Chicago",
    state: "Illinois",
    stateCode: "IL",
    vibe: "The cool-kid neighborhood for the post-Wicker-Park wave — Logan Boulevard's mansions, a craft-cocktail scene, and indie bookstores. Crowd is creative-class with strong neighborhood pride.",
    landmarks: ["Logan Square Monument", "California Avenue", "Palmer Square"],
    industriesActive: 174,
  },
  {
    slug: "lakeview",
    name: "Lakeview",
    citySlug: "chicago-il",
    cityName: "Chicago",
    state: "Illinois",
    stateCode: "IL",
    vibe: "Wrigleyville baseball culture on one end, the Boystown LGBTQ+ scene on the other, and a sprawling residential middle. Game-day surges, drag-brunch weekends, and a year-round 20s-30s crowd.",
    landmarks: ["Wrigley Field", "Belmont Avenue", "Boystown Halsted strip"],
    industriesActive: 226,
  },
  {
    slug: "bucktown",
    name: "Bucktown",
    citySlug: "chicago-il",
    cityName: "Chicago",
    state: "Illinois",
    stateCode: "IL",
    vibe: "Wicker Park's slightly-quieter, slightly-richer sibling — same indie spirit, more strollers. The 606 trail runs through it and brings a steady stream of weekend joggers and bikers.",
    landmarks: ["The 606 trail", "Damen Avenue", "Holstein Park"],
    industriesActive: 168,
  },
  {
    slug: "pilsen",
    name: "Pilsen",
    citySlug: "chicago-il",
    cityName: "Chicago",
    state: "Illinois",
    stateCode: "IL",
    vibe: "Historically Mexican-American neighborhood on the lower west side with an exploding arts scene — murals on every block, taquerias next to galleries. Customers care about authenticity and community roots.",
    landmarks: ["18th Street mural corridor", "National Museum of Mexican Art", "Thalia Hall"],
    industriesActive: 156,
  },
  {
    slug: "andersonville",
    name: "Andersonville",
    citySlug: "chicago-il",
    cityName: "Chicago",
    state: "Illinois",
    stateCode: "IL",
    vibe: "Far-north Chicago neighborhood with Swedish heritage, a tight-knit small-business district along Clark Street, and one of the city's strongest LGBTQ+ family communities. 'Shop local' is more than a slogan here.",
    landmarks: ["Clark Street", "Swedish American Museum", "Women & Children First bookstore"],
    industriesActive: 138,
  },
  {
    slug: "hyde-park",
    name: "Hyde Park",
    citySlug: "chicago-il",
    cityName: "Chicago",
    state: "Illinois",
    stateCode: "IL",
    vibe: "South-side neighborhood anchored by the University of Chicago, mixing academic regulars with longtime residents. Lakefront access, gothic architecture, and a customer base that values substance over hype.",
    landmarks: ["University of Chicago", "Museum of Science and Industry", "53rd Street"],
    industriesActive: 124,
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export const NEIGHBORHOOD_MAP = new Map<string, Neighborhood>(
  NEIGHBORHOODS.map((n) => [`${n.citySlug}/${n.slug}`, n]),
);

export const NEIGHBORHOOD_CITY_SLUGS = Array.from(
  new Set(NEIGHBORHOODS.map((n) => n.citySlug)),
);

export function getNeighborhood(
  citySlug: string,
  neighborhoodSlug: string,
): Neighborhood | undefined {
  return NEIGHBORHOOD_MAP.get(`${citySlug}/${neighborhoodSlug}`);
}

export function getNeighborhoodsForCity(citySlug: string): Neighborhood[] {
  return NEIGHBORHOODS.filter((n) => n.citySlug === citySlug);
}

/** Five "nearby" neighborhoods — same city, deterministic. */
export function getNearbyNeighborhoods(
  citySlug: string,
  neighborhoodSlug: string,
  limit = 5,
): Neighborhood[] {
  const sameCity = NEIGHBORHOODS.filter(
    (n) => n.citySlug === citySlug && n.slug !== neighborhoodSlug,
  );
  return sameCity.slice(0, limit);
}

export interface NeighborhoodCitySummary {
  slug: string;
  name: string;
  state: string;
  stateCode: string;
  neighborhoodCount: number;
}

export const NEIGHBORHOOD_CITIES: NeighborhoodCitySummary[] =
  NEIGHBORHOOD_CITY_SLUGS.map((citySlug) => {
    const sample = NEIGHBORHOODS.find((n) => n.citySlug === citySlug)!;
    return {
      slug: sample.citySlug,
      name: sample.cityName,
      state: sample.state,
      stateCode: sample.stateCode,
      neighborhoodCount: NEIGHBORHOODS.filter((n) => n.citySlug === citySlug)
        .length,
    };
  });
