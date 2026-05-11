// ---------------------------------------------------------------------------
// State-specific marketing content generators
// ---------------------------------------------------------------------------
//
// Produces tactics, challenges, and campaign ideas tailored to each state's
// character. Each helper returns plain strings ready to drop into JSX.

import type { State, StateIndustry } from "./states";

// Characterful one-word/short-phrase angles for tactics.
const STATE_ANGLES: Record<
  string,
  { tactic: string; pride: string; visitor: string }
> = {
  alabama: {
    tactic: "Lean into Southern hospitality and SEC football weekends",
    pride: "Roll Tide / War Eagle fans are loyal — let them flex it",
    visitor: "Gulf Shores tourists are a short-window opportunity",
  },
  alaska: {
    tactic: "Build around the short, intense cruise and tourism season",
    pride: "Locals love businesses that survive the dark winter",
    visitor: "Out-of-state tourists post more than residents",
  },
  arizona: {
    tactic: "Plan a snowbird season and a heat-season playbook separately",
    pride: "Phoenix and Tucson locals love independent over chain",
    visitor: "Spring training and golf bring high-spending visitors",
  },
  arkansas: {
    tactic: "Tap into close-knit community and college-town pride",
    pride: "Razorback weekends are real revenue events",
    visitor: "Bentonville visitors and Walmart suppliers drive midweek spend",
  },
  california: {
    tactic: "Tell a real sustainability story — sourcing, packaging, people",
    pride: "Locals choose 'local' aggressively over chains",
    visitor: "Tourist demand swings hard by season and region",
  },
  colorado: {
    tactic: "Tie campaigns to outdoor activity — trails, slopes, breweries",
    pride: "Denver and Boulder locals reward independent over chain",
    visitor: "Ski-season visitors spend big but only for a few months",
  },
  connecticut: {
    tactic: "Speak to commuter routines — morning and evening windows matter",
    pride: "Towns are small enough that reputation travels fast",
    visitor: "NYC and Boston day-trippers are an underused segment",
  },
  delaware: {
    tactic: "Build a summer-beach playbook for Rehoboth and Bethany visitors",
    pride: "Year-round locals form the off-season base",
    visitor: "Tax-free shopping draws PA and NJ visitors year-round",
  },
  florida: {
    tactic: "Run a tourist playbook and a resident playbook in parallel",
    pride: "Locals love businesses that don't feel touristy",
    visitor: "Tourism flows are predictable — lean into seasonal moments",
  },
  georgia: {
    tactic: "Plan for convention, film-crew, and college-game-day spikes",
    pride: "Atlanta neighborhoods (Decatur, BeltLine) reward locals",
    visitor: "Visitor mix shifts weekly with conventions and concerts",
  },
  hawaii: {
    tactic: "Balance kama'āina pricing with visitor-facing experiences",
    pride: "Locals reward businesses that honor place and culture",
    visitor: "Visitor reviews shape booking decisions a year out",
  },
  idaho: {
    tactic: "Lean into rapid growth — newcomers want a local insider",
    pride: "Boise locals reward genuinely independent over chain",
    visitor: "Sun Valley and Coeur d'Alene tourism drive peak weekends",
  },
  illinois: {
    tactic: "Run a Chicago-neighborhood playbook plus a downstate one",
    pride: "Chicagoans defend their neighborhood spots fiercely",
    visitor: "Conventions and Cubs/Sox games drive weekend spikes",
  },
  indiana: {
    tactic: "Plan around college and pro sports calendars",
    pride: "Hoosier hospitality is real — referrals do heavy lifting",
    visitor: "Indianapolis 500 and Big Ten games drive megaspikes",
  },
  iowa: {
    tactic: "Lean on word-of-mouth — neighborhoods talk and remember",
    pride: "Local pride is genuine and not for sale",
    visitor: "RAGBRAI and college towns produce predictable bursts",
  },
  kansas: {
    tactic: "Build campaigns around K-State and KU game weekends",
    pride: "Wichita and KC suburbs reward consistency over hype",
    visitor: "Day-trip travelers from Missouri are a regular flow",
  },
  kentucky: {
    tactic: "Tie campaigns to bourbon trail, Derby week, and UK basketball",
    pride: "Local distillery and horse culture is part of the marketing",
    visitor: "Derby week and bourbon tourists are a national audience",
  },
  louisiana: {
    tactic: "Plan a festival-season calendar and an off-season survival mode",
    pride: "Locals defend their favorite spots like family",
    visitor: "Festival visitors post heavily — turn them into content",
  },
  maine: {
    tactic: "Maximize the 12-week summer surge with social-first perks",
    pride: "Year-round locals are the brand's foundation",
    visitor: "Out-of-state visitors generate most of the social content",
  },
  maryland: {
    tactic: "Run a D.C.-commuter playbook and a Bay-tourism one",
    pride: "Baltimore neighborhoods reward independent over chain",
    visitor: "Annapolis and Ocean City visitors spike weekends and summers",
  },
  massachusetts: {
    tactic: "Optimize for college-town moves and parents'-weekend windows",
    pride: "Boston and Cambridge reviews drive disproportionate traffic",
    visitor: "Cape Cod summer visitors create a separate playbook",
  },
  michigan: {
    tactic: "Lean into lake-town summers and Detroit-neighborhood revival",
    pride: "Wolverines and Spartans fans turn into customers",
    visitor: "Up-North tourism is a predictable summer windfall",
  },
  minnesota: {
    tactic: "Plan an outdoor summer and indoor winter playbook",
    pride: "Twin Cities locals support local at unusually high rates",
    visitor: "State Fair and stadium events drive weekend spikes",
  },
  mississippi: {
    tactic: "Build campaigns around college football and Gulf Coast tourism",
    pride: "Personal recommendation is the #1 marketing channel",
    visitor: "Casino and beach visitors form a steady weekend flow",
  },
  missouri: {
    tactic: "Tie campaigns to KC barbecue identity or STL neighborhoods",
    pride: "Local sports loyalty is intense — use it",
    visitor: "Branson and KC convention visitors are a separate audience",
  },
  montana: {
    tactic: "Maximize the short summer — Yellowstone, Glacier, festivals",
    pride: "Locals reward businesses that survive the off-season",
    visitor: "National park visitors post to a national audience",
  },
  nebraska: {
    tactic: "Build campaigns around Cornhusker football weekends",
    pride: "Loyalty runs deep and reviews stick",
    visitor: "Game-day weekends draw alumni from across the country",
  },
  nevada: {
    tactic: "Run a Strip playbook, an off-Strip playbook, and a Reno one",
    pride: "Henderson and Summerlin locals avoid touristy spots",
    visitor: "Conventions and shows drive predictable visitor surges",
  },
  "new-hampshire": {
    tactic: "Lean into no-sales-tax shopping and four-season tourism",
    pride: "Lakes Region and Seacoast locals are repeat customers",
    visitor: "Foliage and ski seasons each get their own playbook",
  },
  "new-jersey": {
    tactic: "Run a Shore playbook and a NYC-commuter playbook",
    pride: "Towns are small enough that word travels overnight",
    visitor: "Day-trippers from NYC and Philly drive weekend volume",
  },
  "new-mexico": {
    tactic: "Tie campaigns to local art, food, and Santa Fe culture",
    pride: "Locals reward businesses that respect heritage",
    visitor: "Balloon Fiesta and Santa Fe tourism drive seasonal spikes",
  },
  "new-york": {
    tactic: "Pick a neighborhood and a niche — being broad is being invisible",
    pride: "NYC reviews and Insta posts travel globally",
    visitor: "Tourism and commuter flows shift the customer mix daily",
  },
  "north-carolina": {
    tactic: "Build separate playbooks for Charlotte, Triangle, and Asheville",
    pride: "Local-first messaging plays well against chain growth",
    visitor: "Asheville and Outer Banks tourism drive seasonal spikes",
  },
  "north-dakota": {
    tactic: "Lean into tight communities and energy-sector cycles",
    pride: "Word-of-mouth is the dominant marketing channel",
    visitor: "Bakken workers and Theodore Roosevelt visitors add volume",
  },
  ohio: {
    tactic: "Plan around Buckeye, Browns, Bengals, and Reds game weekends",
    pride: "Columbus, Cleveland, and Cincinnati each have distinct neighborhood loyalty",
    visitor: "Game-day and concert weekends produce predictable spikes",
  },
  oklahoma: {
    tactic: "Tie campaigns to OU/OSU game weekends and rodeo events",
    pride: "Personal recommendations carry serious weight",
    visitor: "OKC and Tulsa concert and sports tourism drive surges",
  },
  oregon: {
    tactic: "Tell a craft, origin, and sustainability story end-to-end",
    pride: "Portland and Eugene locals reward independent aggressively",
    visitor: "Coast and Bend tourism drive seasonal patterns",
  },
  pennsylvania: {
    tactic: "Build a Philly-neighborhood playbook and a Pittsburgh one",
    pride: "Eagles, Steelers, and Penn State pride is a marketing channel",
    visitor: "Conventions, concerts, and Penn State weekends drive spikes",
  },
  "rhode-island": {
    tactic: "Capitalize on Providence density and Newport summer tourism",
    pride: "Word travels fast in a small state — reviews compound",
    visitor: "Newport mansions and Block Island drive summer surges",
  },
  "south-carolina": {
    tactic: "Plan a Charleston food-tourist playbook and a Myrtle Beach one",
    pride: "Southern hospitality is genuine and expected",
    visitor: "Charleston and Myrtle Beach tourism drive most spending",
  },
  "south-dakota": {
    tactic: "Maximize Black Hills summer tourism — Sturgis, Rushmore, Badlands",
    pride: "Sioux Falls and Rapid City locals are year-round base",
    visitor: "Rally week and summer family travelers are the big windfall",
  },
  tennessee: {
    tactic: "Plan around Nashville bachelorette weekends and Memphis tourism",
    pride: "Vols, Titans, and Predators fans turn into customers",
    visitor: "Country music and BBQ tourism drive national audience",
  },
  texas: {
    tactic: "Lean into brand loyalty, big portions, and local pride",
    pride: "Texans reward 'Texas-made' messaging genuinely",
    visitor: "Conventions, rodeos, and college games drive city-by-city spikes",
  },
  utah: {
    tactic: "Plan around family group sizes and Mighty 5 tourism",
    pride: "Salt Lake locals reward independent over chain",
    visitor: "Park City and national-park tourists post to a wide audience",
  },
  vermont: {
    tactic: "Build a foliage playbook, a ski playbook, and a summer one",
    pride: "Locally-made and farm-to-table aren't bonus — they're table stakes",
    visitor: "Out-of-state visitors generate most of the social content",
  },
  virginia: {
    tactic: "Run a NoVA-commuter playbook and a Richmond food one",
    pride: "Richmond and Charlottesville locals defend their indies",
    visitor: "Virginia Beach and Williamsburg tourism drive seasonal flows",
  },
  washington: {
    tactic: "Tell a sourcing story — Seattle customers ask and notice",
    pride: "Seattle and Bellingham locals reward genuinely independent",
    visitor: "Tourism and cruise visitors form a separate audience",
  },
  "west-virginia": {
    tactic: "Lean into community pride and New River Gorge tourism",
    pride: "WVU and Marshall pride is a real marketing lever",
    visitor: "Outdoor-adventure tourism drives weekend spikes",
  },
  wisconsin: {
    tactic: "Plan around game-day weekends and supper-club traditions",
    pride: "Packers, Badgers, and Brewers fans show up loyal",
    visitor: "Door County and Northwoods tourism drive summer surges",
  },
  wyoming: {
    tactic: "Maximize the short Yellowstone-Teton tourism window",
    pride: "Locals reward businesses that respect the place",
    visitor: "National park tourists post to a national audience",
  },
};

