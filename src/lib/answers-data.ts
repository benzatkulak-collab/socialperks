// ═══════════════════════════════════════════════════════════════════════
// Answer Pages — per-question SEO surface for /answers/[slug]
//
// Why this exists: ChatGPT, Claude, Perplexity, and Google's "People
// Also Ask" boxes preferentially surface URLs that answer ONE specific
// question. The existing /faq page bundles many questions onto one URL,
// which means none of them rank as the canonical answer for their
// specific query.
//
// Each entry below becomes:
//   • A standalone page at /answers/[slug]
//   • A QAPage + FAQPage Schema.org JSON-LD block
//   • An entry in the sitemap with priority 0.75 (high — these are
//     citation targets)
//   • Cross-links to related industries, platforms, and CTAs that
//     convert the visitor toward signup
//
// Editorial discipline:
//   1. Short answer is one sentence, ≤ 30 words. This is what gets
//      lifted into a featured snippet.
//   2. Long answer is 250–500 words. Long enough to be authoritative,
//      short enough that the page loads instantly.
//   3. Every question targets a real high-intent search query — no
//      vanity content. If you wouldn't pay to rank for it, drop it.
//   4. Every page has at least one product CTA that's contextually
//      relevant (not generic "sign up").
// ═══════════════════════════════════════════════════════════════════════

export type AnswerCategory =
  | "legality"
  | "ftc-compliance"
  | "platform-rules"
  | "pricing"
  | "tactics"
  | "comparison"
  | "getting-started";

export interface AnswerRelated {
  /** Slug of another answer page worth cross-linking to. */
  answerSlugs?: string[];
  /** Industry slugs that this question is especially relevant to. */
  industries?: string[];
  /** Platform IDs (from platforms.ts) this answer relates to. */
  platformIds?: string[];
}

export interface AnswerCta {
  /** Display label. */
  label: string;
  /** Internal href. */
  href: string;
  /** One-liner explaining why this CTA fits this answer. */
  rationale?: string;
}

export interface AnswerPage {
  slug: string;
  /** The full question, written exactly as a user would search for it. */
  question: string;
  /** ≤30 word answer. Appears in meta description + on-page snippet. */
  shortAnswer: string;
  /** Long-form answer, plain markdown-ish paragraphs separated by \n\n. */
  longAnswer: string;
  /** Plain-text bullet takeaways, displayed prominently. 3–5 items. */
  keyPoints: string[];
  category: AnswerCategory;
  /** When the answer was last reviewed for accuracy. Bump on edits. */
  lastReviewed: string; // ISO date
  related: AnswerRelated;
  ctas: AnswerCta[];
}

// ───────────────────────────────────────────────────────────────────────
// ANSWERS
//
// Each block: one specific high-intent question, written the way real
// small-business owners search. Most have direct revenue intent — they
// were either about to spend money on the wrong thing, or about to
// avoid spending money on the right thing.
// ───────────────────────────────────────────────────────────────────────

