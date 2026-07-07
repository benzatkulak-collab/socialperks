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
    title: "Paying your customers instead of Meta: the case, the math, and where it breaks",
    description: "The argument for redirecting ad spend to incentivized customer posts — the economics, the FTC lines you cannot cross, and where the model breaks.",
    publishedAt: "2026-05-06",
    industry: "coffee-shops",
    body: `Every small business eventually notices the same thing: Meta and Google ads cost more each year and convert less. ROAS that started near 4x drifts toward 2x. The platform is squeezing, and there is no version where a coffee shop out-bids the agencies and AI-run campaigns fighting for the same inventory.

So here is the argument for spending that budget somewhere else entirely: your own customers.

Instead of paying Meta to show a stranger your ad, pay an existing customer — a discount, a free item — to post about you, with proper FTC disclosure. The logic is straightforward:

  - A customer's post reaches their real network, which trusts them more than it trusts an ad placement.
  - The customer feels thanked, not marketed at — so the relationship strengthens instead of eroding.
  - The money stays in your community instead of going to an ad platform.

The economics, in principle

The model only works if the perk costs less than the marketing value of the post. A rough way to think about it: a local ad impression has a price, and a genuine post from a real customer to a local audience is worth at least that — usually more, because of the trust premium. If your perk (say, a free item with a few dollars of marginal cost) costs less than the equivalent reach would cost in ads, the math favors the perk.

The band is narrower than it looks. Pay too little and nobody participates; pay too much and your margin evaporates. A trivial discount tends to get ignored. A real one — a genuine free item, or a double-digit discount — is what moves people. Test the amount. It is the single biggest lever.

Three lines you cannot cross

  1. Google and Yelp reviews cannot be incentivized. Ever. That is a hard rule in their terms, and since the FTC's 2024 rule on fake and incentivized reviews, a legal exposure with civil penalties per violation. Incentivize social posts — Instagram, TikTok, Facebook — not reviews.
  2. Disclosure is mandatory and must be clear: #ad, #sponsored, or the platform's paid-partnership label, visible without hunting for it. Telling the customer to disclose is not a defense — the brand is accountable.
  3. You cannot require the post to be positive. You are paying for the post, not for praise.

Where it does not work

Posts compound; ads convert immediately. Expect the first few weeks to feel slower than paid ads did — volume builds as more customers participate. If you cannot absorb a short dip, run the perks alongside your ads for a month before cutting anything, so you measure honestly instead of guessing.

It also has to be effortless for the customer. If claiming the perk takes more than a tap or two, participation collapses. A QR code at the point of sale routing to a pre-filled posting template is roughly the floor of what works.

What you need to try it

You do not need any particular software. You need three things:

  - A way to give a customer a discount on the spot.
  - A QR code that routes to a posting template with the FTC disclosure already filled in.
  - A way to confirm the post happened before you honor the perk.

That is the whole loop. Social Perks packages it — the templates, the compliance, the verification — so you do not have to build it. But the idea stands on its own: your customers are a cheaper, more trusted marketing channel than the ad auction, if you make it easy and keep it compliant.`,
  },
  {
    slug: "what-an-instagram-reel-is-actually-worth",
    title: "What is an Instagram Reel actually worth — by industry, by audience, by intent",
    description: "Instagram Reels are valued at $4.00 per completion in our pricing oracle. But that's an average. Here's how the value actually breaks down by who's posting and who they're reaching.",
    publishedAt: "2026-05-05",
    industry: "coffee-shops",
    body: `In our pricing oracle, an Instagram Reel is valued at $4.00 per completion. That's the headline number. Run it through the model for a specific business and creator and it ranges from roughly $0.80 to about $48 — a wide spread driven by three multipliers.

The scenarios below are illustrative worked examples of that model, not measured performance. Here's the breakdown.

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

The macro influencer's per-post value is higher than the friend's, but their cost-per-conversion works out roughly the same — a smaller, engaged account tends to convert its audience at a much higher rate than a large, broad one. In this model, that can net roughly the same number of new customers from a $5 spend or a $35 spend.

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
    description: "Where to put your QR code so customers actually scan it — a placement guide built on where people are in the transaction moment. Illustrative expectations, not measured field data.",
    publishedAt: "2026-05-05",
    industry: "coffee-shops",
    body: `Print one QR code, customers scan, post about you, get a perk. The whole thing depends on customers actually scanning that QR code.

Illustrative guide, not a field study. Social Perks is pre-launch — the placements below are ranked by reasoning about where customers are in the moment, not by measured scan rates. Test them against your own counter and keep what wins.

═══════════════════════════════════════════════════════════════════
The winner: receipt-bottom
═══════════════════════════════════════════════════════════════════

  - Bottom-of-receipt with a 1.5-inch QR code and the line "Post about us, get [perk]. Scan here."
  - Why it should win: the customer is already holding the receipt, already in a "what just happened" moment, already alone with their phone
  - A table tent, by contrast, sits flat on a surface nobody picks up

The same logic holds across every category — coffee shops, restaurants, salons, gyms. The receipt is the universal near-perfect surface.

═══════════════════════════════════════════════════════════════════
Runner-ups by industry
═══════════════════════════════════════════════════════════════════

Coffee shops:
  1. Receipt — the anchor placement
  2. Cup sleeve sticker — a smaller QR works because the customer holds the cup at eye level
  3. Counter card next to the tip jar — catches cash payers who never get a receipt
  4. Table tent — flat, nobody picks it up

Restaurants:
  1. Receipt with the bill
  2. Sticker on the takeout bag — strong for takeout-heavy spots
  3. Hostess-station card handed over with the receipt
  4. Menu QR code — easily confused with "scan to view menu" QRs

Salons / spas:
  1. Receipt at checkout
  2. Service-completion card ("Your stylist hopes you love it. Tag us, get 15% off next time.")
  3. Mirror sticker at the chair — eye-catching, but customers are usually occupied
  4. Front-desk acrylic stand

Gyms / yoga studios:
  1. Towel-pickup card — customers are grabbing a towel after class, a low-effort moment
  2. Receipt for one-time class purchases
  3. Locker-room card
  4. Front-desk poster — gym-goers don't linger at the front

═══════════════════════════════════════════════════════════════════
What didn't work
═══════════════════════════════════════════════════════════════════

  - Window decals (visible from outside the shop). Conceptually appealing — you'd think passersby would scan and learn about the perk. In practice, people walking past don't stop to read window decals.

  - Social media posts with the QR. Customers are already on their phone; a QR code on a phone screen is awkward to scan.

  - Email signature. Email signatures are noise — almost nobody scans them.

═══════════════════════════════════════════════════════════════════
The 60-second installation guide
═══════════════════════════════════════════════════════════════════

  1. Generate the QR in your Social Perks dashboard (Print Poster button, /api/v1/businesses/poster).
  2. If you print receipts: contact your POS provider (Square, Toast, Clover) and ask them to add the QR to the receipt footer. Most can do this in their dashboard.
  3. If you don't print receipts (rare): order a stack of 2.5"×4" cards from VistaPrint with the QR + a 6-word call-to-action. Hand one with each transaction.
  4. Track your scan rate. If barely anyone scans after your first ~50 transactions, the QR is in the wrong place. Move it.

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

  Content creation. Agents can write a tweet. The agent's tweet is a 7/10. The human's is a 9/10. For a B2C small business, that gap is the difference between a post that quietly underperforms and one that actually lands — material.

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
