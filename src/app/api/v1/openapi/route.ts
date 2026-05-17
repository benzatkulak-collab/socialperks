/**
 * GET /api/v1/openapi
 *
 * Public OpenAPI 3.1.0 specification for the Social Perks API.
 *
 * Agents and code-gen tools can fetch this to discover endpoints,
 * auth, and response schemas.
 *
 * Cached for 1 hour. Returns application/json.
 */

// NOTE: This route deliberately does NOT use the shared withTiming/rateLimit
// helpers. Those touch a metrics Map with private class fields, which trips
// over a Next.js prerender bug ("Cannot read private member #state from an
// object whose class did not declare it") when the route is statically
// generated. The OpenAPI spec is the same for every caller, has no auth
// branch, and can be aggressively CDN-cached, so we keep the handler trivial
// and let edge cache do the heavy lifting.

import { NextResponse } from "next/server";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://socialperks.app";

function buildSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Social Perks API",
      version: "1.0.0",
      summary: "Marketing actions in exchange for perks",
      description:
        "Social Perks is a marketing platform where businesses offer perks (discounts, free items, cash back) to customers and influencers in exchange for marketing actions across 25 social platforms (125 actions total). This API exposes pricing, action discovery, campaign management, submission tracking, an exchange marketplace, and the OAuth-style agent key-issuance flow described at https://socialperks.app/AGENTS.md.",
      contact: {
        name: "Social Perks",
        url: SITE_URL,
      },
      license: {
        name: "Proprietary",
      },
    },
    servers: [{ url: `${SITE_URL}/api/v1`, description: "Production" }],
    tags: [
      { name: "Reference", description: "Public reference data — pricing, actions, benchmarks" },
      { name: "Campaigns", description: "Create, launch, and manage campaigns" },
      { name: "Submissions", description: "Submit and review proof of completed actions" },
      { name: "AI", description: "AI-powered campaign generation and recommendations" },
      { name: "Exchange", description: "Marketplace for open campaign opportunities" },
      { name: "Programs", description: "Multi-action perk programs" },
      { name: "Auth", description: "Authentication and session management" },
      { name: "Infrastructure", description: "Health, status, OpenAPI" },
    ],
    components: {
      securitySchemes: {
        ApiKey: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API key (sp_live_... or sp_test_...). Recommended for agents.",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT issued by /api/v1/auth.",
        },
      },
      schemas: {
        SuccessEnvelope: {
          type: "object",
          required: ["success", "data"],
          properties: {
            success: { type: "boolean", const: true },
            data: { description: "Endpoint-specific payload" },
          },
        },
        ErrorEnvelope: {
          type: "object",
          required: ["success", "error"],
          properties: {
            success: { type: "boolean", const: false },
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string", example: "VALIDATION_ERROR" },
                message: { type: "string" },
              },
            },
          },
        },
        Action: {
          type: "object",
          properties: {
            id: { type: "string", example: "ig_st" },
            label: { type: "string", example: "Story Tag" },
            type: { type: "string", enum: ["content", "review", "engage", "share", "referral"] },
            effort: { type: "integer", minimum: 0, maximum: 5 },
            value: { type: "number", description: "Estimated USD value" },
            incentivizable: { type: "boolean" },
            platformId: { type: "string", example: "ig" },
            platformName: { type: "string", example: "Instagram" },
            platformIcon: { type: "string", example: "📸" },
            platformColor: { type: "string", example: "#E1306C" },
          },
        },
        PricingEstimate: {
          type: "object",
          properties: {
            actionId: { type: "string" },
            platformId: { type: "string" },
            businessType: { type: "string" },
            estimatedValueUsd: { type: "number" },
            recommendedPerk: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["pct", "amount", "free_item"] },
                value: { type: "number" },
              },
            },
          },
        },
        Campaign: {
          type: "object",
          properties: {
            id: { type: "string" },
            businessId: { type: "string" },
            tier: {
              type: "string",
              enum: ["essential", "high_impact", "growth", "premium", "starter"],
            },
            actionId: { type: "string" },
            platformId: { type: "string" },
            rewardType: { type: "string", enum: ["pct", "amount", "free_item"] },
            rewardValue: { type: "number" },
            status: {
              type: "string",
              enum: ["draft", "active", "paused", "completed"],
            },
          },
        },
      },
    },
    paths: {
      "/health": {
        get: {
          tags: ["Infrastructure"],
          summary: "Health check",
          description: "Returns server status, database connectivity, and uptime.",
          responses: {
            "200": {
              description: "Server healthy",
              content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
            },
          },
        },
      },
      "/pricing": {
        get: {
          tags: ["Reference"],
          summary: "Pricing oracle",
          description:
            "Returns market-rate pricing for actions. Public endpoint, no auth required.",
          parameters: [
            { name: "actionId", in: "query", schema: { type: "string" } },
            { name: "platformId", in: "query", schema: { type: "string" } },
            { name: "businessType", in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": {
              description: "Pricing estimate(s)",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/SuccessEnvelope" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/PricingEstimate" },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      "/actions": {
        get: {
          tags: ["Reference"],
          summary: "List marketing actions",
          description: "Returns all 125+ actions with effort, type, and platform metadata.",
          parameters: [
            { name: "platformId", in: "query", schema: { type: "string" } },
            { name: "type", in: "query", schema: { type: "string" } },
            { name: "maxEffort", in: "query", schema: { type: "integer", minimum: 0, maximum: 5 } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "perPage", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          ],
          responses: {
            "200": {
              description: "Action list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          actions: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Action" },
                          },
                          total: { type: "integer" },
                          page: { type: "integer" },
                          perPage: { type: "integer" },
                          totalPages: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/benchmarks": {
        get: {
          tags: ["Reference"],
          summary: "Industry benchmarks",
          responses: {
            "200": {
              description: "Benchmark data by industry",
              content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
            },
          },
        },
      },
      "/campaigns": {
        get: {
          tags: ["Campaigns"],
          summary: "List campaigns",
          security: [{ BearerAuth: [] }, { ApiKey: [] }],
          parameters: [
            { name: "businessId", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Campaign list" } },
        },
        post: {
          tags: ["Campaigns"],
          summary: "Create or launch a campaign",
          security: [{ BearerAuth: [] }, { ApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["actionId", "platformId", "rewardType", "rewardValue"],
                  properties: {
                    actionId: { type: "string" },
                    platformId: { type: "string" },
                    rewardType: { type: "string", enum: ["pct", "amount", "free_item"] },
                    rewardValue: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Campaign created" } },
        },
      },
      "/ai/quick-start": {
        post: {
          tags: ["AI"],
          summary: "Quick-start campaign recommendation",
          description:
            "Given a business profile, returns a single high-impact campaign recommendation.",
          security: [{ BearerAuth: [] }, { ApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    businessType: { type: "string" },
                    industry: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Recommended campaign" } },
        },
      },
      "/ai/campaign-agent": {
        post: {
          tags: ["AI"],
          summary: "Full AI marketing plan",
          security: [{ BearerAuth: [] }, { ApiKey: [] }],
          responses: { "200": { description: "Multi-step marketing plan" } },
        },
      },
      "/exchange/opportunities": {
        get: {
          tags: ["Exchange"],
          summary: "Browse open campaign opportunities",
          description: "Public marketplace of campaigns accepting submissions.",
          responses: { "200": { description: "Opportunity list" } },
        },
      },
      "/exchange/market": {
        get: {
          tags: ["Exchange"],
          summary: "Real-time market data",
          responses: { "200": { description: "Market snapshot" } },
        },
      },
      "/influencers": {
        get: {
          tags: ["Reference"],
          summary: "Search influencers",
          parameters: [
            { name: "platform", in: "query", schema: { type: "string" } },
            { name: "minFollowers", in: "query", schema: { type: "integer" } },
            { name: "maxFollowers", in: "query", schema: { type: "integer" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "perPage", in: "query", schema: { type: "integer", default: 20 } },
          ],
          responses: {
            "200": {
              description: "Paginated influencer list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          influencers: { type: "array", items: { type: "object" } },
                          total: { type: "integer" },
                          page: { type: "integer" },
                          perPage: { type: "integer" },
                          totalPages: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/submissions": {
        get: {
          tags: ["Submissions"],
          summary: "List submissions",
          security: [{ BearerAuth: [] }, { ApiKey: [] }],
          responses: { "200": { description: "Submission list" } },
        },
        post: {
          tags: ["Submissions"],
          summary: "Submit proof of completed action",
          security: [{ BearerAuth: [] }, { ApiKey: [] }],
          responses: { "201": { description: "Submission accepted" } },
        },
      },
      "/submissions/review": {
        post: {
          tags: ["Submissions"],
          summary: "Approve or reject a submission",
          description:
            "Approve releases the perk and closes the submission. Reject requires a reason (1–500 chars). Owner business or API key with review.submissions scope only.",
          security: [{ BearerAuth: [] }, { ApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["submissionId", "decision"],
                  properties: {
                    submissionId: { type: "string" },
                    decision: { type: "string", enum: ["approve", "reject"] },
                    reason: { type: "string", maxLength: 500 },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Decision recorded" } },
        },
      },
      "/agent-auth/token": {
        post: {
          tags: ["Auth"],
          summary: "Exchange an OAuth authorization code for an API key",
          description:
            "Step 4 of the agent OAuth flow (see /agent/authorize for steps 1–3). Single-use, 60-second TTL on the code. Response shape mirrors RFC 6749 token responses so off-the-shelf OAuth clients work.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["code"],
                  properties: {
                    code: { type: "string", description: "Authorization code from the /agent/authorize redirect." },
                    grant_type: {
                      type: "string",
                      enum: ["authorization_code"],
                      description: "Optional. If present, must be 'authorization_code'.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "API key minted",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/SuccessEnvelope" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              access_token: { type: "string", example: "sp_live_..." },
                              token_type: { type: "string", const: "bearer" },
                              scope: { type: "string", example: "read.campaigns write.campaigns" },
                              business_id: { type: "string" },
                              agent_name: { type: "string" },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "400": { description: "Invalid or expired code" },
          },
        },
      },
      "/agent-activity": {
        get: {
          tags: ["Auth"],
          summary: "Per-agent activity rollup",
          description:
            "Returns each API key's activity for the calling business: campaigns created, submissions filed/reviewed, last-used timestamp. Used by /dashboard/agents.",
          security: [{ BearerAuth: [] }, { ApiKey: [] }],
          responses: { "200": { description: "Activity rollup" } },
        },
      },
      "/usage": {
        get: {
          tags: ["Auth"],
          summary: "Current-month usage vs. plan limits",
          description:
            "Returns campaigns / submissions / AI-generations usage for the calling business plus the limits for the active plan. Agents should call this before write tools to avoid PLAN_LIMIT_EXCEEDED.",
          security: [{ BearerAuth: [] }, { ApiKey: [] }],
          responses: { "200": { description: "Usage snapshot" } },
        },
      },
      "/stats/public": {
        get: {
          tags: ["Reference"],
          summary: "Platform aggregate counts",
          description:
            "Anonymous, cached, rounded aggregate platform counts (total campaigns, businesses, active campaigns). Below an activity floor the response is { show: false } and counts are zero. Cached server-side for 5 minutes.",
          responses: {
            "200": {
              description: "Aggregate counts",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/SuccessEnvelope" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              show: { type: "boolean" },
                              campaigns: { type: "integer" },
                              businesses: { type: "integer" },
                              active: { type: "integer" },
                              updatedAt: { type: "string", format: "date-time" },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  } as const;
}

export async function GET(): Promise<Response> {
  return NextResponse.json(
    { success: true, data: buildSpec() },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}

export const dynamic = "force-static";
export const revalidate = 3600;
