/**
 * OpenAPI 3.1 Specification — Social Perks API
 *
 * Complete API documentation covering all 35+ routes.
 * Served at GET /api/v1/docs with Swagger UI at /api/v1/docs/ui.
 */

// ─── Reusable Schema Definitions ────────────────────────────────────────────

const schemas = {
  // ── Response Wrappers ───────────────────────────────────────────────────

  SuccessResponse: {
    type: "object" as const,
    properties: {
      success: { type: "boolean" as const, example: true },
      data: { type: "object" as const },
    },
    required: ["success", "data"],
  },

  PaginatedResponse: {
    type: "object" as const,
    properties: {
      success: { type: "boolean" as const, example: true },
      data: { type: "object" as const },
      pagination: {
        type: "object" as const,
        properties: {
          page: { type: "integer" as const, example: 1 },
          perPage: { type: "integer" as const, example: 20 },
          total: { type: "integer" as const, example: 100 },
        },
      },
    },
    required: ["success", "data"],
  },

  ErrorResponse: {
    type: "object" as const,
    properties: {
      success: { type: "boolean" as const, example: false },
      error: {
        type: "object" as const,
        properties: {
          code: { type: "string" as const, example: "ERROR_CODE" },
          message: { type: "string" as const, example: "Description of the error" },
        },
        required: ["code", "message"],
      },
    },
    required: ["success", "error"],
  },

  // ── Core Entities ───────────────────────────────────────────────────────

  Business: {
    type: "object" as const,
    properties: {
      id: { type: "string" as const, example: "biz_abc123" },
      name: { type: "string" as const, example: "Sol Coffee" },
      email: { type: "string" as const, format: "email" as const },
      industry: { type: "string" as const, example: "food-beverage" },
      plan: { type: "string" as const, enum: ["free", "starter", "pro", "enterprise"] },
      createdAt: { type: "string" as const, format: "date-time" as const },
    },
    required: ["id", "name", "email"],
  },

  Campaign: {
    type: "object" as const,
    properties: {
      id: { type: "string" as const, example: "camp_xyz789" },
      businessId: { type: "string" as const },
      title: { type: "string" as const, example: "Share us on Instagram" },
      platform: { type: "string" as const, example: "instagram" },
      actionType: { type: "string" as const, example: "content" },
      discountValue: { type: "number" as const, example: 15 },
      discountType: { type: "string" as const, enum: ["percentage", "fixed", "freeItem"] },
      status: { type: "string" as const, enum: ["draft", "active", "paused", "ended", "expired"] },
      tier: { type: "string" as const, enum: ["essential", "highImpact", "growth", "premium", "starter"] },
      budget: { type: "number" as const, example: 500 },
      startDate: { type: "string" as const, format: "date-time" as const },
      endDate: { type: "string" as const, format: "date-time" as const },
      createdAt: { type: "string" as const, format: "date-time" as const },
    },
    required: ["id", "businessId", "title", "platform"],
  },

  LaunchedCampaign: {
    type: "object" as const,
    properties: {
      id: { type: "string" as const },
      campaignId: { type: "string" as const },
      businessId: { type: "string" as const },
      status: { type: "string" as const, enum: ["active", "paused", "ended"] },
      impressions: { type: "integer" as const },
      submissions: { type: "integer" as const },
      approved: { type: "integer" as const },
      launchedAt: { type: "string" as const, format: "date-time" as const },
    },
    required: ["id", "campaignId", "businessId", "status"],
  },

  Submission: {
    type: "object" as const,
    properties: {
      id: { type: "string" as const, example: "sub_def456" },
      campaignId: { type: "string" as const },
      userId: { type: "string" as const },
      proofUrl: { type: "string" as const, format: "uri" as const },
      proofType: { type: "string" as const, enum: ["url", "screenshot", "text"] },
      status: { type: "string" as const, enum: ["pending", "approved", "rejected", "expired"] },
      reviewNote: { type: "string" as const },
      submittedAt: { type: "string" as const, format: "date-time" as const },
      reviewedAt: { type: "string" as const, format: "date-time" as const },
    },
    required: ["id", "campaignId", "userId", "proofUrl", "status"],
  },

  Influencer: {
    type: "object" as const,
    properties: {
      id: { type: "string" as const, example: "inf_ghi789" },
      name: { type: "string" as const, example: "Priya Sharma" },
      email: { type: "string" as const, format: "email" as const },
      platforms: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            platform: { type: "string" as const },
            handle: { type: "string" as const },
            followers: { type: "integer" as const },
          },
        },
      },
      tier: { type: "string" as const, enum: ["nano", "micro", "mid", "macro", "mega"] },
      rateCard: { type: "object" as const },
      createdAt: { type: "string" as const, format: "date-time" as const },
    },
    required: ["id", "name", "email"],
  },

  PerkWallet: {
    type: "object" as const,
    properties: {
      userId: { type: "string" as const },
      balance: { type: "number" as const, example: 45.5 },
      lifetimeEarned: { type: "number" as const, example: 200 },
      lifetimeRedeemed: { type: "number" as const, example: 154.5 },
      perks: {
        type: "array" as const,
        items: { $ref: "#/components/schemas/EarnedPerk" },
      },
    },
    required: ["userId", "balance"],
  },

  EarnedPerk: {
    type: "object" as const,
    properties: {
      id: { type: "string" as const },
      campaignId: { type: "string" as const },
      businessId: { type: "string" as const },
      value: { type: "number" as const },
      type: { type: "string" as const, enum: ["percentage", "fixed", "freeItem"] },
      status: { type: "string" as const, enum: ["active", "redeemed", "expired"] },
      earnedAt: { type: "string" as const, format: "date-time" as const },
      expiresAt: { type: "string" as const, format: "date-time" as const },
    },
    required: ["id", "campaignId", "value", "status"],
  },

  User: {
    type: "object" as const,
    properties: {
      id: { type: "string" as const },
      email: { type: "string" as const, format: "email" as const },
      role: { type: "string" as const, enum: ["business", "influencer", "admin"] },
      businessId: { type: "string" as const, nullable: true },
      createdAt: { type: "string" as const, format: "date-time" as const },
    },
    required: ["id", "email", "role"],
  },

  ApiKey: {
    type: "object" as const,
    properties: {
      id: { type: "string" as const },
      key: { type: "string" as const, description: "Only returned on creation" },
      name: { type: "string" as const },
      businessId: { type: "string" as const },
      scopes: { type: "array" as const, items: { type: "string" as const } },
      lastUsed: { type: "string" as const, format: "date-time" as const, nullable: true },
      createdAt: { type: "string" as const, format: "date-time" as const },
    },
    required: ["id", "name", "businessId"],
  },

  Webhook: {
    type: "object" as const,
    properties: {
      id: { type: "string" as const, example: "whk_abc123_1" },
      businessId: { type: "string" as const },
      url: { type: "string" as const, format: "uri" as const },
      events: { type: "array" as const, items: { type: "string" as const } },
      secret: { type: "string" as const, description: "HMAC signing secret" },
      status: { type: "string" as const, enum: ["active", "inactive", "failing"] },
      failureCount: { type: "integer" as const },
      createdAt: { type: "string" as const, format: "date-time" as const },
    },
    required: ["id", "businessId", "url", "events", "status"],
  },

  Notification: {
    type: "object" as const,
    properties: {
      id: { type: "string" as const },
      type: { type: "string" as const },
      title: { type: "string" as const },
      message: { type: "string" as const },
      read: { type: "boolean" as const },
      createdAt: { type: "string" as const, format: "date-time" as const },
    },
    required: ["id", "type", "title", "message"],
  },
} as const;

