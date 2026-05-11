// Data for /alternatives/[competitor] pages.
// Focused on the EXIT motion: people actively shopping for a switch.
// Different framing from /vs pages — same competitors, different angle.

export type AlternativeCategory = "ugc-reviews" | "influencer" | "loyalty";

export interface PricingRow {
  feature: string;
  socialPerks: string;
  competitor: string;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface Alternative {
  slug: string;
  name: string;
  category: AlternativeCategory;
  categoryLabel: string;
  oneLiner: string;
  whyPeopleSwitch: string[]; // 4 reasons
  whatWeDoDifferently: string[]; // 5 differentiators
  migrationSteps: { title: string; body: string }[]; // 3 steps
  whatYouGet: string[]; // 5 features they don't have
  whatYouGiveUp: string[]; // 2-3 honest tradeoffs
  pricingTable: PricingRow[];
  faqs: FAQ[]; // 6 FAQs
}

export const ALTERNATIVES: Alternative[] = [
  // ========== UGC / REVIEW PLATFORMS ==========
  {
    slug: "yotpo",
    name: "Yotpo",
    category: "ugc-reviews",
    categoryLabel: "UGC & Reviews",
    oneLiner:
      "Enterprise retention suite (reviews, loyalty, SMS, subscriptions) built for mid-market Shopify Plus brands.",
    whyPeopleSwitch: [
      "Pricing creeps fast — what started at $79/mo for reviews quickly becomes $500–$1,500/mo once you add loyalty, SMS, and subscriptions as separate modules.",
      "Implementation is heavy — most brands spend 4–8 weeks getting Yotpo configured before sending the first review request.",
      "It's built for enterprise eCommerce — local businesses, service providers, and brands under $1M ARR rarely use more than 20% of what they're paying for.",
      "AI is buyer-facing only (review summaries, sentiment) — there's no agent that actually generates campaigns end-to-end for you.",
    ],
    whatWeDoDifferently: [
      "AI agent generates the full campaign — perk, copy, schedule, FTC disclosure — in under 10 minutes.",
      "One bundle replaces 4 Yotpo modules: reviews, referrals, perks-for-posts, and influencer marketplace all in $19–$79/mo.",
      "Built for local + DTC, not just enterprise Shopify — works for salons, gyms, restaurants, and service businesses.",
      "Perk-for-post model turns customers into micro-influencers (post on Instagram, get a discount) — Yotpo's loyalty module only does on-site points.",
      "Free forever tier with no order-volume cliff. Prove ROI before paying a dollar.",
    ],
    migrationSteps: [
      {
        title: "Export your data from Yotpo",
        body: "From the Yotpo dashboard, go to Settings → Account → Export. Download your reviews CSV, customer list, and loyalty member list. Yotpo emails the export within 24 hours.",
      },
      {
        title: "Import into Social Perks",
        body: "Drop the CSVs into the Social Perks import wizard. Reviews, customers, and existing loyalty balances map automatically. Typical import time: 5 minutes for under 10,000 records.",
      },
      {
        title: "Launch your first AI campaign",
        body: "Tell the campaign agent your business type and goal. It generates a multi-channel perk campaign (post-for-discount, review-for-credit, refer-a-friend) and schedules it across Instagram, Google Business Profile, and Yelp.",
      },
    ],
    whatYouGet: [
      "Free forever tier (Yotpo has limited free reviews only)",
      "AI campaign generation that writes copy and schedules posts",
      "Native influencer marketplace built into the same tool",
      "Local SEO flows for Google Business Profile and Yelp",
      "Public flat-rate pricing — no quotes, no add-on creep",
    ],
    whatYouGiveUp: [
      "Yotpo's seller-rating feed into Google Shopping is genuinely best-in-class for enterprise eCommerce — if Google Shopping is your #1 channel, that's a real tradeoff.",
      "Yotpo's subscription billing engine is more mature. If you sell physical subscription product, you'll want to keep that piece.",
      "Deep enterprise integrations (Salesforce Commerce Cloud, custom ERP) — we cover Shopify, Square, WooCommerce, and Toast, but not the enterprise tail.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "Free up to 50 orders/mo" },
      { feature: "Practical entry", socialPerks: "$19/mo", competitor: "$79–$199/mo Reviews Growth" },
      { feature: "Full stack price", socialPerks: "$79/mo (everything)", competitor: "$500–$1,500/mo (Reviews + Loyalty + SMS)" },
      { feature: "Setup time", socialPerks: "Under 10 minutes", competitor: "4–8 weeks typical" },
      { feature: "Contract", socialPerks: "Month-to-month", competitor: "Annual common above Growth tier" },
    ],
    faqs: [
      { q: "How long does migration from Yotpo take?", a: "Most brands are fully migrated in 1–2 days, including data import and first-campaign launch. Yotpo's export takes up to 24 hours; the rest is automated." },
      { q: "Can I keep my existing review widget on my product pages?", a: "Yes. We provide a drop-in widget that loads your migrated reviews. If you're on Shopify, the swap takes about 15 minutes." },
      { q: "Will my loyalty members lose their points?", a: "No. Existing point balances import 1:1 from Yotpo Loyalty. We'll honor the same earn/redeem ratios you had configured." },
      { q: "Do I need to cancel Yotpo before migrating?", a: "We recommend running both in parallel for 2 weeks to verify the migration. Cancel Yotpo at the end of that window." },
      { q: "What about my Klaviyo integration?", a: "Social Perks has a native Klaviyo integration that mirrors the Yotpo events (review submitted, perk redeemed, referral converted). Your existing flows continue working." },
      { q: "Is there a free migration service?", a: "Yes. On any paid plan we'll run the import for you and verify everything maps correctly. Free tier customers do it self-serve with the import wizard." },
    ],
  },
  {
    slug: "loox",
    name: "Loox",
    category: "ugc-reviews",
    categoryLabel: "UGC & Reviews",
    oneLiner: "Photo and video reviews app for Shopify — beautiful widgets, Shopify-only.",
    whyPeopleSwitch: [
      "Shopify-only — if you expand to a brick-and-mortar location, a Square POS, or a non-Shopify channel, Loox doesn't follow you.",
      "Reviews are the only job — you still need separate tools for referrals, social posts, influencer outreach, and loyalty.",
      "14-day trial only, no forever-free plan. Once the trial ends you're paying $9.99–$299/mo for reviews alone.",
      "No AI campaign generation — Loox's AI is limited to review summaries and sentiment tagging.",
    ],
    whatWeDoDifferently: [
      "Works anywhere — Shopify, Square, WooCommerce, Toast, Mindbody, or no POS at all.",
      "Reviews + referrals + perks-for-posts + influencer marketplace in one tool, not four.",
      "AI agent designs the campaign (perk, copy, schedule) instead of just collecting reviews.",
      "Perk-for-post model gets customers posting on Instagram and TikTok, not just leaving on-site stars.",
      "Free forever tier — no 14-day cliff.",
    ],
    migrationSteps: [
      {
        title: "Export reviews from Loox",
        body: "Loox → Settings → Export → Reviews. Choose CSV format. Download includes photos and videos as URLs.",
      },
      {
        title: "Import into Social Perks",
        body: "Upload the CSV in the import wizard. Photos and videos rehost to our CDN automatically. Star ratings, customer names, and review dates preserve.",
      },
      {
        title: "Install the review widget",
        body: "On Shopify: install our app, paste the widget into your product template. On any other site: drop in the embed snippet. Done.",
      },
    ],
    whatYouGet: [
      "Free forever tier (Loox is trial-only)",
      "Works off Shopify too — Square, Toast, Mindbody, brick-and-mortar",
      "AI-generated multi-channel perk campaigns",
      "Built-in influencer marketplace and perk-for-post flows",
      "Local SEO tools for Google Business Profile and Yelp",
    ],
    whatYouGiveUp: [
      "Loox's on-site widget polish is genuinely best-in-class — 8+ years of Shopify theme hardening. Ours is good; theirs is the gold standard.",
      "Loox's photo-first review collection flow is uniquely tuned for eCommerce — if that's literally your only need, theirs is more specialized.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "14-day trial only" },
      { feature: "Entry paid plan", socialPerks: "$19/mo", competitor: "$9.99/mo Beginner" },
      { feature: "Mid-tier", socialPerks: "$79/mo (everything)", competitor: "$34.99/mo Scale" },
      { feature: "Works off Shopify", socialPerks: "Yes", competitor: "No — Shopify only" },
      { feature: "Bundled tools", socialPerks: "Reviews + referrals + perks + influencer", competitor: "Reviews only" },
    ],
    faqs: [
      { q: "Will I lose my photo and video reviews?", a: "No — photos and videos rehost to our CDN during import and keep their original star ratings, customer names, and dates." },
      { q: "Does the review widget look the same?", a: "Close but not identical. Our widget supports the same photo-first grid, carousel, and star summary layouts. Most customers can't tell the difference after the swap." },
      { q: "What about my Google seller-rating feed?", a: "We support the Google seller-ratings schema. Your aggregate star rating and review count continue feeding Google Shopping after migration." },
      { q: "Can I migrate if I'm not on Shopify?", a: "Yes. That's one of the main reasons people switch. We work on Shopify, WooCommerce, Square, Toast, Mindbody, or any custom site." },
      { q: "How much do I save vs Loox?", a: "Depends on your plan. Loox Beginner ($9.99/mo) vs our free tier saves you about $120/year for the same review functionality. Loox Unlimited ($299.99/mo) vs our $79/mo Pro saves $2,650/year." },
      { q: "Do I need to keep Loox during the trial?", a: "Run both in parallel for 7–14 days, verify reviews appear correctly, then cancel Loox. We provide a side-by-side checklist." },
    ],
  },
  {
    slug: "junip",
    name: "Junip",
    category: "ugc-reviews",
    categoryLabel: "UGC & Reviews",
    oneLiner: "Modern review collection for Shopify — clean UI, mobile-first, premium pricing.",
    whyPeopleSwitch: [
      "Premium pricing for a single-purpose tool — Junip starts at $39/mo and scales to $499+/mo for reviews alone.",
      "Shopify-only — no support for Square POS, brick-and-mortar, or non-Shopify channels.",
      "No native referral, perks-for-posts, or influencer features — you'll bolt on 3 other tools.",
      "Limited free tier (50 orders/mo) that most growing brands outgrow in their first 60 days.",
    ],
    whatWeDoDifferently: [
      "AI generates the campaign — not just the review request email.",
      "One tool for reviews, referrals, perks-for-posts, and influencer outreach.",
      "Works on Shopify, Square, Toast, Mindbody, WooCommerce, or no POS at all.",
      "Perk-for-post model: customers earn discounts for posting on Instagram or leaving a Google review, not just for buying.",
      "Truly free tier with no order cap.",
    ],
    migrationSteps: [
      {
        title: "Export Junip data",
        body: "Junip → Settings → Data Export → Reviews & Customers. Junip emails a CSV bundle within 1 hour.",
      },
      {
        title: "Import to Social Perks",
        body: "Use the Junip-specific import preset in our wizard. Maps Junip's question/answer schema cleanly to ours.",
      },
      {
        title: "Replace the on-site widget",
        body: "Install our Shopify app, swap the Junip widget for ours in the theme editor. Reviews appear instantly.",
      },
    ],
    whatYouGet: [
      "Free forever tier with no order cap",
      "AI campaign agent built in",
      "Referrals, perks-for-posts, and influencer marketplace bundled",
      "Works off Shopify",
      "Public, flat pricing — no quote calls",
    ],
    whatYouGiveUp: [
      "Junip's mobile review form has some of the best completion rates in the category. Our form is good, but Junip optimized it for years.",
      "Junip's question-and-answer flow (custom attributes, conditional questions) is more granular than ours.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "Free up to 50 orders/mo" },
      { feature: "Entry paid plan", socialPerks: "$19/mo", competitor: "$39/mo" },
      { feature: "Pro tier", socialPerks: "$79/mo (everything)", competitor: "$129/mo (reviews only)" },
      { feature: "Off-Shopify support", socialPerks: "Yes", competitor: "No" },
      { feature: "Referrals included", socialPerks: "Yes", competitor: "No" },
    ],
    faqs: [
      { q: "Will custom review questions migrate?", a: "Yes. Our Junip preset maps custom attributes and question types automatically. Conditional logic moves over manually — we'll walk you through it." },
      { q: "Do I keep my star ratings and review count?", a: "Yes. Aggregate scores, individual reviews, dates, and customer names all preserve." },
      { q: "What about my Klaviyo flows?", a: "We trigger the same Klaviyo events Junip does (review submitted, review approved). Existing flows continue working with a 10-minute config update." },
      { q: "Is there a free migration service?", a: "Yes — on any paid plan. Free tier users migrate self-serve in about 30 minutes." },
      { q: "Can I run Junip and Social Perks in parallel?", a: "Yes, for verification. We recommend 1–2 weeks of overlap before canceling Junip." },
      { q: "Does my Google seller-ratings feed continue working?", a: "Yes. We support the same schema.org review markup Junip does." },
    ],
  },
  {
    slug: "okendo",
    name: "Okendo",
    category: "ugc-reviews",
    categoryLabel: "UGC & Reviews",
    oneLiner: "Premium review platform for Shopify Plus brands — polished, expensive, mid-market focus.",
    whyPeopleSwitch: [
      "Premium pricing — Okendo starts at $19/mo for very small stores but realistic plans for growing brands run $119–$499+/mo.",
      "Built for Shopify Plus — overkill (and overpriced) for businesses under $1M ARR.",
      "Reviews only — you still need separate tools for referrals, loyalty, social posts, and influencer outreach.",
      "Implementation requires onboarding calls and theme customization, not 10-minute self-serve.",
    ],
    whatWeDoDifferently: [
      "10-minute self-serve onboarding — no calls, no theme customization required.",
      "Reviews + referrals + perks-for-posts + influencer marketplace bundled.",
      "AI agent generates campaigns end-to-end.",
      "Works for local + service businesses, not just Shopify Plus DTC.",
      "Forever-free tier — Okendo's free tier caps at 50 monthly orders.",
    ],
    migrationSteps: [
      {
        title: "Export from Okendo",
        body: "Okendo Dashboard → Settings → Export. Select reviews, customers, and media. Email delivery within 2 hours.",
      },
      {
        title: "Import into Social Perks",
        body: "Drop the CSV bundle into our import wizard. Photos, videos, and review attributes preserve.",
      },
      {
        title: "Swap the widget",
        body: "Install our Shopify app, replace the Okendo widget block. UTM tracking and existing Klaviyo events continue working.",
      },
    ],
    whatYouGet: [
      "Forever-free tier with no order cliff",
      "AI campaign generation",
      "Referrals, perks-for-posts, influencer marketplace bundled",
      "10-minute self-serve setup",
      "Flat public pricing — no enterprise quote",
    ],
    whatYouGiveUp: [
      "Okendo's customer surveys and quizzes are genuinely best-in-class for Shopify Plus brands — if zero-party data collection is your core motion, that's a real tradeoff.",
      "Okendo's deep Shopify Plus integration (checkout extensibility, B2B, headless) is more mature than ours.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "Free up to 50 orders/mo" },
      { feature: "Entry paid plan", socialPerks: "$19/mo", competitor: "$119/mo Essential" },
      { feature: "Pro/Growth tier", socialPerks: "$79/mo (everything)", competitor: "$299–$499/mo" },
      { feature: "Self-serve setup", socialPerks: "10 minutes", competitor: "Onboarding call + theme work" },
      { feature: "Bundled scope", socialPerks: "Reviews + referrals + perks + influencer", competitor: "Reviews + surveys" },
    ],
    faqs: [
      { q: "Will my survey and quiz data come over?", a: "Reviews and customer profiles migrate cleanly. Custom surveys map to our review attributes; complex multi-step quizzes need to be rebuilt manually — we provide templates." },
      { q: "What about Okendo's Klaviyo integration?", a: "We have a native Klaviyo integration that fires the same events. Your existing flows keep running after a 10-minute config update." },
      { q: "Do I lose my aggregate star rating?", a: "No. Aggregate scores, review counts, photos, and videos all preserve. Schema.org markup continues feeding Google seller ratings." },
      { q: "Can I migrate while keeping Okendo running?", a: "Yes — we recommend 1–2 weeks of parallel running to verify before canceling." },
      { q: "Is there an annual discount?", a: "Yes — 2 months free on annual prepay across all paid tiers." },
      { q: "Will my reviews keep showing on Google Shopping?", a: "Yes. We pass the same review feed to Google Merchant Center." },
    ],
  },
  {
    slug: "stamped-io",
    name: "Stamped.io",
    category: "ugc-reviews",
    categoryLabel: "UGC & Reviews",
    oneLiner: "Reviews, loyalty, and referrals for Shopify and BigCommerce — broad scope, dated UX.",
    whyPeopleSwitch: [
      "UX feels dated — Stamped is one of the older players in the category and the admin experience shows its age.",
      "Pricing escalates fast — Reviews Premium plus Loyalty plus Referrals can push past $300/mo for mid-size shops.",
      "No native influencer marketplace or perks-for-posts model.",
      "Support response times are inconsistent based on widely-reported reviews on Shopify App Store.",
    ],
    whatWeDoDifferently: [
      "Modern admin UI designed for small business owners, not enterprise admins.",
      "AI campaign agent generates the entire campaign, not just sends a review request email.",
      "Native influencer marketplace and perks-for-posts built in.",
      "Single flat price covers reviews + loyalty + referrals + perks + influencer.",
      "Fast support — typical response under 4 hours business days, public response-time SLA.",
    ],
    migrationSteps: [
      {
        title: "Export from Stamped",
        body: "Stamped → Settings → Data Export. Generate review, customer, and loyalty exports. Download within 1 hour.",
      },
      {
        title: "Import to Social Perks",
        body: "Our Stamped preset maps reviews, loyalty points, and referral codes in one pass.",
      },
      {
        title: "Replace widget and run first campaign",
        body: "Install Shopify or BigCommerce app, swap the widget, then ask the AI agent to design a re-engagement campaign for your existing loyalty members.",
      },
    ],
    whatYouGet: [
      "Modern admin UI built this decade",
      "Native influencer marketplace and perks-for-posts",
      "AI campaign agent",
      "Single bundled price (no per-module add-ons)",
      "Faster, more responsive support",
    ],
    whatYouGiveUp: [
      "Stamped has a longer track record on BigCommerce specifically — if you're deep in BigCommerce, expect a couple more edge cases to work through.",
      "Stamped's NPS surveys are a separate module they've built out — ours is lighter weight.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "Free up to 50 orders/mo" },
      { feature: "Reviews + Loyalty", socialPerks: "$19–$79/mo bundled", competitor: "$59 + $59/mo separately" },
      { feature: "Influencer marketplace", socialPerks: "Included", competitor: "Not available" },
      { feature: "AI campaign generation", socialPerks: "Yes", competitor: "Limited" },
      { feature: "Support response SLA", socialPerks: "Under 4 hours business days", competitor: "No public SLA" },
    ],
    faqs: [
      { q: "Will my Stamped loyalty points carry over?", a: "Yes. Point balances, earn rates, and redemption rules import 1:1." },
      { q: "What about my existing referral codes?", a: "Active referral codes import with their existing reward structure. We'll generate matching codes for any URLs already shared in the wild." },
      { q: "Do reviews keep their photos and videos?", a: "Yes. Media rehosts to our CDN and the original review metadata preserves." },
      { q: "Can I keep using Stamped's email templates?", a: "We provide equivalent templates and the AI agent can rewrite your existing copy to match Social Perks' deliverability best practices." },
      { q: "How long is the typical migration?", a: "1–2 days end-to-end including 1–2 weeks of optional parallel running for verification." },
      { q: "Does it work on BigCommerce?", a: "Yes. We support Shopify, BigCommerce, WooCommerce, Square, Toast, and custom sites." },
    ],
  },
  {
    slug: "trustpulse",
    name: "TrustPulse",
    category: "ugc-reviews",
    categoryLabel: "UGC & Reviews",
    oneLiner: "Social proof notifications (FOMO popups) that show recent purchases or signups.",
    whyPeopleSwitch: [
      "Single-feature tool — TrustPulse only does FOMO popups, nothing else.",
      "Popups are increasingly seen as spammy — many brands are moving toward earned trust (real reviews, real perks) instead of manufactured urgency.",
      "Pricing ($5–$39/mo) is fine but adds up when you also need a real reviews tool and a real referral tool.",
      "No actual content collection — TrustPulse displays activity but doesn't help you create or earn it.",
    ],
    whatWeDoDifferently: [
      "Earned trust over manufactured FOMO — real reviews from real customers earning real perks.",
      "Bundles reviews + referrals + perks + influencer in one tool.",
      "AI agent generates the entire campaign, not just a popup widget.",
      "Social proof comes from posts on Instagram, Google reviews, and TikTok — channels customers actually trust.",
      "Free tier with no notification cap.",
    ],
    migrationSteps: [
      {
        title: "Export TrustPulse activity feed",
        body: "TrustPulse → Campaigns → Export. You'll get a CSV of recent activity events.",
      },
      {
        title: "Import to Social Perks (optional)",
        body: "TrustPulse data is primarily activity logs, so most brands don't import it — they replace the FOMO motion with a real reviews + referrals motion.",
      },
      {
        title: "Launch your first real campaign",
        body: "Ask the AI agent to design a review-collection + perk-for-post campaign. Within a week you'll have real social proof to display, not generated popups.",
      },
    ],
    whatYouGet: [
      "Real reviews and UGC, not manufactured popups",
      "Referrals, perks-for-posts, influencer marketplace",
      "AI campaign generation",
      "Activity widget that displays real customer actions (post, review, refer)",
      "Free forever tier",
    ],
    whatYouGiveUp: [
      "TrustPulse's notification widget is genuinely good at what it does — if you only want a popup that says 'someone in Dallas just bought this,' TrustPulse is purpose-built for it.",
      "Our activity widget is less flashy. TrustPulse has invested in micro-animations and entry effects we haven't matched.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "$5/mo Basic" },
      { feature: "Practical plan", socialPerks: "$19/mo", competitor: "$10–$39/mo" },
      { feature: "What you get", socialPerks: "Reviews + referrals + perks + popup", competitor: "Popup only" },
      { feature: "AI campaign generation", socialPerks: "Yes", competitor: "No" },
      { feature: "Content collection", socialPerks: "Yes (reviews + posts)", competitor: "No (display only)" },
    ],
    faqs: [
      { q: "Can I display recent purchases as a popup like TrustPulse does?", a: "Yes. Our activity widget shows recent posts, reviews, and purchases with similar animations. The data is real customer activity, not synthetic." },
      { q: "Does the widget hurt page speed?", a: "Our widget loads async and adds about 12KB gzipped. Page speed impact is comparable to TrustPulse." },
      { q: "Can I customize the popup look?", a: "Yes — colors, position, animation timing, message templates, and trigger rules are all configurable." },
      { q: "What if I want to keep TrustPulse for popups and use Social Perks for everything else?", a: "That works fine. Many customers run both for the first month, then realize they don't need TrustPulse." },
      { q: "How is this different from FOMO popups?", a: "We display real activity — actual posts, actual reviews, actual referrals — not just orders. The popup is one output of a real customer marketing motion, not the whole product." },
      { q: "Will conversion rate drop if I remove the popup?", a: "Usually no. Real reviews on the product page and a visible perk offer typically outperform FOMO popups for purchase intent." },
    ],
  },
  {
    slug: "reviews-io",
    name: "Reviews.io",
    category: "ugc-reviews",
    categoryLabel: "UGC & Reviews",
    oneLiner: "Review collection platform with Google-licensed reviews — UK-focused, multi-platform.",
    whyPeopleSwitch: [
      "Pricing escalates with review volume — what starts at $89/mo can hit $399+/mo for active stores.",
      "Reviews-only scope — you'll still pay separately for referrals, loyalty, and influencer outreach.",
      "Setup involves Google Reviews licensing fees and feed configuration that take days.",
      "No AI campaign agent — you write the request emails, design the perks, and schedule everything yourself.",
    ],
    whatWeDoDifferently: [
      "Bundled scope — reviews, referrals, perks, influencer in one $19–$79/mo plan.",
      "AI agent designs the campaign, writes the copy, and schedules the sends.",
      "No per-review-volume pricing cliffs.",
      "Perk-for-post model captures Instagram and TikTok content alongside on-site reviews.",
      "Free forever tier.",
    ],
    migrationSteps: [
      {
        title: "Export Reviews.io data",
        body: "Reviews.io → Account → Export. Download review and customer CSVs. Media files included as URLs.",
      },
      {
        title: "Import to Social Perks",
        body: "Use the Reviews.io preset in our import wizard. Star ratings, photos, videos, and customer profiles transfer.",
      },
      {
        title: "Reconnect Google seller-ratings feed",
        body: "We provide the schema.org markup and Google Merchant Center XML feed Reviews.io was generating. 15-minute reconfiguration in Google Merchant Center.",
      },
    ],
    whatYouGet: [
      "Bundled reviews + referrals + perks + influencer",
      "AI campaign generation",
      "Free forever tier",
      "Flat pricing — no per-review-volume tiers",
      "Native influencer marketplace",
    ],
    whatYouGiveUp: [
      "Reviews.io's Google Reviews licensing partnership is unique — if displaying licensed Google review content is critical, you may want to keep it.",
      "Reviews.io has stronger penetration in the UK market — local support hours may be a factor for UK-based teams.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "Free up to 50 orders/mo" },
      { feature: "Entry paid plan", socialPerks: "$19/mo", competitor: "$89/mo" },
      { feature: "Pro tier", socialPerks: "$79/mo (everything)", competitor: "$199–$399/mo" },
      { feature: "Bundled scope", socialPerks: "Reviews + referrals + perks + influencer", competitor: "Reviews only" },
      { feature: "AI campaign generation", socialPerks: "Yes", competitor: "No" },
    ],
    faqs: [
      { q: "Do I lose my Google seller-ratings feed?", a: "No. We generate the same XML feed for Google Merchant Center. Reconfiguration takes about 15 minutes." },
      { q: "What about my Trustpilot or licensed Google reviews?", a: "Owned reviews migrate fully. Licensed Google review content is tied to Reviews.io's partnership — those don't transfer." },
      { q: "How long does the migration take?", a: "Most brands complete migration in 1 business day, plus 1–2 weeks of parallel running for verification." },
      { q: "Will my on-site review widget look similar?", a: "Yes. We offer equivalent grid, carousel, and badge widgets. Most customers don't notice the swap visually." },
      { q: "Does it work for non-Shopify stores?", a: "Yes. We support Shopify, BigCommerce, WooCommerce, Magento, Square, Toast, and custom sites." },
      { q: "Is there UK-based support?", a: "We have support coverage across US and EU business hours. Response time is under 4 hours business days." },
    ],
  },
  {
    slug: "judge-me",
    name: "Judge.me",
    category: "ugc-reviews",
    categoryLabel: "UGC & Reviews",
    oneLiner: "Affordable Shopify reviews app — fast, cheap, narrow scope.",
    whyPeopleSwitch: [
      "Reviews-only — no referrals, no loyalty, no perks-for-posts, no influencer features.",
      "Shopify-focused — limited functionality off Shopify.",
      "No AI campaign agent — you write every review request and design every incentive manually.",
      "Growth often forces a stack — Judge.me + Smile.io + Refersion adds up to more than one bundled tool.",
    ],
    whatWeDoDifferently: [
      "Reviews + referrals + perks + influencer all bundled.",
      "AI agent generates campaigns, writes copy, schedules sends.",
      "Works on any platform — Shopify, Square, Toast, WooCommerce, custom sites.",
      "Perk-for-post model captures social content, not just on-site reviews.",
      "Forever-free tier with broader feature scope than Judge.me's free plan.",
    ],
    migrationSteps: [
      {
        title: "Export Judge.me reviews",
        body: "Judge.me → Settings → Export → All Reviews. Choose CSV. Download includes photos and customer data.",
      },
      {
        title: "Import to Social Perks",
        body: "Drop the CSV into our Judge.me preset. Star ratings, photos, customer profiles, and review dates preserve.",
      },
      {
        title: "Install and launch",
        body: "Install our Shopify app, swap the widget, then ask the AI to design your first multi-channel campaign (review collection + perk-for-Instagram-post).",
      },
    ],
    whatYouGet: [
      "Referrals, perks-for-posts, influencer marketplace alongside reviews",
      "AI campaign generation",
      "Works off Shopify",
      "Forever-free tier with broader features",
      "Single tool instead of a stack of 3–4",
    ],
    whatYouGiveUp: [
      "Judge.me's free tier is genuinely generous for pure reviews — if reviews are literally the only thing you'll ever need, theirs is hard to beat on price.",
      "Judge.me's Shopify-native experience is highly polished after years of iteration.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "Free Forever (reviews only)" },
      { feature: "Awesome / Pro tier", socialPerks: "$19–$79/mo (everything)", competitor: "$15/mo (reviews only)" },
      { feature: "Bundled scope", socialPerks: "Reviews + referrals + perks + influencer", competitor: "Reviews only" },
      { feature: "AI campaign generation", socialPerks: "Yes", competitor: "No" },
      { feature: "Works off Shopify", socialPerks: "Yes", competitor: "Limited" },
    ],
    faqs: [
      { q: "Will my Judge.me free reviews migrate?", a: "Yes. All reviews — including photos, videos, star ratings, and customer profiles — import via the Judge.me preset." },
      { q: "Is Social Perks really worth it if Judge.me is free?", a: "Only if you need more than reviews. If reviews are your only goal forever, stay on Judge.me. If you'll add referrals, perks-for-posts, or influencer outreach within 6 months, bundling is cheaper than stacking." },
      { q: "Does the widget look similar?", a: "Yes — grid, carousel, and badge layouts are equivalent. Most customers don't notice the visual change." },
      { q: "What about Q&A and product questions?", a: "We support product Q&A. The migration moves questions and answers along with reviews." },
      { q: "Will my Google seller-ratings keep working?", a: "Yes. We pass the same schema.org markup and XML feed Judge.me generates." },
      { q: "How long does setup take?", a: "Under 10 minutes for the basic setup. Full migration and parallel verification typically takes 1–2 business days." },
    ],
  },

  // ========== INFLUENCER PLATFORMS ==========
  {
    slug: "brandbassador",
    name: "Brandbassador",
    category: "influencer",
    categoryLabel: "Influencer & Ambassador",
    oneLiner: "Ambassador program management for DTC brands with existing communities.",
    whyPeopleSwitch: [
      "Pricing is opaque and high — quotes typically land $400–$800/mo for entry, climbing into the low five figures.",
      "Sales-led onboarding — no self-serve trial, demo required before pricing.",
      "Requires an existing community of 500+ engaged customers to make economic sense.",
      "Built for DTC eCommerce only — doesn't fit local or service businesses.",
    ],
    whatWeDoDifferently: [
      "Self-serve onboarding in under 10 minutes — no demo call needed.",
      "Forever-free tier so you can prove ROI before paying.",
      "AI agent designs the campaign instead of you building missions manually.",
      "Customer-as-marketer model works without a pre-existing 500-person community.",
      "Public flat pricing — $19/$79/$249 instead of custom quotes.",
    ],
    migrationSteps: [
      {
        title: "Export your ambassador list",
        body: "From Brandbassador → Members → Export. Download CSV including ambassador profiles, tasks completed, and reward history.",
      },
      {
        title: "Import to Social Perks",
        body: "Our Brandbassador preset maps ambassador profiles, task history, and pending rewards. Ambassadors receive a welcome email explaining the migration.",
      },
      {
        title: "Run first AI campaign",
        body: "Ask the AI agent for an ambassador re-engagement campaign. It designs a perk structure, writes outreach copy, and schedules launches across Instagram, TikTok, and email.",
      },
    ],
    whatYouGet: [
      "Forever-free tier",
      "Self-serve onboarding under 10 minutes",
      "AI campaign generation",
      "Works without a 500+ ambassador community",
      "Public flat pricing",
    ],
    whatYouGiveUp: [
      "Brandbassador's ambassador portal UI is more polished for established communities. Our portal is good; theirs is purpose-built for 500+ ambassador programs.",
      "Multi-currency cash payouts (30+ currencies) are a real Brandbassador strength — our cash payout flow covers fewer currencies.",
      "Dedicated customer success manager is included on most Brandbassador plans; ours is on the $249/mo Scale tier and above.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "No free tier" },
      { feature: "Entry paid plan", socialPerks: "$19/mo", competitor: "~$400–$800/mo (custom)" },
      { feature: "Public pricing", socialPerks: "Yes", competitor: "No" },
      { feature: "Self-serve setup", socialPerks: "10 minutes", competitor: "Sales-led demo required" },
      { feature: "Annual contract", socialPerks: "Optional", competitor: "Standard" },
    ],
    faqs: [
      { q: "Will my ambassadors get notified of the migration?", a: "Yes. We send a templated email explaining the move and pointing them to the new ambassador portal. Their existing rewards balance transfers." },
      { q: "What happens to pending rewards or cash payouts?", a: "Pending balances import 1:1. We can issue final payouts in the original currencies through Stripe Connect." },
      { q: "Can I keep the same mission/task structure?", a: "Yes. Brandbassador 'missions' map to Social Perks 'actions.' The AI agent can also redesign your task structure if you want to refresh the program." },
      { q: "Do I need to cancel Brandbassador first?", a: "No — run both in parallel for 2–4 weeks while you verify the new portal works for your ambassadors." },
      { q: "Will I keep my Klaviyo or Mailchimp integration?", a: "Yes. We have native integrations with both. Existing flows continue working." },
      { q: "Is there a free migration service?", a: "Yes on the $79/mo Pro tier and above. Includes data import, ambassador notification email, and a kick-off campaign design call." },
    ],
  },
  {
    slug: "aspireire",
    name: "AspireIQ (Aspire)",
    category: "influencer",
    categoryLabel: "Influencer & Ambassador",
    oneLiner: "Enterprise influencer marketing platform for DTC brands running large creator programs.",
    whyPeopleSwitch: [
      "Pricing starts around $1,500–$2,500/mo and climbs to $5,000–$15,000/mo — out of reach for most small businesses.",
      "Designed for brands with a dedicated creator partnerships team and a $50k+/year creator budget.",
      "Sales-led, no public pricing, no self-serve trial.",
      "Built around paid creator contracts — doesn't fit brands wanting to use existing customers as creators.",
    ],
    whatWeDoDifferently: [
      "Customer-as-creator model — your existing customers ARE your creator base.",
      "Perk-for-post structure works without per-creator contract negotiation.",
      "$19–$249/mo public pricing, not $1,500+ custom quotes.",
      "Self-serve onboarding under 10 minutes.",
      "Free forever tier.",
    ],
    migrationSteps: [
      {
        title: "Export your creator roster",
        body: "Aspire → Creators → Export. Download CSV including creator contact info, past campaign history, and earnings.",
      },
      {
        title: "Import to Social Perks",
        body: "Map Aspire creators into our influencer marketplace. Active partnerships preserve their reward structure.",
      },
      {
        title: "Launch first hybrid campaign",
        body: "Ask the AI agent to design a campaign that uses your existing creator roster + your customer base. Customers earn perks for posts; creators earn cash through Stripe Connect.",
      },
    ],
    whatYouGet: [
      "Free forever tier",
      "Public flat pricing instead of $1,500+/mo custom",
      "Customer-as-creator model — no per-creator contracts required",
      "AI campaign generation",
      "Self-serve onboarding",
    ],
    whatYouGiveUp: [
      "Aspire's creator discovery database (millions of profiles with audience-quality scoring) is genuinely best-in-class. Ours covers fewer creators.",
      "Aspire's contract management, usage rights, and exclusivity workflows are more mature than ours.",
      "Enterprise reporting depth — Aspire has more granular ROI attribution dashboards.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "No free tier" },
      { feature: "Entry paid plan", socialPerks: "$19/mo", competitor: "~$1,500–$2,500/mo" },
      { feature: "Public pricing", socialPerks: "Yes", competitor: "No" },
      { feature: "Self-serve setup", socialPerks: "10 minutes", competitor: "Sales demo required" },
      { feature: "Customer-as-creator", socialPerks: "Built in", competitor: "Limited" },
    ],
    faqs: [
      { q: "Can I still pay creators in cash?", a: "Yes. Stripe Connect integration handles cash payouts to creators in 40+ countries. The default is perk-based (discount/freebie) but cash is supported on Pro and above." },
      { q: "Will my creator contracts come over?", a: "Contract metadata imports as records. Active payment schedules need to be re-set up in our payouts module — we'll walk you through it." },
      { q: "Do I lose access to creator discovery?", a: "Our marketplace is smaller than Aspire's database. For creators outside our marketplace, we support manual invite by email or social handle." },
      { q: "How does the cost difference work in practice?", a: "Brands switching from Aspire typically save 80–95% on software cost. The savings often go into bigger creator perks or paid campaigns." },
      { q: "Is there a managed-service option?", a: "Yes on the $249/mo Scale tier — includes campaign strategy calls and a dedicated success manager." },
      { q: "What about FTC compliance?", a: "Auto-injected per platform on every campaign. Cannot be disabled. Aspire does this too — we maintain parity." },
    ],
  },
  {
    slug: "grin",
    name: "GRIN",
    category: "influencer",
    categoryLabel: "Influencer & Ambassador",
    oneLiner: "Enterprise creator management platform for $10M+ DTC brands.",
    whyPeopleSwitch: [
      "Enterprise pricing — $25,000–$100,000+/year with annual contracts.",
      "Months of implementation before first campaign launch.",
      "Designed for $10M+ DTC brands with dedicated creator teams.",
      "Heavy CRM + workflow tool — most growing brands use 20% of the features.",
    ],
    whatWeDoDifferently: [
      "Public $19–$249/mo pricing, not $25k+/year contracts.",
      "Onboarding in 10 minutes, not 3 months.",
      "AI agent generates the campaign — you don't need a creator team to operate it.",
      "Customer-as-creator model means you don't need a six-figure creator budget.",
      "Free forever tier.",
    ],
    migrationSteps: [
      {
        title: "Export creator data from GRIN",
        body: "GRIN → Creators → Export. Pull creator profiles, past campaign data, and contract status.",
      },
      {
        title: "Import to Social Perks",
        body: "Map creators into our marketplace. Contract metadata imports as records; payment schedules need light reconfiguration.",
      },
      {
        title: "Launch lean first campaign",
        body: "Ask the AI agent to design a customer-perk + creator-cash hybrid campaign. Cost-per-post typically drops 60–80% vs GRIN-managed paid creator programs.",
      },
    ],
    whatYouGet: [
      "$19/mo entry instead of $25k+/year",
      "10-minute onboarding instead of 3 months",
      "AI campaign generation",
      "Customer-as-creator model",
      "Free forever tier",
    ],
    whatYouGiveUp: [
      "GRIN's creator CRM is genuinely best-in-class — email threads, contracts, shipments, and payments all integrated. Ours is lighter.",
      "Deep Shopify order-level attribution is a GRIN strength. Ours covers the basics.",
      "Enterprise reporting and BI exports — GRIN has more dashboards and more export formats.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "No free tier" },
      { feature: "Annual cost", socialPerks: "$228–$2,988/year", competitor: "$25,000–$100,000+/year" },
      { feature: "Public pricing", socialPerks: "Yes", competitor: "No" },
      { feature: "Setup time", socialPerks: "10 minutes", competitor: "3 months typical" },
      { feature: "Contract", socialPerks: "Month-to-month", competitor: "Annual standard" },
    ],
    faqs: [
      { q: "Am I downgrading by switching from GRIN?", a: "Honestly — depends on your stage. If you have a $500k+/year creator budget and a team of 3+ managing it, you'll lose meaningful CRM depth. If you're under that, you'll get more done with less complexity." },
      { q: "What about my creator contracts and usage rights?", a: "Contract terms import as records. Active usage rights and exclusivity clauses need to be migrated manually — we provide a checklist." },
      { q: "How does cost compare in practice?", a: "Most brands save $20k–$80k/year on software, then reinvest into bigger creator perks or paid campaigns. Software cost is rarely the bottleneck." },
      { q: "Will my order-level creator attribution still work?", a: "We attribute by UTM, discount code, and post-tracking. Order-level attribution depth is less than GRIN's but covers 90% of practical cases." },
      { q: "Can I run a hybrid program (customers + paid creators)?", a: "Yes. Customers earn perks; creators can earn cash through Stripe Connect on the same campaign." },
      { q: "Is there a customer success manager?", a: "Yes on the $249/mo Scale tier. Includes strategy calls, campaign reviews, and quarterly business reviews." },
    ],
  },
  {
    slug: "upfluence",
    name: "Upfluence",
    category: "influencer",
    categoryLabel: "Influencer & Ambassador",
    oneLiner: "Influencer and creator commerce platform for DTC brands and agencies.",
    whyPeopleSwitch: [
      "$1,500–$5,000/mo custom pricing with annual contracts.",
      "Sales-led — no public pricing, no free tier (except a Chrome extension).",
      "Designed for paid creator campaigns with negotiated rates — overkill for perk-based motions.",
      "Implementation includes sales, scoping, and configuration that typically takes 4–6 weeks.",
    ],
    whatWeDoDifferently: [
      "Public $19–$249/mo pricing.",
      "10-minute self-serve onboarding.",
      "Perk-for-post model scales without per-creator rate negotiation.",
      "Customer-as-creator detection built in — every customer is a potential micro-influencer.",
      "Forever-free tier.",
    ],
    migrationSteps: [
      {
        title: "Export Upfluence creator data",
        body: "Upfluence → Settings → Data Export. Pulls creator list, campaign history, and message threads.",
      },
      {
        title: "Import to Social Perks",
        body: "Creators import into the marketplace. Campaign history preserves as historical records.",
      },
      {
        title: "Re-launch with AI",
        body: "Ask the AI agent to design a perk-based campaign for your existing creator roster. Most brands cut per-post cost 50–70% by shifting from cash-only to hybrid perk + cash.",
      },
    ],
    whatYouGet: [
      "$19/mo entry instead of $1,500–$5,000/mo",
      "Self-serve onboarding",
      "AI campaign generation",
      "Customer-as-creator model",
      "Free forever tier",
    ],
    whatYouGiveUp: [
      "Upfluence's creator discovery database is broader and includes deeper audience-quality data.",
      "Agency multi-client management is more developed in Upfluence — if you're an agency running campaigns for 10+ brands, theirs is purpose-built.",
      "Upfluence's 'Live Capture' (auto-identifying customers who are also creators on social) is more granular than our equivalent.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "Free Chrome extension only" },
      { feature: "Entry paid plan", socialPerks: "$19/mo", competitor: "~$1,500–$5,000/mo" },
      { feature: "Public pricing", socialPerks: "Yes", competitor: "No" },
      { feature: "Self-serve setup", socialPerks: "10 minutes", competitor: "4–6 weeks typical" },
      { feature: "Contract", socialPerks: "Month-to-month", competitor: "Annual standard" },
    ],
    faqs: [
      { q: "Can I still find new creators?", a: "Yes. Our marketplace is smaller than Upfluence's but covers most major categories. Manual invite by email or handle is also supported." },
      { q: "What about Upfluence's Chrome extension for creator discovery?", a: "We don't have a direct equivalent. We do have a 'lookalike to my best customer' feature in the AI agent that surfaces similar creator profiles." },
      { q: "Will agency multi-client features work?", a: "We support multi-business accounts on the $249/mo Scale tier. Less polished than Upfluence's agency mode, but functional for 5–20 client portfolios." },
      { q: "How does cost actually compare?", a: "Brands switching typically save $15k–$50k/year on software. Many reinvest into bigger creator perks or paid campaigns." },
      { q: "Can creators get paid in cash, not just perks?", a: "Yes. Stripe Connect handles cash payouts. The default is perk-based but hybrid (perk + cash) campaigns are supported." },
      { q: "Does FTC compliance work the same way?", a: "Yes. Auto-injected per platform on every campaign. Cannot be disabled." },
    ],
  },
  {
    slug: "refersion",
    name: "Refersion",
    category: "influencer",
    categoryLabel: "Influencer & Ambassador",
    oneLiner: "Affiliate and influencer tracking with commission-based payouts.",
    whyPeopleSwitch: [
      "Affiliate-only scope — single-purpose tool, you'll still need separate tools for reviews, perks, and influencer outreach.",
      "$119/mo entry is fine for the job but adds up when you stack it with 3–4 other tools.",
      "Cash-commission model only — no perk-for-post option.",
      "No AI campaign generation — you design every affiliate program manually.",
    ],
    whatWeDoDifferently: [
      "Bundled scope — referrals + reviews + perks-for-posts + influencer in $19–$79/mo.",
      "AI agent designs the campaign and writes the affiliate outreach.",
      "Perk-based + cash-based payouts both supported — customers can earn discounts OR cash.",
      "Customer-as-marketer model means every customer can be a referrer, not just signed-up affiliates.",
      "Free forever tier.",
    ],
    migrationSteps: [
      {
        title: "Export affiliate data from Refersion",
        body: "Refersion → Settings → Export. Download affiliate list, commission history, and active referral codes.",
      },
      {
        title: "Import to Social Perks",
        body: "Affiliates import as referrers with their existing codes preserved. Active commission balances import 1:1.",
      },
      {
        title: "Reconnect tracking and launch",
        body: "We provide drop-in tracking pixel and Stripe Connect for payouts. AI agent designs a relaunch campaign for existing affiliates.",
      },
    ],
    whatYouGet: [
      "Bundled referrals + reviews + perks + influencer",
      "AI campaign generation",
      "Perk OR cash payouts (Refersion is cash-only)",
      "Customer-as-marketer model",
      "Free forever tier",
    ],
    whatYouGiveUp: [
      "Refersion's affiliate tracking is genuinely deeper — attribution windows, multi-touch credit, fraud detection on conversions are all more mature.",
      "Integration with major affiliate networks (ShareASale, Impact, CJ) — Refersion plugs into these as a hub; we don't.",
      "Complex commission structures (tiered, performance-based, time-decayed) are more flexible in Refersion.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "No free tier" },
      { feature: "Entry paid plan", socialPerks: "$19/mo", competitor: "$119/mo Professional" },
      { feature: "Pro tier", socialPerks: "$79/mo (everything)", competitor: "$279/mo Business" },
      { feature: "Payout model", socialPerks: "Perk OR cash", competitor: "Cash commissions only" },
      { feature: "Bundled scope", socialPerks: "Referrals + reviews + perks + influencer", competitor: "Affiliate tracking only" },
    ],
    faqs: [
      { q: "Will my affiliate links keep working?", a: "Yes. Existing referral codes import. URLs that have been shared in the wild continue resolving — we set up redirects for the legacy Refersion subdomain." },
      { q: "What about pending commission payouts?", a: "Pending balances import. Final payouts go out through Stripe Connect on the original schedule." },
      { q: "Can I keep tiered commission structures?", a: "Yes — multi-tier commission rates are supported. Complex time-decayed attribution rules need to be redesigned, we'll help." },
      { q: "Will my ShareASale or Impact integration carry over?", a: "Network integrations don't carry over directly. We support them via Zapier and our public API. Brands with deep ShareASale dependencies usually keep Refersion for that piece only." },
      { q: "How does fraud detection compare?", a: "We detect common fraud patterns (self-referral, duplicate IP, coupon stuffing). Refersion's fraud detection is more sophisticated for high-volume cash affiliate programs." },
      { q: "Can I still pay in cash, not just perks?", a: "Yes. Stripe Connect handles cash payouts. Default is perk-based but cash is fully supported on Pro and above." },
    ],
  },
  {
    slug: "intellifluence",
    name: "Intellifluence",
    category: "influencer",
    categoryLabel: "Influencer & Ambassador",
    oneLiner: "Self-serve influencer marketplace for product seeding to micro-influencers.",
    whyPeopleSwitch: [
      "Product-seeding focus — built for shipping free product to micro-influencers, less useful for service businesses.",
      "Influencer-only — no reviews, perks-for-posts, or referral features for your existing customers.",
      "Limited free tier with low outreach caps; paid plans start at $99/mo.",
      "Marketplace-style negotiation can be tedious for brands that just want to launch quickly.",
    ],
    whatWeDoDifferently: [
      "Customer-as-creator model — your existing customers are your primary creator pool.",
      "Bundled scope — reviews + referrals + perks + influencer in one tool.",
      "AI agent generates the campaign end-to-end, not just matches you with influencers.",
      "Works for service businesses where product seeding doesn't apply.",
      "Free forever tier with broader feature scope.",
    ],
    migrationSteps: [
      {
        title: "Export Intellifluence creator history",
        body: "Intellifluence → Account → Export. Pulls past creator partnerships, message threads, and campaign results.",
      },
      {
        title: "Import to Social Perks",
        body: "Past creators import as marketplace contacts. You can re-invite them to a new campaign with one click.",
      },
      {
        title: "Launch hybrid customer + creator campaign",
        body: "Ask the AI agent for a campaign that uses both your existing customer base AND past Intellifluence creators. Hybrid campaigns typically 3–5x output vs creator-only.",
      },
    ],
    whatYouGet: [
      "Customer-as-creator model — not just stranger creators",
      "Reviews + referrals + perks bundled in",
      "AI campaign generation",
      "Works for service businesses, not just product-seeding",
      "Free forever tier with broader features",
    ],
    whatYouGiveUp: [
      "Intellifluence's micro-influencer marketplace is genuinely deep — if pure product seeding is your motion, theirs is purpose-built.",
      "Marketplace-style negotiation (where influencers bid on your offers) is more developed in Intellifluence.",
      "Amazon-seller-specific workflows are a real Intellifluence strength.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever (full features)", competitor: "Free (limited outreach)" },
      { feature: "Entry paid plan", socialPerks: "$19/mo", competitor: "$99/mo Starter" },
      { feature: "Pro tier", socialPerks: "$79/mo (everything)", competitor: "$249/mo Advanced" },
      { feature: "Customer-as-creator", socialPerks: "Yes", competitor: "No" },
      { feature: "Bundled reviews/referrals", socialPerks: "Yes", competitor: "No" },
    ],
    faqs: [
      { q: "Will I keep my creator relationships from Intellifluence?", a: "Yes. Past creators import as marketplace contacts and can be re-invited to new campaigns with their contact history intact." },
      { q: "Can I still ship free product to micro-influencers?", a: "Yes. Product-seeding is one supported action type — we just don't make it the only option." },
      { q: "Does it work for Amazon sellers?", a: "Yes — we support Amazon review-friendly campaigns within Amazon's TOS. Our compliance engine flags requests that would violate Amazon policy." },
      { q: "What about the bidding marketplace?", a: "We don't have an Intellifluence-style auction. Creators accept perk/payout terms you set; for negotiated rates, you can DM individual creators." },
      { q: "Will my outreach caps go up?", a: "Yes — our free tier doesn't cap outreach volume the way Intellifluence's free tier does." },
      { q: "Is there a migration service?", a: "Yes on $79/mo Pro and above. Includes data import and re-engagement campaign design." },
    ],
  },
  {
    slug: "roster",
    name: "Roster",
    category: "influencer",
    categoryLabel: "Influencer & Ambassador",
    oneLiner: "Ambassador marketing platform for DTC brands with existing communities.",
    whyPeopleSwitch: [
      "$300–$1,200/mo custom pricing with sales-led onboarding.",
      "Designed for DTC brands with 1,000+ existing customers — too heavy for early-stage brands.",
      "No AI campaign generation — workflow tool, not strategist.",
      "Annual contracts standard.",
    ],
    whatWeDoDifferently: [
      "Self-serve onboarding under 10 minutes.",
      "AI agent designs the program structure, not just orchestrates it.",
      "Forever-free tier so you can start without 1,000 existing customers.",
      "Broader scope — reviews, referrals, perks, influencer in one tool.",
      "Public flat pricing.",
    ],
    migrationSteps: [
      {
        title: "Export ambassador roster from Roster",
        body: "Roster → Ambassadors → Export. Download ambassador list, task history, and reward balances.",
      },
      {
        title: "Import to Social Perks",
        body: "Ambassadors import with task history and rewards. Re-engagement email goes out automatically.",
      },
      {
        title: "Launch first AI campaign",
        body: "AI agent designs a tiered ambassador program based on your imported data. Active ambassadors get re-engaged; dormant ambassadors get a reactivation offer.",
      },
    ],
    whatYouGet: [
      "Self-serve onboarding",
      "AI campaign generation",
      "Free forever tier",
      "Broader scope (reviews + referrals + perks + influencer)",
      "Public flat pricing",
    ],
    whatYouGiveUp: [
      "Roster's brand-controlled ambassador portal is more polished for established programs.",
      "Tiered task workflows (badges, levels, achievements) are more developed in Roster.",
      "Dedicated CSM and annual contract predictability are Roster strengths.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "No free tier" },
      { feature: "Entry paid plan", socialPerks: "$19/mo", competitor: "~$300–$1,200/mo" },
      { feature: "Public pricing", socialPerks: "Yes", competitor: "No" },
      { feature: "Self-serve setup", socialPerks: "10 minutes", competitor: "Sales-led" },
      { feature: "Contract", socialPerks: "Month-to-month", competitor: "Annual standard" },
    ],
    faqs: [
      { q: "Will my ambassadors keep their tier status?", a: "Yes. Tier assignments, badge progress, and reward balances import 1:1." },
      { q: "What about Roster's branded portal?", a: "Our ambassador portal supports brand colors, logo, and custom domain on the $79/mo Pro tier and above." },
      { q: "Can I keep tiered tasks and milestones?", a: "Yes. Roster 'tasks' map to Social Perks 'actions.' Milestone bonuses preserve." },
      { q: "Do I need to cancel Roster first?", a: "No — run parallel for 2–4 weeks to verify migration before canceling." },
      { q: "Is there a CSM available?", a: "Yes on the $249/mo Scale tier. Includes strategy calls and quarterly business reviews." },
      { q: "Will my Shopify integration keep working?", a: "Yes. We have native Shopify integration with equivalent order-attribution and reward-fulfillment flows." },
    ],
  },
  {
    slug: "statusphere",
    name: "Statusphere",
    category: "influencer",
    categoryLabel: "Influencer & Ambassador",
    oneLiner: "Managed micro-influencer matching for beauty/wellness/lifestyle DTC brands.",
    whyPeopleSwitch: [
      "$1,500–$5,000/mo for managed-service product seeding.",
      "Narrow audience focus — built for female 18–34 in beauty/wellness/lifestyle.",
      "Managed-service model means you have less control over which creators you work with.",
      "No tools for engaging your existing customers — Statusphere only sources strangers.",
    ],
    whatWeDoDifferently: [
      "Customer-as-creator model — your actual customers are the most credible creators.",
      "Software you operate yourself with AI as your assistant — full control.",
      "Bundled scope — reviews, referrals, perks, influencer in one.",
      "Public flat pricing at a fraction of the cost.",
      "Works across categories, not just beauty/wellness/lifestyle.",
    ],
    migrationSteps: [
      {
        title: "Export Statusphere campaign data",
        body: "Request your campaign history export from Statusphere account management. Includes creators, posts, and engagement metrics.",
      },
      {
        title: "Import to Social Perks",
        body: "Past creators import as marketplace contacts. Historical post performance preserves as benchmark data.",
      },
      {
        title: "Launch customer-first campaign",
        body: "Ask the AI agent to design a campaign starting from your existing customer base. Past Statusphere creators get an opt-in invitation to continue.",
      },
    ],
    whatYouGet: [
      "Customer-as-creator model — credible content from real buyers",
      "Full control over creator selection",
      "Bundled reviews + referrals + perks + influencer",
      "Public flat pricing (massive savings)",
      "Free forever tier",
    ],
    whatYouGiveUp: [
      "Statusphere's guaranteed-post fulfillment is a real tradeoff — if you need a contractual guarantee of N posts per month, our perk-for-action model is best-effort.",
      "Statusphere's matching algorithm + managed service handles work you'll need to do yourself with us.",
      "Their female 18–34 micro-influencer pool in beauty/wellness is genuinely strong for that specific audience.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "No free tier" },
      { feature: "Entry paid plan", socialPerks: "$19/mo", competitor: "~$1,500–$5,000/mo" },
      { feature: "Public pricing", socialPerks: "Yes", competitor: "No" },
      { feature: "Self-serve setup", socialPerks: "10 minutes", competitor: "Sales-led" },
      { feature: "Guaranteed posts", socialPerks: "Best-effort (perk-for-action)", competitor: "Yes — contractually guaranteed" },
    ],
    faqs: [
      { q: "Will I lose guaranteed-post fulfillment?", a: "Yes — that's the main tradeoff. Our perk-for-action model is best-effort. If you need a contractual guarantee of post volume, Statusphere's managed service is purpose-built." },
      { q: "Can I still get female 18–34 beauty/wellness creators?", a: "Yes, but you'll source them yourself through our marketplace. Our pool overlaps with Statusphere's but is smaller in that specific niche." },
      { q: "Does it work for brands outside beauty/wellness?", a: "Yes — we work for B2B, local services, fitness, food, fashion, and most DTC categories. Statusphere's focus is much narrower." },
      { q: "What about the matching algorithm?", a: "Our AI agent does category and audience matching. Less specialized than Statusphere's but works across categories." },
      { q: "How much do I actually save?", a: "Most brands switching save $15k–$55k/year on software. Many reinvest into bigger customer perks or paid creator boosts." },
      { q: "Can I run both for a while?", a: "Yes. Many brands keep Statusphere for guaranteed posts and use Social Perks for everything else for the first quarter." },
    ],
  },

