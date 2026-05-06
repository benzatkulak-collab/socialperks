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
];

export function getPlatform(id: string): Platform | null {
  return PLATFORMS.find((p) => p.id === id) ?? null;
}
