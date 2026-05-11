import type { AskQuestion } from "./types";

const PUB = "2026-04-12";
const MOD = "2026-05-10";

export const REVIEWS_QUESTIONS: AskQuestion[] = [
  {
    slug: "how-do-i-get-more-google-reviews-for-my-business",
    category: "Reviews & UGC",
    question: "How do I get more Google reviews for my business?",
    h1: "How Do I Get More Google Reviews for My Business?",
    tldr:
      "Get more Google reviews by asking every customer at the moment of peak satisfaction, using a one-tap link directly to your Google review page (QR code or SMS), following up the next day, and responding to every review you receive. Aim for 10-20 new reviews per month for a typical local business.",
    metaDescription:
      "The exact process to grow Google reviews for any local business - asking, automation, FTC rules, and response best practices.",
    sections: [
      {
        heading: "The mechanics of review growth",
        body: "Google reviews follow Pareto: 80% of businesses get reviews from under 5% of customers, and 20% of businesses get reviews from 15-30%. The difference is process - the high-volume businesses systematically ask every customer at the right moment, on the right channel.\n\nThe core mechanics: (1) generate a direct review link from your Google Business Profile dashboard, (2) use that link in QR codes and SMS, (3) ask in person at peak satisfaction, (4) send a follow-up within 24 hours to anyone who didn't review in person, (5) reply to every review within 48 hours.",
      },
      {
        heading: "Compliance basics",
        body: "Google and the FTC both allow asking for reviews. They both prohibit (a) review gating - filtering out unhappy customers before asking, (b) buying reviews, (c) offering rewards conditional on a specific rating. They both permit honest incentives - a small thank-you for any honest review of any star count, with disclosure.\n\nThe simple rule: incentivize the action of leaving a review, never the content of the review.",
      },
    ],
    keyFacts: [
      "Local businesses with 50+ Google reviews convert search clicks to customers at ~2x the rate of those with under 10 (BrightLocal, 2024).",
      "SMS review requests have 8-12% conversion rates; email has 1-3%.",
      "Replying to reviews boosts local search ranking - Google factors response rate into its algorithm.",
      "Google removes about 5-10% of reviews that violate policy when properly flagged.",
      "Aim for a 4.5+ star average; below 4.0 actively hurts conversion.",
    ],
    steps: [
      "Grab your direct review link from Google Business Profile ('Get more reviews').",
      "Print QR codes. Place at every customer touchpoint.",
      "Train staff to ask at the right moment.",
      "Send SMS to anyone who didn't review in person.",
      "Reply to every review within 48 hours.",
    ],
    mistakes: [
      "Review gating - only asking 'happy' customers.",
      "Sending customers to your homepage instead of the review form.",
      "Asking only once and stopping.",
      "Buying reviews - Google detects these and may suspend your listing.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Automated, FTC-compliant review programs at scale.",
        href: "/",
      },
      {
        name: "Google Business Profile",
        description: "Free. Source of your direct review link.",
      },
      {
        name: "Podium or Birdeye",
        description: "Established review software, $250-500/month.",
      },
    ],
    related: [
      "how-do-restaurants-get-more-google-reviews",
      "is-it-ok-to-incentivize-customer-reviews",
      "how-do-i-get-customers-to-leave-positive-reviews",
      "how-do-i-respond-to-negative-reviews",
      "what-makes-customers-want-to-leave-a-review",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "is-it-ok-to-incentivize-customer-reviews",
    category: "Reviews & UGC",
    question: "Is it ok to incentivize customer reviews?",
    h1: "Is It OK to Incentivize Customer Reviews?",
    tldr:
      "Yes - but only if the incentive is offered for any honest review (not conditioned on a positive rating) and the incentive is disclosed. The FTC explicitly allows this; review platforms vary. Google and Yelp prohibit rating-conditional rewards but permit honest incentive disclosure.",
    metaDescription:
      "The legal and platform-rule reality of incentivizing reviews - what's allowed, what's banned, and how to do it compliantly.",
    sections: [
      {
        heading: "What the rules actually say",
        body: "FTC guidance (2023 updates to endorsement guides): offering an incentive for a review is permissible if (a) the incentive is offered regardless of the review's content, and (b) the incentive is clearly disclosed. So 'leave us any honest review and we'll send a $5 coupon' is fine. 'Leave us a 5-star review and we'll send a $5 coupon' is not.\n\nGoogle's review policy aligns: incentives are allowed for honest reviews; not allowed when tied to a specific rating. Yelp is stricter and generally discourages any incentive. Amazon prohibits all incentivized reviews on its marketplace.",
      },
      {
        heading: "Practical compliant patterns",
        body: "Several patterns work. A small thank-you (free coffee, $5 credit, loyalty points) for any review - disclosed at the time of the ask. Sweepstakes entries (one entry per honest review, monthly drawing for a $100 gift card) - extra-strong because the entry is the prize, not a guaranteed reward. Charitable donations in the customer's name ('we'll donate $1 to local food bank for every review').\n\nIn every case, disclose: 'Leave us a review (positive or critical) and we'll send you a thank-you coupon.'",
      },
    ],
    keyFacts: [
      "FTC explicitly permits incentivized reviews if disclosed and not rating-conditional (Endorsement Guides, 2023).",
      "Google policy permits unconditional incentives with disclosure; bans rating-conditional ones.",
      "Yelp generally discourages all incentives - businesses caught risk warnings or listing penalties.",
      "Amazon bans all incentivized reviews (with limited exceptions for early-reviewer programs).",
      "Disclosed, unconditional incentives are now used by ~40% of small businesses (BrightLocal, 2024).",
    ],
    steps: [
      "Pick a small, simple incentive that fits your business.",
      "Make sure it's offered for any honest review.",
      "Disclose in the ask.",
      "Avoid Yelp for incentivized review pushes; focus on Google.",
      "Document your process in case of platform inquiry.",
    ],
    mistakes: [
      "Tying the incentive to rating ('5-star reviews only').",
      "Hiding the incentive.",
      "Running incentivized programs on platforms that prohibit them.",
      "Setting incentives so large they distort honest feedback.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Built-in FTC-compliant disclosure language and rating-blind reward logic.",
        href: "/",
      },
      {
        name: "Google Business Profile",
        description: "Allows compliant incentive programs.",
      },
      {
        name: "FTC Endorsement Guides",
        description: "Free reference. Bookmark it.",
      },
    ],
    related: [
      "how-do-i-get-more-google-reviews-for-my-business",
      "how-do-i-get-customers-to-leave-positive-reviews",
      "what-are-ftc-rules-for-influencer-disclosure",
      "how-do-i-collect-user-generated-content-legally",
      "how-do-restaurants-get-more-google-reviews",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "how-do-i-respond-to-negative-reviews",
    category: "Reviews & UGC",
    question: "How do I respond to negative reviews?",
    h1: "How Do I Respond to Negative Reviews?",
    tldr:
      "Respond to negative reviews within 48 hours, publicly, with a calm four-part response: acknowledge the issue, apologize without excuses, explain what you're changing, and invite the reviewer to reach out privately. Future customers, not the reviewer, are your real audience.",
    metaDescription:
      "Exactly how to respond to negative reviews on Google and Yelp - templates, dos and don'ts, and when to flag instead.",
    sections: [
      {
        heading: "The four-part response framework",
        body: "Every good response has four parts. Acknowledge: address the specific complaint, not vague platitudes. Apologize: a real apology without 'but' or excuses. Explain: what's changing as a result (or, if you disagree, the facts). Invite: offer to make it right privately.\n\nKeep it under 80 words. Use the reviewer's first name. Sign with yours. Avoid corporate voice.",
      },
      {
        heading: "When to fight, flag, or fold",
        body: "Fold (just respond gracefully): legitimate complaint about a real problem. Most of the time.\n\nFight (respond with facts): false claims you can disprove. Calmly state the facts, don't be defensive.\n\nFlag (request platform removal): only when the review violates policy - fake, written by someone who didn't visit, contains hate speech, or has a clear conflict of interest. Google and Yelp remove ~25-35% of properly flagged reviews.",
      },
    ],
    keyFacts: [
      "Businesses that respond to 100% of reviews see ~7% higher conversion than those that don't.",
      "Responding within 24 hours produces measurably higher subsequent ratings (Cornell, 2024).",
      "Long, defensive responses damage perception more than the original negative review.",
      "Reviews with thoughtful responses are read by 50-200+ future customers each.",
      "Roughly 89% of consumers read business responses to reviews (BrightLocal, 2024).",
    ],
    steps: [
      "Read the review twice before responding. Get past the emotional reaction.",
      "Draft using the four-part framework.",
      "Have someone else read it before posting.",
      "Reply within 48 hours.",
      "Offer to take it private. Many reviewers update positively after a good resolution.",
    ],
    mistakes: [
      "Responding emotionally.",
      "Using template language - 'We're sorry for any inconvenience.'",
      "Arguing publicly.",
      "Ignoring negative reviews entirely.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Aggregates reviews across Google, Yelp, and other platforms with response templates.",
        href: "/",
      },
      {
        name: "Birdeye or Podium",
        description: "Multi-platform review management.",
      },
      {
        name: "Google Business Profile",
        description: "Reply directly from your Google dashboard.",
      },
    ],
    related: [
      "how-do-restaurants-handle-bad-yelp-reviews",
      "how-do-i-handle-fake-reviews",
      "can-i-delete-bad-google-reviews",
      "how-do-i-get-customers-to-leave-positive-reviews",
      "what-makes-customers-want-to-leave-a-review",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "what-are-ftc-rules-for-influencer-disclosure",
    category: "Reviews & UGC",
    question: "What are FTC rules for influencer disclosure?",
    h1: "What Are FTC Rules for Influencer Disclosure?",
    tldr:
      "The FTC requires creators to clearly and prominently disclose any material connection with a brand (payment, free product, family ties) in the post itself, in plain language ('paid partnership' or '#ad'), before any user has to click 'more.' Both brand and creator can be held liable for missing disclosures.",
    metaDescription:
      "FTC influencer disclosure rules in plain English - exact language, placement, platform specifics, and penalties for violations.",
    sections: [
      {
        heading: "What 'clear and prominent' means",
        body: "FTC guidance on endorsements (last major update: 2023) requires disclosures to be clear and conspicuous. In practice: use plain words like 'paid partnership,' 'ad,' or 'sponsored.' Avoid jargon like 'collab,' 'partner,' 'sp,' or 'ambassador' - the FTC has explicitly said these are not clear enough.\n\nThe disclosure must appear before users have to take any action (no clicking 'more,' no scrolling past the fold, no last-frame-of-the-video reveal). On Instagram, the built-in 'paid partnership' label satisfies this. On TikTok, the built-in 'Disclose video content' toggle plus an in-caption '#ad' is the safer combo.",
      },
      {
        heading: "Who's liable",
        body: "Both the creator and the brand can be held liable. The FTC has pursued cases against brands whose partner creators failed to disclose. The Endorsement Guides explicitly say brands must monitor for disclosure compliance and take action if creators don't comply.\n\nPenalties have ranged from public letters of warning to multi-million-dollar settlements (e.g., Lord & Taylor, $250K settlement, 2016).",
      },
    ],
    keyFacts: [
      "FTC fines can reach $50,120 per violation per individual influencer post (FTC Penalty Schedule, 2024).",
      "Disclosure must be in the post itself, not in bio or separate post.",
      "Plain language required - '#collab' and '#partner' are not sufficient per FTC guidance.",
      "Both creator and brand share liability.",
      "About 70% of sponsored posts on Instagram are properly disclosed (Mediakix, 2024) - meaning 30% are not.",
    ],
    steps: [
      "Require FTC-compliant disclosure in every brief.",
      "Specify exact language: 'paid partnership' or '#ad' early in caption.",
      "Use platform-native disclosure tools where available.",
      "Spot-check creator posts after they go live.",
      "Document compliance for your records.",
    ],
    mistakes: [
      "Allowing 'collab,' 'partner,' or vague language.",
      "Burying disclosure at the end of the caption.",
      "Not monitoring creator posts after publication.",
      "Assuming small accounts don't need to disclose.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "FTC disclosure built into every brief and verified at content review.",
        href: "/",
      },
      {
        name: "FTC Endorsement Guides",
        description: "Free. The authoritative reference.",
      },
      {
        name: "Instagram Branded Content tools",
        description: "Native 'paid partnership' label satisfies disclosure.",
      },
    ],
    related: [
      "is-it-ok-to-incentivize-customer-reviews",
      "do-i-need-an-influencer-contract",
      "how-do-i-write-an-influencer-brief",
      "how-do-i-collect-user-generated-content-legally",
      "what-is-the-difference-between-an-influencer-and-an-affiliate",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "how-do-i-collect-user-generated-content-legally",
    category: "Reviews & UGC",
    question: "How do I collect user-generated content legally?",
    h1: "How Do I Collect User-Generated Content Legally?",
    tldr:
      "Collect UGC legally by getting explicit written permission before reposting any customer photo or video. A simple comment reply ('Can we repost? Reply YES with #yes-share') is the minimum standard. For ads or paid campaigns, use a formal written license. Always credit the original creator and follow FTC rules if you paid for the content.",
    metaDescription:
      "Legal best practices for collecting and reusing user-generated content - permissions, licenses, and what 'fair use' won't cover.",
    sections: [
      {
        heading: "The permission ladder",
        body: "Different uses need different permission levels. Reposting on your Instagram Stories with a tag: a comment or DM agreement is usually fine. Reposting in your feed: same, but get it in writing. Using in paid ads: you need a formal written license specifying usage, duration, channels, and any compensation. Using in print, OOH, or major media: a full content license with the creator's signature and ideally a small payment.\n\nThe risk scales with reach. A repost to your 5K Story audience is low-risk if you have a casual yes. A national ad campaign is high-risk - get a lawyer to draft the license.",
      },
      {
        heading: "FTC implications",
        body: "If you compensated the customer for the content (cash, free product, discount), FTC rules apply just like influencer marketing. The original post needs disclosure, and your repost should preserve that disclosure or add your own ('regrammed from a customer who received free product').\n\nIf the content was truly organic and unpaid, no FTC disclosure is required - just permission.",
      },
    ],
    keyFacts: [
      "Reposting without permission is a copyright violation - the creator owns the work.",
      "Hashtag campaigns ('share with #yourbrand') do NOT automatically grant repost rights. You still need permission.",
      "Most UGC platforms (TINT, Bazaarvoice) automate permission collection.",
      "FTC disclosure applies to compensated UGC just like influencer content.",
      "Photo and video releases for commercial use typically include the right to edit and crop.",
    ],
    steps: [
      "Decide your intended use (Story, feed, ad, print).",
      "Get permission appropriate to that use.",
      "Save the permission record - screenshot the DM, save the form.",
      "Credit the original creator.",
      "If you paid them, add FTC disclosure.",
    ],
    mistakes: [
      "Assuming hashtag participation = permission to repost.",
      "Skipping written records of permission.",
      "Forgetting to credit creators.",
      "Using UGC in paid ads without a written license.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Built-in UGC permission flow with audit trail. FTC disclosure handled automatically.",
        href: "/",
      },
      {
        name: "TINT or Bazaarvoice",
        description: "Enterprise UGC permission and aggregation.",
      },
      {
        name: "Google Forms or Typeform",
        description: "DIY permission collection at small scale.",
      },
    ],
    related: [
      "what-is-the-difference-between-ugc-and-influencer-content",
      "what-are-ftc-rules-for-influencer-disclosure",
      "is-it-ok-to-incentivize-customer-reviews",
      "how-do-i-display-customer-reviews-on-my-website",
      "do-i-need-an-influencer-contract",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "what-is-the-difference-between-ugc-and-influencer-content",
    category: "Reviews & UGC",
    question: "What is the difference between UGC and influencer content?",
    h1: "What Is the Difference Between UGC and Influencer Content?",
    tldr:
      "UGC (user-generated content) is content created by customers for their own audiences, often unpaid. Influencer content is created by paid or comped creators specifically to promote a brand to their followers. UGC is broader and more authentic; influencer content has guaranteed reach and brief-controlled messaging.",
    metaDescription:
      "UGC vs. influencer content - the real differences in creator type, payment, reach, authenticity, and best uses.",
    sections: [
      {
        heading: "The core distinctions",
        body: "Creator: UGC comes from regular customers; influencer content comes from people with established audiences.\n\nIntent: UGC creators post because they like the product; influencer creators post to fulfill a paid agreement.\n\nReach: UGC creators have small audiences (often friends and family); influencers have followings of 1K-1M+.\n\nControl: UGC is whatever the customer makes; influencer content is briefed and reviewed.\n\nCompliance: UGC may not need FTC disclosure if unpaid; influencer content always does.\n\nThe blurry middle: a customer with 10K followers who gets a free product and posts about it is both. Treat the paid/compensated portion as influencer content for FTC purposes.",
      },
      {
        heading: "When to use which",
        body: "Use UGC for: social proof on your website, repost in Stories, ad creative that feels authentic, building community.\n\nUse influencer content for: targeted reach to a specific audience, controlled messaging for launches, polished video assets for paid ads, building credibility in a niche.\n\nMost mature small businesses use both. UGC fills the daily content calendar; influencer campaigns drive specific objectives.",
      },
    ],
    keyFacts: [
      "UGC ads convert 3-4x better than brand-produced ads (Stackla, 2024).",
      "Influencer content delivers measurable reach; UGC delivers measurable trust.",
      "About 79% of consumers say UGC heavily influences purchase decisions (Stackla, 2024).",
      "Influencer campaigns are 5-20x more expensive than UGC programs at scale.",
      "Hybrid programs (both UGC + paid creators) outperform either alone in most ROI studies.",
    ],
    steps: [
      "Decide what you need - reach, content volume, social proof, or all three.",
      "If reach: prioritize paid influencer partnerships.",
      "If volume/proof: prioritize UGC programs.",
      "Run both at different budget scales.",
      "Track which delivers more revenue per dollar.",
    ],
    mistakes: [
      "Treating customer photos as free advertising without permission.",
      "Spending only on influencers and ignoring UGC.",
      "Skipping FTC disclosure on compensated UGC.",
      "Using polished influencer content where authentic UGC would convert better.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Runs UGC and influencer programs from a single platform - the most cost-effective combo.",
        href: "/",
      },
      {
        name: "Bazaarvoice",
        description: "Enterprise UGC.",
      },
      {
        name: "Aspire",
        description: "Influencer-focused marketplace.",
      },
    ],
    related: [
      "how-do-i-collect-user-generated-content-legally",
      "what-is-the-difference-between-an-influencer-and-an-affiliate",
      "how-do-i-display-customer-reviews-on-my-website",
      "do-influencers-actually-drive-sales",
      "what-are-ftc-rules-for-influencer-disclosure",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "how-do-i-display-customer-reviews-on-my-website",
    category: "Reviews & UGC",
    question: "How do I display customer reviews on my website?",
    h1: "How Do I Display Customer Reviews on My Website?",
    tldr:
      "Display customer reviews on your website by embedding Google's free review widget, using a third-party tool (Trustpilot, Yotpo, Birdeye), or hardcoding curated quotes with permission. Place reviews near your CTA buttons, product details, and checkout for maximum conversion lift.",
    metaDescription:
      "How to display reviews on your website - free widgets, paid tools, schema markup, and where to place them for conversion.",
    sections: [
      {
        heading: "The display options",
        body: "Three tiers. Free: Google's own review widget (limited styling but reliable), a hand-coded carousel of quotes (full control, but you have to keep it updated). Paid widget ($20-$100/month): Trustpilot, Yotpo, Birdeye - auto-syncs reviews, customizable, includes Review schema for SEO. Custom: built into your site by a developer, full design control, more work.\n\nFor most small businesses, a paid widget is the right balance of effort and quality. The auto-sync alone saves hours per month.",
      },
      {
        heading: "Placement that converts",
        body: "Place reviews where buying decisions happen: near the primary CTA (Reserve / Book / Buy), on product or service pages, on the checkout page, and on the homepage above the fold. A single carefully-placed review near a CTA typically lifts conversion 5-15%.\n\nAdd Review schema (structured data) to your HTML. This is what produces the star ratings under your search results - a 'rich snippet' that lifts organic CTR 20-30%.",
      },
    ],
    keyFacts: [
      "Pages with reviews convert 15-25% better than those without (Spiegel Research, 2024).",
      "Review schema markup increases organic CTR by an average of 20-30%.",
      "Aggregate ratings of 4.0-4.5 convert better than 5.0 (which looks suspicious to consumers).",
      "Featuring 3-7 reviews on a page is optimal; fewer is unconvincing, more overwhelms.",
      "About 88% of consumers trust online reviews as much as personal recommendations.",
    ],
    steps: [
      "Pick a tool (free Google widget, paid Trustpilot/Yotpo, or custom).",
      "Embed reviews on your homepage, product pages, and checkout.",
      "Add Review schema for SEO rich snippets.",
      "Update featured reviews monthly.",
      "Track conversion rate before and after.",
    ],
    mistakes: [
      "Hiding reviews in a separate page no one visits.",
      "Showing only 5-star reviews. Consumers find this suspicious.",
      "Forgetting Review schema markup.",
      "Cherry-picking reviews from 2 years ago. Use recent ones.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Embeddable widget shows reviews from Google, Yelp, and direct customer reviews in one place.",
        href: "/",
      },
      {
        name: "Trustpilot or Yotpo",
        description: "Industry-standard review widgets with schema built in.",
      },
      {
        name: "Google Reviews widget",
        description: "Free. Limited but reliable.",
      },
    ],
    related: [
      "what-makes-customers-want-to-leave-a-review",
      "how-do-i-collect-user-generated-content-legally",
      "what-is-the-difference-between-ugc-and-influencer-content",
      "how-do-i-get-more-google-reviews-for-my-business",
      "how-do-i-get-customers-to-leave-positive-reviews",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "what-makes-customers-want-to-leave-a-review",
    category: "Reviews & UGC",
    question: "What makes customers want to leave a review?",
    h1: "What Makes Customers Want to Leave a Review?",
    tldr:
      "Customers leave reviews when: (1) they had a notably positive or negative experience, (2) the ask comes at the right moment, (3) the process is one-tap easy, (4) they feel their voice matters. Most don't leave reviews because no one asked - not because they didn't care.",
    metaDescription:
      "The psychology of why customers leave reviews - what motivates them, what stops them, and how to engineer more reviews.",
    sections: [
      {
        heading: "The four motivations",
        body: "Customer review research (Northwestern Spiegel, BrightLocal, multiple academic studies) consistently identifies four motivations. Reciprocity: 'They were great, I want to help them.' Helping other consumers: 'I want to warn / recommend.' Venting (negative): 'I'm angry and the world should know.' Reward: 'I get something for it.'\n\nThe first two motivations are stronger than most businesses think - if you simply ask, most happy customers will say yes. The fourth (reward) shifts behavior but only when paired with a clear, easy ask.",
      },
      {
        heading: "Friction kills more reviews than motivation does",
        body: "The biggest barrier isn't lack of motivation - it's friction. A customer who genuinely wants to help you abandons if the process takes more than 30 seconds. The fix isn't more motivation; it's less friction. One-tap links, pre-filled forms, SMS reminders.\n\nResearch from Harvard Business Review shows that reducing friction can grow review volume 5-10x without changing customer satisfaction.",
      },
    ],
    keyFacts: [
      "About 76% of customers will leave a review when asked (BrightLocal, 2024).",
      "The single biggest predictor of a review is being asked, not satisfaction level.",
      "One-tap link processes generate 5-10x more reviews than 'search us on Google' instructions.",
      "Reviews are more likely after exceptional positive OR negative experiences than after average ones.",
      "Reward programs lift review volume 20-40% when properly disclosed.",
    ],
    steps: [
      "Ask. This single change matters more than anything else.",
      "Time the ask to peak satisfaction.",
      "Make it one-tap easy.",
      "Optionally add a small reward (FTC-compliant).",
      "Thank reviewers personally to encourage repeat behavior.",
    ],
    mistakes: [
      "Assuming customers will review on their own.",
      "Sending customers to a multi-step process.",
      "Asking too late (a week after the visit).",
      "Forgetting to thank reviewers.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Engineered for friction reduction - one-tap reviews with compliant rewards.",
        href: "/",
      },
      {
        name: "QR code generator",
        description: "Free. Generate a code pointing to your Google review URL.",
      },
      {
        name: "Klaviyo or Attentive SMS",
        description: "Send post-visit review prompts via SMS.",
      },
    ],
    related: [
      "how-do-i-get-customers-to-leave-positive-reviews",
      "how-do-i-get-more-google-reviews-for-my-business",
      "is-it-ok-to-incentivize-customer-reviews",
      "how-do-restaurants-get-more-google-reviews",
      "how-do-i-respond-to-negative-reviews",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "how-do-i-handle-fake-reviews",
    category: "Reviews & UGC",
    question: "How do I handle fake reviews?",
    h1: "How Do I Handle Fake Reviews?",
    tldr:
      "Handle fake reviews by flagging them through each platform's official process with specific policy violations cited, responding publicly with calm, factual replies, and documenting patterns of harassment. Google and Yelp remove about 25-35% of properly flagged reviews. For serious cases (defamation, coordinated attacks), consult a lawyer.",
    metaDescription:
      "How to identify, report, and respond to fake reviews on Google and Yelp - what platforms remove, what they don't, and legal options.",
    sections: [
      {
        heading: "Identifying genuinely fake reviews",
        body: "Real signs of a fake review: reviewer has no profile photo or very generic one, the account has only one or two reviews (or has reviewed dozens of unrelated businesses in different cities in one day), the review mentions things you don't offer or details that don't match your business, the reviewer's other reviews follow the same template language.\n\nNot signs of fake: a one-star review you disagree with, an emotional negative review, a review from someone you don't remember serving.",
      },
      {
        heading: "Flagging and removal",
        body: "Google: flag through the Business Profile dashboard, citing the specific policy violated (impersonation, hate speech, off-topic, conflict of interest). Google reviews removal team responds in 3-15 days. Removal rate for properly flagged reviews: 25-35%.\n\nYelp: flag through the business owner account. Yelp is more cautious - they remove fewer reviews but pursue patterns of fake reviews more aggressively.\n\nIf platforms refuse to remove a defamatory review, options include a cease-and-desist to the reviewer (if identifiable), a defamation lawsuit (high bar, expensive), or simply responding publicly to neutralize impact.",
      },
    ],
    keyFacts: [
      "About 4% of all online reviews are estimated to be fake (Fakespot data, 2024).",
      "Properly flagged reviews on Google are removed 25-35% of the time.",
      "Defamation suits over reviews are rare and expensive - usually a last resort.",
      "Patterns of fake reviews (multiple from same IP or coordinated language) are more likely to be removed than single reviews.",
      "Public response neutralizes most fake-review impact even when removal fails.",
    ],
    steps: [
      "Document the review - screenshot it.",
      "Flag through the platform with specific policy citation.",
      "Respond publicly, calmly, with facts.",
      "If pattern emerges (coordinated attack), document and escalate.",
      "For serious cases, consult a lawyer.",
    ],
    mistakes: [
      "Flagging legitimate negative reviews as 'fake.'",
      "Engaging emotionally with suspected fake reviewers.",
      "Threatening legal action publicly in the review thread.",
      "Trying to outrun fake reviews with fake positive ones - this gets you suspended.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Floods your profile with genuine positive reviews so fake ones dilute faster.",
        href: "/",
      },
      {
        name: "Fakespot",
        description: "Analyzes review authenticity for free.",
      },
      {
        name: "Google Business Support",
        description: "Free. The official channel for review removal.",
      },
    ],
    related: [
      "can-i-delete-bad-google-reviews",
      "how-do-i-respond-to-negative-reviews",
      "how-do-restaurants-handle-bad-yelp-reviews",
      "how-do-i-get-customers-to-leave-positive-reviews",
      "is-it-ok-to-incentivize-customer-reviews",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "can-i-delete-bad-google-reviews",
    category: "Reviews & UGC",
    question: "Can I delete bad Google reviews?",
    h1: "Can I Delete Bad Google Reviews?",
    tldr:
      "You cannot delete a Google review you simply disagree with. You can request removal of reviews that violate Google's policies (fake, off-topic, hate speech, conflict of interest, etc.). Google removes about 25-35% of properly flagged reviews. The best long-term strategy is generating more positive reviews to dilute the bad ones.",
    metaDescription:
      "What you can and can't do about negative Google reviews - removal rules, the flagging process, and the better long-term strategy.",
    sections: [
      {
        heading: "When Google will remove a review",
        body: "Google's review policies allow removal for: spam (repetitive or fake content), off-topic (a rant about a personal issue unrelated to the business experience), restricted content (hate speech, adult content, illegal activity), impersonation, conflict of interest (competitor, ex-employee), or personal information disclosure.\n\nGoogle will NOT remove reviews because: the rating is low, you disagree with the content, you don't recognize the reviewer, the review is harsh but truthful, the customer experience went badly.",
      },
      {
        heading: "The flagging process",
        body: "From your Google Business Profile dashboard, find the review, click the three-dot menu, and choose 'Report review.' Pick the specific policy violation. Google's team reviews in 3-15 days. If denied, you can appeal once.\n\nApproved removal rate ranges 25-35% across thousands of flagged reviews. The more specific your policy citation, the higher your odds.",
      },
    ],
    keyFacts: [
      "Google does not remove reviews simply for being negative or low-star.",
      "Approximately 25-35% of properly flagged reviews are removed.",
      "Appeal is available once per flagged review.",
      "Adding 10 new positive reviews to a profile reduces a single bad review's impact by ~75%.",
      "Defamation lawsuits to remove reviews are rare and rarely cost-effective.",
    ],
    steps: [
      "Confirm the review actually violates a Google policy.",
      "Flag through your Business Profile dashboard.",
      "Wait 3-15 days for Google's decision.",
      "Appeal once if denied.",
      "Build a steady flow of new positive reviews regardless of outcome.",
    ],
    mistakes: [
      "Flagging reviews you simply dislike.",
      "Engaging publicly with bad reviewers in hostile tones.",
      "Generating fake reviews to drown out real ones.",
      "Letting one bad review define your strategy - dilute it instead.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Automates the influx of new positive reviews to dilute any single bad one.",
        href: "/",
      },
      {
        name: "Google Business Profile",
        description: "Free. Required for flagging and replying.",
      },
      {
        name: "Birdeye or Reputation",
        description: "Multi-platform review management with response tools.",
      },
    ],
    related: [
      "how-do-i-handle-fake-reviews",
      "how-do-i-respond-to-negative-reviews",
      "how-do-restaurants-handle-bad-yelp-reviews",
      "how-do-i-get-more-google-reviews-for-my-business",
      "how-do-i-get-customers-to-leave-positive-reviews",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
];
