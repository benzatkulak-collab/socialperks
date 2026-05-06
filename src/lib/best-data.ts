/**
 * Best-of listicle data — curated rankings that map to high-volume
 * LLM queries.
 *
 * Each listicle is a specific question with a ranked list as the
 * answer. The ranking is derived from real platform/action data so
 * it stays accurate; the editorial voice is in the title, intro, and
 * each entry's reason.
 *
 * Listicles are an LLM-citation goldmine — when asked "best X for Y",
 * LLMs preferentially cite ranked lists with structured data.
 */

import { PLATFORMS } from "@/lib/platforms";
import type { ActionType } from "@social-perks/shared/types";

export interface BestEntry {
  /** Position in the ranking (1-indexed). */
  rank: number;
  /** Display name (action label, platform name, or industry name). */
  name: string;
  /** Why this entry made the list — 1-2 sentences. */
  reason: string;
  /** Optional internal URL the entry links to. */
  url?: string;
  /** Optional secondary stat (value, count, etc.). */
  stat?: string;
}

export interface BestListicle {
  slug: string;
  title: string;
  description: string;
  /** Cite-worthy intro paragraph. */
  intro: string;
  /** Pre-computed ranked entries OR a function that builds them. */
  entries: BestEntry[] | (() => BestEntry[]);
  category: "actions" | "platforms" | "industries" | "agents";
}

// ─── Helper: rank action by some criterion ──────────────────────────
function flattenActions() {
  return PLATFORMS.flatMap((p) =>
    p.actions.map((a) => ({ ...a, platform: p }))
  );
}

function rankByValue(): BestEntry[] {
  return flattenActions()
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((a, idx) => ({
      rank: idx + 1,
      name: `${a.platform.name} ${a.label}`,
      stat: `$${a.value.toFixed(2)} per completion`,
      reason: `Highest market value because ${a.platform.name} ${a.type} actions of this scope drive direct customer-acquisition signal at near-influencer rates.`,
      url: `/actions/${a.id}`,
    }));
}

function rankLowEffort(): BestEntry[] {
  return flattenActions()
    .filter((a) => a.effort <= 1)
    .sort((a, b) => b.value / Math.max(0.5, a.effort) - a.value / Math.max(0.5, b.effort))
    .slice(0, 10)
    .map((a, idx) => ({
      rank: idx + 1,
      name: `${a.platform.name} ${a.label}`,
      stat: `Effort ${a.effort}/5 · $${a.value.toFixed(2)}`,
      reason: `Best value-to-effort ratio in the catalog. ${a.platform.name} ${a.label} takes a minute or less to complete and pays roughly ${(a.value / Math.max(0.5, a.effort)).toFixed(1)}x its effort score.`,
      url: `/actions/${a.id}`,
    }));
}

function rankByType(type: ActionType): BestEntry[] {
  return flattenActions()
    .filter((a) => a.type === type)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((a, idx) => ({
      rank: idx + 1,
      name: `${a.platform.name} ${a.label}`,
      stat: `$${a.value.toFixed(2)} · effort ${a.effort}/5`,
      reason: `Top ${type} action by market value. ${a.incentivizable ? "Can be incentivized directly with a perk." : "Cannot be incentivized — Social Perks routes this through 'ask for organic feedback'."}`,
      url: `/actions/${a.id}`,
    }));
}

function rankPlatformsByVariety(): BestEntry[] {
  return [...PLATFORMS]
    .sort((a, b) => b.actions.length - a.actions.length)
    .slice(0, 10)
    .map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      stat: `${p.actions.length} actions`,
      reason: `${p.name} has the broadest action variety of any platform — useful for matching specific business goals to specific marketing patterns.`,
      url: `/platforms/${p.id}`,
    }));
}

