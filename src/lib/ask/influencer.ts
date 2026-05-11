import type { AskQuestion } from "./types";

const PUB = "2026-04-12";
const MOD = "2026-05-10";

export const INFLUENCER_QUESTIONS: AskQuestion[] = [
  {
    slug: "how-do-small-businesses-find-influencers",
    category: "Influencer marketing",
    question: "How do small businesses find influencers?",
    h1: "How Do Small Businesses Find Influencers?",
    tldr:
      "Small businesses find influencers by searching Instagram/TikTok for local hashtags and location tags, using a creator marketplace (Aspire, Modash, Social Perks), or asking existing customers if any of them post. Focus on micro-influencers (1K-25K followers) - they're affordable and convert better than larger creators.",
    metaDescription:
      "How small businesses actually find influencers - search tactics, platforms, and how to spot creators who'll drive real business.",
    sections: [
      {
        heading: "Three sourcing channels that work",
        body: "First, manual search. On Instagram, search your neighborhood hashtag (#brooklyneats) and your industry hashtag (#brooklynbarber). Open each post, check the creator's profile. Save anyone with 1K-25K followers who posts authentically in your niche. Repeat on TikTok. This takes 2-3 hours and produces 20-50 qualified leads.\n\nSecond, marketplaces. Aspire, Modash, GRIN, and Social Perks let you filter creators by location, niche, follower count, and engagement rate. Faster than manual search but you'll need a budget (most start at $99-$500/month).\n\nThird, your customer base. Many small businesses are sitting on influencer customers who already love them. Ask. A single line at checkout - 'Do you post on Instagram or TikTok?' - surfaces creators ready to collaborate.",
      },
      {
        heading: "How to evaluate fit",
        body: "Three filters: audience location (do their followers live near you?), engagement rate (likes ÷ followers; 3%+ is healthy for micros), and recent posting cadence (do they post weekly?). Skip anyone with engagement under 1.5%, no posts in 30 days, or an audience that doesn't overlap with your customer base.",
      },
    ],
    keyFacts: [
      "Micro-influencers (1K-25K followers) have 2-3x higher engagement rates than larger creators.",
      "About 70% of small businesses that try influencer marketing find creators via Instagram search, not paid platforms.",
      "A typical small business runs 3-12 influencer partnerships per year.",
      "Creator marketplaces charge $99-$999/month plus per-campaign fees.",
      "Geographic targeting matters: a creator with 5K followers in your city beats one with 50K nationwide.",
    ],
    steps: [
      "Search 3-5 local hashtags. Save 20+ candidate accounts.",
      "Check each for engagement rate (free tools: Modash, HypeAuditor).",
      "Confirm audience geography matches yours.",
      "DM 10-15 with a personalized note and clear offer.",
      "Track which creators drive measurable business. Repeat with winners.",
    ],
    mistakes: [
      "Chasing follower count. A 5K-follower local creator beats a 100K creator across the country.",
      "Falling for inflated engagement. Buy a quick audit tool to check authenticity.",
      "Ignoring TikTok. For most consumer small businesses, TikTok creators outperform Instagram in 2026.",
      "Treating creators as ads. The best partnerships build over multiple posts and authentic enthusiasm.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Built-in creator marketplace with location, niche, and engagement filters. FTC-compliant briefs included.",
        href: "/",
      },
      {
        name: "Modash",
        description: "Influencer search and analytics, $99+/month.",
      },
      {
        name: "Instagram + TikTok manual search",
        description: "Free, time-intensive, often the highest-quality leads.",
      },
    ],
    related: [
      "how-much-do-micro-influencers-charge",
      "what-makes-a-good-influencer-for-a-small-business",
      "how-do-restaurants-get-influencers-to-post",
      "whats-the-best-platform-to-find-small-business-influencers",
      "how-do-i-pay-influencers-fairly",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "how-much-do-micro-influencers-charge",
    category: "Influencer marketing",
    question: "How much do micro-influencers charge?",
    h1: "How Much Do Micro-Influencers Charge?",
    tldr:
      "Micro-influencers (1K-25K followers) typically charge $50-$500 per post for cash deals. Many will accept product-only trades, especially for local small businesses. Rates depend on platform, content type (Reel vs. photo), and exclusivity.",
    metaDescription:
      "Real micro-influencer pricing in 2026 - per post, per Reel, per Story, by platform, by industry. Plus when product-only deals work.",
    sections: [
      {
        heading: "Going rates by tier",
        body: "Industry surveys (Influencer Marketing Hub, Aspire, Klear) put 2026 micro-influencer rates at: $50-$150 per Instagram photo, $100-$300 per Reel, $25-$75 per Story slide. TikTok creators of similar size charge slightly more: $100-$400 per video. Local food, lifestyle, and beauty creators often accept product-only trades worth $50-$200 retail.\n\nNano-influencers (under 1K followers) usually work for product only. Mid-tier (25K-100K) start at $300-$1,000 per post. Macro (100K+) start at $1,000 and go up fast.",
      },
      {
        heading: "What changes the price",
        body: "Five things push rates up: exclusivity (you don't want them posting for competitors), usage rights (you want to repost the content as an ad), content type (Reels > photos > Stories), package deals (multi-post campaigns), and turnaround time (rush jobs cost 50%+ more). Always negotiate; published rates are starting points.",
      },
    ],
    keyFacts: [
      "Micro-influencer Reel rates average $100-$300 (Influencer Marketing Hub, 2024).",
      "60-70% of micro-influencers accept product-only deals from local businesses.",
      "Usage rights typically add 20-50% to the base rate.",
      "Exclusivity clauses can add 50-100% to the base rate.",
      "TikTok creators are typically 15-30% more expensive than Instagram creators of the same follower size.",
    ],
    steps: [
      "Decide budget range and what content you need.",
      "Get quotes from 5-10 creators to understand market rate.",
      "Start with a single post or Reel to test fit.",
      "Negotiate usage rights upfront if you plan to repost as ads.",
      "If results are good, sign a 3-6 month deal for better rates.",
    ],
    mistakes: [
      "Paying list price. Almost everything is negotiable.",
      "Skipping usage rights. You'll pay extra later to repost content.",
      "Lowballing without offering trade value (product, exclusivity).",
      "Paying upfront without escrow or clear deliverables.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Standardizes pricing and pays creators automatically on delivery - no chasing invoices.",
        href: "/",
      },
      {
        name: "Aspire or GRIN",
        description: "Established marketplaces with built-in payment processing.",
      },
      {
        name: "Stripe Connect",
        description: "For paying creators directly with proper tax handling.",
      },
    ],
    related: [
      "how-do-i-pay-influencers-fairly",
      "how-do-small-businesses-find-influencers",
      "what-makes-a-good-influencer-for-a-small-business",
      "how-do-i-track-influencer-marketing-roi",
      "do-influencers-actually-drive-sales",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "how-do-i-pay-influencers-fairly",
    category: "Influencer marketing",
    question: "How do I pay influencers fairly?",
    h1: "How Do I Pay Influencers Fairly?",
    tldr:
      "Pay influencers fairly by anchoring to market rates ($50-$500 for micros), respecting their time (don't expect 5 revisions for $100), paying within 14 days of delivery, and being upfront about budget and usage rights. Fair pay leads to better content and repeat partnerships.",
    metaDescription:
      "What 'fair pay' for influencers actually looks like - benchmarks, terms, and the mistakes that destroy creator relationships.",
    sections: [
      {
        heading: "What fair pay includes",
        body: "Fair pay isn't just the dollar amount. It's the full package: a clear scope (one Reel, one Story, no revisions), prompt payment (within 14 days), upfront clarity on usage rights, no surprise asks (don't request a Story slide a week later), and respectful treatment in negotiations.\n\nFor cash deals, $1-$5 per 1,000 followers is a rough floor for Reels (so $5-$125 for a 25K-follower creator). For product-only trades, the product retail value should be at least 2-3x what you'd pay an ad agency to produce equivalent content (because the creator also brings audience).",
      },
      {
        heading: "Common unfair patterns to avoid",
        body: "Scope creep (you agreed to one Reel, you ask for three). Endless revisions. Late payment. Holding usage rights forever without paying for them. Asking for exclusivity without paying for it. All of these turn the partnership transactional in the worst way and damage your reputation in creator communities.",
      },
    ],
    keyFacts: [
      "Industry benchmark: $1-$5 per 1,000 followers per Instagram post (Influencer Marketing Hub).",
      "Net-15 payment terms are standard; net-30 is acceptable; longer than that is unprofessional.",
      "Creators talk to each other. Underpaying or paying late spreads quickly.",
      "Repeat partnerships at fair rates outperform one-off cheap deals by ~3x in ROI.",
      "Usage rights typically cost an additional 20-50% of the base rate.",
    ],
    steps: [
      "Research market rates for the creator's size and platform.",
      "Quote a clear, complete package - content, usage rights, exclusivity.",
      "Confirm everything in writing before they start.",
      "Pay within 14 days of delivery, automatically if possible.",
      "Reach out for a second collaboration if the first went well.",
    ],
    mistakes: [
      "Paying 'in exposure' for creators with more reach than you do.",
      "Adding deliverables after the deal is signed.",
      "Paying 60-90 days out without warning.",
      "Treating creators as vendors instead of partners.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Automated, instant creator payment on verified delivery. Industry-fair rate suggestions built in.",
        href: "/",
      },
      {
        name: "Stripe Connect",
        description: "Handles tax forms (1099s) and international payments.",
      },
      {
        name: "Aspire or GRIN",
        description: "Built-in escrow and payment flows.",
      },
    ],
    related: [
      "how-much-do-micro-influencers-charge",
      "do-i-need-an-influencer-contract",
      "how-do-i-write-an-influencer-brief",
      "how-do-small-businesses-find-influencers",
      "what-is-the-difference-between-an-influencer-and-an-affiliate",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "what-is-the-difference-between-an-influencer-and-an-affiliate",
    category: "Influencer marketing",
    question: "What is the difference between an influencer and an affiliate?",
    h1: "What Is the Difference Between an Influencer and an Affiliate?",
    tldr:
      "An influencer is paid (cash or product) to create content; an affiliate is paid a commission for each sale they drive via a unique link or code. Influencer marketing pays for reach and content; affiliate marketing pays only for results. Many creators do both.",
    metaDescription:
      "Influencer vs. affiliate - the real differences in payment model, content, contracts, and FTC compliance.",
    sections: [
      {
        heading: "Payment model is the core distinction",
        body: "Influencers get paid upfront (or in product) regardless of whether their post drives sales. Affiliates get paid only when someone uses their unique link or code to buy. The same person can act as both - posting content as an influencer (paid upfront) and earning ongoing commission on every sale (as an affiliate).\n\nFor businesses, influencer marketing buys awareness, content, and social proof. Affiliate marketing buys results - but it can take months to ramp because affiliates need conversion data before they invest content effort.",
      },
      {
        heading: "Compliance differs slightly",
        body: "Both must follow FTC disclosure rules (#ad, #partner, 'paid partnership'). Affiliate content has a stricter additional rule: creators must disclose the affiliate relationship even on organic posts that include a code or link. Many programs require a specific disclosure phrase like 'affiliate link.'\n\nFrom a contract standpoint, influencer agreements specify deliverables and pay; affiliate agreements specify commission rate, cookie window, and exclusivity (or lack thereof).",
      },
    ],
    keyFacts: [
      "Affiliate commission rates average 5-30% for physical products, 20-50% for digital products (Affilimate, 2024).",
      "Influencer-affiliate hybrid models grew 40%+ in 2024-2025.",
      "Standard affiliate cookie windows are 30-90 days.",
      "Affiliates with under 10K followers convert at higher rates than larger creators because their audiences trust them more.",
      "Both influencers and affiliates must comply with FTC disclosure rules.",
    ],
    steps: [
      "Decide what you're buying: awareness/content (influencer) or pure sales (affiliate).",
      "If both, offer a hybrid: upfront fee plus commission.",
      "For affiliate, pick software (Refersion, Impact, GoAffPro for Shopify).",
      "Set fair commission rates and cookie window.",
      "Track results separately - they have different success metrics.",
    ],
    mistakes: [
      "Calling everyone an 'influencer' when affiliates fit better.",
      "Running affiliate programs without conversion tracking infrastructure.",
      "Setting affiliate commissions so low (under 5%) that no one promotes you.",
      "Missing FTC disclosure on affiliate content.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Hybrid influencer/affiliate program in one - upfront content fees plus tracked commission.",
        href: "/",
      },
      {
        name: "Refersion or Impact",
        description: "Dedicated affiliate tracking platforms.",
      },
      {
        name: "GoAffPro (Shopify)",
        description: "Lightweight affiliate program for Shopify stores.",
      },
    ],
    related: [
      "do-influencers-actually-drive-sales",
      "how-do-i-track-influencer-marketing-roi",
      "how-do-i-pay-influencers-fairly",
      "what-are-ftc-rules-for-influencer-disclosure",
      "do-i-need-an-influencer-contract",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "do-influencers-actually-drive-sales",
    category: "Influencer marketing",
    question: "Do influencers actually drive sales?",
    h1: "Do Influencers Actually Drive Sales?",
    tldr:
      "Yes - influencers drive measurable sales when the creator's audience matches your customer base, content is authentic, and you track properly with unique codes or links. Micro-influencers with engaged local audiences consistently deliver 3-8x ROAS. Macro-influencer campaigns are riskier and harder to attribute.",
    metaDescription:
      "Real data on whether influencer marketing drives sales - ROAS benchmarks, what works, and how to track it accurately.",
    sections: [
      {
        heading: "When it works and when it doesn't",
        body: "Influencer marketing works when three conditions are met: (1) audience-product fit (the creator's followers actually want what you sell), (2) content authenticity (the post looks like the creator's normal voice, not a corporate ad), and (3) trackable conversion (you can see which sales came from which creator).\n\nIt fails when any of those break. Pairing a tech reviewer with a beauty product wastes money. A scripted, over-produced ad-style post gets ignored. And without tracking codes or affiliate links, you'll have no idea what worked.",
      },
      {
        heading: "Benchmark numbers",
        body: "Across thousands of small business campaigns, micro-influencer ROAS averages 3-8x for product brands and 2-5x for service businesses. Macro-influencer campaigns have a wider variance - 1-15x depending heavily on fit. Local food and beauty businesses tend to see the strongest returns; B2B and complex services tend to see weaker returns.",
      },
    ],
    keyFacts: [
      "Average influencer marketing ROAS is $4.87-$5.78 per $1 spent (Influencer Marketing Hub, 2024).",
      "Micro-influencer campaigns outperform macro campaigns on a per-dollar basis in 70% of cases.",
      "60% of consumers say they've purchased a product after seeing it from an influencer (Matter Communications, 2024).",
      "Authentic-feeling creator content converts 4-10x better than ad-style content.",
      "Unique codes/links recover 40-80% more attributed sales than relying on post engagement alone.",
    ],
    steps: [
      "Define what 'drives sales' means: signups, purchases, bookings.",
      "Give every creator a unique code or link.",
      "Run at least 5-10 creator partnerships to get statistical signal.",
      "Track 30 days after each post for delayed conversion.",
      "Double down on winners; cut losers fast.",
    ],
    mistakes: [
      "Judging a single influencer post on day one. Most conversion happens days 3-30.",
      "Running campaigns without tracking codes.",
      "Choosing creators based on follower count instead of fit.",
      "Letting the creator's audience and yours mismatch - the most common cause of zero-ROI campaigns.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Unique tracked codes per creator + automated attribution. ROAS visible in dashboard.",
        href: "/",
      },
      {
        name: "Refersion",
        description: "Affiliate tracking dedicated software.",
      },
      {
        name: "UTM tracking",
        description: "Free. Use Google Analytics 4 to attribute social referrals.",
      },
    ],
    related: [
      "how-do-i-track-influencer-marketing-roi",
      "how-much-do-micro-influencers-charge",
      "what-makes-a-good-influencer-for-a-small-business",
      "what-is-the-difference-between-an-influencer-and-an-affiliate",
      "how-do-small-businesses-find-influencers",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "how-do-i-track-influencer-marketing-roi",
    category: "Influencer marketing",
    question: "How do I track influencer marketing ROI?",
    h1: "How Do I Track Influencer Marketing ROI?",
    tldr:
      "Track influencer marketing ROI with three measurements: unique discount codes (cleanest attribution), UTM-tagged links (web traffic), and post-campaign surveys ('How did you hear about us?'). Combine all three because each captures a different slice. Total ROI = attributed revenue ÷ total campaign cost.",
    metaDescription:
      "How to actually measure influencer ROI - codes, UTMs, attribution windows, and the math that matters.",
    sections: [
      {
        heading: "The three-method stack",
        body: "Unique discount codes are the cleanest attribution. Give every creator a code like 'JESS15.' Every order using that code is unambiguously attributed. The downside: not every customer uses the code.\n\nUTM-tagged links capture the web traffic creators send. The downside: people often see a creator post but search later, breaking the link.\n\nPost-campaign surveys ('How did you find us?') catch what codes and links miss. The downside: imprecise, but valuable for measuring brand lift.\n\nUse all three. The combined picture is roughly 2x more complete than any single method.",
      },
      {
        heading: "Attribution windows and the ROI formula",
        body: "Most micro-influencer impact happens within 7-14 days of posting; some carries 30-60 days. Use a 30-day attribution window unless you have data justifying longer.\n\nFormula: ROI = (attributed gross profit - campaign cost) ÷ campaign cost. Include the creator's fee, gifted product cost, and any platform fees. A 3x ROI means $3 of gross profit per $1 spent.",
      },
    ],
    keyFacts: [
      "Discount codes typically capture 30-60% of true attributed sales.",
      "UTM links capture another 20-40% (audience members who clicked through).",
      "Post-purchase surveys recover an additional 20-30% of attribution.",
      "Average attribution window for influencer campaigns is 14-30 days.",
      "Multi-method attribution gives ~2x more complete data than single-method.",
    ],
    steps: [
      "Set up a unique discount code for every creator.",
      "Create a unique UTM-tagged link for every post.",
      "Add 'How did you hear about us?' to your checkout or post-purchase email.",
      "Pull all three sources into a single tracking sheet.",
      "Calculate ROI per creator. Repeat with winners; cut losers.",
    ],
    mistakes: [
      "Using the same code or link across creators - kills attribution.",
      "Judging ROI before the attribution window closes.",
      "Ignoring brand lift - awareness has real but delayed value.",
      "Counting only direct sales. Influencer content also produces email signups, follows, and remarketing audiences.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Automatic unique code/link per creator + attribution dashboard.",
        href: "/",
      },
      {
        name: "Google Analytics 4",
        description: "Free. Tracks UTM-tagged influencer traffic.",
      },
      {
        name: "Shopify or Square reports",
        description: "Built-in discount code performance tracking.",
      },
    ],
    related: [
      "do-influencers-actually-drive-sales",
      "what-is-the-roi-of-instagram-marketing-for-restaurants",
      "what-is-a-good-customer-acquisition-cost",
      "how-much-do-micro-influencers-charge",
      "what-marketing-channels-have-the-highest-roi",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "what-makes-a-good-influencer-for-a-small-business",
    category: "Influencer marketing",
    question: "What makes a good influencer for a small business?",
    h1: "What Makes a Good Influencer for a Small Business?",
    tldr:
      "A good influencer for a small business has a locally-relevant audience, an engagement rate above 3%, content that matches your aesthetic, and a track record of authentic recommendations rather than ad-heavy posts. Follower count is the least important variable.",
    metaDescription:
      "How to evaluate influencer fit for a small business - the four signals that matter, plus red flags to skip.",
    sections: [
      {
        heading: "The four signals that matter",
        body: "First, audience geography. A 50K-follower creator whose audience lives across the country won't drive walk-in business to your single-location shop. A 3K-follower creator who lives in your neighborhood and posts about local spots is gold.\n\nSecond, engagement rate. Calculate as (likes + comments) ÷ followers. Anything above 3% is healthy for micros. Below 1.5%, suspect bought followers.\n\nThird, content fit. Browse 20 recent posts. Does their aesthetic match your brand? Could you imagine your product appearing in their feed without it feeling off?\n\nFourth, authenticity ratio. What share of their recent posts are sponsored? If more than 40% are sponsored, audience trust is eroding. Look for creators with 70%+ organic posts.",
      },
      {
        heading: "Red flags to skip",
        body: "Sudden follower spikes (check tools like Modash for growth charts). Engagement that's all heart emojis with no real comments. Bio with no contact info. No posts in 30+ days. Asking for cash upfront before agreeing to deliverables. Refusing FTC disclosure.",
      },
    ],
    keyFacts: [
      "Engagement rate above 3% is the threshold for healthy micro-influencer accounts.",
      "Audience-creator geographic overlap is the #1 predictor of small-business ROI.",
      "Creators with 30%+ sponsored posts see audience trust drop ~25%.",
      "Genuine fit content converts 4-10x better than mismatched content.",
      "Follower count correlates weakly with ROI; engagement and fit correlate strongly.",
    ],
    steps: [
      "List 20-30 candidate creators based on hashtag/location search.",
      "Filter by engagement rate (>3%).",
      "Confirm audience geography overlaps with yours.",
      "Browse their last 20 posts for fit and authenticity.",
      "Reach out to your top 5. Start with one paid partnership to test fit.",
    ],
    mistakes: [
      "Picking by follower count alone.",
      "Skipping the engagement check.",
      "Not browsing recent content - aesthetic fit isn't optional.",
      "Working with anyone who refuses FTC disclosure.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Pre-vetted creator pool with engagement and geography filters.",
        href: "/",
      },
      {
        name: "Modash or HypeAuditor",
        description: "Audit creator authenticity and audience quality.",
      },
      {
        name: "Instagram + TikTok native search",
        description: "Free. Manual but produces high-fit candidates.",
      },
    ],
    related: [
      "how-do-small-businesses-find-influencers",
      "how-do-i-write-an-influencer-brief",
      "do-influencers-actually-drive-sales",
      "how-much-do-micro-influencers-charge",
      "whats-the-best-platform-to-find-small-business-influencers",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "how-do-i-write-an-influencer-brief",
    category: "Influencer marketing",
    question: "How do I write an influencer brief?",
    h1: "How Do I Write an Influencer Brief?",
    tldr:
      "Write an influencer brief that includes: campaign goal, deliverables (exact format and count), key messaging points (3-5 max), what to avoid, posting timeline, usage rights, FTC disclosure requirement, and payment terms. Keep it under one page. Trust the creator on style.",
    metaDescription:
      "A complete influencer brief template - what to include, what to skip, and how to give creators enough freedom to do their best work.",
    sections: [
      {
        heading: "The eight-section template",
        body: "(1) Campaign goal in one sentence - what success looks like. (2) Deliverables - exact format (1 Reel + 2 Stories), length, and posting platform. (3) Key messages - 3-5 bullets the creator should weave in naturally. (4) What to avoid - 2-3 things (don't mention competitor X, don't show alcohol if you sell to kids). (5) Timeline - when content is due, when it goes live. (6) Usage rights - what you can repost and for how long. (7) FTC disclosure - required language. (8) Payment - amount and timing.\n\nKeep it under one page. Long briefs are red flags for creators - they signal that the brand doesn't trust them.",
      },
      {
        heading: "What to leave out",
        body: "Don't script the post word-for-word. The whole reason you hired a creator is their voice. Don't dictate exact filters, music, or shot lists unless brand guidelines require it. Don't list 15 hashtags - 3-5 is plenty. Don't demand approval over multiple rounds; one round of comments is fair.",
      },
    ],
    keyFacts: [
      "Briefs under one page outperform multi-page briefs in creator satisfaction and content quality (Influencer Marketing Hub, 2024).",
      "Scripted content underperforms authentic content by 4-10x.",
      "Allowing one revision round is industry standard; more is friction.",
      "Most creators want 7-14 days from brief to post.",
      "Briefs without FTC disclosure language put both creator and brand at legal risk.",
    ],
    steps: [
      "Write the goal in one sentence.",
      "List exact deliverables - format, count, length, platform.",
      "Add 3-5 key messages.",
      "Note 2-3 things to avoid.",
      "Specify timeline, usage rights, FTC disclosure, and payment.",
    ],
    mistakes: [
      "Writing a brief longer than one page.",
      "Scripting the content word-for-word.",
      "Demanding multiple revision rounds.",
      "Skipping FTC disclosure language.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "FTC-compliant brief templates built in. Customize for each creator.",
        href: "/",
      },
      {
        name: "Google Docs or Notion",
        description: "Share briefs with comment access for back-and-forth.",
      },
      {
        name: "Loom",
        description: "Record a 60-second video brief - higher response rates than written briefs.",
      },
    ],
    related: [
      "do-i-need-an-influencer-contract",
      "what-are-ftc-rules-for-influencer-disclosure",
      "how-do-i-pay-influencers-fairly",
      "how-do-small-businesses-find-influencers",
      "what-makes-a-good-influencer-for-a-small-business",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "whats-the-best-platform-to-find-small-business-influencers",
    category: "Influencer marketing",
    question: "What's the best platform to find small business influencers?",
    h1: "What's the Best Platform to Find Small Business Influencers?",
    tldr:
      "For most small businesses, the best platforms are Aspire, Modash, GRIN, and Social Perks. Each has strengths: Aspire for brand-creator marketplaces, Modash for search/discovery, GRIN for enterprise workflows, Social Perks for FTC-compliant local campaigns at scale. For under $200/month, Modash is often the right starting point.",
    metaDescription:
      "Compared: the leading influencer platforms for small businesses - pricing, strengths, and which one fits your stage.",
    sections: [
      {
        heading: "Platforms compared",
        body: "Aspire ($500+/month): mature marketplace, strong creator-application workflow, best for established brands running 5+ campaigns/month.\n\nModash ($99-$300/month): search-first - great for finding creators by niche, location, audience demographics. Best for businesses who want to find creators themselves rather than receive applications.\n\nGRIN ($1,500+/month): enterprise-grade workflow software. Overkill for most small businesses.\n\nSocial Perks: built specifically for small businesses, with FTC-compliant briefs, automated tracking, instant creator payment, and pricing scaled to micro-influencer programs. Often the most affordable for a 5-15 creators/month program.",
      },
      {
        heading: "Free alternatives",
        body: "Direct Instagram and TikTok search costs nothing and produces high-quality leads if you have the time. Many successful small business campaigns start this way. Move to a paid platform once outreach volume exceeds 15-20 creators per month - that's when the time savings pay back the subscription.",
      },
    ],
    keyFacts: [
      "Aspire serves ~20,000 brands and 1M+ creators (Aspire company data, 2024).",
      "Modash claims 250M+ creator profiles indexed.",
      "Most small businesses use 1-2 platforms; using 3+ wastes budget.",
      "Direct search on Instagram or TikTok costs $0 and remains the most-used method.",
      "Average all-in cost (platform + creator fees) for a 10-creator/month program is $1,500-$5,000.",
    ],
    steps: [
      "Decide if you want search-first (you pick creators) or marketplace-first (creators apply to you).",
      "Try a free trial on one platform.",
      "Run 5 creators through that platform before paying.",
      "If results are good, expand. If not, switch.",
      "Keep direct search as a backup - it's always free.",
    ],
    mistakes: [
      "Paying for enterprise tools at small-business scale.",
      "Subscribing to multiple platforms simultaneously.",
      "Ignoring direct search - many of the best creators don't list on platforms.",
      "Picking based on features instead of fit (search vs. marketplace).",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Best fit for small business creator programs at $50-500/month scale.",
        href: "/",
      },
      {
        name: "Modash",
        description: "Best search-first option for finding niche creators.",
      },
      {
        name: "Aspire",
        description: "Best marketplace option for higher-volume programs.",
      },
    ],
    related: [
      "how-do-small-businesses-find-influencers",
      "how-much-do-micro-influencers-charge",
      "what-makes-a-good-influencer-for-a-small-business",
      "how-do-i-track-influencer-marketing-roi",
      "how-do-restaurants-get-influencers-to-post",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
  {
    slug: "do-i-need-an-influencer-contract",
    category: "Influencer marketing",
    question: "Do I need an influencer contract?",
    h1: "Do I Need an Influencer Contract?",
    tldr:
      "Yes - even for product-only deals, you need at least a one-page written agreement. It should cover deliverables, timeline, usage rights, FTC disclosure, exclusivity (if any), and payment. A handshake or DM thread is not enough once a dispute arises.",
    metaDescription:
      "When influencer contracts are necessary, what to include, free templates, and the common pitfalls that cause disputes.",
    sections: [
      {
        heading: "What a basic contract covers",
        body: "Seven sections cover most disputes: (1) parties (legal names and entities), (2) deliverables (exact format, count, platform), (3) timeline (when content posts and how long it stays up), (4) usage rights (what you can repost, for how long, on which channels), (5) compensation (amount, timing, payment method), (6) FTC compliance (specific disclosure language required), (7) termination clause (what happens if either side cancels).\n\nFor low-stakes product-only deals, a one-page agreement is fine. For multi-thousand-dollar partnerships, use a longer template or have a lawyer review.",
      },
      {
        heading: "When you really need a lawyer",
        body: "Three situations warrant attorney review: high dollar value ($5K+ per deal), long exclusivity periods (3+ months), or content where IP ownership matters (you're licensing the creator's IP, or they're using yours). Otherwise, free templates from Aspire, Klear, or Social Perks are sufficient for most small business creator programs.",
      },
    ],
    keyFacts: [
      "About 30% of small business creator partnerships happen without any written agreement - and these account for the majority of disputes.",
      "Standard exclusivity period for paid partnerships is 14-30 days.",
      "Typical usage rights duration: 30-90 days for organic repost; 6-12 months for paid ad use.",
      "FTC requires disclosure in the post itself, not just in the bio or a separate post.",
      "A one-page contract takes 10 minutes to fill out and prevents 90%+ of disputes.",
    ],
    steps: [
      "Use a free template (Social Perks, Aspire, or any creator-platform library).",
      "Fill in the seven core fields.",
      "Email it to the creator before they start.",
      "Both parties sign (digital signature is fine via Docusign or HelloSign).",
      "Save a copy. Reference it if any dispute comes up.",
    ],
    mistakes: [
      "Relying on DM threads as 'agreements.'",
      "Skipping usage rights - then trying to repost content later.",
      "Omitting FTC disclosure language - exposes you legally.",
      "Demanding exclusivity without paying for it.",
    ],
    tools: [
      {
        name: "Social Perks",
        description: "Built-in one-page contract template, FTC-compliant, digitally signed.",
        href: "/",
      },
      {
        name: "Docusign or HelloSign",
        description: "Free tiers for small-volume e-signatures.",
      },
      {
        name: "Aspire templates",
        description: "Free downloadable creator agreement templates.",
      },
    ],
    related: [
      "what-are-ftc-rules-for-influencer-disclosure",
      "how-do-i-write-an-influencer-brief",
      "how-do-i-pay-influencers-fairly",
      "how-do-small-businesses-find-influencers",
      "what-is-the-difference-between-an-influencer-and-an-affiliate",
    ],
    datePublished: PUB,
    dateModified: MOD,
  },
];