// ─── Reusable Response References ───────────────────────────────────────────

const responses = {
  BadRequest: {
    description: "Bad request — invalid parameters or body",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ErrorResponse" },
      },
    },
  },
  Unauthorized: {
    description: "Authentication required or token invalid",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ErrorResponse" },
        example: { success: false, error: { code: "NO_TOKEN", message: "Authentication required" } },
      },
    },
  },
  RateLimited: {
    description: "Too many requests — rate limit exceeded",
    headers: {
      "X-RateLimit-Limit": { schema: { type: "integer" as const } },
      "X-RateLimit-Remaining": { schema: { type: "integer" as const } },
      "X-RateLimit-Reset": { schema: { type: "integer" as const } },
    },
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ErrorResponse" },
      },
    },
  },
};

// ─── Reusable Parameters ────────────────────────────────────────────────────

const paginationParams = [
  {
    name: "page",
    in: "query" as const,
    schema: { type: "integer" as const, default: 1, minimum: 1 },
    description: "Page number",
  },
  {
    name: "perPage",
    in: "query" as const,
    schema: { type: "integer" as const, default: 20, minimum: 1, maximum: 100 },
    description: "Items per page",
  },
];

const authHeader = {
  name: "Authorization",
  in: "header" as const,
  required: true,
  schema: { type: "string" as const, example: "Bearer eyJhbGci..." },
  description: "Bearer JWT token or session token",
};