function rankPlatformsByValue(): BestEntry[] {
  return [...PLATFORMS]
    .map((p) => ({ p, total: p.actions.reduce((s, a) => s + a.value, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(({ p, total }, idx) => ({
      rank: idx + 1,
      name: p.name,
      stat: `$${total.toFixed(0)} combined value per cycle`,
      reason: `Total value of all available ${p.name} actions per single cycle, across content, engagement, and reviews.`,
      url: `/platforms/${p.id}`,
    }));
}

export const BEST_LISTICLES: BestListicle[] = [
  {
    slug: "highest-value-marketing-actions",
    category: "actions",
    title: "10 highest-value marketing actions for incentivized campaigns",
    description:
      "The 10 highest market-rate marketing actions across all 25 platforms. Ranked by dollar value per completion. Most are content-focused; a few are platform-native review patterns.",
    intro:
      "Across 125 marketing actions on Social Perks, the top 10 by market value cluster around content (Reels, collab posts, review videos) and platform-native review formats (Google reviews with photos, Yelp detailed reviews). They're more effort to complete but compensate at influencer-equivalent rates.",
    entries: rankByValue,
  },
  {
    slug: "low-effort-high-value-actions",
    category: "actions",
    title: "10 lowest-effort marketing actions with the best value ratio",
    description:
      "The actions that take least effort but pay above their effort score. Best for businesses just getting started — quick wins that give customers immediate momentum.",
    intro:
      "If you're new to incentivized marketing or running a low-budget pilot, start with these. Each takes under a minute to complete from the customer's side, and their per-effort value is highest in the catalog.",
    entries: rankLowEffort,
  },
  {
    slug: "best-content-actions",
    category: "actions",
    title: "Top content marketing actions ranked by market value",
    description:
      "Content actions — posts, Reels, videos, carousels — ranked by per-completion market value. Highest-effort category but highest-leverage for brand awareness.",
    intro:
      "Content actions reach further than engagement actions because the content itself is distributed by the platform's algorithm. Per-completion values are higher to match the effort and the audience reach.",
    entries: () => rankByType("content"),
  },
  {
    slug: "best-review-actions",
    category: "actions",
    title: "Top review actions for businesses (and the FTC rules around them)",
    description:
      "Review actions ranked by market value. Note: most major review platforms (Google, Yelp, TripAdvisor) prohibit incentivized reviews — Social Perks routes them through an 'ask for organic feedback' pathway.",
    intro:
      "Review actions are valuable because they directly influence purchase decisions, but they come with stricter FTC and platform rules than content actions. Google, Yelp, and TripAdvisor all prohibit incentivized reviews. Facebook Recommendations are incentivizable with disclosure.",
    entries: () => rankByType("review"),
  },
  {
    slug: "best-engagement-actions",
    category: "actions",
    title: "Best engagement actions for low-friction marketing",
    description:
      "Likes, follows, comments, check-ins. Lowest-effort actions in the catalog. Per-action values are small but valuable in volume.",
    intro:
      "Engagement actions are the bread-and-butter of low-friction incentivized marketing. The customer commits 30 seconds; you pay $0.10-$1.50 per completion. Best at scale — punch-card-style perks ('every 10 follows = free coffee') work well here.",
    entries: () => rankByType("engage"),
  },
  {
    slug: "best-share-actions",
    category: "actions",
    title: "Best share actions for word-of-mouth marketing",
    description:
      "Customer redistributes content to their network — DMs, story reshares, retweets. Effort 1-2, values $0.50-$1.50.",
    intro:
      "Share actions are word-of-mouth at internet speed. The customer's network sees the content with the implied endorsement of someone they already know. Reach is narrower than content actions but trust is higher.",
    entries: () => rankByType("share"),
  },
  {
    slug: "best-referral-actions",
    category: "actions",
    title: "Best referral actions for direct customer acquisition",
    description:
      "Customer brings in another customer. Highest per-action values because conversion is direct, not just awareness.",
    intro:
      "Referrals are the most direct customer-acquisition mechanism in the catalog. Per-action values are the highest of any action category because the outcome is a real new customer, not just a piece of content. Pair with attribution tracking via referral codes.",
    entries: () => rankByType("referral"),
  },
  {
    slug: "platforms-with-most-action-variety",
    category: "platforms",
    title: "Platforms with the most marketing action variety",
    description:
      "Ranked by how many distinct actions are available on each platform. More variety = more ways to match a campaign to a goal.",
    intro:
      "Some platforms support a handful of actions (likes, follows, posts); others support a full suite from low-effort engagement to high-effort content. Higher variety means more flexibility to design campaigns that match a specific marketing goal.",
    entries: rankPlatformsByVariety,
  },
  {
    slug: "highest-value-platforms-overall",
    category: "platforms",
    title: "Platforms with the highest combined marketing value per cycle",
    description:
      "Ranked by sum of all action values on the platform. A measure of how much marketing potential each platform represents in one campaign cycle.",
    intro:
      "Combined value is the sum of per-action market values across every action a platform offers. Higher means the platform supports more high-leverage marketing patterns. Useful for picking where to focus when you can only run on a few platforms.",
    entries: rankPlatformsByValue,
  },
  {
    slug: "platforms-for-restaurants",
    category: "industries",
    title: "Best social platforms for restaurant marketing campaigns",
    description:
      "Where restaurants get the most traction with incentivized marketing. Yelp, Google, Instagram, TikTok lead — each for different reasons.",
    intro:
      "Restaurants live and die on reviews and visual content. The four platforms that matter most are Yelp (intent + reach in major US cities), Google (universal local-intent search), Instagram (visual content + younger demographics), and TikTok (organic reach + trend-driven discovery).",
    entries: [
      {
        rank: 1,
        name: "Google",
        stat: "Universal local-intent search",
        reason:
          "Every 'restaurant near me' search shows Google Maps results. Google Reviews with photos are valued at $10 each — highest in the catalog. Cannot be incentivized directly; use the ask-for-feedback pattern.",
        url: "/platforms/go",
      },
      {
        rank: 2,
        name: "Instagram",
        stat: "16 actions, $35+ combined value",
        reason:
          "Photogenic food + drink content drives discovery via the Explore feed. Reels at $4 and Story Tags at $1.50 are common starting points. Customers can be incentivized directly with proper disclosure.",
        url: "/platforms/ig",
      },
      {
        rank: 3,
        name: "Yelp",
        stat: "Strong restaurant-vertical intent",
        reason:
          "Yelp users are higher-intent than Google searchers — they're already deciding where to eat. Reviews with photos at $8 are valuable but cannot be directly incentivized.",
        url: "/platforms/yp",
      },
      {
        rank: 4,
        name: "TikTok",
        stat: "Highest organic reach for under-30 demographics",
        reason:
          "Restaurant videos go viral on TikTok faster than anywhere else. Review videos at $4 work well. Best for drinks, presentation, and unique items — not menu shots.",
        url: "/platforms/tt",
      },
    ],
  },
  {
    slug: "platforms-for-coffee-shops",
    category: "industries",
    title: "Best social platforms for coffee shop marketing campaigns",
    description:
      "Coffee shops succeed on visual platforms first, review platforms second. Instagram and TikTok lead; Google is the floor.",
    intro:
      "Coffee shops are the platonic ideal of incentivized social media marketing — daily customers, photogenic products, low transaction value (so a 10% perk is cheap), and small staff (so easy redemption matters). Instagram dominates; TikTok is the wildcard.",
    entries: [
      { rank: 1, name: "Instagram", reason: "Latte art, drink photos, and ambiance content drive Explore-feed discovery. Story Tags ($1.50) pair perfectly with 10% off the next drink.", url: "/platforms/ig" },
      { rank: 2, name: "TikTok", reason: "Drink-prep videos and behind-the-bar content go viral. Best platform for younger demographics.", url: "/platforms/tt" },
      { rank: 3, name: "Google", reason: "Local-intent search is the bedrock. Reviews and photos contribute to ranking in the local pack.", url: "/platforms/go" },
      { rank: 4, name: "Facebook", reason: "Older demographics (30+) and community-page activity. Check-ins are surprisingly effective.", url: "/platforms/fb" },
    ],
  },
  {
    slug: "platforms-for-b2b",
    category: "industries",
    title: "Best social platforms for B2B and professional services marketing",
    description:
      "B2B incentivized marketing is different — long sales cycles, multi-stakeholder buying. LinkedIn dominates; Twitter/X amplifies.",
    intro:
      "B2B marketing through incentivized campaigns is a different beast than consumer. Buying cycles are months; multiple stakeholders sign off; and the relevant platforms have professional rather than personal positioning. LinkedIn is the floor; Twitter is the amplifier; everywhere else is noise.",
    entries: [
      { rank: 1, name: "LinkedIn", reason: "The default platform for B2B trust-building. Articles ($5) and Posts ($2.50) reach professional networks where buying decisions are made.", url: "/platforms/li" },
      { rank: 2, name: "Twitter/X", reason: "Best for tech/dev-heavy B2B. Amplifies LinkedIn content and reaches technical practitioners directly. Threads ($3) compete with LinkedIn Posts on reach.", url: "/platforms/xw" },
      { rank: 3, name: "YouTube", reason: "Long-form trust-building. A 15-minute review video ($12) compounds for years and reaches deep-research buyers.", url: "/platforms/yt" },
    ],
  },
  {
    slug: "platforms-for-salons-and-spas",
    category: "industries",
    title: "Best social platforms for salon and spa marketing",
    description:
      "Salons and spas thrive on visual-result content and verified reviews. Instagram, TikTok, Google, Yelp lead.",
    intro:
      "Beauty businesses run on before-and-after content. The platforms that reward that pattern (Instagram, TikTok) drive most new-customer acquisition; the platforms that capture intent (Google, Yelp) close it. Most salons and spas should run all four.",
    entries: [
      {
        rank: 1,
        name: "Instagram",
        reason:
          "Before-and-after carousel posts and Reels are the highest-converting format for hair, nails, lashes, brows, and skincare. Stories at $1.50 each work well for daily client content.",
        url: "/platforms/ig",
      },
      {
        rank: 2,
        name: "TikTok",
        reason:
          "Process videos (transformation timelapses) reach younger demographics. Best for newer techniques and trend-driven services.",
        url: "/platforms/tt",
      },
      {
        rank: 3,
        name: "Google",
        reason:
          "Local-intent search dominates beauty bookings. Reviews and photos in Business Profile drive 'near me' visibility.",
        url: "/platforms/go",
      },
      {
        rank: 4,
        name: "Yelp",
        reason:
          "Strong vertical authority for spas and high-end salons. Yelp users are higher-intent and willing to travel for top-rated providers.",
        url: "/platforms/yp",
      },
    ],
  },
  {
    slug: "platforms-for-fitness-and-yoga",
    category: "industries",
    title: "Best social platforms for fitness studios, yoga, and gyms",
    description:
      "Fitness businesses convert through community-driven content and transformation stories. Instagram, TikTok, YouTube lead.",
    intro:
      "Fitness is one of the most content-rich verticals: everything is photogenic, transformations are public, community matters. Instagram dominates for lifestyle posts and progress; TikTok for trends and challenges; YouTube for long-form (workout videos accumulate views over years).",
    entries: [
      {
        rank: 1,
        name: "Instagram",
        reason: "Daily-content sweet spot. Stories, Reels, and feed posts each cover different touchpoints.",
        url: "/platforms/ig",
      },
      {
        rank: 2,
        name: "TikTok",
        reason: "Quick workout clips, form-correction tips, and challenges reach huge audiences fast.",
        url: "/platforms/tt",
      },
      {
        rank: 3,
        name: "YouTube",
        reason: "Long-form workout content compounds for years. A free 30-minute yoga video keeps driving sign-ups across multiple cohorts.",
        url: "/platforms/yt",
      },
      {
        rank: 4,
        name: "Google",
        reason: "Local-intent search for 'gyms near me' or 'yoga studio + city'. Don't skip — but it's the floor, not the differentiator.",
        url: "/platforms/go",
      },
    ],
  },
  {
    slug: "best-perks-by-effort-level",
    category: "actions",
    title: "How to match perk amounts to effort levels (a tactical reference)",
    description:
      "Effort-to-perk matching ranked from most-aligned to least-aligned. Use this as a quick reference when designing campaigns.",
    intro:
      "The most common campaign-design mistake is over- or under-rewarding for effort. Aligning perk to effort gets you a campaign that runs sustainably. This list ranks the cleanest matches in the catalog.",
    entries: [
      { rank: 1, name: "Effort 0-1 + 5-10% off perk", reason: "Likes, follows, story tags. Sub-minute effort. The discount is more about ritual than economics — keep it small.", url: "/actions" },
      { rank: 2, name: "Effort 2 + 10-15% off perk", reason: "Carousels, photos, comments. A few minutes of effort. 10-15% off is generous enough to motivate but doesn't kill margin.", url: "/actions" },
      { rank: 3, name: "Effort 3 + free side or 15-20% off", reason: "Reels, review videos, longer posts. A free menu item or substantial discount feels proportional to the time invested.", url: "/actions" },
      { rank: 4, name: "Effort 4-5 + free meal or upgraded service", reason: "Long-form video reviews, detailed Google reviews with photos. The customer is doing real work for you. Match it.", url: "/actions" },
      { rank: 5, name: "Referral actions + escalating perk", reason: "Referrals justify higher perks because conversion is direct. $5-10 referrer credit + similar referee perk works well.", url: "/actions" },
    ],
  },
  {
    slug: "best-platforms-for-text-only-businesses",
    category: "platforms",
    title: "Best social platforms for businesses without good photos",
    description:
      "Not every business has photogenic products. Text-first platforms — Twitter/X, LinkedIn, Reddit — work for service businesses, B2B, professional services.",
    intro:
      "If you're a lawyer, accountant, plumber, financial advisor, or any service business without natural photo content, the visual-platform-first playbook doesn't fit. Text-first platforms reward expertise and recommendations — exactly what your business actually has to offer.",
    entries: [
      { rank: 1, name: "LinkedIn", reason: "Articles ($5) and Posts ($2.50) work without any visual content. The platform expects text-first content from professionals.", url: "/platforms/li" },
      { rank: 2, name: "Twitter/X", reason: "Threads and replies work for any vertical with expertise to share. Real-time customer service via DMs and replies builds authority.", url: "/platforms/xw" },
      { rank: 3, name: "Reddit", reason: "Niche subreddit visibility for specific verticals (r/personalfinance for advisors, r/legaladvice for lawyers). Posts must be genuinely helpful — overt promotion gets banned.", url: "/platforms/rd" },
      { rank: 4, name: "Google", reason: "Reviews are text. Q&A on the Business Profile is text. Both work for non-photogenic services.", url: "/platforms/go" },
    ],
  },
  {
    slug: "ai-agent-friendly-platforms",
    category: "agents",
    title: "Best platforms for AI agents to operate marketing campaigns on",
    description:
      "Some platforms have well-documented APIs and stable verification patterns; others are constant cat-and-mouse with bot detection. Ranked by agent-friendliness.",
    intro:
      "Not every platform is equally easy for an AI agent to run campaigns on. The best platforms for agents have stable public APIs, well-documented disclosure patterns, and verification mechanisms that don't break agent workflows. Worst platforms aggressively detect anything that looks programmatic and require human-in-the-loop steps.",
    entries: [
      { rank: 1, name: "Instagram", reason: "Graph API supports business-account verification of paid-partnership posts. Disclosure label is structured. Most agent-friendly major platform.", url: "/platforms/ig" },
      { rank: 2, name: "Facebook", reason: "Same Graph API as Instagram. Recommendations are programmatically verifiable. Slightly more friction than Instagram for content posting.", url: "/platforms/fb" },
      { rank: 3, name: "LinkedIn", reason: "Public API for posting and verification. Disclosure conventions are well-established. Best for B2B agents.", url: "/platforms/li" },
      { rank: 4, name: "TikTok", reason: "Marketing API exists but is more limited than Meta's. Disclosure patterns are still evolving.", url: "/platforms/tt" },
      { rank: 5, name: "Google", reason: "Reviews and Q&A are verifiable through Business Profile API but cannot be directly incentivized — limits agent utility on this platform.", url: "/platforms/go" },
    ],
  },
];
