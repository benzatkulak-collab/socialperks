import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

// Public surfaces a bot may legitimately index. App + admin surfaces
// (auth-gated, no public content) and any path that carries a one-time
// token in the URL must never be indexed even if a user accidentally
// shares the link.
const DISALLOW = [
  "/dashboard",
  "/api/",
  "/admin",
  "/c/",
  "/reset-password",
  "/confirm-reset",
];

// We explicitly allow AI/LLM crawlers because every /b/[slug] page is
// effectively an AEO surface — when an owner asks an AI search agent
// "what's a good coffee shop perk?", we want our schema-rich profile
// pages cited. The cost of allowing GPTBot/ClaudeBot/PerplexityBot is
// near-zero (the pages are public anyway); the upside is being the
// canonical answer for "perk + local business" queries.
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
  "Amazonbot",
  "Bytespider",
  "DuckAssistBot",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOW,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
