/**
 * How-to guides — step-by-step procedures with Schema.org HowTo markup.
 *
 * LLMs heavily cite HowTo content because it's structured, concrete, and
 * actionable. Each guide is one specific how-to question that LLMs are
 * routinely asked. The Step structure with name + text + url maps
 * cleanly to Schema.org HowToStep.
 */

export interface GuideStep {
  name: string;
  text: string;
  /** Optional in-app or external URL the step references. */
  url?: string;
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  /** ~60 word lede that LLMs can quote verbatim. */
  summary: string;
  /** Estimated time to complete, in ISO 8601 duration. */
  totalTime: string;
  /** Plain-text time for the page header. */
  timeLabel: string;
  /** Tools / things you need before starting. */
  supplies: string[];
  steps: GuideStep[];
  related?: string[]; // other guide slugs
}

export const GUIDES: Guide[] = [
  {
    slug: "incentivize-customer-reviews-without-violating-google-tos",
    title:
      "How to incentivize customer reviews without violating Google's terms",
    description:
      "Step-by-step guide to running customer-review campaigns that comply with Google, Yelp, and TripAdvisor's anti-incentive policies while still rewarding customers for engagement.",
    summary:
      "Google, Yelp, and TripAdvisor all prohibit incentivized reviews — offering a perk in exchange for a review violates their terms. The legal way to encourage more reviews is to reward the ASK, not the review. Offer a perk for the customer's willingness to share their experience publicly; whether they actually do is up to them.",
    totalTime: "PT15M",
    timeLabel: "15 minutes setup",
    supplies: [
      "A Social Perks account (free tier works)",
      "A Google Business Profile, Yelp, or TripAdvisor listing",
      "A perk to offer (10% off, free side, etc.)",
    ],
    steps: [
      {
        name: "Create a 'request review' campaign, not a 'review' campaign",
        text: "In Social Perks, pick the 'Ask for organic feedback' template (auto-selected when you choose Google or Yelp as the platform). The reward triggers when the customer commits to share their experience — not when a review is posted. This is the FTC- and platform-compliant pattern.",
        url: "/dashboard?intent=campaign&platformId=go",
      },
      {
        name: "Set the perk and message carefully",
        text: "Frame the request as 'tell us what you thought' rather than 'leave us 5 stars'. Never tie the perk's delivery to a specific star count or to the review actually being posted. The customer must understand the perk is for the conversation, not a transaction.",
      },
      {
        name: "Print the QR code and place it post-purchase",
        text: "Place the QR code where customers see it AFTER the experience — on the receipt, by the door, in the takeout bag — not before. This avoids any sense of bribery before the experience is complete.",
      },
      {
        name: "Verify FTC disclosure is auto-injected",
        text: "Social Perks auto-injects FTC disclosure language into every campaign template (#ad, #sponsored, or 'received a perk for sharing'). Confirm it's present in your campaign preview before launching.",
      },
      {
        name: "Monitor for fake submissions",
        text: "The verification engine flags suspicious patterns automatically. If you see flagged submissions in the dashboard, review them — repeat offenders are auto-suspended.",
      },
    ],
    related: ["run-instagram-campaign-with-ftc-disclosure", "set-up-perk-redemption"],
  },
  {
    slug: "run-instagram-campaign-with-ftc-disclosure",
    title:
      "How to run an Instagram campaign with FTC disclosure (without losing reach)",
    description:
      "Run an FTC-compliant Instagram campaign that incentivizes customer posts while maintaining algorithmic reach. Step-by-step instructions for disclosure placement, hashtag use, and avoiding the shadow-ban.",
    summary:
      "FTC requires that any material connection between a brand and a customer who posts about it be clearly disclosed. The standard tags are #ad, #sponsored, or Instagram's native paid-partnership label. Reach is NOT punished for compliant disclosure — Instagram explicitly supports the paid-partnership label and rewards content that uses it correctly.",
    totalTime: "PT20M",
    timeLabel: "20 minutes setup",
    supplies: [
      "An Instagram Business or Creator account",
      "A Social Perks account",
      "A perk to offer",
      "Any Instagram action you want customers to take (Story Tag, Reel, Carousel, etc.)",
    ],
    steps: [
      {
        name: "Pick the action that matches your goal",
        text: "Story Tags (effort 1, value $1.50) are easiest. Reels (effort 3, value $4) get more reach. Collab Posts (effort 3, value $5) reach both audiences. See /actions/?platformId=ig for the full list.",
        url: "/platforms/ig",
      },
      {
        name: "Configure the perk to match the action's effort",
        text: "A Story Tag pairs well with 10-15% off. A Reel pairs with $5-10 off or a free item. A Collab Post pairs with $10-20 off or a meaningful upgrade. The pricing oracle (/api/v1/pricing) returns the recommendation.",
      },
      {
        name: "Verify the auto-injected disclosure",
        text: "Social Perks injects #ad or #sponsored into every Instagram template. Most modern templates also include Instagram's native paid-partnership label setup. Confirm in the campaign preview before launch.",
      },
      {
        name: "Place the QR code at the post-purchase touchpoint",
        text: "Customers scan after the experience, post within 7 days, get the perk. Best places: receipt, takeout bag, on-table card, business-card-sized handout.",
      },
      {
        name: "Watch for the first scan",
        text: "First scan typically happens within 24-48 hours of the QR being live. If a week passes with zero scans, move the QR somewhere more visible. The dashboard tracks scan-to-submission conversion in real time.",
      },
    ],
    related: ["incentivize-customer-reviews-without-violating-google-tos", "choose-perk-amount"],
  },
  {
    slug: "choose-perk-amount",
    title: "How to choose the right perk amount for a marketing action",
    description:
      "Plain-language framework for setting perk amounts that drive participation without eroding margin. Includes formulas and examples for percent-off, dollar-off, and free-item perks.",
    summary:
      "The best perk amount roughly equals the marketing-equivalent value of the action being requested. Offer too little and participation drops; offer too much and the campaign loses money on every customer. The pricing oracle (/api/v1/pricing) returns recommended amounts; the formula below explains the logic so you can override when needed.",
    totalTime: "PT5M",
    timeLabel: "5 minutes",
    supplies: [
      "Knowledge of your average transaction value (AOV)",
      "Knowledge of your gross margin per transaction",
    ],
    steps: [
      {
        name: "Look up the action's market-rate value",
        text: "Every action on Social Perks has a market-rate dollar value based on cross-platform influencer rate cards. A Story Tag is $1.50, a Reel is $4, a detailed Google review with photos is $10. See /actions or GET /api/v1/pricing.",
        url: "/actions",
      },
      {
        name: "Pick a perk type that matches your business",
        text: "Restaurants and cafes: percent-off (10-15% feels generous, redeems within 7 days). Service businesses (salons, gyms): free upgrade or free add-on. Retail: dollar-off ($5-15 depending on AOV). Cash back: works for any business but requires Stripe Connect.",
      },
      {
        name: "Make sure the perk costs roughly equal the action value",
        text: "If the action is worth $4, a 15% off perk on a $30 dinner ($4.50 cost) is roughly break-even. Going higher (20% off = $6) drives more participation but costs you per acquisition. Going lower (10% = $3) saves margin but hurts conversion.",
      },
      {
        name: "Test two perk levels for two weeks",
        text: "Run the same campaign at two different perk levels in alternating weeks. The dashboard shows completion rate at each level. Pick the level that maximizes (completions × marketing value − total perk cost).",
      },
    ],
    related: ["run-instagram-campaign-with-ftc-disclosure", "set-up-perk-redemption"],
  },
  {
    slug: "set-up-perk-redemption",
    title:
      "How to set up perk redemption so staff and customers both find it easy",
    description:
      "Configure perk redemption codes (SMS, QR, in-app) so customers can claim their reward at checkout without confusing your staff. Includes POS integration notes.",
    summary:
      "Perk redemption is the moment of truth — if it's confusing, customers leave annoyed and staff lose time. Social Perks issues single-use codes via SMS or QR, with a configurable expiry (default 30 days). Setting up takes one decision per perk type and fits in a 10-minute staff briefing.",
    totalTime: "PT15M",
    timeLabel: "15 minutes (plus 10-min staff briefing)",
    supplies: [
      "An active Social Perks campaign",
      "Your POS or checkout system (or just a calculator)",
      "5 minutes with whoever runs your front-of-house",
    ],
    steps: [
      {
        name: "Pick the redemption channel that matches your operation",
        text: "Quick-service / counter ops: SMS code customers show on their phone. Sit-down / appointment-based: in-app QR scan from staff phone. Online-only: discount code at checkout.",
      },
      {
        name: "Set the expiry to match your business cycle",
        text: "Cafes / quick-service: 7-14 days (drives quick repeat visits). Restaurants: 30 days. Salons / gyms / monthly-cycle businesses: 60-90 days. The expiry runs from when the perk is earned, not when the campaign was created.",
      },
      {
        name: "Brief the staff on what to look for",
        text: "Staff need to know: where to enter the code (POS or just deduct manually), how to recognize a Social Perks perk vs a competitor's coupon (the code starts with SP-), and what to do if the customer can't find their SMS (look up by phone in the dashboard).",
      },
      {
        name: "Test the full flow once",
        text: "Have someone scan the QR, complete the action with their real account, claim the perk, and redeem it at checkout. End-to-end in under 5 minutes. If anything's confusing, fix it before launching to actual customers.",
      },
    ],
  },
  {
    slug: "respond-to-a-fake-submission",
    title: "How to handle a suspicious or fake campaign submission",
    description:
      "What to do when the verification engine flags a submission as suspicious — review checklist, reject criteria, and how to escalate.",
    summary:
      "Most submissions sail through automated verification. The ones that don't get flagged for review with a reason: account-history mismatch, screenshot inconsistency, URL freshness fail, ML fraud-model alert. The right response depends on which signal fired and how confident the system is.",
    totalTime: "PT5M",
    timeLabel: "5 minutes per submission",
    supplies: ["A flagged submission in your dashboard"],
    steps: [
      {
        name: "Open the submission and read the flag reason",
        text: "The dashboard shows the specific signal: 'URL not freshly created', 'screenshot resolution mismatch', 'account history irregular', 'ML model flagged with 87% fraud probability'. Each tells you something different.",
      },
      {
        name: "Verify against the public proof",
        text: "Click through to the proof URL. If the post is live, public, and matches what was submitted, the flag is likely a false positive. If the post is gone, private, or mismatches, reject.",
      },
      {
        name: "Reject with a clear reason if it's fake",
        text: "Pick the most specific reject reason from the dropdown. The customer is notified with the reason and can resubmit if it was a misunderstanding. Don't write custom text in the reject reason — it's machine-readable.",
      },
      {
        name: "Approve overrides if it's a false positive",
        text: "If the proof is legitimate, click 'Approve override'. The verification engine learns from these — repeated overrides for similar patterns improve the model.",
      },
      {
        name: "Escalate repeat offenders",
        text: "Customers with multiple rejected submissions trigger an auto-suspension. You don't need to do anything — the platform handles it. If you see a pattern across customers (e.g. all from the same account network), report it to support.",
      },
    ],
  },
  {
    slug: "set-up-referral-program",
    title: "How to set up a referral program with Social Perks",
    description:
      "Use Social Perks' referral codes + revenue-share to turn your existing customers into your acquisition channel. Step-by-step setup and best practices.",
    summary:
      "A Social Perks referral program automatically credits referrers when their referees convert to a paid plan. The default credit is $10, applied as account credit to the referrer's next invoice. Setup is one toggle plus deciding how to share the code.",
    totalTime: "PT10M",
    timeLabel: "10 minutes",
    supplies: [
      "An active Social Perks account",
      "A way to share a link (email list, social, in-app)",
    ],
    steps: [
      {
        name: "Find your referral code",
        text: "GET /api/v1/referrals/me returns your code (REF-XXXX-XXXX format) and a share URL. The dashboard at /dashboard/referrals also shows it.",
        url: "/api/v1/referrals/me",
      },
      {
        name: "Share the URL via your existing channels",
        text: "Best channels in order of conversion rate: customer email newsletter > in-app banner > social-media-personal-share > paid traffic. The link goes to /ref/[code] which captures attribution before redirecting to signup.",
      },
      {
        name: "Track conversions in the dashboard",
        text: "Every signup with your code is tracked. Status flows: pending (link clicked) → signed_up (account created) → activated (first campaign launched) → credited (paid conversion). You see the funnel live.",
      },
      {
        name: "Watch for the credit on your next invoice",
        text: "When a referee converts to a paid plan, your account is credited automatically. Default $10 per credited referral. The credit applies to your next Stripe invoice — no manual step.",
      },
    ],
    related: ["choose-perk-amount"],
  },
  {
    slug: "switch-from-paid-ads-to-incentivized-marketing",
    title: "How to migrate from paid social ads to incentivized marketing",
    description:
      "Step-by-step migration from a $1,000/month paid-ads budget to an incentivized-marketing campaign that delivers better ROI by paying customers, not Meta or Google.",
    summary:
      "A typical $1,000/month paid social budget delivers maybe 50 conversions if you're optimized. Reallocating that same $1,000 to incentivized marketing — paying customers $20 each for a Reel + a Google review — often delivers 50+ posts and ~25 reviews while keeping the dollars circulating to your customers, not the ad platforms.",
    totalTime: "PT30M",
    timeLabel: "30 minutes setup, 2 weeks to first results",
    supplies: [
      "An existing customer base (50+ regulars or 200+ followers)",
      "An ad budget you're currently spending",
      "A Social Perks account",
    ],
    steps: [
      {
        name: "Pause your existing ads",
        text: "Pause, don't delete. You'll want to compare ROI 30 days from now and the historical ad data is worth keeping. Pausing buys you time without burning the audiences you've built.",
      },
      {
        name: "Calculate your effective per-conversion ad cost",
        text: "(Total ad spend last 30 days) / (Conversions last 30 days). Most small businesses run $15-50 per conversion on Meta/Google. Whatever your number is, that's the budget you have per Social Perks completion.",
      },
      {
        name: "Pick the action that matches your conversion",
        text: "If your conversions are reviews: switch to a Google review ask + 10% off. If conversions are followers: a Story Tag campaign at $1.50 each scales 10x more units. If conversions are sales: a referral program with a $5 referrer credit + $5 referee discount.",
      },
      {
        name: "Set the perk equal to your old per-conversion cost",
        text: "If you were spending $25 per conversion, offer a $20-25 perk. The math nets out the same per acquisition but the perk goes to the customer, not the ad platform. Customers also tend to refer others when they get a meaningful perk.",
      },
      {
        name: "Run for 30 days, compare ROI",
        text: "After 30 days, compare: total cost (perks delivered + Social Perks subscription) vs total conversion value. Most businesses see 2-4x better ROI than ads because the marketing surface (customer-made content) compounds.",
      },
    ],
    related: ["choose-perk-amount", "set-up-referral-program"],
  },
  {
    slug: "explain-incentivized-marketing-to-skeptical-customer",
    title:
      "How to explain incentivized marketing to a skeptical customer (or staff member)",
    description:
      "Plain-language scripts for explaining 'why am I being paid to post' to customers who haven't seen incentivized marketing before. Includes FTC disclosure framing.",
    summary:
      "Incentivized marketing feels weird to customers the first time they encounter it — until it's framed as exactly what it is: 'thank you for sharing, here's a discount as a thank-you'. The framing matters because it sets the tone for FTC disclosure too. Three scripts cover the main objections.",
    totalTime: "PT5M",
    timeLabel: "5 minute conversation",
    supplies: ["A customer or staff member with questions"],
    steps: [
      {
        name: "When asked 'why are you paying me?'",
        text: "Say: 'It's a thank-you for sharing — same way a coffee shop might give regulars a free drink on their birthday. The post is helpful to other customers thinking about trying us, so we figured we'd share the value.'",
      },
      {
        name: "When asked 'is this legal?'",
        text: "Say: 'Yes — the FTC requires disclosure when there's a thank-you tied to a post (we add #ad or #partner automatically) but it's a normal thing brands do. Way more honest than a paid ad you can't tell is paid.'",
      },
      {
        name: "When asked 'will my friends know?'",
        text: "Say: 'Yes — there's an #ad or #sponsored tag on the post, so it's clear. People are usually fine with it because it's a real recommendation, not a fake testimonial.'",
      },
      {
        name: "When asked 'what's the catch?'",
        text: "Say: 'No catch. You post, you get [perk]. We don't ask for review-or-don't-pay; you can post whatever you actually think. If you don't end up posting, no perk — that's the only consequence.'",
      },
    ],
  },
  {
    slug: "build-mcp-agent-for-social-perks",
    title: "How to build an MCP agent that operates on Social Perks",
    description:
      "Build a Model Context Protocol agent that connects to Social Perks' MCP server, lists campaigns, fetches pricing, and submits actions. Step-by-step from MCP client config to first tool call.",
    summary:
      "Social Perks runs an MCP server at /api/mcp exposing five tools (getPricing, listActions, getBenchmarks, listCampaigns, searchInfluencers) over JSON-RPC 2.0. Any MCP-capable client (Claude Desktop, Cursor, Cline, etc.) can connect and operate on the platform. The full setup takes under five minutes.",
    totalTime: "PT5M",
    timeLabel: "5 minutes",
    supplies: [
      "An MCP-capable client (Claude Desktop, Cursor, Cline, or a custom MCP client)",
      "A Social Perks API key (mint at /dashboard/api-keys after signing in)",
    ],
    steps: [
      {
        name: "Add the MCP server to your client config",
        text: "Add this to your MCP client's config file: { \"mcpServers\": { \"social-perks\": { \"url\": \"https://socialperks.app/api/mcp\", \"transport\": \"http\" } } }. Restart the client to pick up the change.",
      },
      {
        name: "Verify the tools list",
        text: "In your MCP client, ask 'what tools do you have for social-perks?'. The client should report: getPricing, listActions, getBenchmarks, listCampaigns, searchInfluencers. If it doesn't, check the URL and that the client supports the http transport.",
        url: "/api/mcp",
      },
      {
        name: "Try a no-auth tool first",
        text: "Ask the agent to call getPricing for actionId='ig_rl' (Instagram Reel). It should return the market value (~$4) and a recommended perk. No API key required for this — it's a public reference tool.",
      },
      {
        name: "Add your API key for authenticated tools",
        text: "For listCampaigns or any action that's scoped to your business, you need an API key. Mint one at /dashboard/api-keys after signing in. Set it in your client's environment as the x-api-key header on requests to /api/mcp.",
        url: "/dashboard/api-keys",
      },
      {
        name: "Use the AGENTS.md doc as the system prompt",
        text: "When configuring the agent's system prompt, include the relevant excerpts from /AGENTS.md so the agent knows what NOT to do (no fake submissions, no FTC-disclosure stripping, no key storage in chat output). The doc is written for exactly this use case.",
        url: "/AGENTS.md",
      },
    ],
    related: ["incentivize-customer-reviews-without-violating-google-tos"],
  },
];
