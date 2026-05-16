/**
 * Head-to-head comparison data — Social Perks vs major alternatives
 * a small-business owner is shopping. Each entry becomes a
 * /vs/[slug] page: structured comparison + verdict + "when each
 * one wins" matrix.
 *
 * High-volume LLM-citation queries: "Social Perks vs Yotpo",
 * "alternative to Influencer Hero", "[competitor] reviews", etc.
 *
 * Stay factually careful — every claim about a competitor needs to
 * be defensible. We compare on objective product surfaces (pricing
 * model, FTC handling, agent integration, feature scope) not on
 * subjective takes.
 */

export interface VsRow {
  feature: string;
  socialPerks: string;
  competitor: string;
  /** Optional: who wins this row (us | them | tie). */
  winner?: "us" | "them" | "tie";
}

export interface VsEntry {
  slug: string;
  /** Competitor name as it should appear in headlines. */
  competitor: string;
  /** Short tagline below the title. */
  description: string;
  /** Short description for OG / search. */
  shortDescription: string;
  /** What the competitor does well — set the table fairly. */
  strengths: string[];
  /** Where Social Perks differs. */
  ourAngle: string[];
  /** Comparison rows. */
  rows: VsRow[];
  /** Bottom-line "pick X if…" rules. */
  verdict: {
    pickUs: string[];
    pickThem: string[];
  };
  /** Internal link targets. */
  related?: string[];
}