export const ANSWERS: AnswerPage[] = [
  // ─── Legality / Compliance ─────────────────────────────────────────
  {
    slug: "can-i-pay-customers-for-google-reviews",
    question: "Can I pay customers for Google reviews?",
    shortAnswer:
      "No. Google's policies prohibit incentivized reviews, including discounts, free items, or any form of compensation in exchange for a review.",
    longAnswer:
      "Google's prohibited content policy explicitly bans incentivized reviews. \"Reviewers must not accept money or products in exchange for posting reviews about a business or for changing or removing reviews.\" Violations can get your reviews removed, your Business Profile suspended, and in egregious cases — like the FTC's Fashion Nova settlement — result in fines.\n\nThe ban applies even when the incentive is small (a coffee, 10% off, a free side). It applies even when you only ask for honest reviews. The triggering action is offering the incentive, not the content of the review.\n\nWhat you can legally do: ask customers for reviews. Make it easy with a QR code, a short link, or a text-message reminder. You can run promotions that aren't tied to leaving a review — a frequent-buyer discount, a birthday perk — and many of those customers will leave positive reviews on their own. You can also incentivize content on platforms where it's allowed: Instagram, TikTok, Facebook, and YouTube all permit paid or incentivized posts as long as the user discloses the relationship (typically with #ad).\n\nSocial Perks blocks Google, Yelp, and TripAdvisor review campaigns by design — the platform refuses to launch them. This protects your Business Profile from suspension while letting you build the same word-of-mouth flywheel on the platforms where incentivization is allowed.",
    keyPoints: [
      "Google bans paying for reviews, including discounts or free items",
      "Violations risk suspension of your Google Business Profile",
      "The FTC has fined businesses for buying reviews (e.g., Fashion Nova, $4.2M)",
      "You CAN ask for reviews — just don't pay for them",
      "Instagram, TikTok, Facebook posts can be incentivized (with #ad disclosure)",
    ],
    category: "legality",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "is-it-legal-to-offer-discounts-for-instagram-posts",
        "what-is-the-ftc-rule-on-incentivized-reviews",
        "how-do-i-get-more-google-reviews-legally",
      ],
      platformIds: ["go", "yp", "ta"],
    },
    ctas: [
      {
        label: "Run compliant campaigns instead →",
        href: "/dashboard#signup",
        rationale: "Social Perks blocks the disallowed campaigns automatically.",
      },
      {
        label: "See FTC compliance details",
        href: "/faq",
      },
    ],
  },
  {
    slug: "is-it-legal-to-offer-discounts-for-instagram-posts",
    question: "Is it legal to offer discounts for Instagram posts?",
    shortAnswer:
      "Yes — incentivized Instagram posts are legal in the US as long as the customer discloses the relationship, typically with #ad or Instagram's paid-partnership tool.",
    longAnswer:
      "Instagram permits incentivized content and so does the FTC, with one critical condition: the customer who posts must disclose that they received something in exchange. The FTC's Endorsement Guides require disclosures to be \"clear and conspicuous.\" In practice that means:\n\n• On a feed post: #ad in the first few hashtags, or Instagram's official Paid Partnership tag\n• On a story: a visible \"Paid partnership\" sticker or \"#ad\" in plain text\n• On a Reel: a verbal mention or on-screen text\n\nFailing to disclose isn't just an Instagram policy violation — the FTC has gone after both brands and creators directly. The agency's 2023 update made clear that the brand is responsible for ensuring its endorsers comply, even when the endorser is a regular customer rather than a paid influencer.\n\nSocial Perks auto-injects the platform-specific disclosure into every campaign brief. When a customer redeems a perk by posting, the campaign instructions show exactly which hashtag or tag to use. The system blocks submissions that don't include the disclosure. This isn't optional — there's no toggle to turn off FTC compliance — because the legal exposure isn't worth the convenience.\n\nThe same rules apply on TikTok (uses the Branded Content toggle), Facebook (#ad or Paid Partnership label), and YouTube (built-in paid-promotion disclosure).",
    keyPoints: [
      "Yes — but the customer MUST disclose the relationship",
      "FTC requires disclosure to be \"clear and conspicuous\"",
      "Use #ad in the first hashtags, or Instagram's Paid Partnership tag",
      "Brands are responsible for ensuring their endorsers comply",
      "Same rules apply on TikTok, Facebook, YouTube (different disclosure formats)",
    ],
    category: "ftc-compliance",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "what-is-the-ftc-rule-on-incentivized-reviews",
        "can-i-pay-customers-for-google-reviews",
        "how-much-discount-should-i-offer-for-an-instagram-post",
      ],
      platformIds: ["ig", "tt", "fb", "yt"],
    },
    ctas: [
      {
        label: "Launch a compliant Instagram campaign →",
        href: "/dashboard#signup?plan=starter",
        rationale: "FTC disclosures are auto-injected so you can't accidentally violate.",
      },
    ],
  },
  {
    slug: "what-is-the-ftc-rule-on-incentivized-reviews",
    question: "What is the FTC rule on incentivized reviews?",
    shortAnswer:
      "Anyone who receives something of value for an endorsement must clearly disclose that material connection — the brand is responsible for ensuring compliance.",
    longAnswer:
      "The FTC's Endorsement Guides (16 CFR Part 255) require that any \"material connection\" between an endorser and a brand be disclosed. A material connection is anything of value — money, a free product, a discount, store credit, even a sweepstakes entry — that could reasonably affect what the endorser says.\n\nThe disclosure must be:\n• Clear and conspicuous — visible without scrolling, not buried in hashtag soup\n• Unambiguous — \"#ad\" or \"#sponsored\" works; \"#thanks @brand\" doesn't\n• Close to the endorsement — same post, same story, not in a bio link\n• In the same language as the endorsement\n\nThe 2023 update made one thing especially clear: brands are accountable for their endorsers' disclosures. \"I told them to disclose\" isn't a defense. You need to monitor, train, and have a paper trail.\n\nNon-compliance penalties have escalated. The FTC's 2024 Final Rule on fake reviews allows civil penalties up to $51,744 per violation. Fashion Nova paid $4.2M in 2022 for suppressing negative reviews. Sunday Riley paid $0 to the FTC but had to operate under a consent decree banning misleading reviews for 20 years.\n\nWhat compliance looks like in practice: every campaign brief tells the customer exactly which disclosure to use. The platform validates submissions before approving. There's a paper trail (timestamped submission, platform of post, exact disclosure used) you can produce if asked. Social Perks does all three by default — there's no \"compliance mode\" because compliance is the only mode.",
    keyPoints: [
      "Any \"material connection\" must be disclosed (discounts, free items, sweepstakes entries)",
      "Disclosure must be clear, conspicuous, and close to the endorsement",
      "Brands are accountable for endorser compliance — \"they were told to disclose\" isn't a defense",
      "Civil penalties up to $51,744 per violation under the 2024 Final Rule",
      "Keep a paper trail: campaign brief, submission timestamp, exact disclosure used",
    ],
    category: "ftc-compliance",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "is-it-legal-to-offer-discounts-for-instagram-posts",
        "can-i-pay-customers-for-google-reviews",
      ],
    },
    ctas: [
      {
        label: "Read our FTC compliance overview",
        href: "/faq",
      },
      {
        label: "Launch an FTC-safe campaign →",
        href: "/dashboard#signup",
      },
    ],
  },

  // ─── Tactics / How-to ──────────────────────────────────────────────
  {
    slug: "how-do-i-get-more-google-reviews-legally",
    question: "How do I get more Google reviews legally?",
    shortAnswer:
      "Ask in person, make it frictionless with a QR code or short link, and follow up via SMS — never offer compensation in exchange for the review itself.",
    longAnswer:
      "The legal path to more Google reviews is volume-of-asking, not pay-per-review. Most happy customers would leave a review if asked — they just don't think of it on their own. The bottleneck is the ask, not the willingness.\n\nThe four highest-leverage tactics:\n\n1. **Personal ask at the moment of delight.** When a customer compliments your business — \"this is the best latte I've had in weeks\" — that's the moment. \"Thank you — would you mind leaving us a Google review? It really helps.\" A direct ask at a peak moment converts 30–50% of the time.\n\n2. **QR code at the point of sale.** A small placard at the register with \"Loved your visit? Scan to leave a review →\" and a QR linking directly to your Google review form. The QR removes 3 steps of friction (search for business name → click reviews tab → tap write a review).\n\n3. **SMS or email follow-up.** Send a single message 24 hours after their visit: \"Hi Sarah, hope you enjoyed your coffee yesterday. If you have 30 seconds, a Google review would mean a lot: [short link]\". 8–15% conversion is normal for SMS, 2–5% for email.\n\n4. **Train your team to ask.** Add the ask to your closing script. Track who's asking — the staff member with the highest rate becomes the model.\n\nWhat you can NOT do: offer a discount, free item, raffle entry, or any compensation for the review itself. You CAN run a loyalty program or birthday discount that's unrelated to reviewing — many of those customers will leave reviews independently. The line is whether the incentive is tied to the act of reviewing.\n\nSocial Perks handles this on the *content* side — Instagram posts, TikTok videos, Facebook check-ins — where incentivization is legal. For Google reviews specifically, the tool ships QR codes and SMS reminder templates so you can run the legal version of the ask at scale.",
    keyPoints: [
      "Ask in person at the moment of delight (30–50% conversion)",
      "QR code at point-of-sale removes friction",
      "SMS follow-up 24h later (8–15% conversion)",
      "Never tie a discount, free item, or raffle entry to the review itself",
      "Loyalty programs unrelated to reviewing are legal — and many customers will review anyway",
    ],
    category: "tactics",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "can-i-pay-customers-for-google-reviews",
        "is-it-legal-to-offer-discounts-for-instagram-posts",
      ],
      industries: ["restaurants", "coffee-shops", "salons", "gyms", "dentists"],
      platformIds: ["go"],
    },
    ctas: [
      {
        label: "Get QR codes + SMS reminders →",
        href: "/dashboard#signup?plan=starter",
        rationale: "Starter plan includes printable QR codes and SMS reminders.",
      },
    ],
  },
  {
    slug: "how-much-discount-should-i-offer-for-an-instagram-post",
    question: "How much discount should I offer for an Instagram post?",
    shortAnswer:
      "10–20% off is the sweet spot for most small businesses. Match the discount to the effort: 10% for a story tag, 20% for a feed photo, 25–30% for a reel.",
    longAnswer:
      "The right discount has two inputs: how much effort the post requires and how much margin you can give back without breaking unit economics.\n\nEffort scale (from least to most):\n• Story tag (1-tap, disappears in 24h): ~10% off\n• Story location sticker + tag: ~10–12% off\n• Feed photo with mention: 15–20% off\n• Carousel post (2–10 images): 20% off\n• Reel (short video): 25–30% off\n• Live mention or collab post: 30%+\n\nMargin guardrails: if your gross margin on the average ticket is 60%, a 20% discount eats one-third of your margin. That's fine — the customer is delivering marketing worth 5–10x the discount value if their followers convert at typical rates. If your margin is 30% (common for retail), keep discounts at 10–15% or offer a free low-COGS add-on instead (a side, a sample, a drink upgrade).\n\nWhy not free? A free item often outperforms a percentage discount because the perceived value is higher than the COGS. A \"free latte for an Instagram story\" at a coffee shop costs you $0.50–$1 in materials but feels like a $5–$6 gift. That asymmetry is the highest-ROI offer structure for most independent retailers.\n\nFollower-tier bonuses: a customer with 10K followers delivers far more reach than one with 200. Reward accordingly — Social Perks uses tiered bonuses (Anyone, 500+, 2K+, 10K+, 50K+) so a single campaign can give the right discount to each customer automatically.\n\nWhat to avoid: discounts so deep they attract one-time hunters (35%+ tends to flip the dynamic). And percentage-off on a low-ticket item often nets less revenue than a free upsell.",
    keyPoints: [
      "Story tag: 10% — Feed photo: 15–20% — Reel: 25–30%",
      "Don't exceed 1/3 of your gross margin",
      "Free add-on often outperforms percentage discount (higher perceived value)",
      "Use follower-tier bonuses to reward higher-reach customers more",
      "Avoid 35%+ discounts — attract one-time hunters not loyal customers",
    ],
    category: "pricing",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "is-it-legal-to-offer-discounts-for-instagram-posts",
        "what-is-the-best-perk-to-offer-for-a-customer-review",
      ],
      industries: ["coffee-shops", "restaurants", "retail", "salons", "boutiques"],
      platformIds: ["ig"],
    },
    ctas: [
      {
        label: "See benchmark discounts by industry",
        href: "/benchmarks",
      },
      {
        label: "Launch a tiered-discount campaign →",
        href: "/dashboard#signup?plan=starter",
      },
    ],
  },
  {
    slug: "what-is-the-best-perk-to-offer-for-a-customer-review",
    question: "What is the best perk to offer for a customer review?",
    shortAnswer:
      "On Google/Yelp: no perk — review incentives are banned. On Instagram/TikTok/Facebook: a free low-cost item (a drink, side, or sample) outperforms a percentage discount because perceived value is higher than your COGS.",
    longAnswer:
      "First, separate platforms. Google, Yelp, and TripAdvisor prohibit any incentive tied to a review — you cannot legally offer one, and trying will get your business profile suspended. For those platforms, the answer is: ask better and more often, not pay more.\n\nFor Instagram, TikTok, Facebook, and other content platforms where incentives are legal (with disclosure), the perk structure matters more than the amount. Three formats, ranked by typical ROI:\n\n1. **Free low-COGS item.** A coffee shop offering a free latte for an Instagram story has a true cost of ~$0.80 (milk + syrup + cup). Perceived value to the customer: $5–$6. Customer gets a great deal, you get organic reach with great unit economics. This is the highest-ROI structure for most independent F&B and retail businesses.\n\n2. **Tiered discount (follower-based).** Default 10–15% for anyone, scaling to 25%+ for customers with 10K+ followers. A single campaign serves both your regulars (who get a modest discount but compound through repeat visits) and your higher-reach customers (who deliver outsized organic reach for a one-time bigger discount).\n\n3. **Flat percentage discount.** Simple, easy to communicate, but loses to the other two on margin and on engagement. Use as a fallback when free items aren't operationally feasible (e.g., service businesses, professional services).\n\nWhat to avoid:\n• Cash payouts — feel transactional, often run afoul of platform rules\n• Gift cards over $25 — IRS reporting threshold for some structures\n• Reward stacking with existing loyalty programs without clear rules — confuses customers and inflates redemption\n\nAcross 100+ campaigns we've seen, free-item offers convert at 2–3x the rate of equivalent-value percentage discounts and produce content with measurably higher engagement (the customer's followers see they got something special, not just a coupon).",
    keyPoints: [
      "Never incentivize Google, Yelp, or TripAdvisor reviews — banned",
      "Free low-COGS item beats percentage discount: higher perceived value, better unit economics",
      "Tiered discounts let one campaign reward both regulars AND high-reach customers",
      "Avoid cash payouts and gift cards over $25",
      "Free-item offers convert 2–3x better than equivalent-value percentage discounts",
    ],
    category: "tactics",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "how-much-discount-should-i-offer-for-an-instagram-post",
        "can-i-pay-customers-for-google-reviews",
        "how-do-i-get-more-google-reviews-legally",
      ],
      industries: ["restaurants", "coffee-shops", "bakeries", "retail"],
      platformIds: ["ig", "tt", "fb"],
    },
    ctas: [
      {
        label: "Browse perk benchmarks by industry",
        href: "/benchmarks",
      },
      {
        label: "Launch a free-item campaign →",
        href: "/dashboard#signup",
      },
    ],
  },

  // ─── Platform-specific ─────────────────────────────────────────────
  {
    slug: "how-do-i-get-user-generated-content-for-my-business",
    question: "How do I get user-generated content for my business?",
    shortAnswer:
      "Run a structured perk-for-post campaign: offer customers a small reward (free item or 10–20% off) for posting about your business on Instagram, TikTok, or Facebook with the FTC-required #ad disclosure.",
    longAnswer:
      "User-generated content (UGC) — photos, videos, posts, and reels created by your actual customers — is the highest-ROI marketing asset for any local business. It converts at 4–7x the rate of brand-created ads because viewers trust other customers more than they trust businesses.\n\nThe four-step playbook to generate it predictably:\n\n1. **Pick the platform that matches your customers.** Coffee shops and restaurants: Instagram first (food content gets the highest engagement of any category on the platform). Gyms and fitness: TikTok and Instagram Reels. Boutiques and retail: Instagram + Pinterest. Service businesses (salons, dentists, vets): Facebook works disproportionately well.\n\n2. **Pick the action that matches the platform.** On Instagram: story tag (easiest entry) → feed photo (more committed) → reel (highest-effort, highest-value). Match the perk to the effort.\n\n3. **Offer a perk that costs you less than the content is worth.** A free side dish costs the restaurant $1–$2 and produces a piece of content the restaurant would otherwise pay a photographer $50–$200 to create. The economics are obscenely good if you can systematize the ask.\n\n4. **Make it dead simple to redeem.** A printed QR code at the table or counter. The QR opens a page that says: \"Post about us on Instagram, show your server, get a free [item].\" The customer doesn't need an account, an app, or anything else.\n\nWhat trips most businesses up: forgetting the FTC disclosure (the customer must use #ad), and not having a system to verify the post actually happened before redeeming. Social Perks handles both — every campaign auto-injects the right disclosure for the platform, and a server-side verifier checks the post exists and matches before the perk can be redeemed.",
    keyPoints: [
      "UGC converts 4–7x better than brand-created ads",
      "Match platform to customer base (F&B → Instagram, fitness → TikTok)",
      "Match perk to effort (story tag = small, reel = bigger)",
      "Free low-COGS item beats percentage discount on unit economics",
      "Always include #ad disclosure (FTC requirement)",
      "Verify the post happened before redeeming the perk",
    ],
    category: "tactics",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "how-much-discount-should-i-offer-for-an-instagram-post",
        "what-is-the-best-perk-to-offer-for-a-customer-review",
        "is-it-legal-to-offer-discounts-for-instagram-posts",
      ],
      industries: ["restaurants", "coffee-shops", "gyms", "boutiques", "salons"],
      platformIds: ["ig", "tt", "fb"],
    },
    ctas: [
      {
        label: "Run a UGC campaign →",
        href: "/dashboard#signup?plan=starter",
        rationale: "Starter plan covers up to 500 customer-generated posts/month.",
      },
      {
        label: "Browse UGC campaign templates",
        href: "/actions",
      },
    ],
  },
  {
    slug: "how-much-do-influencers-charge-for-instagram-posts",
    question: "How much do influencers charge for Instagram posts?",
    shortAnswer:
      "Roughly $10 per 1,000 followers for a static feed post, $20 per 1,000 for a Reel — but micro-influencers (1K–10K followers) often work for free product or 20–30% off in exchange for one post.",
    longAnswer:
      "The going rate for sponsored Instagram content scales with follower count, but the curve is not linear and the price-per-post varies more by engagement rate than by raw reach.\n\nA rough industry benchmark by tier:\n\n• **Nano (1K–10K followers):** $25–$100/post, or free product / store credit. Often the best ROI for local businesses — high engagement rates (3–8%), real local relevance, willing to barter.\n• **Micro (10K–100K):** $100–$500/post. Engagement still strong (1.5–3%). The sweet spot for most small-business budgets.\n• **Mid-tier (100K–500K):** $500–$5,000/post. Engagement drops to 1–1.5%. Better for category awareness than direct foot traffic.\n• **Macro (500K–1M):** $5,000–$15,000/post.\n• **Mega (1M+):** $15,000+, often substantially more.\n\nReels typically command 1.5–2x the rate of static feed posts. Stories are cheaper but shorter-lived (~50% of static post rate).\n\nWhat matters more than tier: **engagement rate** (likes + comments / followers). A 5K-follower account with 8% engagement reaches more real people than a 50K account with 0.5% engagement, and pays a fraction of the cost.\n\nThe alternative most local businesses miss: your existing customers ARE micro-influencers, with the added advantage that they actually like you. A regular with 2,500 followers who posts about your coffee shop produces more authentic, higher-converting content than a paid influencer who's never been there. Social Perks is built around this — you offer a perk, they post, you pay only when the post happens, and your existing customer relationship is the trust signal that no paid post can manufacture.",
    keyPoints: [
      "Rough benchmark: $10 per 1,000 followers for static, $20 per 1,000 for Reels",
      "Nano-influencers (1K–10K) work for free product or store credit",
      "Engagement rate matters more than raw follower count",
      "5K @ 8% engagement reaches more real people than 50K @ 0.5%",
      "Your existing customers often outperform paid influencers — they actually like you",
    ],
    category: "pricing",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "how-much-discount-should-i-offer-for-an-instagram-post",
        "what-is-the-best-perk-to-offer-for-a-customer-review",
      ],
      platformIds: ["ig"],
    },
    ctas: [
      {
        label: "See the pricing oracle for influencer rates",
        href: "/pricing-oracle",
      },
      {
        label: "Skip influencers, reward customers →",
        href: "/dashboard#signup",
      },
    ],
  },

  // ─── Getting started ───────────────────────────────────────────────
  {
    slug: "how-do-i-start-a-customer-rewards-program",
    question: "How do I start a customer rewards program for my small business?",
    shortAnswer:
      "Pick one platform your customers actually use, define one specific action you want them to take, set a perk that costs you less than the value of that action, and put a QR code where customers will see it. That's it.",
    longAnswer:
      "Most rewards programs fail because they try to do too much at once. The version that actually works is shockingly small:\n\n**Step 1: Pick one platform.** Don't try to launch on Instagram, TikTok, and Google simultaneously. Pick the one where most of your customers already spend time. For most independent retail and F&B: Instagram. For fitness: Instagram + TikTok. For service businesses (dentists, vets, salons): Facebook + Google.\n\n**Step 2: Define one action.** Not \"share us on social media.\" Specifically: \"Post a story tagging @yourshop\" or \"Leave a Google review.\" Vague asks get vague results. The more specific, the higher the completion rate.\n\n**Step 3: Pick one perk.** A free side, 15% off the next visit, a buy-one-get-one. One offer. Resist the urge to have tiers or rules on day one.\n\n**Step 4: Make the ask visible.** Print a QR code. Put it on the table, the counter, the receipt, the bathroom mirror — wherever customers' eyes go. A reward customers don't know about doesn't exist.\n\n**Step 5: Verify and redeem.** When the customer says they posted, look at their phone (or have a verifier check automatically). Approve the perk. Track who redeemed.\n\nThe whole loop should fit on a 3x5 card. Get that working, measure for a month (how many customers asked? how many posted? what was the cost per post? did sales go up?), then add a second campaign.\n\nThe two failure modes to avoid: (1) launching without a way to verify the action actually happened (you'll get fraud), and (2) launching with no visibility (the QR code at the register that no one sees). Social Perks bakes both into the platform — auto-verification on the post side, printable QR codes designed for visibility on the customer side.",
    keyPoints: [
      "Pick ONE platform, ONE action, ONE perk to start",
      "Vague asks fail — be specific (\"post a story tagging us\" not \"share on social\")",
      "Make the QR code visible — table tents, receipts, counter signs",
      "Verify the post happened before redeeming the perk",
      "Run for a month, measure, then add a second campaign",
    ],
    category: "getting-started",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "how-do-i-get-user-generated-content-for-my-business",
        "what-is-the-best-perk-to-offer-for-a-customer-review",
      ],
      industries: ["restaurants", "coffee-shops", "salons", "gyms", "retail"],
    },
    ctas: [
      {
        label: "Start your first campaign free →",
        href: "/dashboard#signup",
        rationale: "Free plan covers 50 completions/month — enough to test the whole loop.",
      },
      {
        label: "Browse campaign templates by industry",
        href: "/for",
      },
    ],
  },
  {
    slug: "what-is-the-difference-between-influencer-marketing-and-customer-marketing",
    question: "What is the difference between influencer marketing and customer marketing?",
    shortAnswer:
      "Influencer marketing pays strangers with audiences to talk about you. Customer marketing rewards your existing customers — who already like you and have local credibility — for doing the same thing, usually at a fraction of the cost.",
    longAnswer:
      "The two strategies attack the same problem (social proof + reach) from opposite ends.\n\n**Influencer marketing:** you identify someone with a relevant audience, pay them or send them product, and they post about you. The transaction is upfront, the relationship is transactional. Pros: scale (one mid-tier influencer reaches more people than 100 customers combined), production quality (they know how to make content), brand cachet. Cons: cost ($100–$15,000+ per post depending on tier), trust risk (audiences increasingly tune out paid posts), and a one-shot dynamic — the post goes up, the audience scrolls past, the relationship ends.\n\n**Customer marketing (perk-for-post):** you offer a small reward — a free item, a discount — to your actual customers in exchange for posting. The transaction is small, the relationship is ongoing (they're still your customer). Pros: dramatically lower cost per post ($1–$5 in true COGS for a free-item perk), higher trust (their followers know them personally), repeatability (the same customer can post 3, 5, 10 times over a year), and local relevance (their network is literally your trade area). Cons: lower per-post reach (a 2K-follower customer reaches less than a 50K influencer), production quality varies, you can't pick exactly who posts.\n\nFor most local businesses, customer marketing has a 5–10x better ROI for one reason: the people who already buy from you have the same demographic as the people you want to buy from you. Their followers are your future customers. An influencer's followers might be — but probably aren't — in your trade area.\n\nThe right answer for most independent businesses isn't either/or — it's customer marketing as the always-on engine, with occasional influencer collabs for product launches or brand moments when you need the production polish.",
    keyPoints: [
      "Influencer marketing: pay strangers with audiences ($100–$15,000+/post)",
      "Customer marketing: reward your existing customers ($1–$5 true cost per post)",
      "Customers have higher trust + local relevance — their followers are your trade area",
      "Customer marketing wins for ongoing ROI; influencers are better for launches",
      "Most local businesses see 5–10x better ROI from customer marketing",
    ],
    category: "comparison",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "how-much-do-influencers-charge-for-instagram-posts",
        "how-do-i-get-user-generated-content-for-my-business",
        "how-do-i-start-a-customer-rewards-program",
      ],
    },
    ctas: [
      {
        label: "Set up customer marketing in 5 min →",
        href: "/dashboard#signup",
      },
      {
        label: "Compare alternatives",
        href: "/compare",
      },
    ],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────

