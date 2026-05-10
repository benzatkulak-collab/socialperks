// Competitor data for /vs/[competitor] comparison pages.
// Content is researched, fair, and intentionally honest about
// where competitors are stronger — Google penalizes thin/biased
// comparisons, and small business owners reward clarity.

export interface ComparisonRow {
  feature: string;
  socialPerks: string;
  competitor: string;
}

export interface Competitor {
  slug: string;
  name: string;
  tagline: string;
  founded: string;
  headquarters: string;
  bestFor: string;
  pricing: string;
  freeTier: string;
  targetAudience: string;
  aiFeatures: string;
  integrations: string;
  // Long-form sections
  table: ComparisonRow[];
  whenCompetitorIsBetter: string[];
  whenSocialPerksIsBetter: string[];
  pricingDifference: string;
  featureDifference: string;
  bottomLine: string;
}

export const COMPETITORS: Competitor[] = [
  {
    slug: "yotpo",
    name: "Yotpo",
    tagline: "eCommerce retention marketing suite",
    founded: "2011",
    headquarters: "New York / Tel Aviv",
    bestFor:
      "Mid-market and enterprise Shopify Plus, BigCommerce, and Magento brands that want reviews, loyalty, SMS, and subscriptions all under one vendor.",
    pricing:
      "Bundled retention suite. Reviews & UGC starts free for very small stores; growth plans typically start around $79/mo and the loyalty, SMS, and subscriptions modules are quoted separately. Most multi-product setups land in the $300–$1,500/mo range, with enterprise deals quoted custom.",
    freeTier:
      "Free Reviews plan up to 50 monthly orders. Loyalty, SMS, and email tiers do not have a true forever-free option above the smallest stores.",
    targetAudience:
      "Shopify, BigCommerce, and Magento merchants doing $500k–$50M in annual revenue who already run paid acquisition and want to bolt retention on top.",
    aiFeatures:
      "AI review summarization, sentiment tagging, generative SMS copy assist, and product-page review highlights. Most of Yotpo's AI is buyer-facing (smart filters, summary blocks) rather than agentic campaign generation.",
    integrations:
      "Deep Shopify, BigCommerce, Magento, Salesforce Commerce Cloud, Klaviyo, Gorgias, Meta, Google Shopping, TikTok Shop, and Zapier.",
    table: [
      { feature: "Starting price", socialPerks: "Free forever (paid from $19/mo)", competitor: "Free up to 50 orders/mo, paid from ~$79/mo" },
      { feature: "Built for", socialPerks: "Local & service businesses + DTC", competitor: "Mid-market & enterprise eCommerce" },
      { feature: "AI campaign generation", socialPerks: "Yes — full plan, copy, schedule", competitor: "Limited — review summaries & SMS assist" },
      { feature: "Customer-as-marketer model", socialPerks: "Yes — perks for posts, reviews, referrals", competitor: "Reviews + loyalty points (not perk-for-post)" },
      { feature: "Influencer / UGC marketplace", socialPerks: "Yes — built-in", competitor: "No native marketplace" },
      { feature: "Local SEO tools", socialPerks: "Yes — Google Business Profile flows", competitor: "No" },
      { feature: "Time to first campaign", socialPerks: "Under 10 minutes", competitor: "Days to weeks (implementation)" },
      { feature: "Free tier", socialPerks: "Yes — unlimited time", competitor: "Limited free reviews tier only" },
    ],
    whenCompetitorIsBetter: [
      "You run a 7- or 8-figure Shopify Plus or BigCommerce store and want one vendor for reviews, loyalty, SMS, and subscriptions.",
      "You need product-page review widgets that pass Google's seller-rating schema and feed into Google Shopping ads at scale.",
      "You already use Klaviyo or Attentive and want a deep two-way sync for SMS retention.",
      "You have an in-house growth team that can spend weeks on implementation and want a polished enterprise control panel.",
      "You sell physical goods and want a full subscription-billing engine bundled with reviews.",
    ],
    whenSocialPerksIsBetter: [
      "You're a local business — a salon, gym, restaurant, dentist — and Yotpo's eCommerce-first model doesn't fit your day-to-day.",
      "You want to reward customers for posting on Instagram or TikTok, not only for leaving on-site reviews.",
      "You don't have a marketing manager. You want an AI agent that generates the campaign, the copy, the schedule, and the perk structure for you.",
      "You'd rather pay $19–$79/mo than $300–$1,500/mo for a stack you'll only half-use.",
      "You want a forever-free tier with no order-volume cap so you can prove ROI before paying.",
    ],
    pricingDifference:
      "Yotpo's published pricing starts free but the practical entry point for most growing brands is $79–$199/mo for Reviews Growth, with Loyalty, SMS, and Subscriptions quoted as separate add-ons that frequently push total spend past $500/mo. Social Perks publishes a flat $19/mo Starter and $79/mo Pro that include AI campaigns, perk fulfillment, influencer access, and review collection in one bundle. For shops doing under 1,000 orders a month, Social Perks is usually 4–10x cheaper for a comparable feature set; above 10,000 orders/month with deep ERP integrations, Yotpo's enterprise tier may justify its cost.",
    featureDifference:
      "Yotpo wins on: depth of eCommerce integrations, on-site review widgets, subscription billing, and enterprise reporting. Social Perks wins on: AI agent that generates entire campaigns end-to-end, the perk-for-post model that turns customers into micro-influencers, native influencer marketplace, local-SEO tooling, and 25-platform action library. Yotpo treats the customer as a reviewer; Social Perks treats the customer as a distribution channel.",
    bottomLine:
      "If you're running an enterprise eCommerce brand and need a single retention vendor with deep Shopify integration, Yotpo is the safer pick. If you're a local or growing business that wants AI to actually run campaigns and turn customers into a marketing team, Social Perks will get you to results faster and cheaper.",
  },
  {
    slug: "brandbassador",
    name: "Brandbassador",
    tagline: "Ambassador and creator program management",
    founded: "2016",
    headquarters: "Oslo, Norway",
    bestFor:
      "DTC fashion, beauty, and lifestyle brands that already have hundreds or thousands of fans they want to formalize into a paid ambassador program.",
    pricing:
      "Custom-quoted SaaS, typically starting around $400–$800/mo for the smallest plan and climbing into the low five figures for established programs. No public free tier.",
    freeTier: "No free tier. Demo and quote only.",
    targetAudience:
      "Mid-market DTC brands with an existing community of 500+ engaged customers, usually with a Shopify or WooCommerce backend.",
    aiFeatures:
      "AI-assisted mission generation and content moderation. Reporting and matching are mostly rules-based, not agentic.",
    integrations:
      "Shopify, WooCommerce, Klaviyo, Mailchimp, Zapier, and direct API.",
    table: [
      { feature: "Starting price", socialPerks: "Free forever (paid from $19/mo)", competitor: "~$400–$800/mo (custom quote)" },
      { feature: "Built for", socialPerks: "Local & service businesses + DTC", competitor: "DTC fashion/beauty/lifestyle brands" },
      { feature: "AI campaign generation", socialPerks: "Yes — full plan, copy, schedule", competitor: "Mission templates + AI moderation" },
      { feature: "Public pricing", socialPerks: "Yes", competitor: "No — quote only" },
      { feature: "Free tier", socialPerks: "Yes", competitor: "No" },
      { feature: "Local SEO tools", socialPerks: "Yes", competitor: "No" },
      { feature: "Self-serve onboarding", socialPerks: "Yes — under 10 minutes", competitor: "Sales-led demo required" },
      { feature: "FTC compliance automation", socialPerks: "Yes — auto-injected per platform", competitor: "Yes" },
    ],
    whenCompetitorIsBetter: [
      "You already have an established ambassador community of 500+ people and need a polished program management UI for them.",
      "Your brand is fashion, beauty, or lifestyle DTC and you need detailed mission tracking with payouts in 30+ currencies.",
      "You have the budget for $5,000–$20,000/year in software and want a dedicated customer success manager.",
      "You need granular cash payouts and tier-based commissions that look more like a creator-economy program than a referral incentive.",
      "Your team prefers a sales-led, white-glove onboarding rather than self-serve.",
    ],
    whenSocialPerksIsBetter: [
      "You're a small business and don't have $5k+ a year to spend on ambassador software.",
      "You want to start in 10 minutes with a free tier — not sit through a demo and wait for a quote.",
      "You don't yet have a 500-person community and want AI to help you generate one from your existing customer base.",
      "You're a local business (salon, gym, restaurant) — Brandbassador is built for DTC eCommerce, not local service.",
      "You want the perk to be a discount or freebie, not necessarily a cash payout.",
    ],
    pricingDifference:
      "Brandbassador does not publish pricing. Real-world quotes from agencies and reviewers consistently land in the $400–$800/mo range for entry plans, scaling to $1,500–$3,000/mo for established programs. Social Perks publishes flat $19, $79, and $249/mo tiers, plus a free forever tier. For most small businesses, the lifetime cost difference is 10–50x.",
    featureDifference:
      "Brandbassador wins on: ambassador program polish, multi-currency payouts, mission-tracking depth, and brand-control workflows for established communities. Social Perks wins on: AI agent that generates the campaign and the perk structure, lower price, instant onboarding, local-business support, perk-for-post model that works without an existing community, and a built-in marketplace of micro-influencers.",
    bottomLine:
      "Brandbassador is the right tool if you're a DTC brand with an existing ambassador community and budget to match. Social Perks is the right tool if you're starting from zero, want to spend under $100/mo, and want AI to do most of the campaign work.",
  },
  {
    slug: "loox",
    name: "Loox",
    tagline: "Photo and video reviews app for Shopify",
    founded: "2015",
    headquarters: "Tel Aviv, Israel",
    bestFor:
      "Shopify merchants who want beautiful photo and video reviews on their product pages with minimal setup.",
    pricing:
      "$9.99/mo Beginner up to $299.99/mo Unlimited, billed by order volume. Public, transparent pricing.",
    freeTier:
      "14-day free trial. No forever-free plan, but the entry tier is genuinely cheap for very small stores.",
    targetAudience:
      "Shopify merchants of all sizes — Loox is one of the most-installed Shopify apps for reviews specifically.",
    aiFeatures:
      "AI review highlights and sentiment summaries. No agentic campaign generation.",
    integrations:
      "Shopify-first. Klaviyo, Mailchimp, Google Shopping (seller ratings), Meta product catalog, and TikTok.",
    table: [
      { feature: "Starting price", socialPerks: "Free forever (paid from $19/mo)", competitor: "$9.99/mo (14-day trial only)" },
      { feature: "Built for", socialPerks: "Local & service businesses + DTC", competitor: "Shopify merchants" },
      { feature: "AI campaign generation", socialPerks: "Yes — full plan, copy, schedule", competitor: "Review highlights only" },
      { feature: "Photo & video reviews", socialPerks: "Yes", competitor: "Yes — best-in-class on-site widget" },
      { feature: "Influencer marketplace", socialPerks: "Yes", competitor: "No" },
      { feature: "Perk-for-post model", socialPerks: "Yes — 25 platforms, 125 actions", competitor: "Discount-for-review only" },
      { feature: "Local SEO tools", socialPerks: "Yes", competitor: "No" },
      { feature: "Works without Shopify", socialPerks: "Yes", competitor: "Shopify only" },
    ],
    whenCompetitorIsBetter: [
      "You're a Shopify-only merchant whose primary need is photo and video reviews on product pages.",
      "You want a Shopify-native widget that has been hardened over 8+ years and Just Works on every theme.",
      "Your priority is on-site social proof, not multi-channel customer marketing.",
      "You have under 100 orders a month and the $9.99/mo Beginner plan covers you.",
      "You don't need referrals, perks for Instagram posts, or influencer partnerships — only reviews.",
    ],
    whenSocialPerksIsBetter: [
      "You're not on Shopify, or you also have a brick-and-mortar location.",
      "You want customers to post on Instagram, leave Google reviews, and refer friends — not only leave on-site reviews.",
      "You want an AI that designs the whole campaign, including the perk, the copy, the schedule, and the call-to-action.",
      "You want a forever-free tier rather than a 14-day trial.",
      "You want influencer outreach in addition to customer reviews.",
    ],
    pricingDifference:
      "Loox is one of the most affordable Shopify review apps — $9.99/mo Beginner is real and the order-volume tiers scale fairly. However, Loox only solves the on-site review problem. Social Perks bundles reviews, referrals, perks-for-posts, influencer outreach, and AI campaign generation into a single $19–$79/mo plan with a free forever tier. If you only need reviews, Loox is cheaper for the narrow job; if you need a full customer-marketing motion, Social Perks gives you 4–6 product categories at a similar price point.",
    featureDifference:
      "Loox wins on: pure on-site review widget polish, photo and video review collection, Shopify theme integration, and Google seller-rating feed. Social Perks wins on: AI campaign generation, perk-for-post model across Instagram, TikTok, YouTube, and 22 other platforms, native influencer marketplace, local-business SEO tools, and platform-agnostic deployment.",
    bottomLine:
      "If you're a Shopify merchant and reviews are your only need, Loox is excellent and inexpensive. If you want one tool that runs reviews plus referrals plus social posts plus influencer outreach — and you want AI to do the planning — Social Perks is the better fit.",
  },
  {
    slug: "aspireire",
    name: "AspireIQ (Aspire)",
    tagline: "Influencer marketing platform for DTC brands",
    founded: "2013",
    headquarters: "San Francisco, CA",
    bestFor:
      "DTC brands running formal influencer programs at scale — finding creators, managing contracts, paying creators, and measuring ROI.",
    pricing:
      "Custom-quoted, generally starting around $1,500–$2,500/mo for the entry tier and climbing into the $5,000–$15,000/mo range for established programs. No public free tier.",
    freeTier: "No free tier. Sales demo only.",
    targetAudience:
      "Mid-market DTC brands with established influencer marketing budgets ($50k+/year) and a dedicated creator partnerships role.",
    aiFeatures:
      "AI creator discovery and brief-matching, AI content quality scoring, and AI fraud detection on follower bases.",
    integrations:
      "Shopify, WooCommerce, Klaviyo, Meta, TikTok, YouTube, custom API.",
    table: [
      { feature: "Starting price", socialPerks: "Free forever (paid from $19/mo)", competitor: "~$1,500–$2,500/mo (custom)" },
      { feature: "Built for", socialPerks: "Local & service businesses + DTC", competitor: "DTC brands w/ influencer budget" },
      { feature: "AI campaign generation", socialPerks: "Yes — full plan, copy, schedule", competitor: "AI creator discovery + scoring" },
      { feature: "Influencer marketplace", socialPerks: "Yes — built-in", competitor: "Yes — large discovery DB" },
      { feature: "Customer-as-marketer model", socialPerks: "Yes — every customer is a node", competitor: "Influencer-only" },
      { feature: "Public pricing", socialPerks: "Yes", competitor: "No" },
      { feature: "Self-serve onboarding", socialPerks: "Yes", competitor: "Sales-led" },
      { feature: "Reviews & UGC collection", socialPerks: "Yes", competitor: "Yes (UGC, not on-site reviews)" },
    ],
    whenCompetitorIsBetter: [
      "You have a dedicated influencer marketing manager and a budget over $50,000/year for creator partnerships.",
      "You need a deep creator discovery database with millions of profiles and audience-quality scoring.",
      "You run formal contract-and-pay creator programs with deliverables, usage rights, and exclusivity clauses.",
      "Your brand is established DTC and you've outgrown small-tool ambassador platforms.",
      "You need an enterprise control panel with white-glove customer success.",
    ],
    whenSocialPerksIsBetter: [
      "You don't have $1,500/mo to spend on influencer software, let alone $5,000+.",
      "You're a small or local business and your customers are the most credible creators you'll ever have.",
      "You want AI to design the whole campaign, not just find creators.",
      "You want a perk-for-post model where customers earn a discount or freebie — not a fee-for-content model that requires negotiated rates.",
      "You'd rather start free today than book a sales demo.",
    ],
    pricingDifference:
      "AspireIQ pricing starts at roughly 100x what Social Perks charges a small business. The reason is positioning: Aspire is built for brands that already spend on creators and need software to manage that spend. Social Perks is built for brands that don't yet have a creator budget and want to use existing customers instead. For a salon, restaurant, or growing DTC brand under $1M ARR, Aspire is overkill; for a $20M+ DTC brand running 100+ creator partnerships a quarter, Aspire's depth justifies its price.",
    featureDifference:
      "AspireIQ wins on: creator discovery database depth, contract management, payment workflows, audience-quality scoring, and enterprise reporting. Social Perks wins on: AI agent that generates campaigns, perk-for-post model that scales without per-creator negotiation, customer-as-creator philosophy, lower price point, instant self-serve onboarding, local-business support, and review collection bundled in.",
    bottomLine:
      "AspireIQ is the right tool if you already spend on creators and need enterprise software to manage that spend. Social Perks is the right tool if you want to turn your existing customers into a creator base — without contracts, fees, or a dedicated creator-partnerships hire.",
  },
  {
    slug: "refersion",
    name: "Refersion",
    tagline: "Affiliate and influencer tracking platform",
    founded: "2014",
    headquarters: "New York, NY",
    bestFor:
      "DTC brands running formal affiliate programs with commission-based payouts to influencers and partners.",
    pricing:
      "Public pricing: Professional from $119/mo, Business from $279/mo, Enterprise custom. No free tier.",
    freeTier: "14-day free trial. No forever-free plan.",
    targetAudience:
      "DTC brands processing $100k+/year in affiliate-driven revenue with a partnerships or affiliate manager.",
    aiFeatures:
      "Limited. Refersion focuses on tracking, attribution, and payout — not generative AI.",
    integrations:
      "Shopify, BigCommerce, WooCommerce, Magento, Stripe, PayPal, Klaviyo, ShareASale.",
    table: [
      { feature: "Starting price", socialPerks: "Free forever (paid from $19/mo)", competitor: "$119/mo Professional" },
      { feature: "Built for", socialPerks: "Local & service businesses + DTC", competitor: "DTC affiliate programs" },
      { feature: "AI campaign generation", socialPerks: "Yes — full plan, copy, schedule", competitor: "No" },
      { feature: "Affiliate tracking", socialPerks: "Basic referral tracking", competitor: "Yes — best-in-class" },
      { feature: "Commission payouts", socialPerks: "Perks (discount/freebie) by default; cash via Stripe Connect", competitor: "Yes — central payouts via Stripe / PayPal" },
      { feature: "Free tier", socialPerks: "Yes", competitor: "No" },
      { feature: "Customer-as-marketer model", socialPerks: "Yes", competitor: "Affiliate-only" },
      { feature: "Local SEO tools", socialPerks: "Yes", competitor: "No" },
    ],
    whenCompetitorIsBetter: [
      "Your business model is built on cash commission payouts to affiliates and you need rock-solid attribution and payout infrastructure.",
      "You manage 100+ affiliates with custom commission structures and tiered payouts.",
      "You need a dedicated affiliate portal with creative libraries and pixel-perfect tracking.",
      "You're integrating with a larger affiliate network (ShareASale, Impact) and need a hub.",
      "You have an affiliate manager whose full-time job is running this program.",
    ],
    whenSocialPerksIsBetter: [
      "You don't want to pay cash commissions — you'd rather give customers a discount or perk.",
      "You're a small business and $119/mo for a niche tool isn't worth it yet.",
      "You want AI to generate the campaign, not just track clicks.",
      "You want to combine affiliate-style referrals with reviews, social posts, and influencer outreach in one tool.",
      "You'd rather start free today and upgrade later.",
    ],
    pricingDifference:
      "Refersion is fairly priced for what it does — affiliate tracking is genuinely complex and $119/mo is reasonable for a real affiliate program. But Refersion is a single-purpose tool. Social Perks bundles referrals, reviews, perks-for-posts, and AI campaign generation for less than half the entry price, plus a free tier. If you need pure affiliate tracking, Refersion is better; if you need broader customer marketing, Social Perks is more efficient.",
    featureDifference:
      "Refersion wins on: affiliate tracking depth, commission structures, payout infrastructure, fraud detection on conversions, and integrations with affiliate networks. Social Perks wins on: AI campaign generation, perk-based incentives, multi-channel customer marketing, lower price, free tier, and a model that works without cash payouts.",
    bottomLine:
      "Refersion is the right tool for a formal cash-commission affiliate program. Social Perks is the right tool when you'd rather reward customers with perks, run multi-channel campaigns, and let AI do the planning.",
  },
  {
    slug: "intellifluence",
    name: "Intellifluence",
    tagline: "Influencer marketplace and outreach tool",
    founded: "2016",
    headquarters: "Phoenix, AZ",
    bestFor:
      "Small and mid-size brands that want a self-serve marketplace to send free product to micro-influencers in exchange for posts.",
    pricing:
      "Public pricing: Basic Free (limited), Starter $99/mo, Advanced $249/mo, Pro $499/mo. Genuinely affordable for the category.",
    freeTier:
      "Yes — Basic plan is free with limits on outreach volume. Real free tier.",
    targetAudience:
      "Small to mid-size brands sending product samples to micro-influencers; popular with Amazon sellers and Etsy shops.",
    aiFeatures:
      "AI influencer matching and message templates. No full agentic campaign generation.",
    integrations:
      "Shopify, WooCommerce, Amazon (read-only), Zapier.",
    table: [
      { feature: "Starting price", socialPerks: "Free forever (paid from $19/mo)", competitor: "Free (limited), paid from $99/mo" },
      { feature: "Built for", socialPerks: "Local & service businesses + DTC", competitor: "Brands sending product to micro-influencers" },
      { feature: "AI campaign generation", socialPerks: "Yes — full plan, copy, schedule", competitor: "AI matching + templates" },
      { feature: "Free tier", socialPerks: "Yes", competitor: "Yes — real free tier" },
      { feature: "Influencer marketplace", socialPerks: "Yes", competitor: "Yes — large database" },
      { feature: "Customer-as-marketer model", socialPerks: "Yes — every customer is a node", competitor: "Influencer-only (you ship product)" },
      { feature: "Reviews & UGC collection", socialPerks: "Yes", competitor: "Limited" },
      { feature: "Local SEO tools", socialPerks: "Yes", competitor: "No" },
    ],
    whenCompetitorIsBetter: [
      "Your primary motion is sending free product samples to micro-influencers and tracking the resulting posts.",
      "You're an Amazon or Etsy seller looking specifically for influencer-driven product reviews.",
      "You want a large database of pre-vetted micro-influencers ready to accept product offers.",
      "You don't need broader customer marketing — only product seeding.",
      "You like the marketplace model where influencers come to you with bids.",
    ],
    whenSocialPerksIsBetter: [
      "You're a service business (salon, gym, restaurant) where shipping product samples doesn't apply.",
      "You want to turn your actual customers — not strangers from a marketplace — into your marketing team.",
      "You want AI to design the campaign end-to-end, not just match you with influencers.",
      "You want one tool for reviews, referrals, social posts, and influencer outreach.",
      "You want a forever-free tier with real campaign capability, not just a limited outreach quota.",
    ],
    pricingDifference:
      "Intellifluence and Social Perks are unusually close on price — both publish a real free tier and both have paid plans under $250/mo. Intellifluence's $99/mo Starter compares fairly to Social Perks' $79/mo Pro. The difference is scope: Intellifluence's price gets you influencer outreach; Social Perks' price gets you AI campaign generation, reviews, referrals, perks-for-posts, and influencer access. For pure product seeding, Intellifluence is excellent value; for broader customer marketing, Social Perks is more.",
    featureDifference:
      "Intellifluence wins on: depth of micro-influencer marketplace, product-seeding workflow, bid-based negotiation, and Amazon-seller use cases. Social Perks wins on: AI campaign generation, customer-as-marketer model, multi-channel approach (reviews + referrals + posts + influencer), local-business support, and broader platform action library.",
    bottomLine:
      "Intellifluence is the right tool if your motion is product seeding to micro-influencers. Social Perks is the right tool if you want to run a broader customer-marketing program with AI as your operator.",
  },
  {
    slug: "grin",
    name: "GRIN",
    tagline: "Creator management platform for DTC",
    founded: "2014",
    headquarters: "Sacramento, CA",
    bestFor:
      "Mid-market and enterprise DTC brands running large, professionalized creator programs with dedicated team members.",
    pricing:
      "Custom-quoted, typically $25,000–$100,000+/year for the entry tier. No public pricing, no free tier.",
    freeTier: "No free tier. Enterprise sales motion only.",
    targetAudience:
      "DTC brands $10M+ ARR with a dedicated creator partnerships team and an existing creator marketing budget.",
    aiFeatures:
      "AI creator discovery, AI content scoring, AI fraud detection, and AI campaign brief drafting.",
    integrations:
      "Shopify, BigCommerce, Magento, Klaviyo, Slack, Gmail, custom API. Best-in-class eCommerce backend integration.",
    table: [
      { feature: "Starting price", socialPerks: "Free forever (paid from $19/mo)", competitor: "~$25,000–$100,000+/year" },
      { feature: "Built for", socialPerks: "Local & service businesses + DTC", competitor: "Mid-market & enterprise DTC" },
      { feature: "AI campaign generation", socialPerks: "Yes — full plan, copy, schedule", competitor: "AI discovery + brief drafting" },
      { feature: "Public pricing", socialPerks: "Yes", competitor: "No" },
      { feature: "Free tier", socialPerks: "Yes", competitor: "No" },
      { feature: "Creator CRM depth", socialPerks: "Light", competitor: "Best-in-class" },
      { feature: "Self-serve onboarding", socialPerks: "Yes — under 10 minutes", competitor: "Months of implementation" },
      { feature: "Customer-as-marketer model", socialPerks: "Yes", competitor: "Creator-only" },
    ],
    whenCompetitorIsBetter: [
      "You're a $10M+ DTC brand with a creator partnerships team of 2+ people.",
      "You need a creator CRM with email threads, contracts, payments, product seeding, and shipment tracking integrated.",
      "You're spending six or seven figures a year on creator partnerships and need enterprise software to manage that spend.",
      "You need the deepest possible Shopify backend integration including order-level attribution.",
      "You have a CFO who'll sign off on $50,000/year SaaS.",
    ],
    whenSocialPerksIsBetter: [
      "You're not yet at $10M ARR and GRIN's pricing is irrelevant to you.",
      "You want AI to do the campaign work, not just discovery and scoring.",
      "You want to start in 10 minutes, not in 3 months.",
      "You're a local or service business — GRIN doesn't fit your model at all.",
      "You'd rather spend $79/mo than $5,000/mo.",
    ],
    pricingDifference:
      "GRIN is enterprise software at enterprise pricing — typically $25k–$100k+/year. There's no comparison to Social Perks on price. The honest take: GRIN is the wrong tool unless you already have a six-figure creator marketing budget and a team to spend it. Social Perks gets a small or growing business 80% of the practical outcome at 1% of the price.",
    featureDifference:
      "GRIN wins on: creator CRM depth, contract and payment workflows, eCommerce backend integration, audience-quality scoring, and enterprise reporting. Social Perks wins on: AI campaign generation that actually plans and writes the campaign, perk-for-post model that scales without per-creator negotiation, lower price, faster onboarding, and a customer-as-marketer philosophy.",
    bottomLine:
      "GRIN is right for $10M+ DTC brands that already spend heavily on creators. Social Perks is right for everyone else — small businesses, growing DTC brands, and local services that want AI to run customer marketing without an enterprise budget.",
  },
  {
    slug: "upfluence",
    name: "Upfluence",
    tagline: "Influencer and creator commerce platform",
    founded: "2013",
    headquarters: "New York / Paris",
    bestFor:
      "Mid-market DTC brands and agencies that want to find creators in their own customer base and run paid creator campaigns.",
    pricing:
      "Custom-quoted, typically $1,500–$5,000/mo. Annual contracts standard. No public free tier.",
    freeTier: "Free Chrome extension for creator discovery; no free SaaS tier.",
    targetAudience:
      "DTC brands and agencies running formal creator marketing programs.",
    aiFeatures:
      "AI creator discovery, AI message personalization, AI campaign briefing, and AI 'Live Capture' for matching customers to creators.",
    integrations:
      "Shopify, WooCommerce, Klaviyo, PayPal, Stripe, Gmail, Outlook.",
    table: [
      { feature: "Starting price", socialPerks: "Free forever (paid from $19/mo)", competitor: "~$1,500–$5,000/mo (custom)" },
      { feature: "Built for", socialPerks: "Local & service businesses + DTC", competitor: "DTC brands & agencies" },
      { feature: "AI campaign generation", socialPerks: "Yes — full plan, copy, schedule", competitor: "AI creator matching + messaging" },
      { feature: "Customer-to-creator detection", socialPerks: "Yes — every customer is a node", competitor: "Yes — Live Capture feature" },
      { feature: "Public pricing", socialPerks: "Yes", competitor: "No" },
      { feature: "Free tier", socialPerks: "Yes", competitor: "Free Chrome extension only" },
      { feature: "Self-serve onboarding", socialPerks: "Yes", competitor: "Sales-led" },
      { feature: "Local SEO tools", socialPerks: "Yes", competitor: "No" },
    ],
    whenCompetitorIsBetter: [
      "You're an agency managing creator campaigns for multiple clients.",
      "You need a deep creator discovery database with audience-quality data.",
      "You run paid creator campaigns with negotiated rates and contracts.",
      "You want a creator CRM with email threads and payment workflows built in.",
      "You can absorb a $1,500–$5,000/mo line item.",
    ],
    whenSocialPerksIsBetter: [
      "You're a small business without an agency or in-house creator manager.",
      "You want AI to plan and write the campaign, not just match creators.",
      "You'd rather give customers perks than negotiate paid creator rates.",
      "You want a price under $100/mo, not $1,500+.",
      "You want one tool for reviews, referrals, perks, and influencer outreach.",
    ],
    pricingDifference:
      "Upfluence is mid-market priced — $1,500–$5,000/mo is real for an established creator program. Social Perks is small-business priced at $19–$249/mo. They serve different buyers. If you have a creator marketing budget already, Upfluence is fairly priced for what it does; if you don't yet, Social Perks gets you started without that commitment.",
    featureDifference:
      "Upfluence wins on: creator discovery database, agency multi-client support, paid-campaign workflows, and creator CRM. Social Perks wins on: AI campaign generation, perk-for-post model, lower price, free tier, instant onboarding, local-business support, and one-tool-for-everything bundling.",
    bottomLine:
      "Upfluence is the right tool for agencies and mid-market DTC brands running paid creator programs. Social Perks is the right tool for small businesses and growing brands that want AI-driven customer marketing without paid creator overhead.",
  },
  {
    slug: "roster",
    name: "Roster",
    tagline: "Ambassador marketing platform (formerly Loyally)",
    founded: "2015",
    headquarters: "Lehi, Utah",
    bestFor:
      "DTC brands wanting to formalize an ambassador program with referral tracking, social posting, and product seeding.",
    pricing:
      "Custom-quoted, typically $300–$1,200/mo. Annual contracts standard. No public free tier.",
    freeTier: "No free tier. Demo and quote only.",
    targetAudience:
      "DTC brands with an existing customer base of 1,000+ who want to formalize ambassador relationships.",
    aiFeatures:
      "Limited. Roster's strength is workflow and integrations rather than generative AI.",
    integrations:
      "Shopify, WooCommerce, Klaviyo, Mailchimp, Zapier, custom API.",
    table: [
      { feature: "Starting price", socialPerks: "Free forever (paid from $19/mo)", competitor: "~$300–$1,200/mo (custom)" },
      { feature: "Built for", socialPerks: "Local & service businesses + DTC", competitor: "DTC ambassador programs" },
      { feature: "AI campaign generation", socialPerks: "Yes — full plan, copy, schedule", competitor: "Limited" },
      { feature: "Public pricing", socialPerks: "Yes", competitor: "No" },
      { feature: "Free tier", socialPerks: "Yes", competitor: "No" },
      { feature: "Ambassador program depth", socialPerks: "Light", competitor: "Yes" },
      { feature: "Self-serve onboarding", socialPerks: "Yes", competitor: "Sales-led" },
      { feature: "Customer-as-marketer model", socialPerks: "Yes", competitor: "Yes (ambassadors)" },
    ],
    whenCompetitorIsBetter: [
      "You have an existing customer base of 1,000+ and want a formal ambassador program with tiered tasks.",
      "You're DTC and want a polished brand-controlled ambassador portal.",
      "You have $300+/mo to spend and want sales-led onboarding.",
      "You need granular task tracking and reward fulfillment for an established community.",
      "Your team prefers an annual contract for budget predictability.",
    ],
    whenSocialPerksIsBetter: [
      "You don't yet have 1,000 engaged customers and need AI to help you generate that base.",
      "You're a local or service business — Roster is built for DTC.",
      "You want to start free today, not after a sales call.",
      "You want AI to design the campaign, not just orchestrate ambassador tasks.",
      "You want broader scope — reviews, referrals, perks, and influencer outreach in one tool.",
    ],
    pricingDifference:
      "Roster's $300–$1,200/mo entry is reasonable for a dedicated ambassador platform. Social Perks' $19–$79/mo entry covers ambassador-style functionality plus reviews, referrals, AI campaigns, and influencer outreach. For brands that need only ambassador depth, Roster is more polished; for brands that want broader marketing scope, Social Perks is dramatically better value.",
    featureDifference:
      "Roster wins on: ambassador program polish, tiered task workflows, brand-controlled portal, and DTC-specific integrations. Social Perks wins on: AI campaign generation, broader scope, lower price, free tier, instant onboarding, and a customer-as-marketer model that scales without ambassador setup.",
    bottomLine:
      "Roster is right for established DTC brands building a formal ambassador program. Social Perks is right for brands that want AI-led customer marketing across reviews, referrals, perks, and influencer outreach in one place.",
  },
  {
    slug: "statusphere",
    name: "Statusphere",
    tagline: "Micro-influencer matching for product seeding",
    founded: "2017",
    headquarters: "Orlando, FL",
    bestFor:
      "DTC brands sending free product to female-skewing micro-influencers in exchange for guaranteed posts.",
    pricing:
      "Custom-quoted, typically $1,500–$5,000/mo for entry plans. No public free tier. Pricing scales with number of guaranteed posts.",
    freeTier: "No free tier. Demo and quote only.",
    targetAudience:
      "DTC beauty, wellness, fashion, and lifestyle brands targeting female 18–34 audiences with product samples.",
    aiFeatures:
      "Proprietary matching algorithm that pairs products to micro-influencers based on category, audience, and engagement.",
    integrations:
      "Shopify, WooCommerce, Klaviyo, Meta, TikTok, Instagram. Statusphere is a managed-service hybrid, not a pure SaaS.",
    table: [
      { feature: "Starting price", socialPerks: "Free forever (paid from $19/mo)", competitor: "~$1,500–$5,000/mo (custom)" },
      { feature: "Built for", socialPerks: "Local & service businesses + DTC", competitor: "DTC beauty/wellness/lifestyle" },
      { feature: "AI campaign generation", socialPerks: "Yes — full plan, copy, schedule", competitor: "Matching algorithm" },
      { feature: "Public pricing", socialPerks: "Yes", competitor: "No" },
      { feature: "Free tier", socialPerks: "Yes", competitor: "No" },
      { feature: "Guaranteed posts", socialPerks: "No (perk-for-action)", competitor: "Yes — guaranteed deliverables" },
      { feature: "Self-serve onboarding", socialPerks: "Yes", competitor: "Sales-led" },
      { feature: "Customer-as-marketer model", socialPerks: "Yes", competitor: "Influencer-only" },
    ],
    whenCompetitorIsBetter: [
      "You're a beauty, wellness, or lifestyle DTC brand targeting women 18–34 with physical product to seed.",
      "You need guaranteed posts (not best-effort) and you'll pay for that guarantee.",
      "You like the managed-service model where Statusphere handles the matching for you.",
      "You have $1,500+/mo to spend on product seeding alone.",
      "Your category is a perfect fit for their micro-influencer pool.",
    ],
    whenSocialPerksIsBetter: [
      "You're not in beauty/wellness/lifestyle DTC — Statusphere's pool may not match your audience.",
      "You're a local or service business where shipping product samples doesn't apply.",
      "You'd rather turn your actual customers into your marketing team than rent strangers' attention.",
      "You want AI to design the whole campaign, not just match you with creators.",
      "You want a free tier and self-serve setup, not a sales call.",
    ],
    pricingDifference:
      "Statusphere is priced as a managed service — $1,500–$5,000/mo reflects the matching algorithm plus the guaranteed-post fulfillment. Social Perks is priced as software — $19–$249/mo for a tool you operate yourself with AI as your assistant. They serve different buyers. If you want guaranteed posts and don't want to do the work, Statusphere is fairly priced; if you want to run customer marketing yourself with AI doing most of the heavy lift, Social Perks is dramatically cheaper.",
    featureDifference:
      "Statusphere wins on: guaranteed-post fulfillment, managed matching service, female-skewing micro-influencer pool, and DTC beauty/wellness focus. Social Perks wins on: AI campaign generation, customer-as-marketer model, broader category support (local services, eCommerce, B2B), lower price, free tier, and one-tool bundling for reviews, referrals, perks, and influencer outreach.",
    bottomLine:
      "Statusphere is the right tool if you're a beauty or wellness DTC brand and want guaranteed influencer posts as a service. Social Perks is the right tool if you want a broader, AI-powered customer-marketing program at a fraction of the price.",
  },
];

export function getCompetitor(slug: string): Competitor | undefined {
  return COMPETITORS.find((c) => c.slug === slug);
}

export function getOtherCompetitors(slug: string, n: number = 4): Competitor[] {
  return COMPETITORS.filter((c) => c.slug !== slug).slice(0, n);
}