  // ========== LOYALTY PROGRAMS ==========
  {
    slug: "smile-io",
    name: "Smile.io",
    category: "loyalty",
    categoryLabel: "Loyalty Programs",
    oneLiner: "Points and rewards loyalty for Shopify and BigCommerce stores.",
    whyPeopleSwitch: [
      "Points-and-rewards model is old-school — customers increasingly find generic points programs uninspiring.",
      "Pricing escalates fast — what starts free can hit $599/mo for the Plus plan.",
      "Single-purpose tool — you'll still need separate tools for reviews, referrals (well, Smile has basic referrals), perks-for-posts, and influencer.",
      "No AI campaign generation — you design every reward tier and email manually.",
    ],
    whatWeDoDifferently: [
      "Perk-for-action model replaces stale points with specific, valuable rewards customers actually want.",
      "Customers earn perks for posts, reviews, and referrals — not just purchases.",
      "Reviews + referrals + perks + influencer bundled in one tool.",
      "AI agent designs the program structure and writes the customer-facing copy.",
      "Free forever tier with no order cap.",
    ],
    migrationSteps: [
      {
        title: "Export from Smile.io",
        body: "Smile → Customers → Export. Download member list, point balances, redemption history, and active rewards.",
      },
      {
        title: "Import to Social Perks",
        body: "Member list, point balances, and active rewards import 1:1. We honor your existing earn/redeem ratios.",
      },
      {
        title: "Launch hybrid program",
        body: "Keep your points program if customers love it, OR ask the AI agent to redesign it as a perk-for-action program. Migration includes a customer email explaining the changes.",
      },
    ],
    whatYouGet: [
      "Perk-for-action alongside (or replacing) points",
      "Reviews + referrals + perks + influencer bundled",
      "AI campaign generation",
      "Free forever tier with no order cap",
      "Flat public pricing",
    ],
    whatYouGiveUp: [
      "Smile.io's loyalty-specific UX (points balance, VIP tiers, reward redemption flow) is more polished for pure loyalty programs.",
      "Their integrations with specific loyalty-adjacent tools (Klaviyo loyalty triggers, Gorgias customer status) are deeper.",
      "Customers who love watching points accumulate may need to relearn the perk model — that's a real change-management cost.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "Free up to 200 orders/mo" },
      { feature: "Growth tier", socialPerks: "$19–$79/mo", competitor: "$49/mo Starter, $199/mo Growth" },
      { feature: "Plus tier", socialPerks: "$249/mo (everything)", competitor: "$599/mo Plus" },
      { feature: "Bundled scope", socialPerks: "Loyalty + reviews + referrals + perks + influencer", competitor: "Loyalty + basic referrals" },
      { feature: "AI program design", socialPerks: "Yes", competitor: "No" },
    ],
    faqs: [
      { q: "Will customers lose their points?", a: "No. Point balances import 1:1 and stay redeemable at the same ratios. The migration email reassures customers their balance is intact." },
      { q: "Do I have to switch from points to perks?", a: "No. You can run a pure points program if customers love it. Many brands run hybrid — points for purchases + perks for posts/reviews." },
      { q: "What about VIP tiers?", a: "VIP tiers import with their existing thresholds and benefits. Tier-up emails continue firing." },
      { q: "Can I keep my reward catalog?", a: "Yes. Active reward catalog items import. You can also let the AI redesign the catalog based on what's actually redeemed most." },
      { q: "How long does migration take?", a: "Most brands complete migration in 1–2 days. Customer-facing change typically rolls out over 1–2 weeks with email communication." },
      { q: "Will it confuse my customers?", a: "Honest answer: minor confusion is real. We provide email templates and a help-center FAQ that most customers find sufficient. Net Promoter Score impact is typically neutral within 30 days." },
    ],
  },
  {
    slug: "loyaltylion",
    name: "LoyaltyLion",
    category: "loyalty",
    categoryLabel: "Loyalty Programs",
    oneLiner: "Enterprise loyalty program platform for Shopify Plus and mid-market DTC.",
    whyPeopleSwitch: [
      "Enterprise pricing — typically $399–$2,000+/mo with annual contracts.",
      "Built for mid-market and enterprise — overkill for stores under $1M ARR.",
      "Implementation requires onboarding calls, theme customization, and 4–8 weeks of setup.",
      "No AI campaign generation — workflow tool, not strategist.",
    ],
    whatWeDoDifferently: [
      "Public $19–$249/mo pricing, not $399–$2,000+/mo custom.",
      "10-minute self-serve onboarding.",
      "AI agent designs the program structure end-to-end.",
      "Broader scope — loyalty + reviews + referrals + perks + influencer in one.",
      "Free forever tier.",
    ],
    migrationSteps: [
      {
        title: "Export LoyaltyLion data",
        body: "LoyaltyLion → Settings → Data Export. Pulls members, point balances, tier assignments, and reward history.",
      },
      {
        title: "Import to Social Perks",
        body: "Members and balances import 1:1. Tier structure and earning rules import to our equivalent configuration.",
      },
      {
        title: "Verify and launch",
        body: "Run side-by-side for 1–2 weeks to verify earning and redeeming match. Then launch the AI-redesigned program or keep the existing structure.",
      },
    ],
    whatYouGet: [
      "$19/mo entry instead of $399+/mo",
      "Self-serve onboarding in 10 minutes",
      "AI campaign generation",
      "Broader scope (loyalty + reviews + referrals + perks + influencer)",
      "Free forever tier",
    ],
    whatYouGiveUp: [
      "LoyaltyLion's enterprise reporting (LTV by cohort, redemption rate analysis, predictive churn) is more sophisticated.",
      "Custom-built integrations for enterprise stacks (Klaviyo deep integration, Salesforce Commerce Cloud, custom ERP) are more mature.",
      "Dedicated CSM and quarterly business reviews are standard on LoyaltyLion plans; ours are on the $249/mo Scale tier.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "No real free tier" },
      { feature: "Entry paid plan", socialPerks: "$19/mo", competitor: "$399/mo Small Business" },
      { feature: "Pro/Growth tier", socialPerks: "$79–$249/mo", competitor: "$799–$2,000+/mo" },
      { feature: "Public pricing", socialPerks: "Yes", competitor: "Partial" },
      { feature: "Contract", socialPerks: "Month-to-month", competitor: "Annual standard" },
    ],
    faqs: [
      { q: "Will my member point balances carry over?", a: "Yes. 1:1 import of balances, tier assignments, and active rewards." },
      { q: "What about my Klaviyo loyalty triggers?", a: "We fire the equivalent Klaviyo events (points earned, tier-up, reward redeemed). Existing flows continue working after a 10-minute config update." },
      { q: "Will reward redemption codes still work?", a: "Active codes import. Codes in customer inboxes that haven't been redeemed yet are honored." },
      { q: "How do enterprise reports compare?", a: "Honest answer: ours are lighter. We cover LTV, redemption rate, member engagement. We don't have predictive churn modeling or cohort cohort-overlap analysis like LoyaltyLion Plus." },
      { q: "Is there a dedicated CSM?", a: "Yes on the $249/mo Scale tier. Includes onboarding, strategy reviews, and quarterly business reviews." },
      { q: "How long is the typical migration?", a: "1–2 days for data; 2–4 weeks of parallel running for customer-side verification before cutover." },
    ],
  },
  {
    slug: "marsello",
    name: "Marsello",
    category: "loyalty",
    categoryLabel: "Loyalty Programs",
    oneLiner: "Loyalty and marketing automation for omnichannel retail (online + in-store).",
    whyPeopleSwitch: [
      "Pricing climbs with feature use — Marsello's all-in-one positioning means you pay for things you don't use.",
      "Heavy on omnichannel retail features — overkill for online-only or service-only businesses.",
      "Email + SMS marketing automation is bundled in — duplicates if you already have Klaviyo or Attentive.",
      "No AI campaign generation for the program itself.",
    ],
    whatWeDoDifferently: [
      "Lean — bundles only what you actually use (loyalty + reviews + referrals + perks + influencer).",
      "AI agent designs the loyalty program and writes the customer-facing copy.",
      "Plays well with Klaviyo/Attentive instead of trying to replace them.",
      "Perk-for-action model alongside or instead of points.",
      "Free forever tier.",
    ],
    migrationSteps: [
      {
        title: "Export from Marsello",
        body: "Marsello → Settings → Export. Pulls members, point balances, segment definitions, and active rewards.",
      },
      {
        title: "Import to Social Perks",
        body: "Members and balances import. Segments map to our equivalent customer-tag system.",
      },
      {
        title: "Decide on email/SMS",
        body: "If you used Marsello for email/SMS, switch to Klaviyo or Attentive (we have native integrations). If you only used Marsello for loyalty, you're done.",
      },
    ],
    whatYouGet: [
      "Lean bundle — no overlap with Klaviyo/Attentive",
      "AI campaign generation",
      "Reviews + referrals + perks + influencer alongside loyalty",
      "Free forever tier",
      "Flat public pricing",
    ],
    whatYouGiveUp: [
      "Marsello's POS-integrated loyalty (Vend/Lightspeed, Shopify POS) is genuinely deeper than ours for in-store retail.",
      "Their email/SMS automation is built into one tool — you'll need Klaviyo/Attentive for that motion.",
      "Omnichannel reporting that ties in-store + online activity is a Marsello strength.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "$99/mo entry typical" },
      { feature: "Entry paid plan", socialPerks: "$19/mo", competitor: "$199/mo Pro" },
      { feature: "Includes email/SMS automation", socialPerks: "No (integrates with Klaviyo/Attentive)", competitor: "Yes" },
      { feature: "AI campaign generation", socialPerks: "Yes", competitor: "Limited" },
      { feature: "Bundled scope", socialPerks: "Loyalty + reviews + referrals + perks + influencer", competitor: "Loyalty + email + SMS" },
    ],
    faqs: [
      { q: "Will my POS loyalty still work?", a: "Mostly. We integrate with Shopify POS, Square, and Toast. Vend/Lightspeed integration is via Zapier or our API." },
      { q: "What about my Marsello email/SMS sequences?", a: "Not transferred directly. Switch to Klaviyo or Attentive — we have native integrations that mirror Marsello's loyalty events." },
      { q: "Do I lose member balances?", a: "No. 1:1 import of points, tiers, and active rewards." },
      { q: "How does in-store + online reporting compare?", a: "We tie customer activity across channels but our reporting is less omnichannel-specialized than Marsello's. If unified retail analytics is your #1 need, that's a real tradeoff." },
      { q: "How much do I save?", a: "Depends on tier. Most brands save $1,500–$15,000/year on software by switching loyalty to us and email/SMS to Klaviyo." },
      { q: "Is there a managed migration?", a: "Yes on $79/mo Pro and above. Includes data import, Klaviyo/Attentive event mapping, and a kick-off campaign design call." },
    ],
  },
  {
    slug: "fivestars",
    name: "Fivestars",
    category: "loyalty",
    categoryLabel: "Loyalty Programs",
    oneLiner: "Customer loyalty and marketing for local brick-and-mortar businesses (now part of SumUp).",
    whyPeopleSwitch: [
      "Hardware-tied — Fivestars relies on a check-in tablet at the register, locking you into their model.",
      "Pricing is opaque — quotes typically $200–$400+/mo, with hardware fees on top.",
      "Acquired by SumUp in 2021 — product roadmap and support have been inconsistent since.",
      "No AI campaign generation — workflow + check-in tool, not strategist.",
    ],
    whatWeDoDifferently: [
      "No hardware required — QR codes and customer phone numbers, not a check-in tablet.",
      "Public $19–$79/mo flat pricing instead of $200–$400+/mo custom.",
      "AI agent designs campaigns and writes the customer-facing copy.",
      "Broader scope — loyalty + reviews + referrals + perks + influencer in one.",
      "Independent product with active roadmap and 4-hour support SLA.",
    ],
    migrationSteps: [
      {
        title: "Export Fivestars customer list",
        body: "Fivestars merchant dashboard → Customers → Export CSV. Pulls customer phone numbers, visit history, and reward balances.",
      },
      {
        title: "Import to Social Perks",
        body: "Customer list imports with visit history and reward balances. Active offers preserve.",
      },
      {
        title: "Replace check-in flow",
        body: "Swap the Fivestars tablet for a QR code at the counter or a phone-number check-in. Customers earn perks for visits, posts, and reviews — not just check-ins.",
      },
    ],
    whatYouGet: [
      "No hardware lock-in — QR or phone-number check-in",
      "Public flat pricing",
      "AI campaign generation",
      "Reviews + referrals + perks + influencer bundled",
      "Independent roadmap with consistent updates",
    ],
    whatYouGiveUp: [
      "Fivestars' check-in tablet is a tactile in-store moment some businesses love — a QR code is less polished in feel.",
      "Their SMS marketing volume is bundled in at scale that may cost extra elsewhere.",
      "Existing customer familiarity with the Fivestars brand at hundreds of local merchants — that recognition disappears in the switch.",
    ],
    pricingTable: [
      { feature: "Starter price", socialPerks: "Free forever", competitor: "No free tier" },
      { feature: "Entry paid plan", socialPerks: "$19/mo", competitor: "~$200–$400+/mo" },
      { feature: "Hardware required", socialPerks: "No (QR code)", competitor: "Yes (check-in tablet)" },
      { feature: "Public pricing", socialPerks: "Yes", competitor: "No" },
      { feature: "AI campaign generation", socialPerks: "Yes", competitor: "No" },
    ],
    faqs: [
      { q: "Will I still have a check-in moment in-store?", a: "Yes — a QR code at the counter that customers scan with their phone. We provide printable signage." },
      { q: "Do customer phone numbers transfer?", a: "Yes. The customer list with phone numbers, visit history, and reward balances imports cleanly." },
      { q: "Will customers be confused?", a: "Some, yes. We provide an email/SMS template explaining the switch. Most merchants report a 1–2 week ramp before customers fully adopt the new check-in flow." },
      { q: "What about my Fivestars hardware contract?", a: "If you're still under contract, check your SumUp/Fivestars terms. Many merchants find it cheaper to pay out the remaining hardware fee than continue the subscription." },
      { q: "Can I send SMS campaigns to my customer list?", a: "Yes — built in. SMS volume is included on Pro and Scale tiers." },
      { q: "How long does migration take?", a: "Data import is 1 day. Customer-side ramp is 1–2 weeks as people learn the new check-in flow." },
    ],
  },
];

export function getAlternative(slug: string): Alternative | undefined {
  return ALTERNATIVES.find((a) => a.slug === slug);
}

export function getAlternativesByCategory(
  category: AlternativeCategory,
): Alternative[] {
  return ALTERNATIVES.filter((a) => a.category === category);
}

export function getOtherAlternatives(
  slug: string,
  n: number = 4,
): Alternative[] {
  return ALTERNATIVES.filter((a) => a.slug !== slug).slice(0, n);
}
