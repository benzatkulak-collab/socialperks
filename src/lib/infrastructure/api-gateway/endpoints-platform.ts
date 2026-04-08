// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Platform Endpoint Definitions
// Pricing, actions, benchmarks, auth, AI, billing, events, and health
// endpoint specs for the OpenAPI generator.
// ══════════════════════════════════════════════════════════════════════════════

import type { OpenAPIGenerator } from "./openapi-generator";

export function registerPlatformEndpoints(gen: OpenAPIGenerator): void {
  // ── Pricing ─────────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/pricing",
    method: "GET",
    summary: "Get pricing",
    description:
      "Query the pricing oracle for recommended perk values by action and business type.",
    tags: ["Pricing"],
    auth: false,
    parameters: [
      {
        name: "actionId",
        in: "query",
        required: true,
        description: "Action ID to price",
        schema: { type: "string", example: "ig_rl" },
      },
      {
        name: "businessType",
        in: "query",
        required: false,
        description: "Business type for context",
        schema: { type: "string", example: "Restaurant" },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "Pricing recommendation",
        schema: {
          type: "object",
          properties: {
            actionId: { type: "string" },
            baseValue: { type: "number" },
            recommendedPerk: { type: "number" },
            confidence: { type: "number" },
          },
        },
      },
    },
    rateLimit: { requests: 200, window: "1m" },
  });

  // ── Actions ─────────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/actions",
    method: "GET",
    summary: "List marketing actions",
    description:
      "Get the full action library, optionally filtered by platform and type.",
    tags: ["Actions"],
    auth: false,
    parameters: [
      {
        name: "platformId",
        in: "query",
        required: false,
        description: "Filter by platform ID",
        schema: { type: "string", example: "ig" },
      },
      {
        name: "type",
        in: "query",
        required: false,
        description: "Filter by action type",
        schema: {
          type: "string",
          enum: ["content", "review", "engage", "share", "referral"],
        },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "List of actions",
        schema: {
          type: "object",
          properties: {
            data: { type: "array", items: { type: "object" } },
          },
        },
      },
    },
    rateLimit: { requests: 200, window: "1m" },
  });

  // ── Benchmarks ──────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/benchmarks",
    method: "GET",
    summary: "Get industry benchmarks",
    description:
      "Retrieve industry-specific benchmarks for campaign performance.",
    tags: ["Benchmarks"],
    auth: false,
    parameters: [
      {
        name: "businessType",
        in: "query",
        required: true,
        description: "Business type",
        schema: { type: "string", example: "Coffee Shop" },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "Benchmark data",
        schema: {
          type: "object",
          properties: {
            businessType: { type: "string" },
            avgCampaigns: { type: "number" },
            avgPerkValue: { type: "number" },
            topActions: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    rateLimit: { requests: 100, window: "1m" },
  });

  // ── Auth ────────────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/auth",
    method: "POST",
    summary: "Authenticate",
    description: "Authenticate with email and PIN. Returns a session token.",
    tags: ["Auth"],
    auth: false,
    parameters: [],
    requestBody: {
      type: "object",
      required: ["email", "pin"],
      properties: {
        email: { type: "string", format: "email", description: "Email address" },
        pin: { type: "string", description: "PIN code" },
      },
    },
    responses: {
      "200": {
        description: "Authentication successful",
        schema: {
          type: "object",
          properties: {
            token: { type: "string" },
            user: { type: "object" },
            expiresAt: { type: "string", format: "date-time" },
          },
        },
      },
      "401": { description: "Invalid credentials" },
    },
    rateLimit: { requests: 10, window: "1m" },
  });

  // ── AI Generate ─────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/ai/generate",
    method: "POST",
    summary: "Generate campaign suggestions",
    description:
      "Use the AI engine to generate campaign suggestions for a business based on type, goals, and platform preferences.",
    tags: ["AI"],
    auth: true,
    parameters: [],
    requestBody: {
      type: "object",
      required: ["businessType"],
      properties: {
        businessType: { type: "string", description: "Business type" },
        goals: {
          type: "array",
          items: { type: "string" },
          description: "Marketing goals",
        },
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "Preferred platform IDs",
        },
        budget: { type: "number", description: "Monthly budget" },
      },
    },
    responses: {
      "200": {
        description: "Generated campaign suggestions",
        schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: { type: "object", description: "Campaign suggestion" },
            },
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 20, window: "1m" },
  });

  // ── AI Recommend ────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/ai/recommend",
    method: "POST",
    summary: "Get AI recommendations",
    description:
      "Get optimization recommendations for existing campaigns based on performance data.",
    tags: ["AI"],
    auth: true,
    parameters: [],
    requestBody: {
      type: "object",
      required: ["campaignId"],
      properties: {
        campaignId: { type: "string", description: "Campaign to optimize" },
        metrics: { type: "object", description: "Current performance metrics" },
      },
    },
    responses: {
      "200": {
        description: "Optimization recommendations",
        schema: {
          type: "object",
          properties: {
            recommendations: { type: "array", items: { type: "object" } },
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 20, window: "1m" },
  });

  // ── Billing ─────────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/billing",
    method: "GET",
    summary: "Get billing info",
    description: "Retrieve current billing information and subscription status.",
    tags: ["Billing"],
    auth: true,
    parameters: [
      {
        name: "businessId",
        in: "query",
        required: true,
        description: "Business ID",
        schema: { type: "string" },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "Billing information",
        schema: {
          type: "object",
          properties: {
            plan: { type: "string" },
            status: { type: "string" },
            currentPeriodEnd: { type: "string", format: "date-time" },
            usage: { type: "object" },
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 50, window: "1m" },
  });

  gen.addEndpoint({
    path: "/billing",
    method: "POST",
    summary: "Update billing",
    description: "Update subscription plan or payment method.",
    tags: ["Billing"],
    auth: true,
    parameters: [],
    requestBody: {
      type: "object",
      properties: {
        businessId: { type: "string", description: "Business ID" },
        plan: {
          type: "string",
          enum: ["free", "starter", "pro", "enterprise"],
          description: "New plan",
        },
        paymentMethodId: { type: "string", description: "Payment method ID" },
      },
    },
    responses: {
      "200": {
        description: "Billing updated",
        schema: { type: "object" },
      },
      "400": { description: "Invalid request" },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 10, window: "1m" },
  });

  // ── Billing Webhook ─────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/billing/webhook",
    method: "POST",
    summary: "Billing webhook",
    description: "Receive billing events from the payment provider.",
    tags: ["Billing"],
    auth: false,
    parameters: [],
    requestBody: {
      type: "object",
      properties: {
        event: { type: "string", description: "Event type" },
        data: { type: "object", description: "Event payload" },
      },
    },
    responses: {
      "200": { description: "Webhook processed" },
      "400": { description: "Invalid payload" },
    },
    rateLimit: { requests: 100, window: "1m" },
  });

  // ── Events ──────────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/events",
    method: "GET",
    summary: "List events",
    description: "Retrieve platform events for analytics and audit trails.",
    tags: ["Events"],
    auth: true,
    parameters: [
      {
        name: "entityType",
        in: "query",
        required: false,
        description: "Filter by entity type",
        schema: { type: "string" },
      },
      {
        name: "entityId",
        in: "query",
        required: false,
        description: "Filter by entity ID",
        schema: { type: "string" },
      },
      {
        name: "since",
        in: "query",
        required: false,
        description: "Events after this ISO timestamp",
        schema: { type: "string", format: "date-time" },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "List of events",
        schema: {
          type: "object",
          properties: {
            data: { type: "array", items: { type: "object" } },
            total: { type: "integer" },
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 100, window: "1m" },
  });

  // ── Health ──────────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/health",
    method: "GET",
    summary: "Health check",
    description: "Check API health and uptime status.",
    tags: ["System"],
    auth: false,
    parameters: [],
    requestBody: undefined,
    responses: {
      "200": {
        description: "Service healthy",
        schema: {
          type: "object",
          properties: {
            status: { type: "string", example: "ok" },
            version: { type: "string" },
            uptime: { type: "number" },
          },
        },
      },
    },
    rateLimit: { requests: 300, window: "1m" },
  });
}
