// ---------------------------------------------------------------------------
// Service-locality landing page data
// ---------------------------------------------------------------------------
//
// Drives /services/[service]/[city] routes. 8 services × 20 cities = 160
// high-intent commercial pages targeting buyer-intent searches like
// "small business marketing services in Austin".
//
// Cities here are slugged WITHOUT state suffixes (e.g. "austin", not
// "austin-tx") to match cleaner commercial URLs. We keep this list local
// rather than reusing programmatic-seo/data.ts (which uses state-suffixed
// slugs for the broader /local/* tree).

export interface ServiceCity {
  slug: string;
  name: string;
  state: string;
  stateCode: string;
  // A short, locally-flavored snippet used in hero context.
  vibe: string;
  // 3-4 example business types that thrive in this market.
  exampleBusinesses: string[];
}

export const SERVICE_CITIES: ServiceCity[] = [
  {
    slug: "austin",
    name: "Austin",
    state: "Texas",
    stateCode: "TX",
    vibe: "the food truck capital with a fierce keep-it-local culture",
    exampleBusinesses: ["taco trucks", "boutique fitness studios", "live-music bars", "BBQ joints"],
  },
  {
    slug: "denver",
    name: "Denver",
    state: "Colorado",
    stateCode: "CO",
    vibe: "an outdoor-obsessed mile-high market with a craft-everything scene",
    exampleBusinesses: ["craft breweries", "outdoor gear shops", "ski-tune shops", "cafes"],
  },
  {
    slug: "nashville",
    name: "Nashville",
    state: "Tennessee",
    stateCode: "TN",
    vibe: "a music-tourism hub where word-of-mouth travels at song speed",
    exampleBusinesses: ["honky-tonks", "hot chicken spots", "boot shops", "boutique hotels"],
  },
  {
    slug: "miami",
    name: "Miami",
    state: "Florida",
    stateCode: "FL",
    vibe: "a visually-driven, bilingual market that rewards bold creative",
    exampleBusinesses: ["beach clubs", "Cuban cafes", "med spas", "boutique gyms"],
  },
  {
    slug: "seattle",
    name: "Seattle",
    state: "Washington",
    stateCode: "WA",
    vibe: "a coffee-and-tech city that values quality and authenticity over hype",
    exampleBusinesses: ["coffee roasters", "specialty grocers", "bookshops", "yoga studios"],
  },
  {
    slug: "portland",
    name: "Portland",
    state: "Oregon",
    stateCode: "OR",
    vibe: "a small-batch, indie-first market that loves to discover the underdog",
    exampleBusinesses: ["food carts", "bike shops", "vintage boutiques", "cideries"],
  },
  {
    slug: "boston",
    name: "Boston",
    state: "Massachusetts",
    stateCode: "MA",
    vibe: "a dense, university-driven market with high repeat-customer value",
    exampleBusinesses: ["seafood restaurants", "cafes near campuses", "bookstores", "tailors"],
  },
  {
    slug: "atlanta",
    name: "Atlanta",
    state: "Georgia",
    stateCode: "GA",
    vibe: "a Southern creator capital where culture and commerce move together",
    exampleBusinesses: ["soul food spots", "barbershops", "sneaker boutiques", "salons"],
  },
  {
    slug: "chicago",
    name: "Chicago",
    state: "Illinois",
    stateCode: "IL",
    vibe: "a neighborhood-loyal market where every block has its own regulars",
    exampleBusinesses: ["deep-dish pizzerias", "jazz clubs", "delis", "fitness studios"],
  },
  {
    slug: "los-angeles",
    name: "Los Angeles",
    state: "California",
    stateCode: "CA",
    vibe: "a creator-saturated market where standing out requires sharper hooks",
    exampleBusinesses: ["taco shops", "wellness studios", "vintage shops", "cafes"],
  },
  {
    slug: "new-york",
    name: "New York",
    state: "New York",
    stateCode: "NY",
    vibe: "the highest-density small-business market in the country",
    exampleBusinesses: ["bodegas", "pizza shops", "nail salons", "wine bars"],
  },
  {
    slug: "san-francisco",
    name: "San Francisco",
    state: "California",
    stateCode: "CA",
    vibe: "a tech-fluent market where customers expect a polished digital experience",
    exampleBusinesses: ["specialty coffee", "pour-overs", "boutiques", "fitness studios"],
  },
  {
    slug: "dallas",
    name: "Dallas",
    state: "Texas",
    stateCode: "TX",
    vibe: "a fast-growing market with a strong appetite for newcomer brands",
    exampleBusinesses: ["BBQ joints", "boutiques", "salons", "fitness studios"],
  },
  {
    slug: "houston",
    name: "Houston",
    state: "Texas",
    stateCode: "TX",
    vibe: "America's most diverse city, where cuisine and community drive loyalty",
    exampleBusinesses: ["Tex-Mex spots", "crawfish joints", "salons", "auto shops"],
  },
  {
    slug: "philadelphia",
    name: "Philadelphia",
    state: "Pennsylvania",
    stateCode: "PA",
    vibe: "a row-house neighborhood market where local is religion",
    exampleBusinesses: ["cheesesteak shops", "cafes", "barbershops", "bakeries"],
  },
  {
    slug: "phoenix",
    name: "Phoenix",
    state: "Arizona",
    stateCode: "AZ",
    vibe: "a sprawling, seasonal market where snowbirds and locals overlap",
    exampleBusinesses: ["med spas", "Mexican restaurants", "golf shops", "salons"],
  },
  {
    slug: "san-diego",
    name: "San Diego",
    state: "California",
    stateCode: "CA",
    vibe: "a beach-and-craft-beer city with year-round outdoor foot traffic",
    exampleBusinesses: ["taco shops", "surf shops", "breweries", "wellness studios"],
  },
  {
    slug: "las-vegas",
    name: "Las Vegas",
    state: "Nevada",
    stateCode: "NV",
    vibe: "a tourist-and-local hybrid where reviews can make or break a week",
    exampleBusinesses: ["restaurants", "tattoo shops", "wedding chapels", "salons"],
  },
  {
    slug: "minneapolis",
    name: "Minneapolis",
    state: "Minnesota",
    stateCode: "MN",
    vibe: "a tight-knit Twin Cities market where community recommendations carry weight",
    exampleBusinesses: ["cafes", "bookshops", "breweries", "fitness studios"],
  },
  {
    slug: "charlotte",
    name: "Charlotte",
    state: "North Carolina",
    stateCode: "NC",
    vibe: "a fast-growing Southern hub with a young, transplant-heavy customer base",
    exampleBusinesses: ["breweries", "salons", "fitness studios", "Southern restaurants"],
  },
];

