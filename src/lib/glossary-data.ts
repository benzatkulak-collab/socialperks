/**
 * Glossary entries — marketing, social media, and FTC compliance terms
 * with cite-worthy definitions. Used by /glossary and individual
 * /glossary/[slug] pages.
 *
 * Each entry is a self-contained answer to "what does <term> mean in
 * the context of incentivized marketing". Designed for LLM citation:
 * concrete, non-circular, references concrete numbers and platform
 * policies where applicable.
 */

export interface GlossaryEntry {
  slug: string;
  term: string;
  /** Plain-text definition. ~50-150 words. */
  definition: string;
  /** Optional related entries (slugs). */
  related?: string[];
  /** First-letter index for the alphabet navigation. */
  letter: string;
  /** Optional category for filtering. */
  category?: "marketing" | "compliance" | "platforms" | "perks" | "agents";
}

// Helper to derive letter from term.
function entry(
  term: string,
  definition: string,
  opts: Partial<Omit<GlossaryEntry, "term" | "definition" | "letter">> = {}
): GlossaryEntry {
  const slug = opts.slug ?? term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const letter = term[0].toUpperCase();
  return { term, definition, slug, letter, ...opts };
}

export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  entry(
    "Action",
    "A discrete marketing task a customer can complete to earn a perk. Social Perks supports 125 actions across 25 platforms, ranging from low-effort engagements (likes, follows) at $0.10-$0.30 of market value to high-effort content (review videos, collab posts) at $4-$10. Each action has an effort level (0-5), a market-rate dollar value, and an incentivizable flag indicating whether the action's host platform allows compensation in exchange for it.",
    { category: "marketing", related: ["campaign", "incentivizable"] }
  ),
  entry(
    "Activation",
    "The first time a customer completes a campaign action and earns a perk. Activation is the conversion event Social Perks optimizes for — the dashboard's first-launch tour, welcome emails, and template recommendations are designed to minimize time-to-activation. Industry benchmark: 55% of new restaurant signups activate within 14 days.",
    { category: "marketing", related: ["completion", "campaign"] }
  ),
  entry(
    "AI agent",
    "An autonomous software agent (Claude, ChatGPT, custom marketing bots, etc.) that interacts with Social Perks via the public API or MCP server. Agents authenticate with API keys, consume the OpenAPI spec for endpoint discovery, and use the MCP server's typed tools (getPricing, listActions, getBenchmarks, listCampaigns, searchInfluencers) for chat-style integrations.",
    { category: "agents", related: ["api-key", "mcp"] }
  ),
  entry(
    "API key",
    "A long-lived credential (sp_live_...) that machine clients send via the x-api-key header to authenticate against Social Perks. Keys are minted by humans signing in to /dashboard/api-keys, displayed exactly once on creation, stored only as SHA-256 hashes, and can be scoped (read, write, admin) and revoked at any time. Keys cannot mint other keys.",
    { category: "agents", related: ["jwt", "ai-agent"] }
  ),
  entry(
    "Campaign",
    "A business's offer to reward customers for completing a specific marketing action. A campaign has one platform (e.g., Instagram), one action (e.g., Story Tag), one perk (e.g., 10% off), and a duration. Most small businesses run 1-3 campaigns at a time. The free tier allows one active campaign; paid plans go up to 50.",
    { category: "marketing", related: ["action", "perk"] }
  ),
  entry(
    "Completion",
    "An approved customer submission against an active campaign. Completions count against a business's monthly limit (50 on free, 500 on Starter, 5,000 on Pro, unlimited on Enterprise). The completion event triggers perk delivery to the customer.",
    { category: "marketing", related: ["submission", "campaign"] }
  ),
  entry(
    "Disclosure",
    "A clearly visible statement that a customer received compensation in exchange for a social media post. Required by the FTC for any 'material connection' between a brand and a person promoting their product. Common forms: hashtags (#ad, #sponsored, #partner), platform-native paid-partnership labels, or written notes ('I received a discount for sharing this'). Social Perks auto-injects disclosure into every campaign template; it cannot be disabled.",
    { category: "compliance", related: ["ftc", "campaign"] }
  ),
  entry(
    "Effort",
    "The time and skill required to complete an action, expressed as 0-5: 0 (trivial — under a minute, e.g., a like), 1 (low — a minute or two, e.g., a story tag), 2 (moderate — a few minutes), 3 (meaningful — five to ten minutes, e.g., a Reel), 4 (significant — fifteen plus minutes, e.g., a 60-second video review), 5 (high — half an hour or more). Effort and market value are correlated but not identical; some platforms reward certain low-effort actions (e.g., Google reviews) at higher-than-effort prices.",
    { category: "marketing" }
  ),
  entry(
    "FTC",
    "The US Federal Trade Commission. Enforces truth-in-advertising rules including the requirement that material connections between brands and endorsers be clearly disclosed. The FTC's Endorsement Guides (16 CFR Part 255) are the governing document. Violations can result in fines for both the brand and the endorser. Social Perks is built around automatic FTC disclosure compliance.",
    { category: "compliance", related: ["disclosure"], slug: "ftc" }
  ),
  entry(
    "Incentivizable",
    "A boolean property on each action indicating whether the host platform's terms permit offering compensation in exchange for it. Most actions are incentivizable. Notable exceptions: Google reviews, Yelp reviews, and TripAdvisor reviews — all three platforms prohibit incentivized reviews. Social Perks routes non-incentivizable actions through an 'ask for organic feedback' pathway: businesses can request the action but cannot tie a perk to whether it was completed.",
    { category: "compliance", related: ["action", "ftc"] }
  ),
  entry(
    "Influencer",
    "An individual with a substantial social media following who participates in Social Perks campaigns from the supply side. Influencers have rate cards, niches, follower counts, and engagement rates. Tiers: micro (1K-10K followers), mid (10K-100K), macro (100K-1M), mega (1M+). Most Social Perks campaign volume comes from regular customers, not influencers — but the influencer marketplace is available.",
    { category: "marketing", related: ["follower-tier"] }
  ),
  entry(
    "JWT",
    "JSON Web Token. The user-facing authentication format Social Perks issues at sign-in. JWTs carry the user's id, email, role, and businessId in their payload, are signed with the server's AUTH_SECRET (HMAC-SHA256), and expire after a configurable window (default 15 minutes for access tokens, 30 days for refresh tokens). Clients send them via Authorization: Bearer or via a same-site cookie (sp-access-token).",
    { category: "agents", related: ["api-key"] }
  ),
  entry(
    "MCP",
    "Model Context Protocol — Anthropic's open spec for connecting LLM clients (Claude Desktop, Cursor, Cline, etc.) to external tools. Social Perks runs an MCP server at /api/mcp that exposes typed tools (getPricing, listActions, getBenchmarks, listCampaigns, searchInfluencers) as JSON-RPC 2.0 over HTTP. MCP-capable agents can drive Social Perks workflows without writing custom integrations.",
    { category: "agents", related: ["ai-agent", "openapi"], slug: "mcp" }
  ),
  entry(
    "OpenAPI",
    "An open specification for describing REST APIs (formerly Swagger). Social Perks publishes an OpenAPI 3.1 spec at /api/v1/openapi covering all public endpoints, response schemas, and auth methods. Code-generation tools and AI agents consume the spec for typed client generation and endpoint discovery.",
    { category: "agents", related: ["mcp", "api-key"] }
  ),
  entry(
    "Perk",
    "Anything of value a business offers in exchange for a marketing action. Most common types: percent-off discount (10% off your next order), dollar-off discount ($5 off), free item (a free side, free drink), free upgrade (free shipping, free size up), and cash back. The perk type and amount are set per campaign by the business. Social Perks delivers perks via SMS or in-app QR redemption codes.",
    { category: "perks", related: ["campaign", "completion"] }
  ),
  entry(
    "Pricing oracle",
    "A public Social Perks endpoint (GET /api/v1/pricing) that returns the market-rate USD value of any action, plus a recommended perk type and amount for a given business type. The recommendations are tuned so the perk cost roughly matches the action's marketing-equivalent value, leaving the business break-even on first-action customer acquisition. Updated quarterly.",
    { category: "perks", related: ["action", "benchmarks"] }
  ),
  entry(
    "QR code",
    "The primary on-premises distribution surface for a Social Perks campaign. Businesses print a QR code on a poster, sticker, receipt, or cup; customers scan to land on the campaign's claim page. Each QR is campaign-specific and includes referral attribution if the business has a referral code on file.",
    { category: "marketing", related: ["campaign", "referral-code"], slug: "qr-code" }
  ),
  entry(
    "Referral code",
    "A unique alphanumeric code (REF-XXXX-XXXX) tied to a business that, when used by a new customer signup, credits the original business with a referral bonus on the new customer's first paid conversion. Codes are auto-generated, persist across the business account, and are surfaced as a shareable link via /api/v1/referrals/me.",
    { category: "marketing", related: ["referral"], slug: "referral-code" }
  ),
  entry(
    "Submission",
    "A customer's claim of having completed a campaign action, including proof (URL, screenshot, video, or platform-API verification). Submissions enter a verification pipeline: URL freshness, screenshot analysis, account-history fingerprinting, ML fraud model. Approved submissions become completions and trigger perk delivery; rejected submissions notify the customer with a reason.",
    { category: "marketing", related: ["completion", "campaign", "fraud-detection"] }
  ),
  entry(
    "Verification engine",
    "Social Perks' multi-layer fraud detection pipeline that gates every submission. Layers include: URL freshness and reachability checks, screenshot consistency analysis, account-history pattern matching (fake accounts often share fingerprints), platform API verification when the host platform offers it (e.g., the Instagram Graph API for business posts), and a machine-learning model trained on labeled fraud cases. Submissions flagged as suspicious are queued for human review.",
    { category: "compliance", related: ["submission"], slug: "verification-engine" }
  ),
  entry(
    "Webhook",
    "An HTTP callback sent by Social Perks to a business's registered URL when a relevant event happens (campaign launched, submission approved, perk redeemed, payout completed, etc.). Webhooks are HMAC-SHA256 signed with a per-business secret and include a five-minute replay window. Businesses register webhook URLs at /dashboard/settings/webhooks.",
    { category: "agents" }
  ),
];

// Sort entries alphabetically by term once at module load.
GLOSSARY_ENTRIES.sort((a, b) => a.term.localeCompare(b.term));
