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
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://social-perks.example.com";

function buildSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Social Perks API",
      version: "1.0.0",
      summary: "Marketing actions in exchange for perks",
      description:
        "Social Perks is a marketing platform where businesses offer perks (discounts, free items, cash back) to customers and influencers in exchange for marketing actions across 15 social platforms (107 actions total). This API exposes pricing, action discovery, campaign management, submission tracking, and an exchange marketplace.",
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
      { name: "ApiKeys", description: "Mint and manage API keys for agents (human-only — keys cannot mint other keys)" },
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
      "/api-keys": {
        get: {
          tags: ["ApiKeys"],
          summary: "List API keys for the calling business",
          description:
            "Returns the calling business's API keys (public fields only — never the hash). Requires JWT or session auth; cannot be called with x-api-key (keys cannot enumerate keys).",
          security: [{ BearerAuth: [] }],
          responses: {
            "200": {
              description: "API key list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          keys: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "string" },
                                agentName: { type: "string" },
                                keyPrefix: { type: "string", example: "deadbeef" },
                                env: { type: "string", enum: ["live", "test"] },
                                permissions: { type: "array", items: { type: "string" } },
                                active: { type: "boolean" },
                                lastUsedAt: { type: "string", format: "date-time", nullable: true },
                                createdAt: { type: "string", format: "date-time" },
                                expiresAt: { type: "string", format: "date-time", nullable: true },
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
            "401": { description: "Authentication required" },
            "403": { description: "API-key callers are forbidden — sign in to your dashboard" },
          },
        },
        post: {
          tags: ["ApiKeys"],
          summary: "Mint a new API key",
          description:
            "Creates a new API key. The plaintext is returned ONCE in the response and cannot be retrieved later. Requires JWT or session auth (NOT x-api-key).",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["agentName"],
                  properties: {
                    agentName: {
                      type: "string",
                      maxLength: 255,
                      description: "Human-readable label for which agent this key belongs to.",
                    },
                    permissions: {
                      type: "array",
                      items: { type: "string", enum: ["read", "write", "admin"] },
                      default: ["read"],
                    },
                    env: { type: "string", enum: ["live", "test"] },
                    expiresInDays: {
                      type: "integer",
                      minimum: 1,
                      maximum: 3650,
                      description: "Optional expiry (days from now). Defaults to no expiry.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Key created. The plaintext is in `data.key` and is shown ONLY here.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          key: {
                            type: "string",
                            example: "sp_live_deadbeef_00112233445566778899aabbccddeeff",
                            description: "The plaintext API key. Show ONCE, then store securely.",
                          },
                          id: { type: "string" },
                          keyPrefix: { type: "string" },
                          env: { type: "string" },
                          agentName: { type: "string" },
                          permissions: { type: "array", items: { type: "string" } },
                          createdAt: { type: "string", format: "date-time" },
                          expiresAt: { type: "string", format: "date-time", nullable: true },
                          warning: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { description: "Validation error" },
            "401": { description: "Authentication required" },
            "403": { description: "API keys cannot mint other keys" },
            "429": { description: "Rate limit exceeded" },
          },
        },
      },
      "/api-keys/{id}": {
        delete: {
          tags: ["ApiKeys"],
          summary: "Revoke an API key",
          description:
            "Soft-deletes the key (sets active=false). Cross-business attempts return 404 to avoid ID enumeration. Idempotent on unknown IDs.",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Revoked" },
            "401": { description: "Authentication required" },
            "403": { description: "API keys cannot revoke other keys" },
            "404": { description: "Not found" },
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