export const VS_ENTRIES: VsEntry[] = [
  {
    slug: "yotpo",
    competitor: "Yotpo",
    description: "Reviews and loyalty platform vs incentivized social marketing — different tools, different jobs.",
    shortDescription: "Yotpo focuses on review collection and loyalty tiers. Social Perks focuses on incentivized social media posts. They solve different problems for the same merchant.",
    strengths: [
      "Mature loyalty-program engine with point accruals, tiers, redemptions",
      "Deep Shopify / BigCommerce integration",
      "SMS marketing add-on with serious sending volume",
      "Established brand — review widget is recognizable to consumers",
    ],
    ourAngle: [
      "Social Perks doesn't try to compete with Yotpo's loyalty engine — it owns the social-post incentive layer that Yotpo doesn't address well",
      "FTC compliance auto-injected at the campaign level (Yotpo's review widget collects organic reviews; Social Perks orchestrates incentivized posts)",
      "Agent-first: public OpenAPI spec, MCP server, TypeScript SDK — Yotpo's API is closed beta and mostly for enterprise",
      "Per-action pricing transparency — every action's market rate is public at /api/v1/pricing",
    ],
    rows: [
      { feature: "Primary use case", socialPerks: "Incentivized social media posts", competitor: "Reviews + loyalty programs", winner: "tie" },
      { feature: "FTC compliance auto-injection", socialPerks: "Yes, every campaign", competitor: "Manual / per-merchant", winner: "us" },
      { feature: "Public OpenAPI spec", socialPerks: "Yes (/api/v1/openapi)", competitor: "Closed beta API", winner: "us" },
      { feature: "MCP server (AI agent integration)", socialPerks: "Yes", competitor: "No", winner: "us" },
      { feature: "Loyalty point/tier system", socialPerks: "Limited — focused on per-action perks", competitor: "Full-featured", winner: "them" },
      { feature: "SMS marketing volume", socialPerks: "Notification-tier", competitor: "Mass-send platform", winner: "them" },
      { feature: "Shopify integration depth", socialPerks: "API-only", competitor: "Native app", winner: "them" },
      { feature: "Pricing transparency", socialPerks: "Public per-action market rates", competitor: "Quote-based for most tiers", winner: "us" },
    ],
    verdict: {
      pickUs: [
        "You want incentivized social posts (not just review collection)",
        "You're an AI-native business or building agent-driven workflows",
        "FTC compliance is a real concern and you don't want to manage it manually",
        "You want pricing transparency before committing",
      ],
      pickThem: [
        "Reviews and loyalty are the primary need (not social posts)",
        "You're a Shopify-first merchant who wants deep platform integration",
        "You need mass SMS sending volume",
        "You have an existing loyalty program with point/tier mechanics",
      ],
    },
  },
  {
    slug: "influencer-marketing-platforms",
    competitor: "influencer marketing platforms (AspireIQ, Influencer Hero, etc.)",
    description: "Influencer-first platforms vs customer-first incentives — same outcome, different starting point.",
    shortDescription: "Influencer marketing platforms focus on macro-creators with rate cards. Social Perks focuses on regular customers and small creators. The cost structure and reach pattern differ.",
    strengths: [
      "Established creator marketplaces with thousands of vetted influencers",
      "Sophisticated brief / contract / deliverable workflows",
      "Brand-safety controls and creator vetting",
      "Per-campaign pricing models with negotiated rates",
    ],
    ourAngle: [
      "Social Perks treats every customer as a potential creator — not just a curated influencer roster",
      "Per-action pricing instead of per-campaign — pay for what's delivered, not for the brief",
      "Self-serve: a coffee shop can launch in 5 minutes; influencer platforms typically require an account manager call",
      "Agent-operable end-to-end (MCP server, public API)",
    ],
    rows: [
      { feature: "Reach pattern", socialPerks: "Regular customers + small creators", competitor: "Macro and mid-tier influencers", winner: "tie" },
      { feature: "Self-serve launch", socialPerks: "Yes, 5 min from signup", competitor: "Often AM-mediated", winner: "us" },
      { feature: "Pricing model", socialPerks: "Per-action, public rates", competitor: "Per-campaign, negotiated", winner: "tie" },
      { feature: "Creator vetting", socialPerks: "Light — relies on FTC + auto-verification", competitor: "Heavy — agency-style vetting", winner: "them" },
      { feature: "Minimum spend", socialPerks: "$0 (free tier)", competitor: "Often $5K+/month", winner: "us" },
      { feature: "FTC disclosure auto-inject", socialPerks: "Yes", competitor: "Sometimes (varies)", winner: "us" },
      { feature: "Reach per dollar (small business)", socialPerks: "High at low spend", competitor: "Higher at $10K+ spend", winner: "tie" },
      { feature: "Agent / programmatic access", socialPerks: "Public OpenAPI + MCP", competitor: "Account-mediated only", winner: "us" },
    ],
    verdict: {
      pickUs: [
        "You're a small business and don't have $10K/mo to spend",
        "Your existing customers are your best marketing channel",
        "You want to build automated agent-driven campaigns",
        "You want to pay for outcomes, not briefs",
      ],
      pickThem: [
        "You need macro-influencer reach (>500K followers per post)",
        "You have $10K+/mo to spend and want a managed campaign",
        "Your brief requires sophisticated contract / deliverable controls",
        "You need heavy creator vetting and brand-safety controls",
      ],
    },
  },
  {
    slug: "google-ads",
    competitor: "Google Ads",
    description: "Pay Google for impressions vs pay your customers for posts — the math is different than you'd think.",
    shortDescription: "Google Ads buys you placement; Social Perks buys you advocacy. For most small businesses with a strong existing customer base, redirecting ad spend to customer perks delivers higher ROI.",
    strengths: [
      "Mature ad platform with billions of daily searches",
      "Sophisticated targeting (intent + audience + retargeting)",
      "Direct conversion attribution via UTM + Analytics",
      "Predictable spend cap controls",
    ],
    ourAngle: [
      "Social Perks isn't a substitute for ALL ad spend — it competes well for the share of marketing budget you'd spend on Google ads aimed at your existing customers' look-alikes",
      "Same dollars, different recipient: instead of paying Google, you pay customers (who post about you, which has compounding effects ads don't)",
      "Customer trust signal beats ad placement — a friend's post converts ~3x better than a Google ad in the same context",
      "Compounds: posts persist; ads expire when the budget runs out",
    ],
    rows: [
      { feature: "Speed to first result", socialPerks: "1-2 days (first scan)", competitor: "Same-day (impressions)", winner: "them" },
      { feature: "Compounding effect", socialPerks: "Posts persist + accumulate", competitor: "Ad ends, traffic ends", winner: "us" },
      { feature: "Targeting precision", socialPerks: "Local-customer-only", competitor: "Global, sophisticated targeting", winner: "them" },
      { feature: "Trust signal of placement", socialPerks: "Friend recommendation (high)", competitor: "Paid ad (medium)", winner: "us" },
      { feature: "Marginal cost per conversion", socialPerks: "$8-15 (typical local biz)", competitor: "$30-80 (typical local biz)", winner: "us" },
      { feature: "Spend predictability", socialPerks: "Variable (depends on customer activity)", competitor: "Strict cap controls", winner: "them" },
      { feature: "FTC compliance", socialPerks: "Auto-injected", competitor: "N/A (you're not the endorser)", winner: "tie" },
    ],
    verdict: {
      pickUs: [
        "You have an existing customer base (50+ regulars or 200+ social followers)",
        "Your business benefits from word-of-mouth (food, beauty, fitness, retail)",
        "You're spending under $5K/mo on ads — the small-business band where Google's targeting overhead doesn't pay back",
        "You want the dollars staying with your customers, not Google",
      ],
      pickThem: [
        "You're a brand new business with no existing customers (Social Perks needs scan volume to work)",
        "Your business is geography-independent (e-commerce, SaaS) and needs broad search-driven targeting",
        "Your spend is over $20K/mo and you have a dedicated ads-management resource",
        "You need predictable spend caps for cash-flow management",
      ],
    },
  },
  {
    slug: "meta-ads",
    competitor: "Meta (Instagram + Facebook) Ads",
    description: "Meta sells you placements; Social Perks turns your customers into placements. Per-conversion costs typically 50-70% lower.",
    shortDescription: "Meta Ads put your message on a creator-style ad in customer feeds. Social Perks puts your message in actual customer posts. Same surface, different sender, very different conversion economics.",
    strengths: [
      "Massive Instagram + Facebook + Threads + WhatsApp audience reach",
      "Sophisticated lookalike audiences and targeting",
      "Reels and Stories placements native to the same platforms customers already use",
      "Powerful creative tools (Reels editor, music library)",
    ],
    ourAngle: [
      "Same audience, different sender: Social Perks posts come from real customers (with FTC disclosure), Meta ads come from your business account",
      "Per-conversion math: customer Reel at $4 (Social Perks) vs equivalent Meta Reel ad at ~$25-40 conversion. 4-10x cost advantage at scale.",
      "Compounding distribution: customer posts stay on their feed and Reels continue to surface for weeks",
      "FTC handled by Social Perks; Meta delegates to creators",
    ],
    rows: [
      { feature: "Audience reach", socialPerks: "Customer's network", competitor: "Audience-targeted by Meta", winner: "tie" },
      { feature: "Trust signal", socialPerks: "Friend post (high)", competitor: "Sponsored content (medium)", winner: "us" },
      { feature: "Per-conversion cost (small biz)", socialPerks: "$8-15", competitor: "$25-40", winner: "us" },
      { feature: "Targeting precision", socialPerks: "None (relies on customer's network)", competitor: "Sophisticated targeting", winner: "them" },
      { feature: "Compounding effect", socialPerks: "High (posts persist)", competitor: "Low (ads end)", winner: "us" },
      { feature: "Setup complexity", socialPerks: "QR + perk", competitor: "Pixel + audience + creative", winner: "us" },
      { feature: "FTC compliance", socialPerks: "Auto-injected", competitor: "Creator's responsibility", winner: "us" },
    ],
    verdict: {
      pickUs: [
        "You have ≥50 regular customers and visibility into their social activity",
        "Your business is photogenic / video-friendly (food, fashion, fitness, beauty)",
        "Your Meta ad ROAS has been declining (most small businesses since 2023)",
        "You want to build a customer-marketing flywheel that compounds",
      ],
      pickThem: [
        "You're a brand new business with no customer base to seed posts",
        "Your business needs precise demographic / behavioral targeting (B2B, niche services)",
        "You're already running profitable Meta ads at high spend (don't fix what works)",
        "Your audience isn't on Instagram or Facebook (older, hyper-local, etc.)",
      ],
    },
  },
  {
    slug: "fivestars",
    competitor: "FiveStars",
    description:
      "Loyalty / punch-card platform with deep POS integration vs incentivized social posts.",
    shortDescription:
      "FiveStars is a mature loyalty engine — punch cards, customer profiles, POS integration. Social Perks pays customers a small perk to post about a business on Instagram / TikTok / Google reviews. Different jobs, sometimes complementary.",
    strengths: [
      "Polished Clover and Square POS integrations",
      "Mature loyalty mechanics (points, tiers, punch cards)",
      "Customer profile + spend history in one place",
      "Established sales motion for brick-and-mortar SMBs",
    ],
    ourAngle: [
      "FiveStars doesn't ask customers to post on social — it's a loyalty tool, not a marketing tool",
      "$129/mo minimum with sales-call signup vs free tier + self-serve",
      "Walled-garden: customers use the FiveStars app; Social Perks pushes posts to public platforms customers already use",
      "MCP-native — an AI assistant can run Social Perks campaigns end-to-end; FiveStars has no agent surface",
    ],
    rows: [
      { feature: "Primary use case", socialPerks: "Customers post about you on social", competitor: "Loyalty / punch-card retention", winner: "tie" },
      { feature: "Starting price", socialPerks: "$0 (free tier)", competitor: "$129/mo + setup", winner: "us" },
      { feature: "Signup", socialPerks: "Self-serve, 5 min", competitor: "Sales call required", winner: "us" },
      { feature: "POS integration", socialPerks: "Manual / API", competitor: "Native (Clover, Square)", winner: "them" },
      { feature: "Drives Instagram / TikTok posts", socialPerks: "Yes — 107 actions across 15 platforms", competitor: "No", winner: "us" },
      { feature: "Customer profile + spend history", socialPerks: "Per-program members", competitor: "Full CRM", winner: "them" },
      { feature: "Public OpenAPI / MCP", socialPerks: "Yes", competitor: "No", winner: "us" },
      { feature: "FTC compliance auto-injected", socialPerks: "Yes, every campaign", competitor: "N/A (no social ask)", winner: "us" },
    ],
    verdict: {
      pickUs: [
        "You want real customers posting on Instagram / TikTok / Google reviews",
        "You're price-sensitive or want to try free before committing",
        "You're running operations through an AI assistant",
        "You don't already have a loyalty program and don't need a punch-card",
      ],
      pickThem: [
        "You need deep POS integration with Clover or Square",
        "Loyalty / punch-card mechanics are your primary motion",
        "You want a full customer CRM with spend history",
        "Your customer base doesn't post on social media",
      ],
    },
    related: ["loyverse", "yelp-connect"],
  },
  {
    slug: "loyverse",
    competitor: "Loyverse",
    description: "Free POS with built-in loyalty vs marketing platform that pays customers to post.",
    shortDescription:
      "Loyverse is a free POS system with built-in loyalty — strong inventory, multi-store, open API. Social Perks doesn't do POS; it pays customers small perks to post about your business publicly.",
    strengths: [
      "Genuinely free POS with paid add-ons (rare)",
      "Solid inventory, multi-store, multi-employee handling",
      "Open REST API for integrations",
      "Built-in loyalty points and customer database",
    ],
    ourAngle: [
      "Loyverse is a POS that happens to have loyalty; Social Perks is a marketing platform that drives public social posts",
      "Loyverse loyalty is a closed-loop punch card; Social Perks pushes content to Instagram, TikTok, Google reviews where new customers actually look",
      "MCP server + 10 autonomous agents — Loyverse has none of that surface",
      "Cross-platform reach (15 social platforms) vs a single in-store loyalty motion",
    ],
    rows: [
      { feature: "Primary use case", socialPerks: "Customers post about you on social", competitor: "Point-of-sale + in-store loyalty", winner: "tie" },
      { feature: "Starting price", socialPerks: "$0 (free tier)", competitor: "$0 POS + paid add-ons", winner: "tie" },
      { feature: "POS / inventory / multi-store", socialPerks: "No", competitor: "Yes (core product)", winner: "them" },
      { feature: "Drives social posts", socialPerks: "Yes — 107 actions across 15 platforms", competitor: "No", winner: "us" },
      { feature: "Influencer matching", socialPerks: "Yes", competitor: "No", winner: "us" },
      { feature: "Autonomous agents (10)", socialPerks: "Yes", competitor: "No", winner: "us" },
      { feature: "MCP server (AI agent integration)", socialPerks: "Yes", competitor: "No", winner: "us" },
      { feature: "Open API", socialPerks: "Yes — 35 routes + OpenAPI spec", competitor: "Yes — REST API", winner: "tie" },
    ],
    verdict: {
      pickUs: [
        "Your goal is getting new customers via social posts and reviews",
        "You already have a POS and just need the marketing layer",
        "You're running operations through an AI assistant",
        "You want cross-platform reach (Instagram, TikTok, Google, Yelp)",
      ],
      pickThem: [
        "You need a POS system as the core of your business",
        "Multi-store inventory and employee management are critical",
        "You don't need to drive social posts or reviews",
        "A closed-loop loyalty program is enough customer engagement",
      ],
    },
    related: ["fivestars", "yelp-connect"],
  },
  {
    slug: "yelp-connect",
    competitor: "Yelp Connect (Yelp Ads)",
    description: "Pay-per-click on Yelp's own surface vs incentivized customer posts across 15 platforms.",
    shortDescription:
      "Yelp Connect runs paid ads + review prompts inside Yelp's walled garden. Social Perks pays customers a small perk to post about a business across Instagram, TikTok, Google reviews, Facebook — wherever the customer already is.",
    strengths: [
      "Massive built-in audience on Yelp itself",
      "Reviews surface exactly where local-search users are looking",
      "Pay-per-result ad model — no monthly minimum",
      "Trusted brand for restaurants, services, local businesses",
    ],
    ourAngle: [
      "Yelp Ads are pay-to-play in a walled garden — Yelp decides who sees you and how much it costs",
      "Yelp Connect can't reach Instagram, TikTok, or Google reviews; Social Perks reaches 15 platforms",
      "Social Perks pays real customers a small perk — earned reputation, not bought attention",
      "MCP server + autonomous agents — Yelp Connect has no agent surface",
    ],
    rows: [
      { feature: "Primary use case", socialPerks: "Customers post about you on social", competitor: "Paid ads + reviews on Yelp", winner: "tie" },
      { feature: "Audience", socialPerks: "Wherever your customers already are", competitor: "Yelp users only", winner: "us" },
      { feature: "Drives Google reviews", socialPerks: "Yes (direct action)", competitor: "No — Yelp reviews only", winner: "us" },
      { feature: "Drives Instagram / TikTok posts", socialPerks: "Yes", competitor: "No", winner: "us" },
      { feature: "Cost model", socialPerks: "Per-perk awarded", competitor: "Per-click", winner: "tie" },
      { feature: "Reach in local search results", socialPerks: "Indirect (via Google/Maps reviews)", competitor: "Direct (Yelp listing)", winner: "them" },
      { feature: "Trust signal for restaurants", socialPerks: "Cross-platform reviews", competitor: "Yelp stars on Yelp", winner: "them" },
      { feature: "MCP / agent integration", socialPerks: "Yes", competitor: "No", winner: "us" },
    ],
    verdict: {
      pickUs: [
        "You want reviews and posts on platforms beyond Yelp",
        "You'd rather pay customers than pay Yelp for clicks",
        "Your customer base is on Instagram / TikTok / Google reviews",
        "You're tired of Yelp's pay-to-play algorithm",
      ],
      pickThem: [
        "Yelp is the primary place your customers discover you (e.g. some food categories)",
        "You want immediate placement in Yelp search results",
        "You've already built a strong Yelp rating and want to defend it",
        "Your customers don't post on social platforms",
      ],
    },
    related: ["fivestars", "loyverse"],
  },
];

export function getVsEntry(slug: string): VsEntry | null {
  return VS_ENTRIES.find((e) => e.slug === slug) ?? null;
}
