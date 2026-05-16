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

  // ─── Platform-specific rules ───────────────────────────────────────
  {
    slug: "what-are-tiktoks-rules-on-paid-product-placement",
    question: "What are TikTok's rules on paid product placement?",
    shortAnswer:
      "TikTok requires creators to toggle on \"Branded Content\" for any post made in exchange for compensation. Failing to disclose risks post removal and account restrictions.",
    longAnswer:
      "TikTok's Branded Content Policy is straightforward: any post created in exchange for payment, free product, discounts, or other compensation must be marked with the Branded Content toggle in the post settings. The toggle automatically adds a \"Paid partnership\" label visible to viewers.\n\nWhat counts as compensation:\n• Cash payments\n• Free products to keep\n• Discounts and store credit\n• Sweepstakes entries or giveaways\n• Long-term partnerships, ambassador programs\n\nThe toggle is non-negotiable for two reasons. First, FTC rules require it regardless of TikTok's policy. Second, TikTok automatically promotes Branded Content posts less aggressively in the algorithm — but the platform reserves the right to remove undisclosed sponsored content entirely, and repeat offenders lose access to the Creator Marketplace.\n\nProhibited categories: TikTok bans branded content for tobacco, alcohol (in some regions), drugs, weapons, financial products, political advertising, and dating services. Even if disclosed, posts in these categories can't carry the Branded Content tag.\n\nFor small businesses running perk-for-post campaigns: every campaign brief should tell the customer exactly to enable the Branded Content toggle before posting. \"Tag us in your post\" isn't enough — without the toggle, both you and the customer are in violation.\n\nSocial Perks injects this instruction automatically into every TikTok campaign brief. Submissions are verified to confirm the Branded Content label is present before the perk is released.",
    keyPoints: [
      "Branded Content toggle is REQUIRED for any compensated post",
      "Free products, discounts, and store credit all count as compensation",
      "Posts without the toggle can be removed; repeat offenders lose Creator Marketplace access",
      "Algorithm de-prioritizes branded content slightly — but the legal alternative is worse",
      "Banned categories: tobacco, alcohol (some regions), drugs, weapons, financial, political",
    ],
    category: "platform-rules",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "is-it-legal-to-offer-discounts-for-instagram-posts",
        "what-is-the-ftc-rule-on-incentivized-reviews",
      ],
      platformIds: ["tt"],
    },
    ctas: [
      {
        label: "Launch a TikTok campaign with auto-disclosure →",
        href: "/dashboard#signup?plan=starter",
      },
    ],
  },
  {
    slug: "what-is-youtubes-policy-on-paid-product-placement",
    question: "What is YouTube's policy on paid product placement?",
    shortAnswer:
      "YouTube requires creators to enable \"Includes paid promotion\" in the video upload settings AND to disclose the relationship verbally or on-screen within the first 30 seconds.",
    longAnswer:
      "YouTube's paid product placement rules sit on top of FTC requirements, and both must be satisfied. Two specific actions are required:\n\n1. **YouTube checkbox.** During upload, under Advanced Settings, check the \"Includes paid promotion\" box. This adds a yellow \"Includes paid promotion\" banner at the start of the video.\n\n2. **In-video disclosure.** The checkbox alone isn't enough — FTC rules require the disclosure be clear and conspicuous. In practice that means either:\n   • Verbal disclosure (\"Today's video is sponsored by [business]\") within the first 30 seconds\n   • On-screen text overlay (\"Sponsored\" / \"Paid partnership\") visible in the first 30 seconds\n   • Both, for maximum safety\n\nThe checkbox + first-30-seconds rule reflects how viewers consume YouTube: many drop off before the description loads, and a disclosure buried in the description doesn't satisfy the \"conspicuous\" standard.\n\nProhibited content categories overlap with TikTok and Instagram: no paid product placement for alcohol (some markets), tobacco, drugs, weapons, gambling, or political content. Election ads have their own separate rules and require additional verification.\n\nSpecial cases for small businesses:\n• **Shorts** follow the same rules as regular videos despite being under 60 seconds. Disclose within the first ~10 seconds for Shorts.\n• **Live streams** can disclose verbally at the start; the checkbox still applies to the saved VOD.\n• **Members-only content** still requires disclosure even though viewership is restricted.\n\nFor small-business perk-for-video campaigns, the campaign brief should explicitly require both the checkbox AND on-screen text. A single missed disclosure can result in monetization being pulled from the video by YouTube, which makes the creator unhappy and won't be repeated.",
    keyPoints: [
      "Two things required: \"Includes paid promotion\" checkbox AND in-video disclosure",
      "Disclosure must be within first 30 seconds (10 seconds for Shorts)",
      "Description-only disclosure doesn't count — must be visible while viewing",
      "Banned categories: alcohol (some markets), tobacco, drugs, weapons, gambling, political",
      "Missing the disclosure can result in YouTube pulling monetization from the video",
    ],
    category: "platform-rules",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "is-it-legal-to-offer-discounts-for-instagram-posts",
        "what-is-the-ftc-rule-on-incentivized-reviews",
      ],
      platformIds: ["yt"],
    },
    ctas: [
      {
        label: "Run a YouTube campaign with auto-compliance →",
        href: "/dashboard#signup?plan=starter",
      },
    ],
  },
  {
    slug: "can-i-run-an-instagram-giveaway-legally",
    question: "Can I run an Instagram giveaway legally?",
    shortAnswer:
      "Yes — but giveaways must follow Instagram's promotion rules and US sweepstakes law, which means no purchase required, official rules posted, and disclosure if you involve influencers.",
    longAnswer:
      "Instagram giveaways are legal in the US but operate under three overlapping rule sets:\n\n**1. Instagram's Promotion Guidelines.** Instagram requires that you (a) acknowledge that the promotion is in no way sponsored, endorsed or administered by Instagram, (b) provide official rules, terms, and eligibility requirements (e.g., age and residency), and (c) comply with applicable rules and regulations. Failing to include the \"not endorsed by Instagram\" disclaimer is the most common violation.\n\n**2. Sweepstakes vs. lottery distinction.** In the US, a lottery (illegal without a state license) has three elements: prize, chance, AND consideration. A sweepstakes drops the consideration element — there's no purchase required to enter. To stay on the legal side, never require a purchase to enter your giveaway. Liking a post, following an account, and tagging a friend are all considered \"de minimis\" effort and aren't legal consideration in most US states. Requiring a paid product purchase IS consideration and makes it an illegal lottery in most jurisdictions.\n\n**3. FTC disclosure.** If you partner with an influencer or pay anyone to promote the giveaway, both the partnership AND the giveaway entry mechanic need clear disclosure.\n\nState-by-state variation: a handful of states (notably Florida, New York, Rhode Island) have additional registration and bonding requirements for prizes over a certain value (typically $5,000). Most small-business giveaways stay well below that threshold.\n\nWhat to include in your official rules:\n• Sponsor name and address\n• Eligibility (age, US-only or specific states)\n• Start and end dates with timezone\n• How winners are selected (random drawing recommended)\n• Prize description and approximate retail value\n• How and when winners will be notified\n• \"This promotion is not affiliated with or sponsored by Instagram\"\n\nAlternative that avoids all this complexity: instead of a giveaway, offer a guaranteed perk for posting (\"every customer who posts gets a free latte\"). No randomness, no lottery question, just an incentive — which is the model Social Perks is built around.",
    keyPoints: [
      "Legal but follows Instagram's rules + US sweepstakes law",
      "Never require a purchase to enter (creates an illegal lottery in most states)",
      "Must include \"not affiliated with Instagram\" disclaimer",
      "Need official rules: sponsor, eligibility, dates, winner selection, prize value",
      "FL, NY, RI have additional registration if prizes are over ~$5,000",
      "Guaranteed perk-for-post is simpler and skips sweepstakes law entirely",
    ],
    category: "legality",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "is-it-legal-to-offer-discounts-for-instagram-posts",
        "what-is-the-best-perk-to-offer-for-a-customer-review",
      ],
      platformIds: ["ig"],
    },
    ctas: [
      {
        label: "Run a guaranteed-perk campaign instead →",
        href: "/dashboard#signup",
        rationale: "Skip the giveaway paperwork — guaranteed perks aren't sweepstakes.",
      },
    ],
  },

  // ─── Tactics expansion ─────────────────────────────────────────────
  {
    slug: "how-do-i-ask-a-customer-for-an-instagram-post",
    question: "How do I ask a customer for an Instagram post?",
    shortAnswer:
      "Ask at the peak moment (when they say they love it), make the perk crystal clear, give them the exact hashtag and handle to use, and have a QR code that opens the campaign details.",
    longAnswer:
      "The ask succeeds or fails based on timing, specificity, and friction. Five components of an ask that converts:\n\n**1. Time the ask to the peak emotion.** When a customer says \"this is amazing\" or \"oh my god this latte\" — that's the window. Not at the door on the way out. Not in a follow-up email. Right then, in the next 30 seconds.\n\n**2. Lead with the perk, not the ask.** \"Want a free latte next time you come in? Post a story tagging us — we'll handle the rest.\" The perk goes first because that's what they hear. The ask is the price, and the price feels smaller when the offer is clear.\n\n**3. Be exact about what you want.** \"Post a story tagging @yourshop and using #shopnameperk.\" Not \"share us on social.\" Specificity is the difference between 5% completion and 40%. Print the exact tag and hashtag on a small card you can hand them.\n\n**4. Remove every step of friction.** A QR code on the table. They scan, they see your handle, they tap directly into Instagram Stories with you pre-tagged. You should have to type nothing. Three taps from scan to post.\n\n**5. Make the redemption painless.** When they post and show their server, that's it. No \"come back tomorrow to claim,\" no \"sign up for our app first.\" Free latte, right now. The whole loop should take under 90 seconds from ask to perk.\n\nWhat NOT to do:\n• Don't ask in writing without context (Mailchimp blast, signage alone). Conversion is 10x lower.\n• Don't make the customer install an app or create an account first.\n• Don't ask for too much in the first post (carousel + caption + 5 hashtags + tag). One simple action.\n• Don't combine the ask with other CTAs (newsletter signup, loyalty enrollment). One thing at a time.\n\nMeasured conversion rates from Social Perks campaigns: in-person ask + QR code + free-item perk = 38–55% completion. Same campaign with signage only and no in-person ask = 6–11%.",
    keyPoints: [
      "Ask at the peak emotion moment, not at the door on the way out",
      "Lead with the perk (\"free latte\"), not the ask (\"post a story\")",
      "Be specific: exact handle, exact hashtag, exact action",
      "QR code that opens Instagram Stories with you pre-tagged",
      "Redeem on the spot — don't ask them to come back later",
      "In-person ask converts 5-10x better than signage alone",
    ],
    category: "tactics",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "how-do-i-get-user-generated-content-for-my-business",
        "how-much-discount-should-i-offer-for-an-instagram-post",
        "how-do-i-start-a-customer-rewards-program",
      ],
      industries: ["coffee-shops", "restaurants", "bakeries", "salons"],
      platformIds: ["ig"],
    },
    ctas: [
      {
        label: "Get the printable QR + script kit →",
        href: "/dashboard#signup",
      },
    ],
  },
  {
    slug: "why-isnt-my-customer-campaign-getting-submissions",
    question: "Why isn't my customer campaign getting submissions?",
    shortAnswer:
      "Almost always one of three things: customers can't see the offer, the offer is unclear, or the friction to redeem is too high. Fix in that order.",
    longAnswer:
      "A campaign that gets zero submissions usually has a diagnosable problem. In order of likelihood:\n\n**1. Visibility.** The QR code is on a stack of menus no one reads. The table tent is next to the ketchup. The link is in your bio that no one visits. Customers cannot redeem an offer they don't know exists. Fix: put the offer at the moment-of-payment, where every customer's eyes already are. Receipt printouts, payment terminal display, post-purchase email.\n\n**2. Clarity.** The customer reads the offer and thinks \"wait, what do I do?\" If the ask is \"engage with us on social media,\" no one engages. If the ask is \"post a story tagging @yourshop for a free latte,\" people post. Specificity wins. Use exact handle, exact action, exact reward.\n\n**3. Friction.** Even if they see it and understand it, every extra step kills conversion. Common friction points: \"download our app first,\" \"create an account,\" \"come back tomorrow to claim,\" \"valid only Tuesdays.\" Strip all of it. The fewer steps between ask and reward, the higher the completion rate.\n\n**4. The perk is too small.** A 5% discount for a 30-second video isn't worth the customer's effort. Rule of thumb: the perceived value of the perk should be 3-5x the effort. A free $5 item for a 30-second story is the sweet spot for most F&B and retail businesses.\n\n**5. The perk is too big.** Counterintuitive, but a 50% discount or a free $20 item attracts deal-hunters, not advocates. They post the minimum required, often with low-quality content, then never come back. 10-25% discounts and small free items produce higher-quality content from higher-quality customers.\n\n**6. Wrong platform.** If your customers are 35-year-old parents and your campaign asks for TikTok videos, you'll get nothing. Check where your customers actually post — for most F&B/retail, that's Instagram first.\n\n**7. Wrong moment.** Asking for a video review at 7am during a coffee rush will fail. Asking at 11am on a Saturday brunch is different. Match the ask to the customer's actual headspace.\n\nIf you've got more than 2 weeks and fewer than 5 submissions, walk into your business and try to redeem the perk yourself as a customer would. If you can't find the offer, can't figure out what to do, or hit any friction, that's your fix.",
    keyPoints: [
      "Visibility first: put the offer where eyes already go (receipt, terminal, table)",
      "Clarity: \"post a story tagging us\" beats \"engage with us\" by 10x",
      "Strip friction: no app downloads, no \"come back tomorrow,\" no day restrictions",
      "Perk size: 3-5x perceived value vs effort — too small fails, too big attracts deal-hunters",
      "Right platform for your customers (most F&B = Instagram, not TikTok)",
      "Walk in and try to redeem your own offer — that's the debug",
    ],
    category: "tactics",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "how-do-i-ask-a-customer-for-an-instagram-post",
        "how-do-i-start-a-customer-rewards-program",
        "how-much-discount-should-i-offer-for-an-instagram-post",
      ],
    },
    ctas: [
      {
        label: "Audit your campaign with our setup checklist →",
        href: "/dashboard#signup",
      },
    ],
  },
  {
    slug: "how-do-i-verify-a-customer-actually-posted",
    question: "How do I verify a customer actually posted before giving the perk?",
    shortAnswer:
      "Three options ranked by accuracy: (1) automated platform verification via the public post URL, (2) screenshot review by your staff, (3) honor system. Use automated for scale, screenshot for low volume.",
    longAnswer:
      "Verification matters because without it you'll either get fraud (customer claims to have posted, didn't) or you'll over-trust and lose the data trail when you need it (FTC dispute, refund question, internal audit).\n\nThree levels of verification, from most rigorous to least:\n\n**1. Automated platform verification.** The customer pastes their post URL into your redemption form. Your system fetches the public post page and confirms (a) the post exists, (b) it tags your handle, (c) it contains the required hashtag or disclosure. This is the gold standard for scale — works for Instagram (feed posts and reels, not stories), TikTok (public videos), YouTube, X.\n\nLimitations: Instagram stories disappear in 24h and can't be verified after the fact, so for story campaigns you need real-time verification (screenshot at point of redemption) or trust-based redemption with random audits.\n\n**2. Screenshot review by staff.** Customer shows their phone to your server/barista, who eyeballs: did they tag the right handle? Use the right hashtag? Then approve in your system. Fast for low volume (under ~20 redemptions/day), error-prone above that. Works for any platform including ephemeral stories.\n\n**3. Honor system + random audits.** Customer says they posted, you redeem the perk, you randomly verify 10% of redemptions later. Lowest friction, highest fraud rate. Only reasonable if your perks are very small (free side, $1 discount) where the fraud math doesn't justify checking.\n\nFraud rate benchmarks: with no verification, 15-30% of \"redemptions\" are fraudulent (customer never posted). With staff screenshot review, 2-5%. With automated platform verification, under 1% — almost all of that is sophisticated bot networks rather than individual customers.\n\nFor most small businesses, the right mix is automated verification on feed posts and reels (where it works cleanly) plus screenshot review for stories (which expire). Social Perks runs the automated layer on every submission and surfaces the screenshot path for staff redemption of story-based campaigns.",
    keyPoints: [
      "Automated verification: best for feed posts, reels, videos (≤1% fraud)",
      "Staff screenshot review: works for ephemeral stories (2-5% fraud)",
      "Honor system: only safe for very small perks (15-30% fraud)",
      "Instagram stories expire in 24h — verify at point of redemption",
      "Without any verification you'll see 15-30% fraudulent redemptions",
    ],
    category: "tactics",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "how-do-i-get-user-generated-content-for-my-business",
        "why-isnt-my-customer-campaign-getting-submissions",
      ],
    },
    ctas: [
      {
        label: "Use built-in post verification →",
        href: "/dashboard#signup",
        rationale: "Automated verification on every submission — no manual checks needed.",
      },
    ],
  },
  {
    slug: "how-do-i-handle-negative-google-reviews",
    question: "How do I handle a negative Google review for my small business?",
    shortAnswer:
      "Respond publicly within 24-48 hours, acknowledge the customer's experience without being defensive, offer to fix it offline, and never argue. Then flood the page with new positive reviews from happy customers.",
    longAnswer:
      "Negative reviews are inevitable. How you respond is what shapes future customers' impression — they read your replies more carefully than they read the review itself. A good response can turn a 1-star reviewer into a returning customer; a bad one will lose you ten future customers.\n\n**The response template that works:**\n\n1. **Acknowledge specifically.** \"Hi [Name], thank you for taking the time to share this — I'm sorry your latte was cold on Tuesday morning.\" Quoting the specific complaint shows you read it.\n\n2. **Own it without excuses.** \"That's not the experience we want any guest to have.\" Skip the \"we were short-staffed\" or \"this is unusual\" — those read as defensive, not accountable.\n\n3. **Offer a private resolution path.** \"Please email me at [direct email] so I can make this right.\" Don't try to litigate the situation in the public reply.\n\n4. **Sign with your name.** \"— Sarah, Owner\". A real name signals a real person, not corporate boilerplate.\n\nThat's it. Don't apologize five times, don't explain how this never happens, don't tag the reviewer's friends. Future customers want to see that you can absorb feedback without becoming defensive — that's the signal that closes the next sale.\n\n**When to flag a review for removal:** Google removes reviews that violate its policies — spam, conflict of interest (competitor leaving a review), off-topic content, content from someone who clearly wasn't a customer, profanity, or personal attacks. \"My experience was bad and the food was overpriced\" is NOT removable, even if it feels unfair. \"This place serves rats\" with no evidence often is. Flag the review through Google Business Profile → Reviews → the three-dot menu.\n\n**The structural fix:** A 4.2 rating with 200 reviews looks more trustworthy than a 4.8 with 12. The defense against the next bad review is more good reviews. Run a legal review-request campaign (ask in person, QR code at register, SMS follow-up) and the next 1-star slides from \"the lone signal\" to \"the outlier.\"",
    keyPoints: [
      "Respond within 24-48 hours, never argue, take it offline",
      "Acknowledge the specific complaint — \"sorry your latte was cold\" not \"sorry you had a bad experience\"",
      "Sign with your real name and title — signals a real person",
      "Future customers read your replies more than the review itself",
      "Google will remove off-topic, fake, or policy-violating reviews — not just unfair ones",
      "Best defense is more reviews: 4.2 with 200 beats 4.8 with 12",
    ],
    category: "tactics",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "how-do-i-get-more-google-reviews-legally",
        "can-i-pay-customers-for-google-reviews",
      ],
      platformIds: ["go"],
    },
    ctas: [
      {
        label: "Get the legal review-ask system →",
        href: "/dashboard#signup",
      },
    ],
  },
  {
    slug: "how-long-does-customer-marketing-take-to-work",
    question: "How long does customer marketing take to work?",
    shortAnswer:
      "First submissions within days, meaningful local-reach effects in 4-8 weeks, compounding word-of-mouth flywheel after 3-6 months. Faster than ads, slower than discounts. Stickier than both.",
    longAnswer:
      "Customer marketing doesn't spike like a paid ad campaign and doesn't tank like a discount once it ends. The timeline has three phases:\n\n**Phase 1: First submissions (days 1-14).** As soon as you've put the offer somewhere visible and asked a few customers in person, submissions start. Don't be surprised if the first week is slow — your team is learning the ask, customers are learning the offer exists. By day 7-10 you should see 5-15 submissions per week for a typical coffee shop. If you're seeing zero, debug visibility, clarity, and friction in that order (see our \"why isn't my campaign getting submissions\" answer).\n\n**Phase 2: Local reach effects (weeks 4-8).** This is when the math starts working. A customer with 500 followers who posts a story tagging you reaches maybe 80-150 real people in your local area. If 5 customers per week post, that's 400-750 local impressions weekly — and they're warm impressions from a trusted source, not paid ads. By week 6, you should see a measurable uptick in new-customer conversations (\"my friend posted about you\") at the counter. This is the leading indicator.\n\n**Phase 3: Flywheel (months 3-6+).** The customers who post once tend to post again. The ones who try you because a friend posted often become customers who post about their experience. Compounding. The math: if every 10 posts produces 1 new customer who also eventually posts, you have a sub-1.0 viral coefficient — but each cycle takes weeks, not seconds, so the math compounds slowly and durably. By month 6 you should see a meaningful share of your new customers attributing their first visit to social posts.\n\n**Compared to paid ads:** Ads spike day 1, customers come in, ads stop, customers stop. Customer marketing builds an asset (a stream of UGC + word-of-mouth) that persists when you stop investing.\n\n**Compared to deep discounts:** A 50% off promotion fills tables this week and trains customers to wait for the next discount. Customer marketing produces full-price visits AND content.\n\n**What kills the flywheel before it starts:** changing the offer every two weeks (no consistency), tying it to days/times that confuse customers (\"Tuesdays only\"), or launching without verification and getting burned by fraud. Pick one offer, run it for 60 days, then iterate.",
    keyPoints: [
      "First submissions in days, not months",
      "Real local reach effects start at 4-8 weeks",
      "Flywheel compounding from 3-6 months onward",
      "Faster ROI than ads stopping, more durable than discounts ending",
      "Pick one offer and run it 60 days before iterating",
    ],
    category: "getting-started",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "how-do-i-start-a-customer-rewards-program",
        "what-is-the-difference-between-influencer-marketing-and-customer-marketing",
      ],
    },
    ctas: [
      {
        label: "Start your 60-day flywheel free →",
        href: "/dashboard#signup",
      },
    ],
  },

  // ─── Pricing / financial questions ─────────────────────────────────
  {
    slug: "are-customer-perks-tax-deductible",
    question: "Are customer perks and rewards tax-deductible for my business?",
    shortAnswer:
      "Yes — customer perks are typically deductible as advertising or promotional expenses on Schedule C (sole prop) or as Marketing Expense on a corporate return. Talk to your CPA about your specific structure.",
    longAnswer:
      "For most US small businesses, perks given to customers in exchange for marketing actions (Instagram posts, reviews, referrals) are deductible as advertising and promotion expense. This includes:\n\n• Free products given as part of a campaign (deducted at COGS)\n• Discounts (already reduce revenue, so the deduction is automatic)\n• Cash back paid to customers (deduct as marketing expense; report on 1099-NEC if >$600 to one person in a year)\n• Gift cards (deduct as marketing expense; same 1099 threshold)\n\nWhere to put it on the tax forms:\n• **Sole proprietor / single-member LLC:** Schedule C, Line 8 (Advertising)\n• **S-corp / C-corp / multi-member LLC:** Marketing / Advertising line item on the corporate return\n\nWhat trips small businesses up:\n\n**1. 1099 reporting threshold.** If you pay any single individual more than $600 in cash, gift cards, or cash-equivalent rewards in a tax year, you must issue them a 1099-NEC and report it to the IRS. This applies to influencers and high-volume customer-marketers. Track per-person totals or your bookkeeper will scream in January.\n\n**2. Cost of goods sold vs. marketing expense.** A free latte you give for an Instagram post — is the cost recorded as reduced COGS (the materials cost) or as marketing expense (the retail value)? Most accountants prefer COGS at materials cost, which is more conservative and easier to defend. The retail value goes nowhere — it never hit your revenue.\n\n**3. Sales tax on free items.** In some states (notably California, Texas, New York, Washington), you owe sales tax on the FMV of products given away as promotional items, even if no money changed hands. Check your state's rules; this can be a meaningful expense at volume.\n\n**4. Self-dealing.** You can't give yourself or your immediate family a \"customer perk\" and deduct it. The IRS calls this out specifically for closely-held businesses.\n\nThis is not legal or tax advice — talk to your CPA, especially if you're running high-volume perks, doing influencer payments, or operating in states with promotional sales tax rules.",
    keyPoints: [
      "Yes, deductible as advertising/promotional expense on Schedule C or corporate return",
      "Track per-person totals — issue 1099-NEC if any one person gets >$600/year",
      "Free items: deduct at COGS (materials), not retail value",
      "Some states (CA, TX, NY, WA) charge sales tax on FMV of free promotional items",
      "You can't deduct perks given to yourself or immediate family",
      "Get a CPA's opinion if you're doing this at scale",
    ],
    category: "pricing",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "do-i-have-to-issue-a-1099-for-customer-rewards",
        "what-is-the-average-roi-of-customer-marketing-campaigns",
      ],
    },
    ctas: [
      {
        label: "Track perk costs automatically →",
        href: "/dashboard#signup?plan=starter",
      },
    ],
  },
  {
    slug: "do-i-have-to-issue-a-1099-for-customer-rewards",
    question: "Do I have to issue a 1099 for customer rewards?",
    shortAnswer:
      "Only if a single individual receives more than $600 in cash, gift cards, or cash-equivalent rewards from your business in a tax year. Free product or in-store discounts don't trigger it.",
    longAnswer:
      "The IRS 1099-NEC (or 1099-MISC depending on the nature of the payment) is required when you pay an individual or single-member LLC more than $600 in a calendar year for services rendered. For customer marketing programs, this comes up in a few specific scenarios:\n\n**Triggers a 1099:**\n• Cash payments to a customer or influencer for content ($50/post × 13 posts = $650 → 1099)\n• Gift cards given as rewards ($25 × 25 = $625 → 1099)\n• Store credit redeemable for cash (\"$100 of merch credit\")\n• Any cash-equivalent rewards in aggregate over $600 to one person\n\n**Does NOT trigger a 1099:**\n• Free product given on the spot (a latte, a sandwich, a haircut — has no cash-equivalent value at the IRS's view)\n• Percentage discount on a purchase (e.g., 15% off a $50 meal — reduces price, doesn't pay anything)\n• Buy-one-get-one offers\n• Loyalty points redeemable only in-store for goods/services\n\nThe distinction is essentially: did the customer receive something they could convert to cash? Free latte = no. Visa gift card = yes.\n\n**Practical implications for small-business owners:**\n\n1. **Most perk-for-post programs never trigger a 1099.** If your perks are free items or in-store discounts, you can run hundreds of campaigns without ever hitting the threshold.\n\n2. **Influencer payment programs frequently do trigger it.** If you're paying creators $100-$500 per post and you work with the same creator multiple times, you'll cross $600 fast.\n\n3. **Cash-back programs frequently do.** Customer earns 5% back on every purchase — if any one customer redeems more than $600 cumulatively, you owe them a 1099 and have to file with the IRS by January 31 of the following year.\n\n4. **Track per-recipient totals.** Bookkeeping software should tag rewards by recipient. Don't try to reconstruct this in January.\n\n5. **Failure to file** results in penalties ($60-$310 per missing form depending on lateness, plus risk of audit).\n\nFor Social Perks specifically: free-item and percentage-discount campaigns generate zero 1099 obligations no matter how many you run. Cash-back campaigns track per-recipient totals automatically and flag any approaching the $600 threshold so you can plan.\n\nThis is not tax advice. Talk to your CPA about your specific situation.",
    keyPoints: [
      "Required when one person receives >$600 in cash/gift-card-equivalent rewards in a year",
      "Free product and percentage discounts don't count — they're not cash-equivalent",
      "Influencer payment programs and cash-back programs hit the threshold fastest",
      "Track per-recipient totals throughout the year — don't reconstruct in January",
      "Penalties: $60-$310 per missing form, plus audit risk",
    ],
    category: "pricing",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "are-customer-perks-tax-deductible",
        "how-much-do-influencers-charge-for-instagram-posts",
      ],
    },
    ctas: [
      {
        label: "Avoid 1099 hassle with in-store perks →",
        href: "/dashboard#signup",
      },
    ],
  },
  {
    slug: "what-is-the-average-roi-of-customer-marketing-campaigns",
    question: "What is the average ROI of customer marketing campaigns?",
    shortAnswer:
      "Typical small-business customer marketing campaigns return 4-12x: a $1 perk produces $4-12 in revenue from new customers and repeat visits. Compare to 1.5-3x for paid social ads.",
    longAnswer:
      "ROI on customer marketing varies widely by industry, perk structure, and platform — but the typical small-business range is 4-12x return on perk cost. Two ways to look at it:\n\n**By direct attribution (lower-bound estimate):**\nA customer with 500 Instagram followers posts about your coffee shop tagged with your handle. Followers see it; perhaps 60-100 of them are in your trade area; 1-2 visit in the next month; 1 becomes a regular. Revenue: ~$60-$200 over 6 months from that one acquired customer. Perk cost: ~$1 (the latte you gave for the post). ROI: 60-200x — but this happens on maybe 1 in every 5-10 posts.\n\nAveraged across all posts (including the ones that don't drive a visible visit), ROI per dollar spent tends to land between $4 and $12.\n\n**By comparison to paid ads:**\n• Facebook ads to local audience: typical $4-8 cost per click, $25-60 cost per acquired customer, 1.5-3x ROAS for most small businesses\n• Google Local Service Ads: $15-40 per lead, 30-50% lead-to-customer conversion, 2-4x ROAS\n• Customer marketing perk-for-post: $1-3 perk cost per post, 1-2 customers acquired per 10 posts, 4-12x effective ROAS\n\nThe gap exists because customer posts have three advantages paid ads don't:\n1. **Trust** — viewers know the poster personally\n2. **Locality** — followers are by definition in the poster's social network, often geographically close\n3. **Persistence** — a feed post stays searchable; an ad disappears when you stop paying\n\n**By industry (rough benchmarks):**\n• Coffee shops: 6-10x ROI\n• Restaurants: 5-8x ROI\n• Salons / Spas: 8-15x ROI (high lifetime value per acquired customer)\n• Boutique retail: 4-7x ROI\n• Service businesses (dentists, vets, fitness): 10-20x ROI (very high LTV, low marketing cost baseline)\n\n**What kills ROI:**\n• Discount too deep (40%+ attracts deal-hunters with no LTV)\n• Perk too small (5% off doesn't motivate posting)\n• Wrong platform (asking gym customers for Pinterest pins)\n• No verification (15-30% fraud rate eats margin)\n\n**What's actually realistic for a new program:** First 30 days, expect to lose money or break even — you're learning the ask, customers are learning the offer. Months 2-4, ROI ramps to 2-4x. Month 6+, the steady-state 4-12x range. Patience matters; this isn't a same-week miracle.\n\nMost important: the unit economics of free-item perks are unusually favorable. A coffee shop's latte costs them ~$0.80 in materials and feels like a $5 gift to the customer. That asymmetry is what makes customer marketing structurally more profitable than discounting.",
    keyPoints: [
      "Typical range: 4-12x ROI on perk cost",
      "Beats paid social (1.5-3x) and Google ads (2-4x) for most small businesses",
      "Salons, dentists, vets see highest ROI (high LTV per customer)",
      "First 30 days break-even is normal — flywheel takes 60-90 days",
      "Free-item perks beat percentage discounts on unit economics",
    ],
    category: "pricing",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "how-much-discount-should-i-offer-for-an-instagram-post",
        "what-is-the-difference-between-influencer-marketing-and-customer-marketing",
        "how-long-does-customer-marketing-take-to-work",
      ],
    },
    ctas: [
      {
        label: "Try a 4-12x ROI campaign free →",
        href: "/dashboard#signup",
      },
    ],
  },

  // ─── FTC compliance expansion ──────────────────────────────────────
  {
    slug: "what-is-the-ftc-penalty-for-not-disclosing-sponsored-content",
    question: "What is the FTC penalty for not disclosing sponsored content?",
    shortAnswer:
      "Up to $51,744 per violation under the 2024 Final Rule on fake reviews and undisclosed endorsements. The FTC has historically targeted brands more often than individual endorsers, but both can be liable.",
    longAnswer:
      "The FTC's 2024 Final Rule on consumer reviews and testimonials set the per-violation civil penalty at $51,744 (adjusted annually for inflation). \"Per violation\" can mean per post, per misleading claim, or per consumer harmed, depending on how the FTC chooses to charge.\n\nNotable recent enforcement actions:\n\n• **Fashion Nova (2022):** $4.2 million settlement for suppressing negative reviews from their product pages. Notable because it established that brands are accountable for the review ecosystem they participate in, not just their direct ads.\n• **Sunday Riley (2019):** Consent decree requiring 20 years of monitored compliance after employees posted reviews without disclosing their affiliation. No monetary penalty, but the operational burden of the decree was significant.\n• **Bountiful Co. (Nature's Bounty parent, 2023):** $600,000 settlement for using fake reviews and hijacked third-party reviews. Showed the FTC pursuing mid-market companies, not just large brands.\n• **Multiple influencer cases (2017-present):** The FTC has sent warning letters to individual influencers, occasionally pursuing civil penalties when influencers ignored prior warnings.\n\n**Who's liable when an endorser fails to disclose?**\n\nBoth the brand AND the endorser can be held liable. The brand can't say \"I told them to disclose\" as a defense — the FTC expects brands to monitor compliance and have systems in place. Specifically, the brand should be able to produce:\n• Written disclosure guidance given to endorsers\n• Evidence of monitoring (screenshots, audits)\n• Process for non-compliant content (e.g., refusing to pay for non-disclosed posts)\n• A documented corrective-action process\n\n**Practical risk for small businesses:**\n\nThe FTC has limited resources and pursues cases for one of three reasons: large brand visibility (Fashion Nova), systematic deception across many products (Bountiful), or as a warning shot in a new enforcement area (early influencer cases). A coffee shop with 50 customer posts is not on the FTC's radar.\n\nHowever: state attorneys general can also enforce, class-action plaintiffs' attorneys can sue under state consumer protection laws, and platform policies (Instagram, TikTok) can suspend accounts. The aggregate risk is non-trivial even if pure FTC enforcement against a small business is unlikely.\n\nThe right posture: build compliance into the campaign from day 1. Auto-inject the disclosure, verify it on submission, keep records. This is approximately the same effort as not doing it, and removes 99% of the legal exposure.",
    keyPoints: [
      "Up to $51,744 per violation under the 2024 Final Rule",
      "Both brand AND endorser can be liable",
      "FTC pursues high-visibility cases and systematic deception — not single coffee shops",
      "State AGs and class-action lawsuits add aggregate risk beyond FTC",
      "Best defense: auto-inject disclosures and verify on submission",
    ],
    category: "ftc-compliance",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "what-is-the-ftc-rule-on-incentivized-reviews",
        "is-it-legal-to-offer-discounts-for-instagram-posts",
      ],
    },
    ctas: [
      {
        label: "Run auto-compliant campaigns →",
        href: "/dashboard#signup",
      },
    ],
  },

  // ─── Industry-specific tactics ─────────────────────────────────────
  {
    slug: "how-do-coffee-shops-use-instagram-to-grow",
    question: "How do coffee shops use Instagram to grow their business?",
    shortAnswer:
      "Three plays in order: turn drinks into shareable moments (latte art, signature seasonal drinks), reward customers for posting (story tag = free pastry), and consistently post your own behind-the-scenes content.",
    longAnswer:
      "Independent coffee shops are uniquely well-positioned for Instagram. Food and drink content gets the highest engagement of any category on the platform, your product is inherently photogenic, and your customers post about coffee anyway. The playbook is about catalyzing what would already happen, not creating it from scratch.\n\n**Play 1: Make every drink shareable.** A latte with a heart in the foam gets posted; a flat brown beverage gets drunk. The drink is the content. If you don't have a barista doing latte art, get one trained — it's a one-week skill and it doubles the rate at which your drinks get organic posts. Signature seasonal drinks (lavender honey latte, peach espresso tonic) get posted at 3-5x the rate of standard menu items because they feel novel.\n\n**Play 2: Reward customers for posting.** A small printed card at the register: \"Post a story tagging @yourshop, show your barista, get a free pastry.\" This is the perk-for-post mechanic — turn a $1 pastry cost into 30-80 followers' worth of trust-weighted local impressions. The economics are obscene if you do it consistently.\n\n**Play 3: Post your own content consistently.** 3-5 posts per week minimum, mostly Stories. Behind-the-scenes (pulling shots, opening up the shop), staff features (introduce a barista), and customer features (with permission). Stories drive engagement; feed posts build the searchable archive. Reels reach beyond your follower base but require more production effort — start with 1 per week.\n\n**What NOT to do:**\n• Don't buy followers. Local businesses don't benefit from inflated counts and Instagram will detect it.\n• Don't post product photos with no context. \"Here's our latte\" gets ignored; \"Try the new pistachio rose latte this Saturday — Maria's been perfecting it for a month\" gets engagement.\n• Don't run flash discounts on Instagram. Train customers to come for the experience, not the sale. Discounts can come from the customer-marketing side via posts.\n• Don't ignore comments. Reply to every comment within 24 hours. The algorithm rewards engagement velocity, and it's basic respect.\n\n**Realistic timeline:** First 30 days, you'll feel like nothing is working. Days 30-60, you start seeing returning customers mention they saw your posts. Months 3-6, you have a small but engaged local following that converts. Year 1, you're a known fixture in your local coffee scene.\n\nThe coffee shops that fail at Instagram fail because they post once a month, never reward customers for posting, and treat the platform as a side project. The ones that succeed treat it as a real channel and run it daily, even briefly.",
    keyPoints: [
      "Drinks must be shareable: latte art, seasonal signature drinks",
      "Reward customers for posting: free pastry for an Instagram story = best unit economics",
      "Post 3-5x/week — mostly stories, BTS content, staff features",
      "Don't buy followers, don't post sterile product shots, don't ignore comments",
      "30 days feels like nothing is working — flywheel kicks in at 60-90 days",
    ],
    category: "tactics",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "how-do-i-ask-a-customer-for-an-instagram-post",
        "how-do-i-get-user-generated-content-for-my-business",
        "what-is-the-best-perk-to-offer-for-a-customer-review",
      ],
      industries: ["coffee-shops"],
      platformIds: ["ig"],
    },
    ctas: [
      {
        label: "Get the coffee-shop Instagram kit →",
        href: "/for/coffee-shops",
      },
      {
        label: "Launch a story-tag campaign →",
        href: "/dashboard#signup",
      },
    ],
  },
  {
    slug: "how-do-restaurants-get-more-user-generated-content",
    question: "How do restaurants get more user-generated content?",
    shortAnswer:
      "Make signature dishes that beg to be photographed, train staff to ask at the moment of \"oh my god this is good,\" reward Instagram posts with a free appetizer, and create one Instagrammable spot in the restaurant.",
    longAnswer:
      "Restaurants generate UGC organically — the food is the content. The job isn't to make customers post; it's to remove friction and add incentive at the moment they'd naturally consider it.\n\n**1. Engineer dishes for the camera.** A burger with melted cheese pull, a pasta dish served with a flourish, a cocktail with a smoking dome — visual drama gets posted at 5-10x the rate of equally-tasty but visually flat dishes. Spend a budget cycle redesigning your two most popular dishes to be more photogenic. This isn't gimmicky; it's recognizing that the customer's decision to post is a visual one.\n\n**2. Train your staff to ask.** The peak moment for a UGC ask is the first bite. \"Oh my god this is amazing\" is the cue. Your server's job: \"Right? If you post a story tagging us, your appetizer is on the house tonight.\" Train this until it's automatic. Track which servers convert better — the top performer is the model.\n\n**3. Build one Instagrammable spot.** A mural, a neon sign with a phrase, a unique tile pattern, a striking view. The spot becomes a default photo for every social-active customer who walks in. Tag the location on Instagram so geo-tagged photos roll up.\n\n**4. Run a structured UGC campaign.** The perk-for-post mechanic: \"Post a photo tagging us, free appetizer.\" Print it on table tents, the back of the menu, and the receipt. Costs you ~$3 in food, returns 60-150 local-area impressions per post.\n\n**5. Use the content.** Repost customer photos to your stories (with permission and credit). It signals to other customers that you notice and appreciate posters — and it gives you 3-5 stories per day with zero production effort. Build a highlight reel on your profile of customer photos. Future customers see it before they decide to book.\n\n**6. Don't fight the algorithm.** Reels reach further than feed posts on Instagram right now. Encourage video content even though it's a higher ask. Pair it with a bigger perk (free dessert, not just free appetizer) to match effort to reward.\n\n**What kills restaurant UGC:**\n• Dishes that look bad in low restaurant lighting (test your top dishes by photographing them at your actual table lighting)\n• Servers who never ask, or ask in a way that feels transactional (\"would you mind\" not \"would you like\")\n• No incentive structure — relying purely on customer enthusiasm leaves 80% of potential posts on the table\n• Inconsistent execution — running a campaign for two weeks, dropping it, restarting it\n\nRealistic volume: a mid-size restaurant (50-100 covers/day) with this stack running gets 8-25 customer posts per week. Compounded over a year, that's 400-1300 posts — far more than the same restaurant would generate from paid influencers at any reasonable budget.",
    keyPoints: [
      "Engineer dishes for visual drama — cheese pulls, plating flourishes, smoking domes",
      "Train staff to ask at the \"oh my god\" moment (first bite)",
      "Build one Instagrammable spot in the restaurant",
      "Reward posts with free appetizer (~$3 cost, 60-150 local impressions)",
      "Repost customer photos with credit — signals you care",
      "Realistic: 8-25 customer posts/week for a mid-size restaurant with this stack",
    ],
    category: "tactics",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "how-do-i-get-user-generated-content-for-my-business",
        "how-do-i-ask-a-customer-for-an-instagram-post",
        "how-much-discount-should-i-offer-for-an-instagram-post",
      ],
      industries: ["restaurants"],
      platformIds: ["ig", "tt"],
    },
    ctas: [
      {
        label: "Get the restaurant UGC playbook →",
        href: "/for/restaurants",
      },
      {
        label: "Launch a free-appetizer campaign →",
        href: "/dashboard#signup",
      },
    ],
  },
  {
    slug: "how-do-salons-and-spas-get-more-customers-from-instagram",
    question: "How do salons and spas get more customers from Instagram?",
    shortAnswer:
      "Before/after photos are the highest-converting content for salons. Get every client's permission to post their result, reward them for tagging you, and run a small budget of Reels showing transformations.",
    longAnswer:
      "Salons and spas have an unfair advantage on Instagram: the before/after transformation is one of the highest-performing content formats on the platform. The job is to systematize capturing it.\n\n**1. Make before/after capture standard practice.** At the start of every appointment, the stylist takes a quick phone photo of the client's hair/skin/nails. At the end, the same shot. Five seconds. This shouldn't be optional — it's how the work gets seen by future clients.\n\n**2. Get explicit permission to post.** During booking confirmation, include a checkbox: \"I'm okay with you sharing my before/after on Instagram\" with options for face/no-face. The opt-in rate is ~70%. Make it dead clear they can opt out without affecting service.\n\n**3. Post 1-2 transformations per day on Stories, 3-4 per week on the feed.** Stories build engagement velocity, feed posts build a searchable portfolio that future clients scroll through before booking.\n\n**4. Reward clients for tagging you.** \"Post your transformation on Instagram tagging @yoursalon and you get 15% off your next visit.\" Salons have especially good economics here: a return visit is worth $80-$300+, so a 15% discount ($12-$45 cost) for a piece of content that drives 1-3 new bookings is wildly profitable.\n\n**5. Run Reels of in-progress transformations.** 15-30 seconds. Color application, balayage technique, lash extension setup. These reach beyond your follower base and pull in cold viewers. Don't over-produce — phone-shot, no editing, raw is fine. Authenticity beats polish.\n\n**6. Use Stories Highlights as a service menu.** Group your saved stories by service: \"Balayage,\" \"Color correction,\" \"Bridal hair,\" \"Lash extensions.\" New visitors to your profile can browse exactly the service they want with real client examples. This is the highest-converting profile real estate you have.\n\n**7. Local hashtag strategy.** Use 5-10 local hashtags (#nashvillehair, #eastnashville, #musiccityhair) plus 2-3 service hashtags (#balayage, #hairtransformation). Local hashtags drive bookings; national/category hashtags rarely do for service businesses.\n\n**What kills salon Instagram:**\n• Posting only the artists' favorite work (90% of clients want a slightly tweaked version of something they saw on someone like them — variety matters more than perfection)\n• Inconsistent posting (the algorithm punishes sporadic)\n• Generic posts (\"Walk-ins welcome!\" gets ignored; \"Sarah's first balayage — slide for the before\" gets bookings)\n• Not capturing transformations because \"the lighting is bad\" — phone cameras are fine; consistency matters more than perfection\n\nRealistic results: a salon running this stack consistently for 4 months typically sees Instagram-attributed bookings grow from 5-10% of new clients to 25-40%. That's a meaningful share of the marketing channel mix at zero ad spend.",
    keyPoints: [
      "Before/after photos at every appointment — 5 seconds, standard practice",
      "Get permission via booking checkbox (~70% opt-in)",
      "Post 1-2 transformations daily to Stories, 3-4/week to feed",
      "Reward tagged posts with 15% off next visit (return visit is worth $80-$300+)",
      "Use Stories Highlights as a service menu — \"Balayage,\" \"Bridal,\" \"Color correction\"",
      "Local hashtags drive bookings; generic hashtags don't",
    ],
    category: "tactics",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "how-do-i-get-user-generated-content-for-my-business",
        "how-do-i-ask-a-customer-for-an-instagram-post",
      ],
      industries: ["salons"],
      platformIds: ["ig"],
    },
    ctas: [
      {
        label: "Get the salon Instagram playbook →",
        href: "/for/salons",
      },
      {
        label: "Run a transformation-post campaign →",
        href: "/dashboard#signup",
      },
    ],
  },

  // ─── Comparison expansion ──────────────────────────────────────────
  {
    slug: "social-perks-vs-yotpo-vs-birdeye",
    question: "How does Social Perks compare to Yotpo and Birdeye?",
    shortAnswer:
      "Yotpo and Birdeye focus on review collection (Google, Yelp, internal) and are enterprise-priced. Social Perks focuses on incentivized social posts (Instagram, TikTok, Facebook) where incentivization is legal, and starts at $0.",
    longAnswer:
      "All three platforms operate in the customer marketing space but optimize for different jobs. Quick framing of who solves what:\n\n**Yotpo:** Built for e-commerce. Strongest at collecting reviews on your own product pages, syndicating them to Google Shopping, and running loyalty/referral programs for online stores. Starts around $79/mo for the basic tier; enterprise plans run thousands per month. Best fit: Shopify/WooCommerce stores with $100k+/year revenue.\n\n**Birdeye:** Built for local services and multi-location businesses. Strongest at review monitoring across Google/Yelp/Facebook, automated review-request SMS/email, and reputation analytics. Pricing not public; typically $300-$1,500/mo per location. Best fit: dentists, law firms, multi-location restaurant chains, real estate brokerages.\n\n**Social Perks:** Built for independent and small multi-location businesses running incentivized social marketing. Strongest at perk-for-post campaigns on Instagram, TikTok, Facebook, YouTube, where incentivization is legal. Free tier covers most starting businesses; paid tier starts at $29/mo. Best fit: independent coffee shops, restaurants, salons, retailers.\n\n**Where the overlap is:**\n• All three help small businesses get more social proof\n• All three handle FTC compliance (with varying rigor)\n• All three offer review-request workflows\n\n**Where the differences are:**\n• Yotpo focuses on REVIEWS (your own product page, Google Shopping). Social Perks blocks paid Google reviews because they violate Google's TOS, and focuses on POSTS where incentivization is legal.\n• Birdeye focuses on review MONITORING and REQUESTS across Google/Yelp/Facebook. Social Perks focuses on user-generated CONTENT generation on Instagram and TikTok.\n• Yotpo and Birdeye are sales-led with custom pricing. Social Perks is self-serve with public pricing.\n\n**When to pick which:**\n• You run an online store and want reviews on your product pages → Yotpo\n• You're a multi-location service business and need centralized review monitoring → Birdeye\n• You're an independent local business and want to turn customers into Instagram/TikTok posters → Social Perks\n• You want all three: Birdeye for review monitoring on Google + Social Perks for incentivized Instagram posts. They don't directly compete.\n\nThe pricing dynamic matters: Yotpo and Birdeye are built for businesses that have already crossed $500k/year revenue and can afford 4-figure monthly platform fees. Social Perks is built for the businesses one step earlier in the lifecycle — generally $0-$2M/year revenue, where any subscription cost has to be obviously profitable on day 1.",
    keyPoints: [
      "Yotpo = e-commerce reviews + loyalty ($79+/mo, enterprise plans available)",
      "Birdeye = multi-location review monitoring + requests ($300-1500/mo/location)",
      "Social Perks = incentivized Instagram/TikTok posts for independent local businesses ($0-49/mo)",
      "Different tools for different jobs; you can run Birdeye + Social Perks together",
      "Choose Yotpo for online stores, Birdeye for chains, Social Perks for independents",
    ],
    category: "comparison",
    lastReviewed: "2026-05-15",
    related: {
      answerSlugs: [
        "what-is-the-difference-between-influencer-marketing-and-customer-marketing",
        "how-do-i-start-a-customer-rewards-program",
      ],
    },
    ctas: [
      {
        label: "See the full comparison",
        href: "/vs",
      },
      {
        label: "Start free →",
        href: "/dashboard#signup",
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
