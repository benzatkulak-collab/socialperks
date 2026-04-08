// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Core Endpoint Definitions
// Campaign, influencer, and submission endpoint specs for the OpenAPI generator.
// ══════════════════════════════════════════════════════════════════════════════

import type { OpenAPIGenerator } from "./openapi-generator";

export function registerCoreEndpoints(gen: OpenAPIGenerator): void {
  // ── Campaigns ───────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/campaigns",
    method: "GET",
    summary: "List campaigns",
    description:
      "Retrieve a paginated list of campaigns. Filter by business, tier, status, and more.",
    tags: ["Campaigns"],
    auth: true,
    parameters: [
      {
        name: "businessId",
        in: "query",
        required: false,
        description: "Filter by business ID",
        schema: { type: "string", example: "b1" },
      },
      {
        name: "tier",
        in: "query",
        required: false,
        description: "Filter by campaign tier",
        schema: {
          type: "string",
          enum: ["essential", "high_impact", "growth", "premium", "starter"],
        },
      },
      {
        name: "status",
        in: "query",
        required: false,
        description: "Filter by campaign status",
        schema: { type: "string", enum: ["active", "paused", "ended"] },
      },
      {
        name: "page",
        in: "query",
        required: false,
        description: "Page number",
        schema: { type: "integer", example: 1 },
      },
      {
        name: "perPage",
        in: "query",
        required: false,
        description: "Results per page",
        schema: { type: "integer", example: 20 },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "List of campaigns",
        schema: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { type: "object", description: "Campaign object" },
            },
            total: { type: "integer" },
            page: { type: "integer" },
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 100, window: "1m" },
  });

  gen.addEndpoint({
    path: "/campaigns",
    method: "POST",
    summary: "Create a campaign",
    description:
      "Create and launch a new campaign for a business. Requires business authentication.",
    tags: ["Campaigns"],
    auth: true,
    parameters: [],
    requestBody: {
      type: "object",
      required: ["businessId", "name", "actions", "discountValue", "discountType"],
      properties: {
        businessId: { type: "string", description: "Business ID" },
        name: { type: "string", description: "Campaign name" },
        description: { type: "string", description: "Campaign description" },
        actions: {
          type: "array",
          items: { type: "string" },
          description: "Action IDs",
        },
        discountValue: { type: "number", description: "Discount amount" },
        discountType: {
          type: "string",
          enum: ["pct", "dol"],
          description: "Discount type",
        },
        guidelines: { type: "string", description: "Campaign guidelines" },
        maxCompletions: { type: "integer", description: "Max completions" },
        expiresInDays: { type: "integer", description: "Days until expiry" },
        useTiers: { type: "boolean", description: "Use follower tiers" },
      },
    },
    responses: {
      "201": {
        description: "Campaign created",
        schema: { type: "object", description: "Created campaign" },
      },
      "400": { description: "Invalid request body" },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 50, window: "1m" },
  });

  // ── Influencers ─────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/influencers",
    method: "GET",
    summary: "Search influencers",
    description:
      "Search and filter influencers by niche, follower count, tier, and location.",
    tags: ["Influencers"],
    auth: true,
    parameters: [
      {
        name: "niche",
        in: "query",
        required: false,
        description: "Filter by niche",
        schema: { type: "string", example: "food" },
      },
      {
        name: "minFollowers",
        in: "query",
        required: false,
        description: "Minimum follower count",
        schema: { type: "integer", example: 5000 },
      },
      {
        name: "tier",
        in: "query",
        required: false,
        description: "Influencer tier",
        schema: { type: "string", enum: ["micro", "mid", "macro", "mega"] },
      },
      {
        name: "location",
        in: "query",
        required: false,
        description: "Location filter",
        schema: { type: "string" },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "List of matching influencers",
        schema: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { type: "object", description: "Influencer profile" },
            },
            total: { type: "integer" },
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 100, window: "1m" },
  });

  gen.addEndpoint({
    path: "/influencers",
    method: "POST",
    summary: "Register influencer",
    description: "Register a new influencer profile on the platform.",
    tags: ["Influencers"],
    auth: true,
    parameters: [],
    requestBody: {
      type: "object",
      required: ["displayName", "email", "niches"],
      properties: {
        displayName: { type: "string", description: "Display name" },
        email: { type: "string", format: "email", description: "Email address" },
        bio: { type: "string", description: "Bio" },
        niches: {
          type: "array",
          items: { type: "string" },
          description: "Content niches",
        },
        location: { type: "string", description: "Location" },
      },
    },
    responses: {
      "201": {
        description: "Influencer registered",
        schema: { type: "object", description: "Influencer profile" },
      },
      "400": { description: "Invalid request body" },
    },
    rateLimit: { requests: 20, window: "1m" },
  });

  // ── Submissions ─────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/submissions",
    method: "GET",
    summary: "List submissions",
    description:
      "Retrieve campaign submissions with optional filtering by campaign, status, or influencer.",
    tags: ["Submissions"],
    auth: true,
    parameters: [
      {
        name: "campaignId",
        in: "query",
        required: false,
        description: "Filter by campaign ID",
        schema: { type: "string" },
      },
      {
        name: "status",
        in: "query",
        required: false,
        description: "Submission status",
        schema: {
          type: "string",
          enum: ["pending", "approved", "rejected", "expired"],
        },
      },
      {
        name: "influencerId",
        in: "query",
        required: false,
        description: "Filter by influencer ID",
        schema: { type: "string" },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "List of submissions",
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

  gen.addEndpoint({
    path: "/submissions",
    method: "POST",
    summary: "Create submission",
    description:
      "Submit proof of completing a campaign action. Attach screenshots, URLs, or video links.",
    tags: ["Submissions"],
    auth: true,
    parameters: [],
    requestBody: {
      type: "object",
      required: ["campaignId", "actionId", "proofType", "proofUrl"],
      properties: {
        campaignId: { type: "string", description: "Campaign ID" },
        actionId: { type: "string", description: "Action ID" },
        influencerId: { type: "string", description: "Influencer ID" },
        proofType: {
          type: "string",
          enum: ["screenshot", "url", "video", "api_verified"],
        },
        proofUrl: { type: "string", format: "uri", description: "Proof URL" },
        notes: { type: "string", description: "Additional notes" },
      },
    },
    responses: {
      "201": {
        description: "Submission created",
        schema: { type: "object", description: "Submission object" },
      },
      "400": { description: "Invalid submission" },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 30, window: "1m" },
  });

  gen.addEndpoint({
    path: "/submissions/review",
    method: "POST",
    summary: "Review a submission",
    description: "Approve or reject a campaign submission.",
    tags: ["Submissions"],
    auth: true,
    parameters: [],
    requestBody: {
      type: "object",
      required: ["submissionId", "decision"],
      properties: {
        submissionId: { type: "string", description: "Submission ID" },
        decision: {
          type: "string",
          enum: ["approved", "rejected"],
          description: "Review decision",
        },
        reason: { type: "string", description: "Reason for decision" },
      },
    },
    responses: {
      "200": {
        description: "Submission reviewed",
        schema: { type: "object" },
      },
      "400": { description: "Invalid review" },
      "401": { description: "Unauthorized" },
      "404": { description: "Submission not found" },
    },
    rateLimit: { requests: 50, window: "1m" },
  });
}
