/**
 * GET /api/v1/openapi
 *
 * OpenAPI 3.1 specification served as JSON. AI agents (MCP servers,
 * Cursor, Claude Code, custom marketing-agent stacks) can ingest this
 * to discover and call our 35 routes without us having to write a
 * per-agent integration.
 *
 * This is a hand-curated stub — covers the most agent-relevant routes
 * (campaigns, programs, ai/*, businesses/poster). Full coverage of
 * all 35 routes will be auto-generated once we wire `next-openapi`
 * to the route definitions; until then this stub is enough to be
 * registered with smithery, mcp.so, and Cursor's tool catalog.
 *
 * Why not auto-generate?
 *   - Auto-generators infer schemas from Zod / type defs; our routes
 *     mostly hand-validate, so the auto output would be hollow.
 *   - This stub is the *contract* — when we tighten validation we
 *     update both at the same time, and the contract leads.
 */
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

const SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Social Perks API",
    version: "1.0.0",
    description:
      "QR-code-driven customer-marketing primitives for local businesses. Designed for AI marketing agents to call directly: list ideas, create perk campaigns, print posters, query stats.",
    contact: { name: "Social Perks", url: "https://socialperks.io", email: "hello@socialperks.io" },
    license: { name: "Proprietary" },
  },
  servers: [{ url: `${SITE_URL}/api/v1`, description: "Production" }],
  security: [{ bearerAuth: [] }, { apiKey: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      apiKey: { type: "apiKey", in: "header", name: "X-API-Key" },
    },
    schemas: {
      Campaign: {
        type: "object",
        required: ["id", "businessId", "platformId", "actionId", "rewardType", "rewardValue"],
        properties: {
          id: { type: "string" },
          businessId: { type: "string" },
          platformId: { type: "string", description: "e.g. instagram, tiktok, facebook, x" },
          actionId: { type: "string", description: "Action library ID — see GET /actions" },
          rewardType: { type: "string", enum: ["pct", "dol", "free"] },
          rewardValue: { type: "string" },
          status: { type: "string", enum: ["draft", "active", "paused", "ended"] },
          completions: { type: "integer", minimum: 0 },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ActionIdea: {
        type: "object",
        properties: {
          id: { type: "string" },
          platform: { type: "string" },
          label: { type: "string" },
          effort: { type: "integer", minimum: 0, maximum: 5 },
          estimatedValue: { type: "number" },
          tier: { type: "string", enum: ["essential", "high_impact", "growth", "premium", "starter"] },
        },
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          requestId: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/campaigns": {
      get: {
        summary: "List campaigns for the authenticated business",
        operationId: "listCampaigns",
        tags: ["campaigns"],
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["draft", "active", "paused", "ended"] } },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { type: "object", properties: { campaigns: { type: "array", items: { $ref: "#/components/schemas/Campaign" } } } },
              },
            },
          },
        },
      },
      post: {
        summary: "Create a new perk campaign",
        operationId: "createCampaign",
        tags: ["campaigns"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["platformId", "actionId", "rewardType", "rewardValue"],
                properties: {
                  platformId: { type: "string" },
                  actionId: { type: "string" },
                  rewardType: { type: "string", enum: ["pct", "dol", "free"] },
                  rewardValue: { type: "string" },
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/Campaign" } } } },
          "400": { description: "Bad request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/actions": {
      get: {
        summary: "List the action library — 107 marketing actions across 15 platforms",
        operationId: "listActions",
        tags: ["reference"],
        parameters: [
          { name: "platform", in: "query", schema: { type: "string" } },
          { name: "tier", in: "query", schema: { type: "string", enum: ["essential", "high_impact", "growth", "premium", "starter"] } },
        ],
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/ActionIdea" } } } },
          },
        },
      },
    },
    "/pricing": {
      get: {
        summary: "Pricing oracle — what a perk-action is worth in market terms",
        operationId: "getPricing",
        tags: ["reference"],
        responses: { "200": { description: "OK" } },
      },
    },
    "/benchmarks": {
      get: {
        summary: "Industry benchmarks — completion rates, redemption rates by vertical",
        operationId: "getBenchmarks",
        tags: ["reference"],
        responses: { "200": { description: "OK" } },
      },
    },
    "/ai/quick-start": {
      post: {
        summary: "One-shot recommendation: given a business, return the single best campaign to launch first",
        operationId: "aiQuickStart",
        tags: ["ai"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  businessType: { type: "string", example: "coffee_shop" },
                  budget: { type: "number" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "OK" } },
      },
    },
    "/ai/campaign-agent": {
      post: {
        summary: "Full AI-generated marketing plan — multi-campaign, sequenced",
        operationId: "aiCampaignAgent",
        tags: ["ai"],
        responses: { "200": { description: "OK" } },
      },
    },
    "/businesses/poster": {
      get: {
        summary: "Generate the printable QR poster (8.5×11 SVG) for a campaign",
        operationId: "getPoster",
        tags: ["businesses"],
        parameters: [
          { name: "campaignId", in: "query", required: true, schema: { type: "string" } },
          { name: "businessName", in: "query", schema: { type: "string" } },
          { name: "perk", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "SVG poster", content: { "image/svg+xml": {} } } },
      },
    },
  },
  tags: [
    { name: "campaigns", description: "Create, list, manage perk campaigns" },
    { name: "reference", description: "Read-only data: actions, pricing, benchmarks" },
    { name: "ai", description: "Backend AI primitives — campaign generation, recommendations" },
    { name: "businesses", description: "Business-side artifacts (poster, profile, etc.)" },
  ],
} as const;

export async function GET(_req: NextRequest) {
  return new Response(JSON.stringify(SPEC, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      // Permissive CORS — agents pulling this from a browser-side
      // tool catalog need to be able to fetch it directly.
      "Access-Control-Allow-Origin": "*",
    },
  });
}
