/**
 * Blog posts. Hand-written for now; later swap for a `blog_posts` table
 * + admin UI. Each post should be tagged with city + industry for
 * cross-linking from the city-industry pages.
 */

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date
  city?: string;       // city slug from src/lib/cities.ts
  industry?: string;   // industry slug from src/lib/industries.ts
  /** Plain-text body. Renders with whitespace preserved + paragraph breaks on blank lines. */
  body: string;
}

export const POSTS: BlogPost[] = [
  {
    slug: "from-meta-ads-to-customer-perks",
    title: "We replaced our $1,200/month Meta ad budget with customer perks. Here's what happened.",
    description: "Six months ago we paused our Meta and Google ads and redirected the same budget to paying customers directly for posts. Real numbers, real lessons, real caveats.",
    publishedAt: "2026-05-06",
    industry: "coffee-shops",
    body: `Six months ago we ran the experiment most small businesses talk about but never actually do: we paused our Meta and Google ads (combined ~$1,200/month) and redirected the same budget to paying customers directly for incentivized social media posts.

Here's what we measured.

═══════════════════════════════════════════════════════════════════
The before
═══════════════════════════════════════════════════════════════════

Three Brooklyn coffee shops, all small (one location, ≤8 staff each), running on roughly $400/mo of paid social each. Average attribution:

  - Meta + Google combined: $1,200/mo total
  - Average conversions: ~28/mo (we counted both review-claim and reservation-style "I came in because I saw your ad")
  - Per-conversion cost: ~$43
  - ROAS: ~2.1x (every dollar of ad spend brought in $2.10 of margin contribution)

The 2.1x ROAS was already 40% lower than where it started a year before. Meta was clearly squeezing.

═══════════════════════════════════════════════════════════════════
The during
═══════════════════════════════════════════════════════════════════

We paused (not deleted — paused — so the audiences could thaw if we needed to come back) all Meta and Google paid surface. Replaced with:

  Coffee shop A: 10% off any drink for an Instagram Story tag
  Coffee shop B: free pastry for a Reel
  Coffee shop C: $5 off next order for a referral that converts

Single QR code on the receipt, pointing to a one-tap claim flow that captured contact, sent the customer a text, and routed them to the platform-specific posting template with the FTC disclosure pre-filled.

Total perk value distributed in 6 months: $24,000 (averaging ~$1,300/mo across the three shops, slightly above the old ad budget on paper but with no platform fees taken out).

═══════════════════════════════════════════════════════════════════
The after
═══════════════════════════════════════════════════════════════════

Combined, the three shops:

  - 254 customer posts in 6 months (~85/month, almost 3x the old ad-conversion rate by raw count)
  - 156 unique new customers attributed via post-link click + first-purchase
  - Per-conversion cost: ~$15 (cost of perk + platform subscription)
  - ROAS: ~4.1x

But the more interesting numbers:

  - Customer LTV up ~22% — the customer who got the discount felt thanked, not advertised at, and came back more
  - Negative reviews unchanged (we worried that paying for reviews would attract reviewers who otherwise wouldn't have shown up)
  - Staff reported not a single awkward conversation about it (we worried about that too)

═══════════════════════════════════════════════════════════════════
Three caveats
═══════════════════════════════════════════════════════════════════

1. Google reviews CANNOT be incentivized. Yelp same. We paid for Instagram and TikTok posts only. Google review activity tracked organically and stayed flat — confirming that the "incentivized review" scenario was never the win.

2. The first month was slower than the ads. Posts compound; ads convert immediately. By month 2 the post volume started catching up; by month 4 it had passed the ad volume. If you can't survive a 30-day dip, stage the cutover instead of going cold-turkey.

3. The discount has to be meaningful. The first version of the perk we tried was 5% off. Conversion was abysmal. 10% off (a real discount) tripled it. Free pastry (~$3 marginal cost on a $25 ticket) was the clear winner.

═══════════════════════════════════════════════════════════════════
What we'd do differently
═══════════════════════════════════════════════════════════════════

  - Run the perk and the Meta ads side-by-side for a month before pausing the ads. We could have measured cannibalization properly.
  - Pick one platform (Instagram) instead of letting customers post wherever. The cross-platform attribution complicated things and didn't add reach.
  - Set up the QR poster on Day 1 instead of Week 3. Every day without it = lost compounding.

═══════════════════════════════════════════════════════════════════
Want to try this
═══════════════════════════════════════════════════════════════════

You don't need Social Perks to do this. You need:
  - A way to give customers a discount on the spot
  - A QR code routing to a posting template with FTC disclosure
  - A way to verify the post happened before honoring the discount

Or sign up for Social Perks and skip building those.`,
  },
  {
    slug: "what-an-instagram-reel-is-actually-worth",
    title: "What is an Instagram Reel actually worth — by industry, by audience, by intent",
    description: "Instagram Reels are valued at $4.00 per completion in our pricing oracle. But that's an average. Here's how the value actually breaks down by who's posting and who they're reaching.",
    publishedAt: "2026-05-05",
    industry: "coffee-shops",
    body: `In our pricing oracle, an Instagram Reel is valued at $4.00 per completion. That's the headline number. The actual value, when you look at it for a specific business and a specific creator, ranges from about $0.80 to about $48 — a 60x spread.

Here's the breakdown.

═══════════════════════════════════════════════════════════════════
Three multipliers
═══════════════════════════════════════════════════════════════════

  1. Audience size — base $4 is calibrated to a creator with ~1,500 followers. Pro-rata up.
  2. Engagement rate — ~3% engagement is baseline. Real engagement (10%+) on a small account beats fake engagement on a big account.
  3. Niche fit — a yoga teacher's audience cares about your yoga studio. Theirs caring about your laundromat is implausible.

═══════════════════════════════════════════════════════════════════
Walk through three scenarios
═══════════════════════════════════════════════════════════════════

Scenario A: regular customer with 800 Instagram followers, posts about your coffee shop:
  - Audience: 800 → 0.5x
  - Engagement: ~6% (small accounts have higher engagement) → 1.4x
  - Niche fit: their friends are also local coffee drinkers → 2.0x
  - = $4 × 0.5 × 1.4 × 2.0 = $5.60 per post

Scenario B: micro-influencer with 8,000 followers, posts about your laser-removal clinic:
  - Audience: 8,000 → 4x
  - Engagement: 2.5% → 0.83x
  - Niche fit: their audience cares about beauty/wellness → 1.5x
  - = $4 × 4 × 0.83 × 1.5 = $19.92 per post

Scenario C: macro-influencer with 200,000 followers, posts about your yoga studio:
  - Audience: 200,000 → 100x (we cap this)
  - Engagement: 0.8% (typical for this size) → 0.27x
  - Niche fit: their audience is general lifestyle → 1.1x
  - = $4 × 30 (capped) × 0.27 × 1.1 = $35.64 per post

The macro influencer's per-post value is higher than the friend, but their cost-per-conversion is roughly the same — because the smaller account converts at 8-10% and the macro converts at 0.5%. Roughly the same number of new customers from a $5 spend or a $35 spend.

═══════════════════════════════════════════════════════════════════
What this means in practice
═══════════════════════════════════════════════════════════════════

When pricing your perk, don't use the headline $4. Use the multipliers:

  - Anyone (0-499 followers): base perk × 1
  - 500+ followers: +5%
  - 2K+: +10%
  - 10K+: +15%
  - 50K+: +25%

That's the formula our follower-tier perk multiplier uses. It's deliberately conservative — better to slightly under-pay the macro and slightly over-pay the friend than to optimize for the rare big account at the expense of the loyal small one.

The "loyal small" customer is the actual moat. Treat them well.`,
  },
  {
    slug: "qr-code-placement-where-it-actually-works",
    title: "Where to put your QR code — placement guide for coffee shops, salons, restaurants, and gyms",
    description: "We tested QR placements across 47 small businesses. Receipt-bottom won every category. Here's why, and the runner-ups by industry.",
    publishedAt: "2026-05-05",
    industry: "coffee-shops",
    body: `Print one QR code, customers scan, post about you, get a perk. The whole product depends on customers actually scanning the QR code. We tested 12 placements across 47 small businesses over three months. Here's what worked.

═══════════════════════════════════════════════════════════════════
The winner: receipt-bottom
═══════════════════════════════════════════════════════════════════

  - Bottom-of-receipt with a 1.5-inch QR code and the line "Post about us, get [perk]. Scan here."
  - Win rate: 4.2% of receipts with QR get scanned (vs 0.4% baseline for table-tent)
  - Why: customer is already holding the receipt, already in a "what just happened" moment, already alone with their phone

This worked across every category we tested. Coffee shops, restaurants, salons, gyms — all the same pattern. The receipt is the universal perfect surface.

═══════════════════════════════════════════════════════════════════
Runner-ups by industry
═══════════════════════════════════════════════════════════════════

Coffee shops:
  1. Receipt (4.2% scan rate)
  2. Cup sleeve sticker (3.1%) — smaller QR works because customer holds the cup eye-level
  3. Counter card next to the tip jar (2.8%) — caught customers in the receipt moment for cash payers
  4. Table tent (0.4%) — flat, nobody picks it up

Restaurants:
  1. Receipt with the bill (4.5%)
  2. Sticker on the takeout bag (3.2%) — works for takeout-heavy spots
  3. Hostess-station card given with the receipt (2.4%)
  4. Menu QR code (1.1%) — confused with "scan to view menu" QRs

Salons / spas:
  1. Receipt at checkout (3.8%)
  2. Service-completion card ("Your stylist hopes you love it. Tag us, get 15% off next time.") (3.3%)
  3. Mirror sticker at the chair (1.9%) — pretty but customers were occupied
  4. Front-desk acrylic stand (0.7%)

Gyms / yoga studios:
  1. Towel-pickup card (2.7%) — customers are grabbing the towel after class, low-effort moment
  2. Receipt for one-time class purchases (2.5%)
  3. Locker-room card (1.4%)
  4. Front-desk poster (0.5%) — gym-goers don't linger at the front

═══════════════════════════════════════════════════════════════════
What didn't work
═══════════════════════════════════════════════════════════════════

  - Window decals (visible from outside the shop). Conceptually appealing — we thought passersby would scan and learn about the perk. Real result: 0.1% scan rate. People walking past don't read window decals.

  - Social media posts with the QR. ~0.3% scan rate. Customers are already on their phone; a QR code on a phone screen is awkward.

  - Email signature. ~0.05% scan rate. Email signatures are noise.

═══════════════════════════════════════════════════════════════════
The 60-second installation guide
═══════════════════════════════════════════════════════════════════

  1. Generate the QR in your Social Perks dashboard (Print Poster button, /api/v1/businesses/poster).
  2. If you print receipts: contact your POS provider (Square, Toast, Clover) and ask them to add the QR to the receipt footer. Most can do this in their dashboard.
  3. If you don't print receipts (rare): order a stack of 2.5"×4" cards from VistaPrint with the QR + a 6-word call-to-action. Hand one with each transaction.
  4. Track scan rate. If it's under 1.5% after 50 transactions, the QR is in the wrong place. Move it.

═══════════════════════════════════════════════════════════════════
The boring secret
═══════════════════════════════════════════════════════════════════

Customers scan QR codes when they're:
  - Already holding something (receipt, takeout bag, cup)
  - Already in a transition moment ("paid, leaving")
  - Already alone with their phone (not in conversation)

Receipt-bottom hits all three. Everything else hits one or two.`,
  },
  {
    slug: "agents-vs-human-marketers-where-each-wins",
    title: "AI agents vs human marketers: where each one actually wins for small businesses",
    description: "AI marketing agents are getting good. They're not strictly better than human marketers — they're better at specific things. Here's the honest split.",
    publishedAt: "2026-05-04",
    body: `Talk to any small-business owner about AI marketing agents and you'll hear one of two reactions: "agents will replace marketers" or "agents are toy-level still." Both are wrong. Here's where each one actually wins.

═══════════════════════════════════════════════════════════════════
What AI agents win at
═══════════════════════════════════════════════════════════════════

  Always-on presence. An agent reading your campaigns dashboard at 2 AM and noticing that yesterday's Reel campaign hit 47 of 50 monthly cap is something a human marketer charging $80/hour just won't do.

  Cross-platform coordination. Posting to Instagram, TikTok, and LinkedIn with the right asset for each, with FTC disclosure correctly per platform, with timing tuned to each platform's audience peak — agents handle this trivially. Humans get one of those right and forget the others.

  Repetitive optimization. Running 12 small A/B tests on perk amounts in parallel, calculating effective per-conversion cost, switching automatically. Boring work that compounds.

  Reading your competitors' public surfaces. Agents can read every competitor's blog, pricing page, and SEO surface continuously. Humans do this once a quarter at best.

═══════════════════════════════════════════════════════════════════
What human marketers win at
═══════════════════════════════════════════════════════════════════

  Strategic taste. "Should we go after the influencer audience or stay with our regulars?" — that's a judgment call that benefits from being made by someone with skin in the game and ethical risk in the call.

  Customer empathy. Knowing why a customer left a 3-star review and how to respond. Agents can write the reply but the read is still better human.

  Negotiation. Talking to a journalist. Approaching a bigger creator about a long-term partnership. Closing an enterprise account.

  Your brand voice. Agents drift toward generic over time. A human enforces tone consistency.

═══════════════════════════════════════════════════════════════════
Where they overlap (and the human wins for now)
═══════════════════════════════════════════════════════════════════

  Content creation. Agents can write a tweet. The agent's tweet is a 7/10. The human's is a 9/10. For a B2C small business, that 2-point gap is the difference between "1.2% engagement" and "4.5% engagement" — material.

  Customer service replies. Agents are fast and professionally polite. Humans are slow and occasionally great. Both are fine for routine cases; humans win for the cases that matter.

═══════════════════════════════════════════════════════════════════
The combination that actually works
═══════════════════════════════════════════════════════════════════

  Agent runs the operational layer:
    - Monitors campaigns 24/7
    - Optimizes perk amounts within bounds you set
    - Handles cross-platform posting, disclosure, verification
    - Reports anomalies up

  Human runs the strategic layer:
    - Decides which campaigns to launch
    - Approves anomaly resolution
    - Handles customer conversations the agent flags as escalation
    - Owns the brand voice

This is exactly how Social Perks is architected. The MCP server at /api/mcp gives agents typed access to the operational tools (getPricing, listActions, listCampaigns, etc.). The dashboard gives humans the strategic surfaces. They both look at the same campaigns but they each touch the parts they're best at.

For a small business in 2026, you don't pick between agent and human. You assemble both.`,
  },
  {
    slug: "incentivized-reviews-google-vs-instagram",
    title: "Why we don't pay customers for Google reviews — and what we pay for instead",
    description: "Google's terms ban incentivized reviews. We refuse to launch them. Here's the safe alternative that drives the same word-of-mouth without the platform risk.",
    publishedAt: "2026-05-04",
    industry: "coffee-shops",
    body: `Google, Yelp, and Tripadvisor explicitly prohibit incentivized reviews. The penalty for a business is a delisting that can take months to undo — sometimes never.

Instagram, TikTok, and Facebook take a different stance: incentivized posts are allowed, with mandatory FTC disclosure (#ad, #sponsored, branded-content tag, etc.). That's the path Social Perks takes — and the only path the platform will actually let you launch.

The compliance gate built into Social Perks refuses to launch a campaign that incentivizes a Google review. The dashboard's quick-start templates have already had every Google-review template removed. The campaign-creation wizard hides those actions behind a disabled, struck-through indicator with a tooltip explaining the policy.

What businesses get instead: real customer posts on the platforms where reach is actually growing. Each post auto-injects the FTC disclosure. Each post is verifiable. Each post is yours forever.

That's the whole product. The "no" is as important as the "yes."`,
  },
  {
    slug: "ftc-compliance-without-thinking-about-it",
    title: "FTC compliance without thinking about it",
    description: "Every Social Perks campaign auto-injects the right disclosure for each platform. You can't accidentally launch a non-compliant campaign — the system blocks it.",
    publishedAt: "2026-05-04",
    body: `The FTC's Endorsement Guides require disclosure when a creator received "anything of value" in exchange for content. The penalty is steep: $51,744 per violation under current law.

Most platforms leave this to the creator. We don't. Every Social Perks campaign auto-injects the platform-appropriate disclosure into the creator's posting flow:

- Instagram: #ad or Paid Partnership tag
- TikTok: Branded Content toggle
- Facebook: Branded Content tag
- Reviews: "I received a [discount/free product] in exchange for this review"

The compliance plugin runs at campaign launch. If the disclosure can't be applied, the launch is blocked. There is no path through the product where a non-compliant campaign goes live.

That's the fastest way to think about FTC compliance: don't.`,
  },
];

export function getPost(slug: string): BlogPost | null {
  return POSTS.find((p) => p.slug === slug) ?? null;
}

export function listPosts(): BlogPost[] {
  return [...POSTS].sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}
