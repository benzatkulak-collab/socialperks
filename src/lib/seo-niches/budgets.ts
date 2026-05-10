// Data for /by-budget/[budget] programmatic SEO pages.
// 6 budget tiers. ~900 words each.

export interface BudgetStrategy {
  title: string;
  description: string;
  roiMath: string;
  toolsNeeded: string[];
}

export interface BudgetPage {
  slug: string;
  label: string; // e.g. "Under $100/month"
  longLabel: string; // For H1
  intro: string;
  strategies: BudgetStrategy[];
  closing: string;
  bestFor: string;
  ctaLine: string;
}

export const BUDGETS: BudgetPage[] = [
  {
    slug: "bootstrap-zero-budget",
    label: "$0/month",
    longLabel: "Bootstrap, Zero-Budget Marketing",
    intro:
      "Zero-budget marketing isn't a hack — it's a discipline. With no money to spend, every hour you invest must compound. The strategies below are the ones that work without paid ads, premium tooling, or hired help. They take time and consistency, but they build assets — reviews, email lists, social proof — that you'll keep forever.",
    closing:
      "A zero-budget marketing program is slower than a paid one, but the assets compound. Six months of consistent effort with these five strategies typically produces an email list, a Google Business profile, and a social presence that would have cost $5,000-$15,000 to build with paid help. The catch is consistency: skip a week and the compounding stalls. Schedule the work, and the work pays.",
    bestFor:
      "Pre-revenue founders, side projects, businesses in lean months, anyone who'd rather invest time than money.",
    ctaLine:
      "Social Perks has a free tier built exactly for this — review requests, perks, and basic analytics with no monthly cost.",
    strategies: [
      {
        title: "Optimize and post on Google Business weekly",
        description:
          "Google Business is the highest-ROI free marketing surface a local business has. Add every service, upload 20+ photos, post weekly updates, and answer Q&A. The profile drives 2-5x the traffic of most websites for local categories.",
        roiMath:
          "A jump from #4 to #1 in the local 3-pack typically doubles or triples profile views. For a service business with $200 average ticket, that's an extra 5-15 calls per month at zero cost.",
        toolsNeeded: ["Google Business Profile (free)", "A phone with a camera"],
      },
      {
        title: "Ask every happy customer for a review",
        description:
          "Reviews are the single most leveraged unpaid marketing asset. Ask in person, follow up by text, and make the ask within 24 hours of a positive interaction. A simple 'Would you mind leaving us a review?' converts at 30-50% with happy customers.",
        roiMath:
          "Going from 4.0 to 4.5 stars lifts conversion 25-40%. For a $50K/month business, that's $12K-$20K in incremental monthly revenue from a free 5-minute conversation per customer.",
        toolsNeeded: ["Google Business Profile", "SMS or email", "Social Perks free tier (optional)"],
      },
      {
        title: "Build an email list with an in-store opt-in",
        description:
          "An email list is the only marketing asset you actually own. Collect addresses at checkout in exchange for a small future perk. Send a monthly newsletter — even a plain-text one will outperform what most local businesses do.",
        roiMath:
          "A list of 1,000 engaged subscribers at a 15% open rate and 3% click rate drives 4-5 incremental visits per send. Over 12 sends, that's 50-60 visits worth $3,000-$10,000+.",
        toolsNeeded: ["A free email tool (Mailchimp, MailerLite)", "A clipboard or QR code"],
      },
      {
        title: "Post on Instagram or TikTok 3x per week",
        description:
          "Cadence beats quality for organic reach. Three posts a week from your phone, mixing reels, carousels, and behind-the-scenes shots, will outperform one polished post a month. Customers and prospects scroll daily — your job is to show up.",
        roiMath:
          "Brands posting 3x/week see 2-3x the reach of brands posting weekly. Reach compounds to follower growth, which compounds to bookings.",
        toolsNeeded: ["A smartphone", "Free editing apps (CapCut, InShot)"],
      },
      {
        title: "Launch a referral perk for existing customers",
        description:
          "A two-sided referral perk costs you nothing until it works. Tell your customers: 'Refer a friend, you both get $10 off.' This costs $20 only when it produces a $50-$200 customer. Print it on receipts, mention it at checkout, post it on social.",
        roiMath:
          "If 10% of customers refer one friend, and 30% of referrals convert, a 100-customer-per-month business adds 3 free customers monthly — roughly $600-$2,000 in revenue per month at zero ad spend.",
        toolsNeeded: ["Social Perks free tier", "A simple tracking system"],
      },
    ],
  },
  {
    slug: "under-100-per-month",
    label: "Under $100/month",
    longLabel: "Under $100 per Month",
    intro:
      "$100/month is enough to add a few high-leverage tools to a zero-budget program. The math: $100 might mean $1,200/year in spend, which should produce $6,000-$12,000+ in incremental revenue if allocated to the right places. The strategies below prioritize tools that automate work you'd otherwise do by hand, so the spend buys you time.",
    closing:
      "$100/month is the threshold where marketing starts to feel like a system instead of a hustle. A few right-fit tools take the daily drag off your plate, and the freed-up time goes back into the highest-leverage activities. Audit what you're paying for every quarter — most owners overpay because they never cancel anything.",
    bestFor:
      "Solo operators and very small businesses who want to graduate from purely manual marketing.",
    ctaLine:
      "Social Perks Starter is $39/month and covers reviews, perks, and basic automation — fitting comfortably under $100 with room for one or two other tools.",
    strategies: [
      {
        title: "Automate review requests with a managed tool",
        description:
          "A managed review tool sends requests automatically after a transaction, follows up if there's no response, and routes negative feedback privately. The hour a week you save adds up to a half-day a month — meaningful at this scale.",
        roiMath:
          "Automated review programs typically lift review velocity 3-5x. For a business that was getting 4 reviews/month manually, that's 12-20/month — enough to materially shift star rating in 90 days.",
        toolsNeeded: ["Social Perks Starter ($39/mo)"],
      },
      {
        title: "Email marketing with a real ESP",
        description:
          "A proper email service provider gets you better deliverability, segmentation, and templates. At this scale, a free or cheap tier (Mailchimp free, MailerLite cheap) is plenty.",
        roiMath:
          "Better deliverability alone often lifts open rates 20-40%, which compounds to revenue.",
        toolsNeeded: ["Mailchimp free or MailerLite ($10/mo)"],
      },
      {
        title: "A scheduling tool for social posts",
        description:
          "Spending an hour scheduling a week of posts is far more efficient than fighting the urge to post daily. A scheduler also lets you post at audience-best times instead of platform-default times.",
        roiMath:
          "Scheduling tools save 2-3 hours per week. At any reasonable hourly value, the ROI is immediate.",
        toolsNeeded: ["Buffer free or Later ($25/mo)"],
      },
      {
        title: "A Google Business posting tool",
        description:
          "Posting weekly to Google Business is one of the highest-ROI activities, but it's tedious. A tool that pre-schedules a quarter of posts in an afternoon takes the friction off entirely.",
        roiMath:
          "Consistent weekly posting boosts profile freshness signals, which correlate with local-pack rank.",
        toolsNeeded: ["Most all-in-one social tools cover this"],
      },
      {
        title: "Run a small referral perk program",
        description:
          "Even $20-$50/month in perk redemptions can drive measurable acquisition lift, especially in service categories with high LTV.",
        roiMath:
          "Two new customers per month at $200 LTV is $400 in incremental revenue for $50 in perks.",
        toolsNeeded: ["Social Perks Starter"],
      },
      {
        title: "Use a hashtag and content research tool",
        description:
          "Knowing which hashtags drive reach in your category — and which are saturated or banned — is a 10x leverage point on Instagram and TikTok.",
        roiMath:
          "Right-tag-set posts often get 3-5x the reach of generic-tag posts, multiplying every other piece of organic effort.",
        toolsNeeded: ["Most all-in-one tools cover this"],
      },
    ],
  },
  {
    slug: "under-250-per-month",
    label: "Under $250/month",
    longLabel: "Under $250 per Month",
    intro:
      "$250/month opens up a layer of tools that add real automation and analytics. At this budget, you're looking at $3,000/year — enough to support a Growth-tier subscription, an SMS program, and modest paid amplification on Instagram or Google. The discipline at this level: spend on tools that do work you'd otherwise have to hire for, not on shiny dashboards you'll never check.",
    closing:
      "$250/month is the budget where small marketing becomes professional small marketing. The same principles apply — focus on assets that compound, prioritize tools over ads, audit quarterly — but you have meaningfully more room for amplification and automation.",
    bestFor: "Established small businesses with at least $5K/month in revenue.",
    ctaLine:
      "Social Perks Growth ($79/mo) plus an SMS allowance and a small ad budget fits cleanly under $250.",
    strategies: [
      {
        title: "Add SMS marketing on top of email",
        description:
          "SMS has a 95%+ open rate and complements email well for time-sensitive offers. Carrier fees run $0.01-$0.03 per message, so a list of 1,000 with 4 messages/month is $40-$120 in carrier costs.",
        roiMath:
          "SMS converts at 3-5x the rate of email for time-sensitive offers. A $40 monthly SMS investment typically returns $400+ in incremental revenue.",
        toolsNeeded: ["Social Perks Growth or a dedicated SMS tool"],
      },
      {
        title: "Run targeted Meta or Google ads",
        description:
          "At this budget, $50-$100/month on retargeting is plausible. Don't run prospecting at this spend — you can't get to statistical significance. Instead, retarget your website visitors and email list.",
        roiMath:
          "Retargeting typically returns 3-7x ROAS at small scale. $50 spent should return $150-$350 in revenue.",
        toolsNeeded: ["Meta Ads Manager", "Google Ads"],
      },
      {
        title: "Launch a tiered loyalty program",
        description:
          "A real loyalty program with tiered rewards can lift repeat-visit rates 5-15% in service categories. The cost is mostly time to set up; ongoing redemption costs are paid out of incremental revenue.",
        roiMath:
          "A 10% lift in retention typically translates to a 30%+ lift in profit for most local businesses, due to compounding LTV effects.",
        toolsNeeded: ["Social Perks Growth"],
      },
      {
        title: "Build a UGC library",
        description:
          "Customer-submitted photos and videos are 4x more effective than studio shots in ads and on landing pages. A perk-driven UGC program at this budget can produce 20-50 licensed assets per quarter.",
        roiMath:
          "Replacing stock photography with UGC typically lifts ad CTR 50-200% and landing page conversion 20-50%.",
        toolsNeeded: ["Social Perks Growth"],
      },
      {
        title: "Pay for a hashtag and competitor research tool",
        description:
          "Tools like SocialBlade or built-in features in all-in-one platforms surface what's working in your category, including competitor content patterns and tag sets.",
        roiMath:
          "One viral-pattern insight per quarter can produce a campaign worth thousands.",
        toolsNeeded: ["All-in-one social tool"],
      },
      {
        title: "Test influencer outreach with one local micro-influencer per month",
        description:
          "Local micro-influencers (1K-10K followers) often work for $50-$200 per post or product trade. One post per month is enough to test the channel.",
        roiMath:
          "One well-fit micro-influencer post can drive 10-50 visits in the 48 hours after posting.",
        toolsNeeded: ["Social Perks Growth", "Manual outreach or built-in discovery"],
      },
    ],
  },
  {
    slug: "under-500-per-month",
    label: "Under $500/month",
    longLabel: "Under $500 per Month",
    intro:
      "$500/month is a real marketing budget. At $6K/year, you can support a Growth or Pro subscription, a meaningful ad spend, and consistent influencer programs. The trap at this level: it's tempting to spread the budget across too many channels. Concentrate spend on the 2-3 channels that produce trackable returns, and resist the urge to add channels until those are saturated.",
    closing:
      "$500/month is the budget at which paid amplification starts to meaningfully shape your acquisition curve. Used well, it should produce $2,500-$5,000+ in incremental monthly revenue. Used poorly, it disappears. The discipline: track each channel to revenue, kill what doesn't work, and double-down on what does.",
    bestFor: "Small businesses with $10K+ monthly revenue and ambitious growth goals.",
    ctaLine:
      "Social Perks Pro ($149/mo) with a $250-$300 ad and influencer allowance fits cleanly here.",
    strategies: [
      {
        title: "Run prospecting Meta or Google ads",
        description:
          "At $300+/month on a single channel, you can get to statistical significance on prospecting. Lookalike audiences from your customer list are usually the highest-leverage starting point.",
        roiMath:
          "Well-targeted prospecting typically achieves 2-4x ROAS. $300 should return $600-$1,200 in revenue at scale.",
        toolsNeeded: ["Meta Ads Manager or Google Ads", "A pixel on your site", "An exported customer list"],
      },
      {
        title: "Run a managed influencer program",
        description:
          "At $500/month, you can comfortably book 2-4 local micro-influencer posts per month, plus pay for the tools to source and vet them.",
        roiMath:
          "Local micro-influencer programs typically return 3-5x ROAS at small scale, with a long-tail of organic content.",
        toolsNeeded: ["Social Perks Pro", "An influencer discovery tool"],
      },
      {
        title: "Launch a brand ambassador program",
        description:
          "Recruit 10-25 of your top customers into a tiered ambassador program. Monthly perks plus a content quota produce a steady output of authentic posts at much lower cost than influencer hires.",
        roiMath:
          "A 20-ambassador program at $25/month each produces 60-100 pieces of content per month for $500. Equivalent influencer cost would be $5,000+.",
        toolsNeeded: ["Social Perks Pro"],
      },
      {
        title: "Add a retargeting layer to your funnel",
        description:
          "A modest retargeting budget ($75-$100/month) on top of your prospecting drives down blended CAC by recapturing high-intent visitors who didn't convert the first time.",
        roiMath:
          "Retargeting CAC is typically 30-50% of prospecting CAC. Adding it usually lifts blended ROAS 30-50%.",
        toolsNeeded: ["Meta or Google retargeting", "A pixel on your site"],
      },
      {
        title: "Invest in proper email and SMS automation",
        description:
          "At this budget, a Klaviyo-tier ESP with proper segmentation and behavior-triggered flows pays back quickly through better email-driven revenue.",
        roiMath:
          "Behavior-triggered flows typically drive 30-50% of total email revenue at minimal incremental work.",
        toolsNeeded: ["Klaviyo or equivalent", "Social Perks Pro for unified perks/email"],
      },
      {
        title: "Run quarterly seasonal campaigns",
        description:
          "Holiday and seasonal campaigns are the highest-ROI windows of the year. A pre-built template library plus a $100-$200 amplification budget per campaign produces meaningful peaks.",
        roiMath:
          "A well-run holiday campaign typically lifts revenue 20-50% above baseline for the campaign window.",
        toolsNeeded: ["Social Perks Pro templates"],
      },
    ],
  },
  {
    slug: "under-1000-per-month",
    label: "Under $1,000/month",
    longLabel: "Under $1,000 per Month",
    intro:
      "$1,000/month is the budget at which marketing becomes a real lever on the business. $12K/year supports a Pro-tier platform, healthy paid spend, a managed influencer program, and basic agency or freelancer help on the highest-leverage projects. The discipline at this level: report to yourself like a marketing manager would. Track ROAS by channel, audit monthly, and resist the temptation to chase shiny objects.",
    closing:
      "At $1,000/month, marketing should produce 4-8x the spend in incremental revenue. The team that gets the most from this budget is the one that picks 3-4 channels and runs them well, not the one that runs 10 channels poorly. Cull aggressively.",
    bestFor: "Established small businesses with $25K+ monthly revenue.",
    ctaLine:
      "Social Perks Pro plus a healthy ad spend, an influencer allowance, and freelancer help fits cleanly under $1,000.",
    strategies: [
      {
        title: "Scale prospecting ads to $400-$600/month per platform",
        description:
          "At this spend level, you can scale lookalike audiences and creative testing across 2-3 audience cohorts on Meta and Google.",
        roiMath:
          "Disciplined ad management at this scale typically returns 3-5x ROAS, or $1,200-$3,000 monthly on a $400 spend.",
        toolsNeeded: ["Meta and Google Ads", "Creative testing discipline"],
      },
      {
        title: "Run a 25-50 person ambassador program",
        description:
          "A larger ambassador program produces 100-200 monthly pieces of content. At this scale, the program rivals what a small agency would charge $5K-$10K to produce.",
        roiMath:
          "Per-content cost drops to $2-$5 from a typical agency rate of $50-$200.",
        toolsNeeded: ["Social Perks Pro"],
      },
      {
        title: "Hire a freelance editor or designer for $200-$300/month",
        description:
          "A few hours of freelance creative time per month materially lifts the quality of email designs, ad creative, and social assets.",
        roiMath:
          "Better creative typically lifts CTR 20-50%, which compounds across every channel.",
        toolsNeeded: ["Upwork, Contra, or your network"],
      },
      {
        title: "Run an SMS program at scale",
        description:
          "At a list size of 2,500-5,000 with 6-8 messages/month, SMS becomes a meaningful revenue driver — often 10-15% of total marketing-attributed revenue.",
        roiMath:
          "Mature SMS programs return $20-$40 per dollar spent at this scale.",
        toolsNeeded: ["Social Perks Pro or a dedicated SMS tool"],
      },
      {
        title: "Add a dedicated retargeting layer with custom creative",
        description:
          "Retargeting with bespoke creative (custom-designed for visitors at each funnel stage) outperforms generic retargeting by 50-100%.",
        roiMath:
          "Custom-creative retargeting often returns 5-10x ROAS.",
        toolsNeeded: ["Meta retargeting", "A creative system"],
      },
      {
        title: "Quarterly ROI audit by channel",
        description:
          "Once a quarter, audit each channel's ROAS. Cut the bottom 25% of spend and reallocate to the top 25%. This single discipline often lifts blended ROAS by 30%.",
        roiMath:
          "Reallocation alone typically lifts overall returns 20-30% per quarter.",
        toolsNeeded: ["A spreadsheet", "Discipline"],
      },
    ],
  },
  {
    slug: "enterprise-scale",
    label: "Enterprise scale",
    longLabel: "Enterprise-Scale Marketing",
    intro:
      "Enterprise-scale marketing budgets ($10K-$1M+ per month) are a different game. The strategies below are for multi-location brands, franchises, and DTC businesses with mature operations. The single biggest lever at this scale isn't more spend — it's better attribution, better creative systems, and better cross-channel orchestration.",
    closing:
      "At enterprise scale, the marketing team's job is no longer 'try things and see what works.' It's 'measure, attribute, and reallocate.' The brands that grow fastest at this stage are the ones that have built the data infrastructure to make decisions with confidence — and the operational discipline to act on those decisions.",
    bestFor: "Multi-location brands, franchises, mid-market DTC, and enterprise teams.",
    ctaLine:
      "Social Perks Enterprise includes multi-location workflows, advanced attribution, and a dedicated success manager. Talk to sales for custom pricing.",
    strategies: [
      {
        title: "Build a multi-touch attribution model",
        description:
          "At this scale, last-click attribution leaves money on the table. A multi-touch model (data-driven attribution in GA4, or a custom MMM) reveals the true contribution of each channel.",
        roiMath:
          "Properly attributed reallocation typically lifts blended ROAS 20-40%.",
        toolsNeeded: ["GA4 with conversion tracking", "An MMM tool or analyst"],
      },
      {
        title: "Run a centralized influencer program with regional activation",
        description:
          "Multi-location brands win when corporate provides creative and contracts, and regions execute against local influencers and audiences.",
        roiMath:
          "Centralized programs typically achieve 30-50% lower per-influencer cost through bulk negotiation and templated workflows.",
        toolsNeeded: ["Social Perks Enterprise", "A regional rollout playbook"],
      },
      {
        title: "Build a creative system, not creative one-offs",
        description:
          "At this scale, you're producing dozens of creative variants per week. A creative system — Figma component libraries, brand guidelines, AI-assisted asset generation — pays back quickly.",
        roiMath:
          "Creative systems typically cut per-asset production cost 50-70% while improving consistency.",
        toolsNeeded: ["Figma", "A brand book", "AI-assisted creative tooling"],
      },
      {
        title: "Run brand and performance budgets in parallel",
        description:
          "Pure performance marketing eventually saturates. A brand layer (15-25% of budget) keeps the awareness funnel topped up so performance can keep performing.",
        roiMath:
          "Brand investment typically lifts performance ROAS 10-20% over 6-12 months.",
        toolsNeeded: ["A measurement framework that tolerates time-delayed effects"],
      },
      {
        title: "Centralize loyalty and CRM across locations",
        description:
          "A unified loyalty database across locations is the single highest-leverage CRM investment a multi-location brand can make. It enables cross-location retention, lifecycle marketing, and unified analytics.",
        roiMath:
          "Unified CRM typically lifts repeat-visit rate 5-15% across the network.",
        toolsNeeded: ["Social Perks Enterprise", "A unified data layer"],
      },
      {
        title: "Build an in-house analytics function",
        description:
          "At enterprise scale, agency dashboards aren't enough. An in-house analyst or analytics team with direct access to the data pays back many times over.",
        roiMath:
          "An in-house analyst typically influences 5-10x their cost in better decisions per quarter.",
        toolsNeeded: ["BigQuery, Snowflake, or equivalent", "A BI tool", "An analyst"],
      },
    ],
  },
];

export const BUDGET_MAP = new Map(BUDGETS.map((b) => [b.slug, b]));

export function getBudgetBySlug(slug: string): BudgetPage | undefined {
  return BUDGET_MAP.get(slug);
}