export const SERVICE_CITY_MAP = new Map(SERVICE_CITIES.map((c) => [c.slug, c]));

export interface ServiceFAQ {
  q: string;
  a: string;
}

export interface Service {
  slug: string;
  name: string; // populated below — split for length
  oneLiner: string;
  outcome: string;
  deliverables: [string, string, string, string, string];
  faqs: [ServiceFAQ, ServiceFAQ, ServiceFAQ, ServiceFAQ, ServiceFAQ, ServiceFAQ];
}

// (Type kludge — TS wants `name: string`; declaring inline above triggers
// shorthand prop issues. We re-declare cleanly here.)
export interface ServiceDef {
  slug: string;
  name: string;
  oneLiner: string;
  outcome: string;
  deliverables: [string, string, string, string, string];
  faqs: [ServiceFAQ, ServiceFAQ, ServiceFAQ, ServiceFAQ, ServiceFAQ, ServiceFAQ];
}

export const SERVICES: ServiceDef[] = [
  {
    slug: "small-business-marketing",
    name: "Small Business Marketing",
    oneLiner: "A turnkey marketing system built for owner-operators who don't have time for an agency.",
    outcome: "a steady flow of new customers and repeat visits",
    deliverables: [
      "A monthly content calendar tailored to your business and seasonality",
      "Automated review-request campaigns over SMS and email",
      "A customer perks program that turns happy customers into promoters",
      "Performance dashboard with foot traffic, reviews, and revenue lift",
      "FTC-compliant disclosures auto-injected on every customer post",
    ],
    faqs: [
      {
        q: "I'm a one-person business. Will this actually save me time?",
        a: "Yes — setup takes about 5 minutes, then the system runs on autopilot. You approve posts and customer rewards from your phone in under 10 minutes a week.",
      },
      {
        q: "Do I need to be on social media for this to work?",
        a: "No. We mobilize your existing customers to post on their channels (where their friends already trust them) rather than relying on your reach.",
      },
      {
        q: "What's the difference between this and just running Facebook ads?",
        a: "Ads buy attention from strangers. Customer-perks marketing earns attention through people who already love you — which converts 5–10× better and costs a fraction of paid social.",
      },
      {
        q: "How do you measure ROI for a small business?",
        a: "We track new-customer attribution by QR code and unique perk codes, then surface revenue lift, average ticket, and review velocity in a weekly digest.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes — month-to-month, no contracts, and you keep all your customer data and reviews if you leave.",
      },
      {
        q: "Will this work if I'm not tech-savvy?",
        a: "We built it for non-technical owners. If you can use Instagram, you can run Social Perks. White-glove onboarding is included.",
      },
    ],
  },
  {
    slug: "social-media-marketing",
    name: "Social Media Marketing",
    oneLiner: "AI-generated, brand-safe content across Instagram, TikTok, and Facebook — plus a customer army amplifying every post.",
    outcome: "consistent posting, more reach, and content from real customers",
    deliverables: [
      "Weekly content plan across Instagram, TikTok, and Facebook",
      "AI-generated captions, hashtags, and posting times",
      "User-generated content (UGC) program that pays customers in perks for posts",
      "Engagement analytics: reach, saves, profile visits, and follower growth",
      "Brand-voice presets so AI captions sound like you wrote them",
    ],
    faqs: [
      {
        q: "Do you actually post for me, or do I have to copy-paste?",
        a: "Both options work. You can auto-publish once approved, or copy-paste to your own scheduler. We integrate with Meta Business Suite, Later, and Buffer.",
      },
      {
        q: "How do you get my customers to post for me?",
        a: "We offer them a small perk (a free coffee, a discount, an entry to a raffle) in exchange for tagging your business in a story or post. They opt in, you approve, the perk drops.",
      },
      {
        q: "Will my content look generic or AI-slop?",
        a: "We train on your existing posts and brand voice. Most owners say outputs are indistinguishable from what they'd write — just faster and on schedule.",
      },
      {
        q: "What platforms do you cover?",
        a: "15 platforms including Instagram, TikTok, Facebook, YouTube Shorts, Threads, Pinterest, Twitter/X, Snapchat, Reddit, LinkedIn, Yelp, and Google Business.",
      },
      {
        q: "Can I review every post before it goes live?",
        a: "Yes — approval mode is on by default. You can switch to auto-publish per platform once you trust the cadence.",
      },
      {
        q: "Do you handle paid ads too?",
        a: "Not directly — Social Perks is organic + earned media. We integrate with your ads manager so customer-generated content can be boosted as Spark ads or Whitelist ads.",
      },
    ],
  },
  {
    slug: "review-generation",
    name: "Review Generation",
    oneLiner: "Get 5× more 5-star Google and Yelp reviews on autopilot — without buying or begging.",
    outcome: "more 5-star reviews on Google, Yelp, and Facebook",
    deliverables: [
      "Automated SMS and email review requests timed to peak satisfaction moments",
      "QR code reviewer kit (table tents, receipts, business cards)",
      "Review-response AI that drafts owner replies in your voice",
      "Negative-feedback intercept that routes complaints to you privately first",
      "Weekly review velocity report (Google, Yelp, Facebook, TripAdvisor)",
    ],
    faqs: [
      {
        q: "Is this allowed by Google and Yelp?",
        a: "Yes — we follow each platform's TOS. We ask for honest reviews, never offer perks in exchange for positive ones, and don't gate reviews behind star-rating filters.",
      },
      {
        q: "How fast will I see new reviews?",
        a: "Most businesses see their first new reviews within 48 hours of going live. A 3–5× monthly increase is typical by week 4.",
      },
      {
        q: "What if a customer leaves a negative review?",
        a: "We auto-draft a professional response in your voice within 60 seconds and alert you for approval. Owners who respond fast see negative-review impact drop by ~70%.",
      },
      {
        q: "Do I need a Google Business Profile already?",
        a: "Yes — and if you don't, we'll help you claim and optimize it during onboarding. Same for Yelp, Facebook, and TripAdvisor.",
      },
      {
        q: "Can I import existing customer lists?",
        a: "Yes — CSV upload, Square, Toast, Mindbody, Shopify, and Stripe integrations are supported. Imports are GDPR/CAN-SPAM-compliant by default.",
      },
      {
        q: "What's the catch with the QR code reviewer kit?",
        a: "No catch. We mail printed table tents and stickers free with annual plans, or you can print on-demand from the dashboard.",
      },
    ],
  },
  {
    slug: "influencer-marketing",
    name: "Influencer Marketing",
    oneLiner: "Find, brief, and pay local nano- and micro-influencers in your zip code — no agencies, no $5K minimums.",
    outcome: "local creator collaborations that actually drive foot traffic",
    deliverables: [
      "Vetted local creator database filtered by audience, engagement, and proximity",
      "Auto-generated briefs with brand-safe talking points and FTC disclosures",
      "Performance pay-per-post pricing — no flat fees, no surprises",
      "Whitelist and Spark Ads rights baked into every contract",
      "Attribution dashboard showing reach, clicks, and in-store conversion",
    ],
    faqs: [
      {
        q: "How is this different from Aspire, GRIN, or other influencer platforms?",
        a: "Most platforms are built for national brands with $50K+ budgets. We're built for owner-operators working with nano-creators (1K–50K followers) at $50–$500 per post.",
      },
      {
        q: "How do I find creators near me?",
        a: "We index local creators by zip code, niche, and engagement rate. You can filter by distance, audience demographics, and average post performance.",
      },
      {
        q: "What if a creator misrepresents my brand?",
        a: "Every brief auto-injects FTC #ad disclosure language and your brand-safe talking points. You also approve every post before it goes live.",
      },
      {
        q: "Can I run a campaign with multiple creators at once?",
        a: "Yes — bulk briefs let you launch a 10-creator campaign in under 15 minutes. We've seen restaurants double weekend foot traffic this way.",
      },
      {
        q: "Do I need to negotiate rates?",
        a: "No. Pricing is set by our oracle based on engagement, niche, and city, with a transparent take rate. Creators can counter; you can accept or pass.",
      },
      {
        q: "What about creator payments and 1099s?",
        a: "We handle payouts (Stripe Connect), tax docs, and contracts. You see one invoice per campaign.",
      },
    ],
  },
  {
    slug: "customer-loyalty-programs",
    name: "Customer Loyalty Programs",
    oneLiner: "Stop losing customers to chains with loyalty cards. Build a perks program that fits in their phone.",
    outcome: "more repeat visits and higher average ticket size",
    deliverables: [
      "Branded digital perk card delivered via Apple Wallet and Google Wallet",
      "Points, punches, or tier-based rewards (you pick the model)",
      "Auto-segmented win-back campaigns for lapsed customers",
      "Birthday and anniversary perk automation",
      "Revenue and retention dashboard with cohort analysis",
    ],
    faqs: [
      {
        q: "Do I need a POS integration for this to work?",
        a: "It's better if you have one (Square, Toast, Clover, Shopify, Lightspeed are supported), but a QR-code-only setup works fine for cash businesses.",
      },
      {
        q: "What kind of perks should I offer?",
        a: "Our pricing oracle recommends a perk structure based on your margin, average ticket, and visit frequency. Most cafes do 10th-visit free; salons do tiered % off.",
      },
      {
        q: "Will customers actually sign up?",
        a: "Average signup rate is 38% of transactions when the staff prompts. Wallet adoption is 4× higher than physical cards because there's nothing to lose.",
      },
      {
        q: "How does this prevent fraud or abuse?",
        a: "Each redemption is single-use, geo-bound, and rate-limited. Our fraud engine catches duplicate accounts and suspicious patterns automatically.",
      },
      {
        q: "Can I run a points-and-perks hybrid?",
        a: "Yes — combine points-on-spend with perk-for-action (e.g. \"100 points or 1 review = $10 off\"). This is the highest-retention model in our data.",
      },
      {
        q: "What happens to my data if I cancel?",
        a: "You can export your full customer list, transaction history, and perk balances as CSV. No lock-in.",
      },
    ],
  },
  {
    slug: "ugc-marketing",
    name: "UGC Marketing",
    oneLiner: "Turn every customer with a phone into your content team — with rights, compliance, and reuse built in.",
    outcome: "a steady flow of customer-created photos and videos you can legally reuse",
    deliverables: [
      "Customer perk-for-post program with built-in usage rights",
      "AI moderation that auto-flags brand-safety and quality issues",
      "Centralized UGC library with download, license tracking, and tagging",
      "One-click repost to Instagram, TikTok, and your website",
      "FTC #ad disclosure auto-injection on every customer post",
    ],
    faqs: [
      {
        q: "Do I have to pay customers for their posts?",
        a: "Pay in perks, not cash. A $5 perk feels generous to a customer and costs you ~$1.50 in COGS — far cheaper than a stock photo.",
      },
      {
        q: "Do I own the content customers create?",
        a: "Yes — every perk redemption includes a clickwrap content license granting you perpetual reuse rights for marketing.",
      },
      {
        q: "What if someone posts something off-brand or NSFW?",
        a: "Our AI moderation scans every post before you see it and rejects clear violations. You also have a 24-hour kill switch on any approved post.",
      },
      {
        q: "Can I use UGC in paid ads?",
        a: "Yes — Spark Ads and Whitelist Ads rights are included by default. Many businesses see 3× ROAS using UGC vs. studio creative.",
      },
      {
        q: "How do I know if a customer actually posted?",
        a: "We verify each post via the platform's API (Instagram, TikTok, Facebook). No screenshots, no honor system.",
      },
      {
        q: "What if my industry is regulated (alcohol, cannabis, medical)?",
        a: "We have compliance presets for alcohol, cannabis, healthcare, and financial services that auto-inject the right disclosures and block prohibited content.",
      },
    ],
  },
  {
    slug: "referral-program-setup",
    name: "Referral Program Setup",
    oneLiner: "Launch a customer referral program in 5 minutes — track every invite, every signup, every payout.",
    outcome: "a measurable referral channel that brings in pre-qualified customers",
    deliverables: [
      "Shareable referral links with attribution per customer",
      "Dual-sided rewards (referrer + referee both get a perk)",
      "Auto-payout in store credit, Stripe, or PayPal",
      "Leaderboard and gamification to drive top-referrer activity",
      "Fraud detection on self-referrals, duplicate accounts, and abuse",
    ],
    faqs: [
      {
        q: "What's a good referral reward structure?",
        a: "Our data shows dual-sided rewards (e.g. $10 to referrer, $10 to referee) outperform one-sided by 2.3×. Start with ~10% of your average ticket on each side.",
      },
      {
        q: "How long does setup take?",
        a: "5 minutes for the default template. 30 minutes if you want custom branding, multi-tier rewards, and POS integration.",
      },
      {
        q: "Can I prevent self-referrals?",
        a: "Yes — IP, device, payment-method, and address matching block obvious self-referrals. The fraud engine also flags suspicious patterns.",
      },
      {
        q: "What's the average referral conversion rate?",
        a: "Customer-to-customer referrals convert at 12–18% (vs. ~2% for paid ads). Most owners see payback within the referee's first transaction.",
      },
      {
        q: "Can I cap how much one customer can earn?",
        a: "Yes — set per-customer caps, time-window caps, and per-program caps. Defaults prevent any single customer from earning more than 20% of program spend.",
      },
      {
        q: "Does this integrate with my existing loyalty program?",
        a: "Yes — referrals can stack on top of points/perks, or run standalone. We have one-click bridges to Square Loyalty, Toast Rewards, and Mindbody.",
      },
    ],
  },
  {
    slug: "local-seo-marketing",
    name: "Local SEO Marketing",
    oneLiner: "Rank in the Google Map Pack for the searches that matter — without guessing what to optimize next.",
    outcome: "higher Google Map Pack rankings and more website visits from local search",
    deliverables: [
      "Google Business Profile audit and optimization",
      "Local citation building across 50+ directories",
      "Review velocity acceleration (the #1 Map Pack ranking factor)",
      "Geo-targeted content suggestions for your blog and social",
      "Weekly local rank tracking with competitor benchmarks",
    ],
    faqs: [
      {
        q: "How long until I see Map Pack ranking improvements?",
        a: "Most businesses move up 5–10 positions within 30 days, and into the top 3 within 60–90 days for primary keywords. Highly competitive niches take longer.",
      },
      {
        q: "What's the biggest local SEO factor I'm probably missing?",
        a: "Review velocity (new reviews per week). Google heavily weights recency. Most owners have great old reviews but few new ones — we fix that.",
      },
      {
        q: "Do I need a website for this to work?",
        a: "A website helps, but a well-optimized Google Business Profile alone can rank for local searches. We'll optimize whatever you have.",
      },
      {
        q: "What about Yelp, Apple Maps, and Bing?",
        a: "All included — we sync citations across Google, Apple Maps, Bing Places, Yelp, Facebook, TripAdvisor, and 45+ niche directories.",
      },
      {
        q: "Can I see what searches I'm ranking for?",
        a: "Yes — our local rank tracker checks 50+ keywords daily from your actual service area, not a national average.",
      },
      {
        q: "Is this different from hiring a local SEO agency?",
        a: "Same outcomes, ~10× cheaper. Agencies typically charge $1.5–3K/mo for the same playbook we automate. You also keep full ownership of your GBP and citations.",
      },
    ],
  },
];

export const SERVICE_MAP = new Map(SERVICES.map((s) => [s.slug, s]));
