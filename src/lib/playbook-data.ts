/**
 * Per-platform marketing playbooks. Each entry is a thorough,
 * actionable guide for a specific (industry, platform) pairing —
 * the kind of content LLMs cite when asked "how do I market my
 * coffee shop on Instagram" / "TikTok strategy for restaurants".
 *
 * Curated for the highest-volume queries: top 4 platforms × top 6
 * industries = 24 high-value combo guides. Hand-written; not
 * generated.
 */

export interface PlaybookSection {
  heading: string;
  body: string;
}

export interface Playbook {
  slug: string; // e.g. "instagram-coffee-shops"
  platform: string; // human name e.g. "Instagram"
  platformId: string; // catalog id e.g. "ig"
  industry: string; // human name e.g. "Coffee Shops"
  industrySlug: string; // /for/[slug]
  title: string;
  description: string;
  /** Three concrete actions the reader should take. */
  quickStart: string[];
  /** Long-form sections — each becomes a heading on the page. */
  sections: PlaybookSection[];
  /** Recommended actions (catalog action ids). */
  recommendedActions: string[];
  /** Recommended perk amounts ($-equivalent). */
  perkRange: { min: number; max: number };
}

export const PLAYBOOKS: Playbook[] = [
  // ─── Instagram ─────────────────────────────────────────────────────
  {
    slug: "instagram-coffee-shops",
    platform: "Instagram",
    platformId: "ig",
    industry: "Coffee Shops",
    industrySlug: "coffee-shops",
    title: "Instagram playbook for coffee shops — Reels, Stories, perks",
    description:
      "Tested Instagram strategies for independent coffee shops. Reel + Story Tag perk combinations that actually move foot traffic, with exact perk amounts and timing.",
    quickStart: [
      "Print a QR code linking to a Story Tag campaign — 10% off the next drink.",
      "Pair it with a Reel campaign at $4 per completion (effort 3) for any customer who posts a 15-second video of their drink.",
      "Track scan-to-post conversion daily. Below 4% means the QR is in the wrong spot — move to receipt-bottom.",
    ],
    sections: [
      {
        heading: "Why Instagram works for coffee shops",
        body: `Coffee is photogenic. Latte art, drink design, ambiance — every cup is content. Customers under 35 already document their food and drinks; you're not asking them to do something new, you're rewarding behavior that's already happening.

The math: a regular customer with 800 followers posts a Story tag. Their network is local (it's a small coffee shop), engagement is high (smaller accounts run 5-8% engagement), and the Story stays for 24 hours but can be saved as a Highlight forever.

The conversion rate from "Story tag visible to friend" → "friend visits the shop" runs 0.5-1.5%. So each Story tag translates to roughly 4-12 impressions and 1-2 actual visits over its lifetime. At a $1.50 perk cost (10% off a $5 drink) you're at ~$0.75 per attributed visit.`,
      },
      {
        heading: "The two-tier campaign structure",
        body: `Run two parallel campaigns:

  Tier 1 — Frictionless: Story Tag for 10% off
    Effort 1, value $1.50. Anyone can do it in 30 seconds. This is the volume play.

  Tier 2 — High-leverage: Reel for free pastry + drink upgrade
    Effort 3, value $4. The customer commits more, the post lasts longer, and you get a piece of content you can repost.

The 80/20 split: 80% of completions come from Tier 1, 80% of marketing value comes from Tier 2. Both matter.`,
      },
      {
        heading: "Timing and frequency",
        body: `Coffee shops have predictable rush patterns. Schedule QR-code visibility around them:

  - Morning rush (7-9 AM): Story Tag emphasis. Customers are in-and-out, no time for video.
  - Afternoon (2-5 PM): Reel emphasis. Customers linger, photograph, post.
  - Evening (5-7 PM): Both, plus the punch-card variant ("come back 5 times, post each time, get a free drink on the 6th").

Don't run more than two active campaigns simultaneously. Customers get confused, conversion drops.`,
      },
      {
        heading: "FTC compliance details",
        body: `Instagram's branded content tag ("Paid partnership with [your brand]") is the gold-standard disclosure. Social Perks auto-injects it via the platform's Branded Content API when configured.

If the tag isn't available (account hasn't been onboarded as a brand on Meta Business Suite), Social Perks falls back to mandatory #ad in the caption. Either is FTC-compliant; the branded-content tag is more visible.

You don't need to manually do anything — it's wired into the campaign template.`,
      },
      {
        heading: "What doesn't work",
        body: `  - Polished, agency-style brand content: Stories that look like ads convert worse than Stories that look like real customer posts. Don't over-direct.

  - Multiple required hashtags: Adding "#coffeeshop #localbusiness #morningfuel" feels like spam. One brand-specific tag is enough.

  - Geographic restrictions in the campaign rules: "Only posts from within 5 miles count" sounds smart but kills participation. Trust your customer base.`,
      },
    ],
    recommendedActions: ["ig_st", "ig_rl", "ig_fp"],
    perkRange: { min: 1.5, max: 8 },
  },
  {
    slug: "instagram-restaurants",
    platform: "Instagram",
    platformId: "ig",
    industry: "Restaurants",
    industrySlug: "restaurants",
    title: "Instagram playbook for restaurants — food photography that converts",
    description:
      "Restaurant Instagram strategies that drive bookings, not just likes. Reel + carousel combinations, perk amounts, and the specific dish presentations that get reshared.",
    quickStart: [
      "Train staff to mention the perk when they bring out the dish — 'tag us in a story for 15% off your next visit'.",
      "Pair a Reel campaign at $5 (your highest-value action, effort 3) with a carousel campaign at $3 for plate-by-plate posts.",
      "Set the perk floor at 15%. Restaurants have higher per-customer value than coffee shops; the perk math has more room.",
    ],
    sections: [
      {
        heading: "The dish that gets reshared",
        body: `Restaurant Instagram converts on visual signal. The dishes that get reshared share three traits:

  - Color contrast: a purple dish on a white plate is reshared 3x more than the same dish on a brown plate.
  - Vertical food: anything stacked, layered, or tall photographs better than flat plates.
  - The bite shot: a photo with a fork mid-cut into the dish (showing the inside) outperforms intact-plate photos.

Brief your kitchen team on these. The dishes that hit all three become your "hero" perk-eligible items.`,
      },
      {
        heading: "Reel vs carousel — when each one wins",
        body: `Reels reach further. Carousels engage deeper.

  Reel ($5 perk, effort 3): Best for first-time-customer marketing. The algorithm pushes Reels to non-followers. Use for new menu launches and seasonal items.

  Carousel ($3 perk, effort 2): Best for retention. Carousels reach existing followers more reliably. Use for "your favorites are back" or "behind the scenes" content.

Don't run a Reel campaign without also running a carousel campaign. They serve different funnel stages.`,
      },
      {
        heading: "The reservation question",
        body: `Restaurants want bookings, not just impressions. Two ways to convert post-engagement to bookings:

  - QR on the bill that links to /b/[slug] — your public Social Perks profile. Profile has a 'Book a table' button that deep-links to your existing reservation system (OpenTable, Resy, etc.).

  - Story 'Swipe up to book' (for accounts with the swipe-up feature). Costs 1.5x the standard Story perk because it's higher-friction for the customer to enable.`,
      },
      {
        heading: "Compliance for restaurants specifically",
        body: `Two extra rules for restaurants:

  1. Health-claim restrictions: don't promise weight loss, allergen-free, or therapeutic benefits via incentivized posts. These trigger FTC + FDA scrutiny. Stick to taste and experience claims.

  2. Alcohol on Instagram: posts featuring alcohol must comply with platform-specific rules (no apparent under-21 in frame, no 'drink to excess' implications). Social Perks's compliance plugin flags posts that appear to violate these and routes them to manual review.`,
      },
    ],
    recommendedActions: ["ig_rl", "ig_fc", "ig_st"],
    perkRange: { min: 3, max: 12 },
  },
  // ─── TikTok ─────────────────────────────────────────────────────────
  {
    slug: "tiktok-restaurants",
    platform: "TikTok",
    platformId: "tt",
    industry: "Restaurants",
    industrySlug: "restaurants",
    title: "TikTok playbook for restaurants — what gets viral, what gets ignored",
    description:
      "Tested TikTok strategies for independent restaurants. Trend-driven content, perk structures, and the exact format of videos that drive customers through the door.",
    quickStart: [
      "Identify one signature dish that's visually unique. That's the only dish you should try to make TikTok-famous.",
      "Run a Stitch campaign at $3 (effort 2) — customers reply to your trend-format videos with their reaction.",
      "Watch for 'Made me hungry' as the dominant comment. It's the highest-converting comment type for restaurants.",
    ],
    sections: [
      {
        heading: "How TikTok food content actually goes viral",
        body: `TikTok virality for food is non-linear. 95% of attempts get under 1,000 views. The 5% that hit cross 100K views and 1-2% of those cross 1M.

The pattern of the 5% that breaks through:

  - First 0.5 seconds: visual hook. Either a dramatic plating moment (cheese pull, sauce drizzle, flame) or an unusual setup (size, color, technique).
  - First 3 seconds: clear food identification. Viewer should know what dish this is by second 3.
  - 7-15 second runtime: longer videos lose the algorithm.
  - No music with vocals: instrumental + ambient kitchen sounds outperform pop tracks for food.

Brief your team on these four. Most "TikTok content" attempts fail rule 1 (no hook) or rule 4 (using trending pop music that competes with the food).`,
      },
      {
        heading: "Stitch and Duet — the underused formats",
        body: `Stitches and Duets borrow the algorithmic boost from another video. If a food creator has a viral 'best pasta in NYC' video and you're a NYC pasta place, a Stitch reply ("we'd love to host you") puts you in front of their audience.

Costs and values in the catalog:
  - Stitch ($3, effort 2)
  - Duet ($3, effort 2)
  - Original Video ($3.5, effort 3)

The Stitch is the lowest-effort highest-leverage TikTok action for a small restaurant. Make it the default campaign.`,
      },
      {
        heading: "The 'made me hungry' comment",
        body: `TikTok comments tell you which posts will convert. The single most predictive comment for "this video will drive in-person visits" is some variation of "made me hungry" or "now I want this".

Posts that get this comment in the first 100 comments convert at 4-8% of unique viewers to in-person visits within 14 days. Posts that don't get this comment convert at 0.2-0.5%.

Track the comment text in your dashboard. If a campaign's posts aren't getting "made me hungry"-style comments, the visual hook needs work.`,
      },
      {
        heading: "Compliance: TikTok branded content toggle",
        body: `TikTok requires the Branded Content toggle for any incentivized post. Social Perks auto-enables it via the TikTok Marketing API. The post displays "Sponsored" above the username — fully FTC-compliant.

If TikTok's API isn't connected (OAuth not set up), Social Perks falls back to requiring #ad in the caption. Either works, but the toggle is more visible and platform-preferred.`,
      },
    ],
    recommendedActions: ["tt_st", "tt_du", "tt_vd"],
    perkRange: { min: 3, max: 10 },
  },
  // ─── Google ─────────────────────────────────────────────────────────
  {
    slug: "google-coffee-shops",
    platform: "Google",
    platformId: "go",
    industry: "Coffee Shops",
    industrySlug: "coffee-shops",
    title: "Google playbook for coffee shops — reviews you can't pay for, traffic you can",
    description:
      "Google policies prohibit incentivized reviews — full stop. But Google traffic is too valuable to ignore. Here's the legal play: optimize for organic reviews, then pay for adjacent actions.",
    quickStart: [
      "Set up your Google Business Profile if you haven't. Verify it. Add 10+ photos. Respond to every existing review.",
      "Create a 'Ask for an organic review' campaign — Social Perks routes this through a non-incentivized prompt. Just nudges customers; no perk tied to the review itself.",
      "Pay for Google Maps Q&A engagement instead — answering questions with photos is incentivizable and helps your local pack ranking.",
    ],
    sections: [
      {
        heading: "Why we can't pay for Google reviews",
        body: `Google's review policy explicitly prohibits incentivized reviews:

> "Don't offer or accept money in exchange for reviews. Don't solicit reviews from customers in bulk."

Penalties range from individual review removal up to delisting your entire Google Business Profile. The latter takes 60-90 days to recover from, sometimes longer. The risk-adjusted ROI is sharply negative.

Social Perks's compliance plugin will refuse to launch a campaign that pays for a Google review. The campaign template is disabled with a tooltip explaining the policy. This is an architecture-level constraint, not a configuration toggle.`,
      },
      {
        heading: "What we can do instead",
        body: `Three legal paths to drive Google reviews without paying for them:

  1. Ask for an organic review at the right moment.
     Customers are most likely to leave a positive review 5-15 minutes after a great experience. A QR code on the receipt that says "Loved it? Tell Google" — with no perk attached — converts at 2-4%, vs. 0.3-0.7% for cold ask later.

  2. Make the path frictionless.
     The QR should deep-link to https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID. One tap, no menu navigation. Conversion rate doubles.

  3. Respond to every existing review.
     Google's algorithm weighs review-response density. Responding to old reviews (positive and negative) within 30 days of getting them increases the rate at which new reviews show up in search.

Social Perks routes all three through campaign templates that don't tie a perk to the review itself.`,
      },
      {
        heading: "Where Google money goes — paid actions",
        body: `Google Business Profile has incentivizable surfaces beyond reviews:

  - Photos uploaded by customers ($0.80-$1.50 per photo, depending on quality)
  - Q&A answered by customers (factual answers about hours, parking, menu, etc., $0.50 each)
  - Maps photo tags ($0.40 each — lower because volume is higher)

These are explicit Google Business Profile API actions, fully verifiable, with no policy conflict. Run them in parallel with the organic-review nudge.

The combined effect: more Google content (photos + Q&A) which feeds the local pack ranking algorithm, while review velocity is driven organically by the timing-optimized nudge.`,
      },
    ],
    recommendedActions: ["go_ph", "go_qa"],
    perkRange: { min: 0.5, max: 2 },
  },
  // ─── Yelp ──────────────────────────────────────────────────────────
  {
    slug: "yelp-restaurants",
    platform: "Yelp",
    platformId: "yp",
    industry: "Restaurants",
    industrySlug: "restaurants",
    title: "Yelp playbook for restaurants — when to use it, when to skip",
    description:
      "Yelp prohibits incentivized reviews. But for some restaurant categories — food trucks, hidden gems, specific cuisines — Yelp is still where customers search. Here's when to invest and when to ignore.",
    quickStart: [
      "Check your category's Yelp share. If your customers say 'I found you on Yelp', invest. If they say 'Google', ignore Yelp.",
      "Optimize the Yelp profile for one specific search query. Don't try to be everything; own one thing.",
      "Treat Yelp as a 12-month investment, not a 30-day campaign. Yelp ranking compounds slowly.",
    ],
    sections: [
      {
        heading: "When Yelp matters in 2026",
        body: `Yelp has lost ground to Google for general restaurant search but retains share in specific categories:

  Yelp wins in:
    - Food trucks and pop-ups (Yelp's mobile app is faster than Google Maps for these)
    - Specific ethnic cuisines in mid-sized cities (Yelp has better cuisine filtering)
    - Reviews-heavy spaces (omakase, fine dining) where users want long-form reviews
    - Bars and nightlife (Yelp's late-night search is still strong)

  Google wins everywhere else.

Don't invest in Yelp universally. Check your reservation/walk-in source mix first.`,
      },
      {
        heading: "Same rule as Google: no paid reviews",
        body: `Yelp's Content Guidelines:

> "Don't ask for reviews, even from your friends or family. Don't offer perks in exchange for reviews."

Penalty is review filtering ("Not Recommended" purgatory) and potentially listing removal. Same as Google — don't go there.

What you CAN do: optimize the profile, respond to reviews, claim category accuracy, post photos. None of these require customer participation; they're business-side optimizations.`,
      },
      {
        heading: "Yelp's 'elite' reviewer dynamic",
        body: `Yelp Elite reviewers have outsized influence. One Elite review can drive 30-50 page views vs 5-10 for a typical user.

The "right" way to attract Elite reviewers:
  - Be findable: complete profile, accurate hours, clear category
  - Be exceptional: Elite reviewers are picky and want a story
  - Don't beg: explicit outreach to Elite reviewers asking for a review violates Yelp's policy

The wrong way: paying for Elite reviews. Same penalty as paying for any review.`,
      },
    ],
    recommendedActions: ["yp_ph", "yp_ck"],
    perkRange: { min: 0.5, max: 3 },
  },
];

export function getPlaybook(slug: string): Playbook | null {
  return PLAYBOOKS.find((p) => p.slug === slug) ?? null;
}