// Generic but state-specific challenges (anchored by industry + state).
export function getStateChallenges(
  state: State,
  industry: StateIndustry,
): string[] {
  const industrySingular = industry.singular.toLowerCase();
  const industryPlural = industry.plural.toLowerCase();
  const climate = state.region;

  const seasonal: Record<StateRegionKey, string> = {
    northeast: `Sharp seasonal swings — ${industryPlural} in ${state.name} need a summer playbook and a winter playbook`,
    midwest: `Long winters concentrate ${industryPlural} spending into a few months and put pressure on off-season survival`,
    south: `Year-round demand for ${industryPlural} in ${state.name} also means year-round competitive pressure with no off-season to reset`,
    west: `Tourism-heavy seasons mean ${industryPlural} can boom for a quarter and starve for the next`,
  };

  return [
    seasonal[climate as StateRegionKey],
    `Customer acquisition costs in ${state.name} keep climbing as paid ads compete with national chains for the same ${industrySingular} keywords`,
    `Hard for an independent ${industrySingular} to show up in ${state.name} local search when chains dominate the top three Google results`,
  ];
}

type StateRegionKey = "northeast" | "midwest" | "south" | "west";

// Four state-specific tactics — anchored to the state's character.
export function getStateTactics(state: State, industry: StateIndustry): string[] {
  const angle = STATE_ANGLES[state.slug];
  const industrySingular = industry.singular.toLowerCase();
  const industryPlural = industry.plural.toLowerCase();
  const [p1, p2] = industry.platforms;

  return [
    `${angle.tactic}. For ${industryPlural}, that means tying each perk to a moment a ${state.name} customer is already excited about.`,
    `${angle.pride}. A perk that asks a ${state.name} customer to share why they love your ${industrySingular} on ${p1} feels natural, not transactional.`,
    `${angle.visitor} — and an out-of-state visitor's ${p1} post reaches a much wider audience than a local's. Build a visitor-only perk that doubles the reach of every check-in.`,
    `Use ${p2} reviews to compound local search rank. Ten honest, photo-rich reviews from ${state.name} customers will move you further up the ${state.largestCity} map pack than a month of paid ads.`,
  ];
}