// ─── Helper: build a standard path ──────────────────────────────────────────

function jsonBody(schema: object, description = "Request body") {
  return {
    description,
    required: true,
    content: { "application/json": { schema } },
  };
}

function jsonResponse(
  description: string,
  schema?: object
) {
  return {
    description,
    content: {
      "application/json": {
        schema: schema ?? { $ref: "#/components/schemas/SuccessResponse" },
      },
    },
  };
}

function standardResponses(successDescription: string, successSchema?: object) {
  return {
    "200": jsonResponse(successDescription, successSchema),
    "400": responses.BadRequest,
    "401": responses.Unauthorized,
    "429": responses.RateLimited,
  };
}

// ─── Paths ──────────────────────────────────────────────────────────────────

const paths: Record<string, object> = {
  // ── Auth ──────────────────────────────────────────────────────────────

  "/auth": {
    get: {
      summary: "Validate current session",
      tags: ["Auth"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      responses: standardResponses("Current user information", {
        $ref: "#/components/schemas/SuccessResponse",
      }),
    },
    post: {
      summary: "Login, signup, logout, refresh, or reset password",
      tags: ["Auth"],
      requestBody: jsonBody({
        type: "object",
        properties: {
          action: { type: "string", enum: ["login", "signup", "logout", "refresh", "reset-password"] },
          email: { type: "string", format: "email" },
          password: { type: "string" },
          name: { type: "string" },
        },
        required: ["action"],
      }),
      responses: standardResponses("Auth action result"),
    },
  },

  // ── Campaigns ─────────────────────────────────────────────────────────

  "/campaigns": {
    get: {
      summary: "List campaigns",
      tags: ["Campaigns"],
      security: [{ bearerAuth: [] }],
      parameters: [
        authHeader,
        ...paginationParams,
        { name: "status", in: "query", schema: { type: "string" }, description: "Filter by status" },
        { name: "platform", in: "query", schema: { type: "string" }, description: "Filter by platform" },
      ],
      responses: standardResponses("List of campaigns", {
        $ref: "#/components/schemas/PaginatedResponse",
      }),
    },
    post: {
      summary: "Create or launch a campaign",
      tags: ["Campaigns"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          title: { type: "string" },
          platform: { type: "string" },
          actionType: { type: "string" },
          discountValue: { type: "number" },
          discountType: { type: "string" },
          budget: { type: "number" },
        },
        required: ["title", "platform"],
      }),
      responses: standardResponses("Created campaign", {
        $ref: "#/components/schemas/SuccessResponse",
      }),
    },
  },

  // ── Submissions ───────────────────────────────────────────────────────

  "/submissions": {
    get: {
      summary: "List submissions",
      tags: ["Submissions"],
      security: [{ bearerAuth: [] }],
      parameters: [
        authHeader,
        ...paginationParams,
        { name: "status", in: "query", schema: { type: "string" }, description: "Filter by status" },
        { name: "campaignId", in: "query", schema: { type: "string" }, description: "Filter by campaign" },
      ],
      responses: standardResponses("List of submissions", {
        $ref: "#/components/schemas/PaginatedResponse",
      }),
    },
    post: {
      summary: "Create a submission with proof",
      tags: ["Submissions"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          campaignId: { type: "string" },
          proofUrl: { type: "string", format: "uri" },
          proofType: { type: "string", enum: ["url", "screenshot", "text"] },
          comment: { type: "string" },
        },
        required: ["campaignId", "proofUrl"],
      }),
      responses: standardResponses("Created submission"),
    },
  },

  "/submissions/review": {
    post: {
      summary: "Approve or reject a submission",
      tags: ["Submissions"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          submissionId: { type: "string" },
          action: { type: "string", enum: ["approve", "reject"] },
          reviewNote: { type: "string" },
        },
        required: ["submissionId", "action"],
      }),
      responses: standardResponses("Reviewed submission"),
    },
  },

  // ── AI (Backend-Only) ─────────────────────────────────────────────────

  "/ai/generate": {
    post: {
      summary: "Generate AI campaign suggestions",
      tags: ["AI"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          businessType: { type: "string" },
          industry: { type: "string" },
          goals: { type: "array", items: { type: "string" } },
          budget: { type: "number" },
          platforms: { type: "array", items: { type: "string" } },
        },
      }),
      responses: standardResponses("Generated campaign suggestions"),
    },
  },

  "/ai/recommend": {
    post: {
      summary: "Get AI optimization recommendations",
      tags: ["AI"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          campaignId: { type: "string" },
          type: { type: "string", enum: ["optimize", "expand", "budget"] },
        },
      }),
      responses: standardResponses("AI recommendations"),
    },
  },

  "/ai/review": {
    post: {
      summary: "AI-powered submission review pipeline",
      tags: ["AI"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          submissionId: { type: "string" },
        },
        required: ["submissionId"],
      }),
      responses: standardResponses("AI review result"),
    },
  },

  "/ai/campaign-agent": {
    post: {
      summary: "Full AI-generated marketing plan",
      tags: ["AI"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          businessId: { type: "string" },
          goals: { type: "array", items: { type: "string" } },
          budget: { type: "number" },
          timeframe: { type: "string" },
        },
      }),
      responses: standardResponses("Complete marketing plan"),
    },
  },

  "/ai/quick-start": {
    post: {
      summary: "Quick-start single recommendation",
      tags: ["AI"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          businessType: { type: "string" },
          platform: { type: "string" },
        },
      }),
      responses: standardResponses("Quick-start recommendation"),
    },
  },

  // ── Billing ───────────────────────────────────────────────────────────

  "/billing": {
    post: {
      summary: "Manage subscription (create, update, cancel)",
      tags: ["Billing"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          action: { type: "string", enum: ["subscribe", "update", "cancel", "portal"] },
          planId: { type: "string" },
        },
        required: ["action"],
      }),
      responses: standardResponses("Billing action result"),
    },
  },

  "/billing/webhook": {
    post: {
      summary: "Stripe webhook handler",
      tags: ["Billing"],
      parameters: [
        { name: "Stripe-Signature", in: "header", required: true, schema: { type: "string" } },
      ],
      requestBody: jsonBody({ type: "object" }, "Stripe webhook event"),
      responses: {
        "200": jsonResponse("Webhook processed"),
        "400": responses.BadRequest,
        "429": responses.RateLimited,
      },
    },
  },

  // ── Programs ──────────────────────────────────────────────────────────

  "/programs": {
    get: {
      summary: "List perk programs",
      tags: ["Programs"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader, ...paginationParams],
      responses: standardResponses("List of programs", {
        $ref: "#/components/schemas/PaginatedResponse",
      }),
    },
    post: {
      summary: "Create a perk program",
      tags: ["Programs"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          type: { type: "string" },
          rewards: { type: "array", items: { type: "object" } },
        },
        required: ["name"],
      }),
      responses: standardResponses("Created program"),
    },
  },

  "/programs/{programId}": {
    get: {
      summary: "Get program details",
      tags: ["Programs"],
      security: [{ bearerAuth: [] }],
      parameters: [
        authHeader,
        { name: "programId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: standardResponses("Program details"),
    },
    put: {
      summary: "Update a program",
      tags: ["Programs"],
      security: [{ bearerAuth: [] }],
      parameters: [
        authHeader,
        { name: "programId", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: jsonBody({
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          status: { type: "string" },
        },
      }),
      responses: standardResponses("Updated program"),
    },
    delete: {
      summary: "End a program",
      tags: ["Programs"],
      security: [{ bearerAuth: [] }],
      parameters: [
        authHeader,
        { name: "programId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: standardResponses("Program ended"),
    },
  },

  "/programs/{programId}/progress": {
    get: {
      summary: "Get member progress in a program",
      tags: ["Programs"],
      security: [{ bearerAuth: [] }],
      parameters: [
        authHeader,
        { name: "programId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: standardResponses("Member progress data"),
    },
  },

  "/programs/{programId}/submit": {
    post: {
      summary: "Submit an action for a program",
      tags: ["Programs"],
      security: [{ bearerAuth: [] }],
      parameters: [
        authHeader,
        { name: "programId", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: jsonBody({
        type: "object",
        properties: {
          actionId: { type: "string" },
          proofUrl: { type: "string", format: "uri" },
        },
        required: ["actionId", "proofUrl"],
      }),
      responses: standardResponses("Submission result"),
    },
  },

  "/programs/{programId}/cashback": {
    get: {
      summary: "List cashback payouts",
      tags: ["Programs"],
      security: [{ bearerAuth: [] }],
      parameters: [
        authHeader,
        { name: "programId", in: "path", required: true, schema: { type: "string" } },
        ...paginationParams,
      ],
      responses: standardResponses("List of cashback payouts"),
    },
    post: {
      summary: "Request or manage cashback",
      tags: ["Programs"],
      security: [{ bearerAuth: [] }],
      parameters: [
        authHeader,
        { name: "programId", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: jsonBody({
        type: "object",
        properties: {
          action: { type: "string", enum: ["request", "approve", "reject"] },
          amount: { type: "number" },
        },
        required: ["action"],
      }),
      responses: standardResponses("Cashback action result"),
    },
  },

  "/programs/{programId}/members": {
    get: {
      summary: "List program members",
      tags: ["Programs"],
      security: [{ bearerAuth: [] }],
      parameters: [
        authHeader,
        { name: "programId", in: "path", required: true, schema: { type: "string" } },
        ...paginationParams,
      ],
      responses: standardResponses("List of program members"),
    },
    post: {
      summary: "Enroll a member in a program",
      tags: ["Programs"],
      security: [{ bearerAuth: [] }],
      parameters: [
        authHeader,
        { name: "programId", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: jsonBody({
        type: "object",
        properties: {
          userId: { type: "string" },
          email: { type: "string", format: "email" },
        },
      }),
      responses: standardResponses("Enrollment result"),
    },
  },

  // ── Exchange ──────────────────────────────────────────────────────────

  "/exchange/opportunities": {
    get: {
      summary: "List market opportunities (public)",
      tags: ["Exchange"],
      parameters: paginationParams,
      responses: standardResponses("Market opportunities", {
        $ref: "#/components/schemas/PaginatedResponse",
      }),
    },
  },

  "/exchange/market": {
    get: {
      summary: "Real-time market data (public)",
      tags: ["Exchange"],
      responses: standardResponses("Market data"),
    },
  },

  "/exchange/orders": {
    get: {
      summary: "List orders",
      tags: ["Exchange"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader, ...paginationParams],
      responses: standardResponses("List of orders"),
    },
    post: {
      summary: "Place a buy/sell order",
      tags: ["Exchange"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          side: { type: "string", enum: ["buy", "sell"] },
          amount: { type: "number" },
          price: { type: "number" },
          campaignId: { type: "string" },
        },
        required: ["side", "amount"],
      }),
      responses: standardResponses("Created order"),
    },
  },

  "/exchange/trades": {
    get: {
      summary: "List trades",
      tags: ["Exchange"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader, ...paginationParams],
      responses: standardResponses("List of trades"),
    },
    post: {
      summary: "Trade lifecycle actions (settle, cancel, dispute)",
      tags: ["Exchange"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          tradeId: { type: "string" },
          action: { type: "string", enum: ["settle", "cancel", "dispute"] },
        },
        required: ["tradeId", "action"],
      }),
      responses: standardResponses("Trade action result"),
    },
  },

  "/exchange/enroll": {
    post: {
      summary: "Agent auto-enrollment",
      tags: ["Exchange"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          agentId: { type: "string" },
          capabilities: { type: "array", items: { type: "string" } },
        },
      }),
      responses: standardResponses("Enrollment result"),
    },
  },

  // ── Reference Data ────────────────────────────────────────────────────

  "/pricing": {
    get: {
      summary: "Pricing oracle — platform action pricing",
      tags: ["Reference"],
      parameters: [
        { name: "platform", in: "query", schema: { type: "string" }, description: "Filter by platform" },
        { name: "action", in: "query", schema: { type: "string" }, description: "Filter by action type" },
      ],
      responses: {
        "200": jsonResponse("Pricing data"),
        "429": responses.RateLimited,
      },
    },
  },

  "/actions": {
    get: {
      summary: "Action library — all 107 marketing actions",
      tags: ["Reference"],
      parameters: [
        { name: "platform", in: "query", schema: { type: "string" }, description: "Filter by platform" },
        { name: "type", in: "query", schema: { type: "string" }, description: "Filter by action type" },
      ],
      responses: {
        "200": jsonResponse("Action library"),
        "429": responses.RateLimited,
      },
    },
  },

  "/benchmarks": {
    get: {
      summary: "Industry benchmarks",
      tags: ["Reference"],
      parameters: [
        { name: "industry", in: "query", schema: { type: "string" }, description: "Filter by industry" },
      ],
      responses: {
        "200": jsonResponse("Benchmark data"),
        "429": responses.RateLimited,
      },
    },
  },

  "/influencers": {
    get: {
      summary: "Search influencers",
      tags: ["Reference"],
      parameters: [
        ...paginationParams,
        { name: "platform", in: "query", schema: { type: "string" }, description: "Filter by platform" },
        { name: "tier", in: "query", schema: { type: "string" }, description: "Filter by tier" },
        { name: "q", in: "query", schema: { type: "string" }, description: "Search query" },
      ],
      responses: {
        "200": jsonResponse("Influencer list", { $ref: "#/components/schemas/PaginatedResponse" }),
        "429": responses.RateLimited,
      },
    },
    post: {
      summary: "Register as an influencer",
      tags: ["Reference"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" },
          platforms: {
            type: "array",
            items: {
              type: "object",
              properties: {
                platform: { type: "string" },
                handle: { type: "string" },
                followers: { type: "integer" },
              },
            },
          },
        },
        required: ["name", "email"],
      }),
      responses: standardResponses("Registered influencer"),
    },
  },

  "/recommendations": {
    get: {
      summary: "ML-powered recommendations",
      tags: ["Reference"],
      security: [{ bearerAuth: [] }],
      parameters: [
        authHeader,
        { name: "type", in: "query", schema: { type: "string" }, description: "Recommendation type" },
      ],
      responses: standardResponses("Recommendations"),
    },
  },

  "/legal": {
    get: {
      summary: "Legal compliance briefings",
      tags: ["Reference"],
      parameters: [
        { name: "topic", in: "query", schema: { type: "string" }, description: "Legal topic" },
      ],
      responses: {
        "200": jsonResponse("Legal briefing"),
        "429": responses.RateLimited,
      },
    },
  },

  // ── Infrastructure ────────────────────────────────────────────────────

  "/events": {
    get: {
      summary: "SSE real-time event stream",
      tags: ["Infrastructure"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      responses: {
        "200": {
          description: "Server-Sent Events stream",
          content: {
            "text/event-stream": {
              schema: { type: "string" },
            },
          },
        },
        "401": responses.Unauthorized,
      },
    },
  },

  "/health": {
    get: {
      summary: "Health check",
      tags: ["Infrastructure"],
      responses: {
        "200": jsonResponse("Service health status"),
      },
    },
  },

  "/oauth/connect": {
    post: {
      summary: "Start OAuth flow for a social platform",
      tags: ["Infrastructure"],
      security: [{ bearerAuth: [] }],
      parameters: [authHeader],
      requestBody: jsonBody({
        type: "object",
        properties: {
          platform: { type: "string" },
          redirectUri: { type: "string", format: "uri" },
        },
        required: ["platform"],
      }),
      responses: standardResponses("OAuth redirect URL"),
    },
  },

  "/oauth/{platform}": {
    get: {
      summary: "OAuth callback handler",
      tags: ["Infrastructure"],
      parameters: [
        { name: "platform", in: "path", required: true, schema: { type: "string" } },
        { name: "code", in: "query", schema: { type: "string" }, description: "Authorization code" },
        { name: "state", in: "query", schema: { type: "string" }, description: "CSRF state token" },
      ],
      responses: {
        "200": jsonResponse("OAuth connection result"),
        "400": responses.BadRequest,
      },
    },
  },

  "/verification/webhook": {
    get: {
      summary: "Webhook challenge verification (platform handshake)",
      tags: ["Infrastructure"],
      parameters: [
        {
          name: "hub.challenge",
          in: "query",
          schema: { type: "string" },
          description: "Challenge token to echo back",
        },
      ],
      responses: {
        "200": {
          description: "Challenge response",
          content: { "text/plain": { schema: { type: "string" } } },
        },
      },
    },
    post: {
      summary: "Platform webhook receiver (verification events)",
      tags: ["Infrastructure"],
      parameters: [
        {
          name: "X-Hub-Signature-256",
          in: "header",
          schema: { type: "string" },
          description: "HMAC signature for payload verification",
        },
      ],
      requestBody: jsonBody({ type: "object" }, "Platform webhook event payload"),
      responses: {
        "200": jsonResponse("Webhook processed"),
        "400": responses.BadRequest,
      },
    },
  },

  "/seed": {
    post: {
      summary: "Seed demo data (development only)",
      tags: ["Infrastructure"],
      responses: {
        "200": jsonResponse("Seed data created"),
        "400": responses.BadRequest,
      },
    },
  },
};

// ─── Full OpenAPI Spec ──────────────────────────────────────────────────────

export const openAPISpec = {
  openapi: "3.1.0",
  info: {
    title: "Social Perks API",
    version: "1.0.0",
    description:
      "Social Perks turns customers into your marketing team. " +
      "Businesses offer perks (discounts/rewards) to customers in exchange " +
      "for marketing actions across social media platforms. " +
      "This API powers campaign management, submission tracking, AI-driven " +
      "recommendations, perk programs, an influencer exchange, and more.",
    contact: {
      name: "Social Perks API Support",
      url: "https://socialperks.app/support",
    },
    license: {
      name: "Proprietary",
    },
  },
  servers: [
    {
      url: "/api/v1",
      description: "API v1 (current, deprecation planned for 2026-12-31)",
    },
    {
      url: "/api/v2",
      description: "API v2 (next generation)",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication and session management" },
    { name: "Campaigns", description: "Campaign creation and management" },
    { name: "Submissions", description: "Proof submission and review" },
    { name: "AI", description: "AI-powered campaign generation and recommendations (backend-only)" },
    { name: "Billing", description: "Subscription and payment management" },
    { name: "Programs", description: "Perk programs, members, cashback, and progress" },
    { name: "Exchange", description: "Influencer/business marketplace and trading" },
    { name: "Reference", description: "Pricing, actions, benchmarks, influencers, and legal data" },
    { name: "Infrastructure", description: "Health, events, OAuth, webhooks, and seed data" },
  ],
  paths,
  components: {
    schemas,
    securitySchemes: {
      bearerAuth: {
        type: "http" as const,
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token obtained from POST /auth with action=login",
      },
      apiKeyAuth: {
        type: "apiKey" as const,
        in: "header" as const,
        name: "X-API-Key",
        description: "API key for programmatic access (enterprise plans)",
      },
    },
    responses,
  },
  security: [
    { bearerAuth: [] },
    { apiKeyAuth: [] },
  ],
};
