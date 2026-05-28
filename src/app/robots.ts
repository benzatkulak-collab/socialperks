import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

// Public, GET-only API endpoints that agents and crawlers should be able to
// discover. Everything else under /api/ stays blocked because it either
// requires auth, mutates state, or returns user-specific data.
const AGENT_DISCOVERABLE_API_PATHS = [
  "/api/mcp",
  "/api/v1/openapi",
  "/api/v1/pricing",
  "/api/v1/actions",
  "/api/v1/benchmarks",
  "/api/v1/exchange/opportunities",
  "/api/v1/exchange/market",
  "/api/v1/health",
  "/api/v1/legal",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ─── AI training / search crawlers — explicitly welcomed ────────────
      // We want LLMs and AI search products to know about Social Perks.
      // Listing them by name (rather than relying on the wildcard) makes
      // intent unambiguous to crawlers that look for explicit grants.
      ...["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot", "cohere-ai", "Bytespider", "DuckAssistBot"].map(
        (userAgent) => ({
          userAgent,
          allow: ["/", ...AGENT_DISCOVERABLE_API_PATHS, "/llms.txt", "/.well-known/ai-plugin.json", "/AGENTS.md"],
          disallow: ["/dashboard", "/admin", "/c/", "/reset-password", "/confirm-reset"],
        })
      ),
      // ─── General crawlers (Googlebot, Bingbot, etc.) ────────────────────
      {
        userAgent: "*",
        // Allow public agent-discoverable API paths even though /api/ is
        // otherwise disallowed — agents and search engines need these to
        // find the OpenAPI spec, MCP server, and reference data.
        allow: [
          "/",
          ...AGENT_DISCOVERABLE_API_PATHS,
          "/llms.txt",
          "/.well-known/ai-plugin.json",
        ],
        // App + admin surfaces (auth-gated, no public content) and any
        // path that carries a one-time token in the URL — those must
        // never be indexed even if a user accidentally shares the link.
        disallow: [
          "/dashboard",
          "/api/",
          "/admin",
          "/c/",
          "/reset-password",
          "/confirm-reset",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