// Five state-specific campaign ideas.
export function getStateCampaignIdeas(
  state: State,
  industry: StateIndustry,
): string[] {
  const industrySingular = industry.singular.toLowerCase();
  const [p1, p2, p3] = industry.platforms;
  const word = state.tourismTaglineWord;
  const angle = STATE_ANGLES[state.slug];

  const baseByIndustry: Partial<Record<string, string[]>> = {
    restaurants: [
      `Free ${state.name} appetizer special for diners who post a Reel of their main course`,
      `10% off the next visit for verified ${p2} reviews mentioning a specific menu item`,
      `Featured "${word}" plate of the month on the restaurant's ${p1} for the best customer ${p1} post`,
    ],
    "coffee-shops": [
      `Free pastry with any latte tagged on ${p1} Stories from a ${state.name} customer`,
      `Buy-one-get-one for posting a ${p3} of latte art with a ${state.name}-themed hashtag`,
      `Half-price afternoon drink for a fresh five-star ${p2} review`,
    ],
    "yoga-studios": [
      `Free class for sharing a class selfie to ${p1} with the studio tagged`,
      `Friend-referral perk for ${state.name} residents through ${p3} event check-ins`,
      `Discounted month for a ${p2} review mentioning a favorite ${state.name} teacher`,
    ],
    salons: [
      `Free deep-conditioning add-on for an ${p1} before/after post tagged at the salon`,
      `Featured client transformation on the salon's ${p3} for ${state.name} customers`,
      `$20 credit toward the next visit for a detailed ${p2} review`,
    ],
    boutiques: [
      `10% off for an ${p1} outfit-of-the-day tag in store`,
      `Featured on the boutique's ${p3} for a try-on haul from a ${state.name} shopper`,
      `$15 store credit for sharing a ${p3} event post about a trunk show`,
    ],
    gyms: [
      `Free week pass for a friend tagged in an ${p1} check-in from a ${state.name} member`,
      `Featured on the gym's ${p3} for a member transformation`,
      `Reduced enrollment fee for a ${p3} recommendation post`,
    ],
    bars: [
      `Free shot for an ${p1} cocktail-of-the-night post tagged at the bar`,
      `Featured drink of the week on ${p3} for video reviews from ${state.name} regulars`,
      `10% off the next tab for a ${p2} review with photos`,
    ],
    bakeries: [
      `Free cookie with any order posted to ${p1} Stories`,
      `Featured cake of the week on ${p3} for client posts`,
      `5% off custom orders for a ${p2} review with photos`,
    ],
  };

  const base = baseByIndustry[industry.slug] ?? [
    `Free upgrade for a tagged ${p1} post from a ${state.name} customer`,
    `Featured customer of the week on the shop's ${p3}`,
    `Discount on next visit for a ${p2} review`,
  ];

  return [
    base[0]!,
    `${angle.visitor.replace(/\.$/, "")}: offer a "${word} visitor" perk that gives out-of-state customers a small extra for tagging your ${industrySingular} in their ${p1} travel post.`,
    base[1]!,
    `Loyalty perk for ${state.name} regulars who tag your ${industrySingular} on ${p1} three times in a month — designed to build the local-resident base that survives the off-season.`,
    base[2]!,
  ];
}
