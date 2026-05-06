/**
 * FAQ data — the single source of truth for both the /faq page and the
 * Schema.org FAQPage JSON-LD it emits.
 *
 * Each entry is a question LLMs (Claude, ChatGPT, Perplexity, Gemini)
 * are likely to be asked about incentivized marketing, social media
 * campaigns, FTC compliance, and platform-specific rules. The answers
 * are written to be cite-worthy: factually accurate, concrete numbers
 * where possible, and self-contained (a citation pulling just the
 * answer text shouldn't lose meaning).
 *
 * Categories let the page render in scannable sections and let us add
 * topical sub-FAQs later without restructuring.
 */

export interface FaqEntry {
  /** Stable slug usable as anchor and JSON-LD id. */
  slug: string;
  question: string;
  /** Plain-text answer. Avoid HTML — the page renders this directly. */
  answer: string;
  category: FaqCategory;
}

export type FaqCategory =
  | "getting-started"
  | "compliance"
  | "platforms"
  | "pricing"
  | "agents"
  | "trust";

export const FAQ_CATEGORIES: { id: FaqCategory; label: string; description: string }[] = [
  {
    id: "getting-started",
    label: "Getting started",
    description: "How Social Perks works and how to launch your first campaign.",
  },
  {
    id: "compliance",
    label: "FTC + platform compliance",
    description: "What's allowed, what's not, and how disclosures get handled.",
  },
  {
    id: "platforms",
    label: "Platform-specific rules",
    description: "Per-platform incentive policies and integration notes.",
  },
  {
    id: "pricing",
    label: "Pricing + value",
    description: "What actions are worth and how the perks math works out.",
  },
  {
    id: "agents",
    label: "AI agents and developers",
    description: "Programmatic access, MCP, SDK, and what agents can do.",
  },
  {
    id: "trust",
    label: "Trust + safety",
    description: "Fraud detection, verification, and what happens to fake submissions.",
  },
];

