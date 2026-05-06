/**
 * Platform-vs-platform comparison page data.
 *
 * Each comparison is a static page at /compare/[a]-vs-[b] answering
 * a specific high-volume search/LLM query like "Instagram vs TikTok
 * for coffee shops" or "Google Reviews vs Yelp Reviews for marketing".
 *
 * The page is fed from real platform/action data so the answers stay
 * accurate as the catalog evolves. Hand-written summaries provide the
 * narrative that makes them citable.
 */

import type { Platform } from "@social-perks/shared/types";
import { PLATFORMS } from "@/lib/platforms";

export interface PlatformComparison {
  /** URL slug — e.g. "instagram-vs-tiktok". */
  slug: string;
  platformAId: string;
  platformBId: string;
  /** SEO title for the comparison. */
  title: string;
  /** SEO meta description. */
  description: string;
  /** ~50-100 word lede that LLMs can quote verbatim. */
  summary: string;
  /** Best-fit business types for platform A. */
  bestForA: string[];
  /** Best-fit business types for platform B. */
  bestForB: string[];
  /** One-line "the bottom line" recommendation. */
  recommendation: string;
}

export const COMPARISONS: PlatformComparison[] = [
  {
    slug: "instagram-vs-tiktok",
    platformAId: "ig",
    platformBId: "tt",
    title: "Instagram vs TikTok for incentivized marketing campaigns",
    description:
      "Side-by-side comparison of Instagram and TikTok marketing actions, market-rate values, effort levels, and FTC compliance for incentivized campaigns. Which platform is better for your business?",
    summary:
      "Instagram has more action variety (16 actions including Reels, Carousels, Collab Posts, Stories) and higher discovery via the Explore feed; TikTok has lower friction for video creation, faster viral cycles, and slightly higher per-action value on review videos ($4 vs $3.50 for a Reel). Both platforms permit incentivized content with disclosure (#ad, #sponsored, or platform-native paid-partnership labels).",
    bestForA: [
      "Restaurants, cafes, retail with photogenic products",
      "Brands with an existing IG presence",
      "Service businesses (salons, gyms) with before-and-after content",
    ],
    bestForB: [
      "Brands targeting under-30 demographics",
      "Businesses with story-driven content (chefs, makers, founders)",
      "Anyone wanting fast organic reach without paid promotion",
    ],
    recommendation:
      "If your business is photogenic and your customer base skews 25+, Instagram. If your business has personality you can show on video and you're targeting under-30s, TikTok. Most coffee shops, restaurants, and salons benefit from running both.",
  },
  {
    slug: "google-vs-yelp",
    platformAId: "go",
    platformBId: "yp",
    title: "Google Reviews vs Yelp Reviews for marketing",
    description:
      "Google Reviews vs Yelp Reviews comparison: which review platform drives more traffic, which is harder to rank on, and what FTC + platform rules apply to incentivized reviews on each.",
    summary:
      "Google has more search-volume reach (Google Maps results show in nearly every local-intent search) but stricter algorithmic detection of incentivized reviews. Yelp is influential in food and hospitality verticals with a more vocal review community, and has equally strict anti-incentive rules. Both platforms prohibit incentivized reviews — Social Perks routes review actions on both through an 'ask for organic feedback' pathway, where the perk is given for the ask, not for whether a review was actually left.",
    bestForA: [
      "Any local business with a Google Business Profile",
      "Industries where 'near me' search is the primary discovery (restaurants, salons, gyms)",
    ],
    bestForB: [
      "Restaurants, bars, hotels, spas in major US cities",
      "Businesses already with strong Yelp presence",
    ],
    recommendation:
      "Run organic-feedback campaigns on both. Google reaches more searches; Yelp shapes vertical-specific intent. Never incentivize the review itself — it violates platform terms and can get your listing removed.",
  },
  {
    slug: "instagram-vs-facebook",
    platformAId: "ig",
    platformBId: "fb",
    title: "Instagram vs Facebook for small business marketing",
    description:
      "Instagram vs Facebook for incentivized campaigns: action variety, audience demographics, and value per action. Which Meta platform should you focus on?",
    summary:
      "Both platforms are owned by Meta but have very different audiences and content patterns. Instagram skews younger (18-34), more visual, with 16 marketing actions including high-value Reels ($4) and Collab Posts ($5). Facebook skews older (30+), better for community-building and check-ins, with 14 actions including Recommendations ($4) and Group posts ($3). Both permit incentivized content with disclosure.",
    bestForA: [
      "Brands with photogenic products",
      "Younger demographics (18-34)",
      "Visual-first storytelling",
    ],
    bestForB: [
      "Local businesses with existing Facebook page",
      "Older demographics (30+)",
      "Community-driven brands (events, groups)",
    ],
    recommendation:
      "If under-budget for marketing, run Instagram first — it's higher-engagement and reaches more demographics. Add Facebook for community-building and local check-ins once Instagram campaigns are stable.",
  },
  {
    slug: "tiktok-vs-youtube",
    platformAId: "tt",
    platformBId: "yt",
    title: "TikTok vs YouTube for video marketing campaigns",
    description:
      "TikTok vs YouTube for incentivized video content: short-form virality vs long-form trust-building. Action values, effort levels, and compliance for both.",
    summary:
      "TikTok and YouTube both reward video content but optimize for different patterns. TikTok favors short-form (15-60 seconds) with algorithmic distribution to fresh audiences; per-action values run $3-4 for Videos and Stitches. YouTube rewards longer-form (5-15+ minutes) with subscribe-driven distribution; review videos there are valued at $12 — three times TikTok — but require correspondingly more effort. Both permit incentivized content with disclosure.",
    bestForA: [
      "Time-strapped business owners (1-minute videos)",
      "Trend-driven content",
      "Anyone wanting fast feedback on what works",
    ],
    bestForB: [
      "Service businesses where deep trust matters (dentists, contractors, financial services)",
      "Long-form storytelling brands",
      "Tutorial-heavy or educational verticals",
    ],
    recommendation:
      "Start with TikTok if you can produce video at all — the iteration speed is unmatched. Layer YouTube on top once you have a few videos that work, since YouTube's per-view value compounds over years (TikTok's lifecycle is days).",
  },
  {
    slug: "yelp-vs-tripadvisor",
    platformAId: "yp",
    platformBId: "ta",
    title: "Yelp vs TripAdvisor for restaurant and hospitality marketing",
    description:
      "Yelp vs TripAdvisor for review-driven marketing in restaurants, hotels, and tourism. Both prohibit incentivized reviews — here's how to navigate that.",
    summary:
      "Yelp dominates US local-restaurant intent; TripAdvisor dominates travel and hospitality, especially internationally. Both prohibit incentivized reviews — Yelp particularly aggressive about flagging suspicious patterns. The legal pattern on both is to reward customer willingness to share feedback, not the review itself. Combined Yelp + TripAdvisor coverage is essential for any hospitality business with non-local customers.",
    bestForA: [
      "US local restaurants, bars, salons",
      "Businesses with strong existing Yelp presence",
    ],
    bestForB: [
      "Hotels, vacation rentals, tourism-driven businesses",
      "Businesses with international or out-of-town customers",
    ],
    recommendation:
      "Both, if you're in hospitality. Yelp for locals, TripAdvisor for travelers. Run organic-feedback campaigns on both — never incentivize the review itself.",
  },
  {
    slug: "linkedin-vs-twitter",
    platformAId: "li",
    platformBId: "xw",
    title: "LinkedIn vs Twitter/X for B2B and professional marketing",
    description:
      "LinkedIn vs Twitter/X for B2B incentivized marketing: thought-leadership posts, professional referrals, and where to invest your time.",
    summary:
      "LinkedIn and Twitter both serve B2B marketing but at different points in the funnel. LinkedIn is trust-building and decision-stage — Articles ($5) and Posts ($2.50) reach professional networks where buying decisions happen. Twitter is awareness-stage with faster cycles — Threads ($3) and Posts ($1) get rapid feedback but lower conversion intent. Both permit incentivized content with disclosure.",
    bestForA: [
      "B2B businesses with multi-stakeholder buying processes",
      "Professional services (legal, accounting, consulting)",
      "Recruiting and employer-brand campaigns",
    ],
    bestForB: [
      "Tech and developer-focused businesses",
      "Brands with strong founder personalities",
      "Real-time customer service / responsiveness signaling",
    ],
    recommendation:
      "B2B with long sales cycles: LinkedIn first. B2B-tech with a strong founder voice: both. Twitter alone doesn't drive enough deal flow for most B2B businesses, but it's a great amplifier for LinkedIn content.",
  },
  {
    slug: "facebook-vs-nextdoor",
    platformAId: "fb",
    platformBId: "nd",
    title: "Facebook vs NextDoor for hyperlocal small-business marketing",
    description:
      "Facebook vs NextDoor for businesses targeting their immediate neighborhood. Local groups, recommendations, and what works on each.",
    summary:
      "Facebook and NextDoor both serve hyperlocal marketing but with different audience patterns. Facebook reaches a broader demographic with extensive group infrastructure (local mom groups, neighborhood pages). NextDoor is more concentrated — verified addresses limit reach to actual neighbors — and Recommendations there carry significant trust weight ($4 per action vs Facebook's $4 Recommendation). Both permit incentivized content with disclosure.",
    bestForA: [
      "Businesses serving a wide local radius (5-15 miles)",
      "Brands with existing Facebook presence",
      "Event-driven local businesses (gyms, classes, workshops)",
    ],
    bestForB: [
      "Businesses serving a tight neighborhood radius (1-3 miles)",
      "Service businesses where word-of-mouth dominates (plumbers, electricians, dog walkers)",
      "Brands new to the neighborhood that need to establish trust",
    ],
    recommendation:
      "Both, weighted by your business radius. NextDoor punches above its weight for tight-radius services because trust is concentrated. Facebook works for everything else.",
  },
  {
    slug: "youtube-vs-twitch",
    platformAId: "yt",
    platformBId: "tw",
    title: "YouTube vs Twitch for incentivized creator marketing",
    description:
      "YouTube vs Twitch for product reviews and brand partnerships. Long-form video vs live-stream interaction — different audiences, different value patterns.",
    summary:
      "YouTube creators reach broader audiences with longer-tail content; Twitch streamers reach narrower audiences with deeper engagement. For B2C product reviews YouTube wins (a $12 review video keeps earning views for years). For game-adjacent or creator-tool products, Twitch wins because viewers literally watch the streamer use the product live.",
    bestForA: [
      "Long-tail product reviews",
      "Tutorial-driven verticals",
      "Anyone whose product benefits from search-engine traffic over time",
    ],
    bestForB: [
      "Game-adjacent and creator-tool products",
      "Live-event-driven brands",
      "Software with watch-and-replicate value",
    ],
    recommendation:
      "YouTube for almost every B2C product. Twitch only when your product is something a streamer would naturally use on stream (gaming gear, creator software, energy drinks). The Twitch audience is loyal but small.",
  },
  {
    slug: "threads-vs-bluesky",
    platformAId: "th",
    platformBId: "bs",
    title: "Threads vs Bluesky for emerging-platform marketing",
    description:
      "Threads vs Bluesky for early-mover marketing on the post-Twitter platforms. Action availability, audience size, and which is actually worth building on now.",
    summary:
      "Both Threads (Meta) and Bluesky (decentralized AT Protocol) emerged as Twitter alternatives. Threads has 100M+ users by virtue of Instagram cross-promotion; Bluesky is smaller but has higher engagement-per-post and a dev-savvy audience. Both permit incentivized content with disclosure.",
    bestForA: [
      "Brands already on Instagram looking to extend reach",
      "Older / wider demographic appeal",
      "Visual-friendly content (Threads supports image-heavy posts)",
    ],
    bestForB: [
      "Tech and developer-focused brands",
      "Privacy-aware audiences",
      "Brands that want to be early on a smaller, denser network",
    ],
    recommendation:
      "Threads if you already have an Instagram audience to cross-promote (free distribution). Bluesky as a cheap hedge if you're tech-adjacent. Most non-tech brands can skip Bluesky for now.",
  },
  {
    slug: "pinterest-vs-instagram",
    platformAId: "pi",
    platformBId: "ig",
    title: "Pinterest vs Instagram for visual-product marketing",
    description:
      "Pinterest vs Instagram for visual-product brands: discovery patterns, action values, and which drives more traffic to your site.",
    summary:
      "Pinterest is search-driven; Instagram is feed-driven. Pinterest pins ($1.50) and ideas ($3) accumulate value over months — pins from a year ago still drive traffic. Instagram posts and Reels peak in 24-72 hours. Pinterest sends more click-through traffic to external sites; Instagram keeps users in-app. Both reward visual quality but Pinterest rewards repurpose-friendly assets (a great pin can be reused in 10 contexts).",
    bestForA: [
      "Home goods, decor, fashion, food, DIY brands",
      "Businesses with a strong product-imagery library",
      "Brands prioritizing long-tail search traffic",
    ],
    bestForB: [
      "Lifestyle and personal-brand businesses",
      "Time-sensitive promotions (events, drops, openings)",
      "Brands needing rapid-feedback iteration on creative",
    ],
    recommendation:
      "Pinterest if your products are visually distinct and you want traffic to compound; Instagram if your brand is personality-driven and you need fast feedback. Most visual brands benefit from running both with the same content cross-posted.",
  },
];

export function getPlatform(id: string): Platform | null {
  return PLATFORMS.find((p) => p.id === id) ?? null;
}