export const ANSWER_SLUGS = ANSWERS.map((a) => a.slug);

export const ANSWERS_BY_SLUG = new Map(ANSWERS.map((a) => [a.slug, a]));

export const ANSWERS_BY_CATEGORY: Record<AnswerCategory, AnswerPage[]> = {
  legality: ANSWERS.filter((a) => a.category === "legality"),
  "ftc-compliance": ANSWERS.filter((a) => a.category === "ftc-compliance"),
  "platform-rules": ANSWERS.filter((a) => a.category === "platform-rules"),
  pricing: ANSWERS.filter((a) => a.category === "pricing"),
  tactics: ANSWERS.filter((a) => a.category === "tactics"),
  comparison: ANSWERS.filter((a) => a.category === "comparison"),
  "getting-started": ANSWERS.filter((a) => a.category === "getting-started"),
};

export const CATEGORY_META: Record<AnswerCategory, { label: string; description: string }> = {
  legality: {
    label: "Is it legal?",
    description: "What you can and can't do under Google, Yelp, and platform rules.",
  },
  "ftc-compliance": {
    label: "FTC compliance",
    description: "Endorsement disclosure rules, penalties, and how to stay safe.",
  },
  "platform-rules": {
    label: "Platform rules",
    description: "Instagram, TikTok, Facebook, and YouTube policies on incentivized content.",
  },
  pricing: {
    label: "Pricing & perks",
    description: "How much to offer, what kind of perk, and follower-tier strategy.",
  },
  tactics: {
    label: "Tactics & how-to",
    description: "Specific plays for getting reviews, posts, and customer marketing wins.",
  },
  comparison: {
    label: "Comparisons",
    description: "Customer marketing vs. influencers, paid ads, and other channels.",
  },
  "getting-started": {
    label: "Getting started",
    description: "First-campaign basics for businesses new to perk-for-post marketing.",
  },
};

export function getAnswerBySlug(slug: string): AnswerPage | undefined {
  return ANSWERS_BY_SLUG.get(slug);
}