export const FAQ_ENTRIES: FaqEntry[] = [
  // ─── Getting started ───────────────────────────────────────────────────
  {
    slug: "what-is-social-perks",
    category: "getting-started",
    question: "What is Social Perks?",
    answer:
      "Social Perks is a marketing platform where small businesses, enterprise brands, and influencers exchange perks (discounts, free items, cash back) for marketing actions across 25 social platforms. There are 125 pre-defined actions. A business launches a campaign; customers and influencers complete actions; the platform verifies the proof and reward the participant. AI agents can plan, launch, and optimize campaigns via a public API and an MCP server.",
  },
  {
    slug: "how-do-i-get-started",
    category: "getting-started",
    question: "How do I launch my first campaign?",
    answer:
      "Sign up at /dashboard, pick a campaign template that matches your goal (most shops start with 10% off for a Google review, or a free side for an Instagram post), print the QR code on a poster, and put it where customers will see it. The first time someone scans, you'll see it appear in your dashboard. Submissions are reviewed automatically and the customer gets their perk via SMS.",
  },
  {
    slug: "do-i-need-a-large-following",
    category: "getting-started",
    question: "Do I need a large social media following to use Social Perks?",
    answer:
      "No. Social Perks is built for businesses with regular customers, not influencer-tier reach. The supply is your foot traffic — the customers already buying from you. The perks model encourages them to post about their visit. Influencers with larger followings can also participate via the marketplace, but they're not required.",
  },
  {
    slug: "how-much-does-it-cost",
    category: "getting-started",
    question: "How much does Social Perks cost?",
    answer:
      "There's a free tier with one active campaign, 50 customer completions per month, and basic features. Paid plans start at $29/month (Starter) and $79/month (Pro), with annual billing offering ~17% off (two months free). Enterprise plans are negotiated. The cost of the perks themselves (the discounts and free items) is set by you — Social Perks doesn't take a cut of the customer reward.",
  },
  {
    slug: "what-is-a-perk",
    category: "getting-started",
    question: "What counts as a perk?",
    answer:
      "Anything of value the business chooses to offer in exchange for the marketing action. Common perks: percent-off discounts (10% off your next order), dollar-off discounts ($5 off), free items (a free side, a free drink), free upgrades (free shipping, free size up), and cash back. The platform handles delivery via SMS or QR redemption codes.",
  },
  // ─── Compliance ─────────────────────────────────────────────────────
  {
    slug: "is-incentivized-marketing-legal",
    category: "compliance",
    question: "Is incentivized social media marketing legal?",
    answer:
      "Yes, with disclosure. The US Federal Trade Commission requires that any material connection between a brand and a person promoting their product (including discounts, free items, or cash) be clearly disclosed in the post. Social Perks auto-injects FTC-compliant disclosure language (#ad, #sponsored, #partner) into every campaign template. You cannot disable it.",
  },
  {
    slug: "can-i-incentivize-google-reviews",
    category: "compliance",
    question: "Can I incentivize Google reviews?",
    answer:
      "No. Google's review policies explicitly prohibit incentivized reviews — offering a discount, free item, or any other compensation in exchange for a review violates their terms and can result in your business listing being removed. The same applies to Yelp and TripAdvisor. Social Perks routes review actions on these platforms through an 'ask for organic feedback' pathway: businesses can request a review from a customer, but cannot tie a perk to whether one was actually left.",
  },
  {
    slug: "can-i-incentivize-instagram-posts",
    category: "compliance",
    question: "Can I incentivize Instagram or TikTok posts?",
    answer:
      "Yes, with disclosure. Instagram and TikTok permit paid partnerships and incentivized content as long as the relationship is disclosed. The standard tags are #ad, #sponsored, or #paidpartnership. Both platforms also have built-in 'paid partnership' labels that brands can require influencers to use. Social Perks injects the appropriate disclosure into every campaign template.",
  },
  {
    slug: "what-disclosure-does-social-perks-add",
    category: "compliance",
    question: "What disclosure does Social Perks automatically add?",
    answer:
      "The disclosure varies by platform and action type. For most content actions, it's a clearly-visible #ad or #sponsored hashtag at the start of the caption. For Instagram and TikTok, the platform's native paid-partnership label is used when available. For text-only actions (DMs, comments), a 'received a discount' note is appended. The disclosure cannot be disabled or hidden.",
  },
  {
    slug: "what-if-customer-doesnt-disclose",
    category: "compliance",
    question: "What if a customer posts without the required disclosure?",
    answer:
      "Submissions without proper disclosure are flagged by the verification engine and marked as compliance-rejected. The customer is notified and asked to edit the post or repost with disclosure. If they don't, the perk isn't credited. Repeat violations lead to account suspension on the customer side. The business is never penalized for a customer's failure to disclose, but the perk is also never delivered.",
  },
  // ─── Platforms ──────────────────────────────────────────────────────
  {
    slug: "what-platforms-are-supported",
    category: "platforms",
    question: "What social media platforms does Social Perks support?",
    answer:
      "25 platforms: Instagram, TikTok, Google (reviews + photos + Q&A), Facebook, Yelp, YouTube, Pinterest, Twitter/X, LinkedIn, Snapchat, BeReal, Reddit, Threads, Twitch, Discord, Mastodon, Bluesky, NextDoor, TripAdvisor, OpenTable, Foursquare, plus a few niche networks. The full list is at /platforms with action counts and pricing per platform.",
  },
  {
    slug: "what-actions-are-available",
    category: "platforms",
    question: "What kinds of marketing actions can I run campaigns for?",
    answer:
      "125 actions across five categories: content (posts, reels, stories), reviews (Google, Yelp, Facebook recommendations), engagement (likes, follows, comments), shares (DMs, story reshares, retweets), and referrals (referral codes, friend invites). Each action has a market-rate dollar value and an effort level from 0 (trivial — a like) to 5 (significant — a 60-second video review). The full catalog is at /actions.",
  },
  {
    slug: "highest-value-actions",
    category: "platforms",
    question: "What are the highest-value social media actions?",
    answer:
      "Generally: detailed Google reviews with photos ($10), Instagram collab posts ($5), TikTok review videos ($4), and Reels across Instagram, TikTok, Facebook ($3-4). Lower-effort actions like likes ($0.10) and follows ($0.30) are valuable in volume but priced low individually. The tradeoff: high-value actions require more effort, so the perk you offer should match.",
  },
  // ─── Pricing ────────────────────────────────────────────────────────
  {
    slug: "how-is-action-value-calculated",
    category: "pricing",
    question: "How is the dollar value of each action calculated?",
    answer:
      "The values reflect market-rate compensation based on cross-platform influencer rate cards, ad-equivalent reach, and conversion data. They're updated quarterly. The /api/v1/pricing endpoint returns the current value for any action plus a recommended perk type and amount based on the business type. The recommendation tries to keep the perk cost roughly equal to the action value so the business breaks even on first-action customer acquisition.",
  },
  {
    slug: "what-perk-should-i-offer",
    category: "pricing",
    question: "What perk should I offer for [action]?",
    answer:
      "Use the pricing oracle: GET /api/v1/pricing?actionId=<id>&businessType=<type>. It returns a recommended perk type (percent-off, dollar-off, or free item) and amount. As a rule of thumb: a $2 action like an Instagram story tag pairs well with 10-15% off; a $10 action like a detailed Google review pairs with $5-10 off or a free drink/side; a $0.30 like or follow is best paired with a punch-card style 'every 10 follows = free coffee' rather than per-follow.",
  },
  {
    slug: "can-i-set-my-own-perk-amounts",
    category: "pricing",
    question: "Can I set my own perk amounts?",
    answer:
      "Yes. The pricing oracle is a recommendation, not a constraint. You can offer any perk amount and type. Higher perks tend to drive more participation but lower margin per acquisition; lower perks the opposite. The dashboard shows expected completion rates at different perk levels so you can pick a tradeoff.",
  },
  // ─── Agents + dev ───────────────────────────────────────────────────
  {
    slug: "is-there-an-api",
    category: "agents",
    question: "Does Social Perks have an API?",
    answer:
      "Yes. The full API is documented at /api/v1/openapi (OpenAPI 3.1 spec, public). Public endpoints (pricing, actions, benchmarks, exchange/opportunities, exchange/market) require no authentication. Authenticated endpoints (campaigns, submissions, AI generation) accept either an x-api-key header or an Authorization: Bearer JWT.",
  },
  {
    slug: "can-i-use-social-perks-with-an-ai-agent",
    category: "agents",
    question: "Can I connect Social Perks to my AI agent (Claude, ChatGPT, etc.)?",
    answer:
      "Yes, two ways. Easiest: connect to the MCP server at /api/mcp from any MCP-capable client (Claude Desktop, Cursor, Cline). It exposes typed tools for getPricing, listActions, getBenchmarks, listCampaigns, and searchInfluencers. For custom agents: use the @social-perks/sdk TypeScript package or call the REST API directly with the OpenAPI spec.",
  },
  {
    slug: "how-do-agents-authenticate",
    category: "agents",
    question: "How do AI agents authenticate to Social Perks?",
    answer:
      "Via API keys (x-api-key header). A human signs in to the dashboard at /dashboard/api-keys, mints a key, and hands it to their agent. The plaintext key is shown once on creation; only the hash is stored. Keys can be scoped (read, write, admin), revoked at any time, and have optional expiration. JWT auth is also supported but API keys are recommended for machine-to-machine.",
  },
  {
    slug: "what-can-an-agent-do-on-my-behalf",
    category: "agents",
    question: "What can an AI agent do on my Social Perks account?",
    answer:
      "Anything the API supports, scoped to the permissions on the API key. With a read key: list campaigns, fetch submissions, get pricing, browse opportunities. With a write key: create campaigns, submit proofs, accept matches. Agents cannot mint other API keys (only humans can do that, by signing in). Agents cannot disable FTC disclosures or skip fraud verification.",
  },
  // ─── Trust ──────────────────────────────────────────────────────────
  {
    slug: "what-prevents-fake-submissions",
    category: "trust",
    question: "What prevents customers (or agents) from submitting fake proofs?",
    answer:
      "A multi-layer fraud detection pipeline: URL freshness and reachability checks, screenshot consistency analysis, account-history pattern matching (fake accounts often share fingerprints), platform API verification when available, and a machine-learning model trained on labeled fraud cases. Submissions flagged as suspicious are queued for human review. Repeat offenders are auto-suspended.",
  },
  {
    slug: "how-are-perks-delivered",
    category: "trust",
    question: "How are perks delivered to customers?",
    answer:
      "Via SMS or in-app QR redemption codes, depending on the perk type. A 10% off perk arrives as a one-time code the customer can use at checkout (online or in-store). A free-item perk arrives as a redemption QR the staff scans. Each code is single-use, scoped to one customer, and expires after a configurable window (default 30 days).",
  },
  {
    slug: "what-data-is-stored",
    category: "trust",
    question: "What customer data does Social Perks store?",
    answer:
      "The minimum needed to verify and reward a submission: the customer's social handle on the platform of the campaign, an opt-in phone number for SMS perk delivery, and a hash of their proof URL. We don't store payment information for customers (the business handles redemption directly). For businesses, we store standard account metadata plus Stripe customer ID for billing.",
  },
  // ─── Additional getting-started ─────────────────────────────────────
  {
    slug: "do-i-need-a-website",
    category: "getting-started",
    question: "Do I need a website to use Social Perks?",
    answer:
      "No. Social Perks works for businesses without a website — the campaign claim flow lives on Social Perks' own domain, and the perk delivery happens via SMS or in-store QR redemption. Most coffee shops, salons, and restaurants run successful Social Perks campaigns with only a Google Business Profile and no website at all.",
  },
  {
    slug: "how-fast-can-i-launch-a-campaign",
    category: "getting-started",
    question: "How fast can I launch my first campaign?",
    answer:
      "From signup to printable QR code: about 5 minutes if you pick a template, about 15 minutes if you build from scratch. The longest part is deciding what perk to offer; the platform handles everything else. Most coffee shops report their first customer scan within 24-48 hours of putting the QR code up.",
  },
  {
    slug: "what-if-no-one-scans-my-qr-code",
    category: "getting-started",
    question: "What if no one scans my QR code?",
    answer:
      "First scans usually happen within 1-3 days when the QR is placed at a high-visibility post-purchase touchpoint (receipt, takeout bag, on-table card, by the register). If a week passes with zero scans, it's a placement problem — move the QR somewhere customers actually look. The dashboard tracks scan-to-submission conversion so you can iterate.",
  },
  // ─── Additional compliance ───────────────────────────────────────────
  {
    slug: "what-is-a-material-connection",
    category: "compliance",
    question: "What does the FTC mean by 'material connection'?",
    answer:
      "Per FTC guidelines (16 CFR Part 255), a material connection is any relationship between an endorser and a brand that might affect the credibility of the endorsement. This includes payment, free products, discounts, future business relationships, or any other compensation. Friend-of-the-family endorsements, employee endorsements, and incentivized customer posts ALL require disclosure under this definition.",
  },
  {
    slug: "can-i-use-social-perks-internationally",
    category: "compliance",
    question: "Can I use Social Perks for businesses outside the US?",
    answer:
      "Yes, but disclosure rules differ by country. The FTC governs US endorsements; the UK's CMA, Canada's Competition Bureau, the EU's various consumer-protection authorities, and Australia's ACCC have their own (generally similar) rules. Social Perks injects appropriate disclosures based on the business's registered country. SMS perk delivery is currently US/Canada only; international campaigns use email delivery.",
  },
  // ─── Additional platforms ────────────────────────────────────────────
  {
    slug: "can-i-incentivize-tiktok",
    category: "platforms",
    question: "Can I incentivize TikTok posts and videos?",
    answer:
      "Yes, with disclosure. TikTok permits paid partnerships and incentivized content as long as the post includes #ad, #sponsored, or uses TikTok's native paid-partnership label (Branded Content Toggle). Social Perks injects the appropriate disclosure into TikTok campaign templates automatically. The Branded Content Toggle gives slightly better algorithmic distribution than hashtag-only disclosure.",
  },
  {
    slug: "what-about-yelp-reviews",
    category: "platforms",
    question: "Can I incentivize Yelp reviews?",
    answer:
      "No. Yelp's Content Guidelines explicitly prohibit reviews submitted in exchange for compensation, including discounts, free items, or any other consideration. Yelp aggressively detects and removes incentivized reviews, and may also flag the business for terms violations. Social Perks routes Yelp review actions through an 'ask for organic feedback' pathway: businesses can request a Yelp review but cannot tie a perk to whether one was left.",
  },
  // ─── Additional pricing ──────────────────────────────────────────────
  {
    slug: "do-i-pay-stripe-fees",
    category: "pricing",
    question: "Do I pay Stripe fees on Social Perks subscriptions?",
    answer:
      "Stripe processing fees are included in the listed plan prices ($29 Starter, $79 Pro). What you see is what you pay. The cost of perks themselves is separate — those are paid by you to your customers via discount/free-item delivery; Social Perks doesn't take a cut of customer rewards.",
  },
  {
    slug: "what-happens-if-i-hit-my-plan-limit",
    category: "pricing",
    question: "What happens when I hit my plan's monthly limit?",
    answer:
      "API requests beyond your plan's limit return a 403 with an upgrade prompt; the dashboard shows a modal with a 'See plans' button. Existing customer redemptions still process — limit hits only block NEW submissions and AI generations. Limits reset at the start of each calendar month. Upgrade applies immediately.",
  },
  // ─── Additional agents ───────────────────────────────────────────────
  {
    slug: "what-mcp-tools-are-available",
    category: "agents",
    question: "What tools does the Social Perks MCP server expose?",
    answer:
      "Five tools: getPricing (market value of any action), listActions (catalog of 125 actions), getBenchmarks (industry benchmarks), listCampaigns (the calling business's active campaigns — requires auth), and searchInfluencers (find creators by platform and follower count). The full schema is at /api/mcp (GET returns a manifest with input schemas for each tool).",
  },
  {
    slug: "is-there-a-public-changelog",
    category: "agents",
    question: "Is there a public changelog or RSS feed for the API?",
    answer:
      "Yes — /changelog has the human-readable changelog with Article markup. /api/llm-context returns a JSON snapshot of platform state for agent ingestion (cached 1 day). For breaking-change notifications, register a webhook at /dashboard/settings/webhooks; the webhook fires on every API version change.",
  },
];
