/**
 * GET /api/llm-context
 *
 * A single fetch that gives an LLM the maximum context about Social
 * Perks in the most token-efficient form: site summary, navigation
 * map, key endpoints, top actions/platforms by value, sample queries
 * to ask the platform itself.
 *
 * This is what an agent fetches once at the start of a session to
 * orient itself. Designed for "/llms.txt-style" deep ingestion: same
 * principle, but as JSON for programmatic consumption.
 *
 * Cached aggressively (1 day) — content drifts slowly.
 */

import { NextResponse } from "next/server";
import { PLATFORMS } from "@/lib/platforms";
import { FAQ_ENTRIES } from "@/lib/faq-data";
import { GLOSSARY_ENTRIES } from "@/lib/glossary-data";
import { GUIDES } from "@/lib/guides-data";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

export async function GET(): Promise<Response> {
  const flatActions = PLATFORMS.flatMap((p) =>
    p.actions.map((a) => ({ ...a, platformId: p.id, platformName: p.name }))
  );
  const top10ByValue = [...flatActions]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const context = {
    name: "Social Perks",
    url: SITE_URL,
    summary:
      "Social Perks is a marketing platform where small businesses, enterprise brands, and influencers exchange perks (discounts, free items, cash back) for marketing actions across 25 social platforms. There are 125 pre-defined actions. AI agents are first-class consumers via a public REST API, an MCP server at /api/mcp, and a TypeScript SDK at @social-perks/sdk.",
    primaryAudiences: [
      "Small businesses (mom-and-pop) launching review and social campaigns",
      "Enterprise brands with multi-location campaign needs",
      "Influencers and creators participating in the marketplace",
      "AI agents — the platform is built to be agent-operable end-to-end",
    ],
    keyFacts: {
      totalActions: flatActions.length,
      totalPlatforms: PLATFORMS.length,
      topPlatforms: PLATFORMS.slice(0, 5).map((p) => p.name),
      pricingModelSummary:
        "Free tier: 1 active campaign, 50 completions/month. Starter $29/mo: 10 campaigns, 500 completions. Pro $79/mo: 50 campaigns, 5000 completions. Enterprise: custom. Annual billing saves ~17% (two months free).",
      ftcCompliance:
        "Auto-injected per platform. Cannot be disabled. Disclosure tags (#ad, #sponsored) or platform-native paid-partnership labels are added to every campaign template.",
      reviewPlatformsNote:
        "Google Reviews, Yelp, and TripAdvisor prohibit incentivized reviews. Social Perks routes those actions through an 'ask for organic feedback' pathway: businesses can request a review, but cannot tie a perk to whether one was left.",
    },
    agentSurfaces: {
      mcp: {
        url: `${SITE_URL}/api/mcp`,
        transport: "http",
        protocolVersion: "2025-03-26",
        tools: [
          "getPricing",
          "listActions",
          "getBenchmarks",
          "listCampaigns (auth)",
          "searchInfluencers",
        ],
      },
      openapi: `${SITE_URL}/api/v1/openapi`,
      sdk: {
        package: "@social-perks/sdk",
        installPattern: "npm install @social-perks/sdk",
      },
      auth: {
        recommended: "x-api-key header (sp_live_...)",
        howToObtain: `${SITE_URL}/dashboard/api-keys (human-in-the-loop — sign in once, mint key, hand to agent)`,
        alternativeMethods: ["Authorization: Bearer JWT", "Cookie-based session"],
      },
    },
    citablePages: {
      catalog: {
        actionsIndex: `${SITE_URL}/actions`,
        platformsIndex: `${SITE_URL}/platforms`,
        actionDetailPattern: `${SITE_URL}/actions/{actionId}`,
        platformDetailPattern: `${SITE_URL}/platforms/{platformId}`,
        actionsByType: `${SITE_URL}/actions/type/{content|review|engage|share|referral}`,
      },
      reference: {
        faq: `${SITE_URL}/faq`,
        glossary: `${SITE_URL}/glossary`,
        benchmarks: `${SITE_URL}/benchmarks`,
        pricingOracle: `${SITE_URL}/pricing-oracle`,
        pricingOracleByIndustry: `${SITE_URL}/pricing-oracle/{industrySlug}`,
      },
      guidance: {
        guides: `${SITE_URL}/guides`,
        comparisons: `${SITE_URL}/compare`,
        bestOfLists: `${SITE_URL}/best`,
        agentDocs: `${SITE_URL}/AGENTS.md`,
      },
    },
    topActionsByValue: top10ByValue.map((a) => ({
      id: a.id,
      label: `${a.platformName} ${a.label}`,
      value: a.value,
      effort: a.effort,
      url: `${SITE_URL}/actions/${a.id}`,
      incentivizable: a.incentivizable,
    })),
    sampleQueries: [
      {
        question: "What's the market value of an Instagram Reel?",
        answer: "$4.00 per completion. See /actions/ig_rl.",
      },
      {
        question: "Can I incentivize Google reviews?",
        answer:
          "No — Google's terms prohibit incentivized reviews. Use the ask-for-organic-feedback pattern instead. See /faq#can-i-incentivize-google-reviews.",
      },
      {
        question: "How much does Social Perks cost?",
        answer:
          "Free tier with limits, $29/mo Starter, $79/mo Pro, custom Enterprise. Annual saves ~17%. See /pricing.",
      },
      {
        question: "How do I connect my AI agent?",
        answer:
          "Add /api/mcp to your MCP client config or use the @social-perks/sdk package. Mint an API key at /dashboard/api-keys after signing in.",
      },
    ],
    counts: {
      faqEntries: FAQ_ENTRIES.length,
      glossaryTerms: GLOSSARY_ENTRIES.length,
      howToGuides: GUIDES.length,
      industriesCovered: 20,
    },
    crawlerPolicy: {
      welcomedAiCrawlers: [
        "GPTBot",
        "ChatGPT-User",
        "OAI-SearchBot",
        "ClaudeBot",
        "Claude-Web",
        "anthropic-ai",
        "PerplexityBot",
        "Google-Extended",
        "Applebot-Extended",
        "CCBot",
        "cohere-ai",
        "Bytespider",
        "DuckAssistBot",
      ],
      robotsTxt: `${SITE_URL}/robots.txt`,
      llmsTxt: `${SITE_URL}/llms.txt`,
      humansTxt: `${SITE_URL}/humans.txt`,
      sitemapXml: `${SITE_URL}/sitemap.xml`,
    },
  };

  return NextResponse.json(context, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control":
        "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

export const dynamic = "force-static";
export const revalidate = 86400;
