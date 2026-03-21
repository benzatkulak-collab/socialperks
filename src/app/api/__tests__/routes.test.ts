import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// -- Helpers ------------------------------------------------------------------

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function createJsonRequest(
  url: string,
  body: Record<string, unknown>,
  headers?: Record<string, string>
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

// =============================================================================
// GET /api/health
// =============================================================================

describe("GET /api/health", () => {
  it("returns healthy status", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    // apiResponse wraps data under body.data
    const data = body.data ?? body;
    expect(data.status).toBe("healthy");
    expect(data).toHaveProperty("version");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("uptime");
    expect(typeof data.uptime).toBe("number");
  });

  it("returns a valid ISO timestamp", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    const data = body.data ?? body;
    const parsed = new Date(data.timestamp);
    expect(parsed.toISOString()).toBe(data.timestamp);
  });
});

// =============================================================================
// GET /api/v1/campaigns
// =============================================================================

describe("GET /api/v1/campaigns", () => {
  it("returns a success structure with campaigns array and pagination", async () => {
    const { GET } = await import("@/app/api/v1/campaigns/route");
    const request = createRequest("/api/v1/campaigns?businessId=b1");
    const response = await GET(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("campaigns");
    expect(Array.isArray(body.data.campaigns)).toBe(true);
    expect(body.data).toHaveProperty("pagination");
    expect(body.data.pagination).toHaveProperty("page");
    expect(body.data.pagination).toHaveProperty("perPage");
    expect(body.data.pagination).toHaveProperty("total");
    expect(body.data.pagination).toHaveProperty("totalPages");
  });

  it("pagination works with page and perPage params", async () => {
    const { GET } = await import("@/app/api/v1/campaigns/route");
    const request = createRequest("/api/v1/campaigns?businessId=b1&page=2&perPage=5");
    const response = await GET(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.pagination.page).toBe(2);
    expect(body.data.pagination.perPage).toBe(5);
  });

  it("returns empty campaigns for unknown business", async () => {
    const { GET } = await import("@/app/api/v1/campaigns/route");
    const request = createRequest("/api/v1/campaigns?businessId=nonexistent");
    const response = await GET(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.campaigns).toEqual([]);
  });
});

// =============================================================================
// POST /api/v1/campaigns
// =============================================================================

describe("POST /api/v1/campaigns", () => {
  it("returns 401 without an auth token", async () => {
    const { POST } = await import("@/app/api/v1/campaigns/route");
    const request = createJsonRequest("/api/v1/campaigns", {
      businessId: "b1",
      name: "Test Campaign",
      actions: ["ig_st"],
      discountValue: 10,
      discountType: "pct",
    });
    const response = await POST(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("creates a campaign with valid token and data", async () => {
    const { POST } = await import("@/app/api/v1/campaigns/route");
    const request = createJsonRequest(
      "/api/v1/campaigns",
      {
        businessId: "b1",
        name: "Test Campaign",
        actions: ["ig_st"],
        discountValue: 15,
        discountType: "pct",
      },
      { authorization: "Bearer demo-token-b1" }
    );
    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("id");
    expect(body.data.name).toBe("Test Campaign");
    expect(body.data.businessId).toBe("b1");
    expect(body.data.discountValue).toBe(15);
    expect(body.data.discountType).toBe("pct");
    expect(body.data.actions).toEqual(["ig_st"]);
  });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("@/app/api/v1/campaigns/route");
    const request = createJsonRequest(
      "/api/v1/campaigns",
      { businessId: "b1" },
      { authorization: "Bearer demo-token-b1" }
    );
    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("MISSING_FIELDS");
  });

  it("returns 400 when actions array is empty", async () => {
    const { POST } = await import("@/app/api/v1/campaigns/route");
    const request = createJsonRequest(
      "/api/v1/campaigns",
      {
        businessId: "b1",
        name: "Test",
        actions: [],
        discountValue: 10,
        discountType: "pct",
      },
      { authorization: "Bearer demo-token-b1" }
    );
    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe("INVALID_ACTIONS");
  });

  it("returns 400 when discountValue is not positive", async () => {
    const { POST } = await import("@/app/api/v1/campaigns/route");
    const request = createJsonRequest(
      "/api/v1/campaigns",
      {
        businessId: "b1",
        name: "Test",
        actions: ["ig_st"],
        discountValue: -5,
        discountType: "pct",
      },
      { authorization: "Bearer demo-token-b1" }
    );
    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe("INVALID_PERK");
  });

  it("returns 400 when discountType is invalid", async () => {
    const { POST } = await import("@/app/api/v1/campaigns/route");
    const request = createJsonRequest(
      "/api/v1/campaigns",
      {
        businessId: "b1",
        name: "Test",
        actions: ["ig_st"],
        discountValue: 10,
        discountType: "invalid",
      },
      { authorization: "Bearer demo-token-b1" }
    );
    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe("INVALID_DISCOUNT_TYPE");
  });
});

// =============================================================================
// GET /api/v1/pricing
// =============================================================================

describe("GET /api/v1/pricing", () => {
  it("returns pricing data for a valid action", async () => {
    const { GET } = await import("@/app/api/v1/pricing/route");
    const request = createRequest("/api/v1/pricing?actionId=ig_rl");
    const response = await GET(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("action");
    expect(body.data.action.id).toBe("ig_rl");
    expect(body.data).toHaveProperty("pricing");
  });

  it("returns 404 for an invalid action", async () => {
    const { GET } = await import("@/app/api/v1/pricing/route");
    const request = createRequest("/api/v1/pricing?actionId=nonexistent");
    const response = await GET(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("ACTION_NOT_FOUND");
  });

  it("returns all pricing when no filters provided", async () => {
    const { GET } = await import("@/app/api/v1/pricing/route");
    const request = createRequest("/api/v1/pricing");
    const response = await GET(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    // apiResponse wraps: { success, data: { data: [...], meta: {...} } }
    const payload = body.data;
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.data.length).toBeGreaterThan(0);
    expect(payload.meta).toHaveProperty("total");
  });

  it("accepts a businessType parameter", async () => {
    const { GET } = await import("@/app/api/v1/pricing/route");
    const request = createRequest("/api/v1/pricing?actionId=ig_rl&businessType=Restaurant");
    const response = await GET(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("pricing");
  });

  it("returns pricing for a platform", async () => {
    const { GET } = await import("@/app/api/v1/pricing/route");
    const request = createRequest("/api/v1/pricing?platformId=ig");
    const response = await GET(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// GET /api/v1/actions
// =============================================================================

describe("GET /api/v1/actions", () => {
  it("returns actions with meta and pagination", async () => {
    const { GET } = await import("@/app/api/v1/actions/route");
    const request = createRequest("/api/v1/actions");
    const response = await GET(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("actions");
    expect(Array.isArray(body.data.actions)).toBe(true);
    expect(body.data).toHaveProperty("meta");
    expect(body.data.meta).toHaveProperty("totalActions");
    expect(body.data).toHaveProperty("pagination");
  });

  it("filters by platformId", async () => {
    const { GET } = await import("@/app/api/v1/actions/route");
    const request = createRequest("/api/v1/actions?platformId=ig");
    const response = await GET(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    for (const action of body.data.actions) {
      expect(action.platform.id).toBe("ig");
    }
  });

  it("filters by action type", async () => {
    const { GET } = await import("@/app/api/v1/actions/route");
    const request = createRequest("/api/v1/actions?type=review");
    const response = await GET(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    for (const action of body.data.actions) {
      expect(action.type).toBe("review");
    }
  });

  it("filters by maxEffort", async () => {
    const { GET } = await import("@/app/api/v1/actions/route");
    const request = createRequest("/api/v1/actions?maxEffort=1");
    const response = await GET(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    for (const action of body.data.actions) {
      expect(action.effort).toBeLessThanOrEqual(1);
    }
  });

  it("respects pagination", async () => {
    const { GET } = await import("@/app/api/v1/actions/route");
    const request = createRequest("/api/v1/actions?page=1&perPage=3");
    const response = await GET(request);
    const body = await response.json();

    expect(body.data.actions.length).toBeLessThanOrEqual(3);
    expect(body.data.pagination.perPage).toBe(3);
  });
});

// =============================================================================
// POST /api/v1/auth
// =============================================================================

describe("POST /api/v1/auth", () => {
  it("logs in with valid business credentials", async () => {
    const { POST } = await import("@/app/api/v1/auth/route");
    const request = createJsonRequest("/api/v1/auth", {
      email: "yoga@demo.com",
      pin: "1234",
    });
    const response = await POST(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("user");
    expect(body.data).toHaveProperty("token");
    expect(body.data.user.email).toBe("yoga@demo.com");
    expect(body.data.user.role).toBe("business_owner");
  });

  it("returns error for invalid credentials", async () => {
    const { POST } = await import("@/app/api/v1/auth/route");
    const request = createJsonRequest("/api/v1/auth", {
      email: "yoga@demo.com",
      pin: "9999",
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 400 when email is missing", async () => {
    const { POST } = await import("@/app/api/v1/auth/route");
    const request = createJsonRequest("/api/v1/auth", {
      pin: "1234",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("MISSING_CREDENTIALS");
  });

  it("returns 400 when pin is missing", async () => {
    const { POST } = await import("@/app/api/v1/auth/route");
    const request = createJsonRequest("/api/v1/auth", {
      email: "yoga@demo.com",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("MISSING_CREDENTIALS");
  });

  it("logs in with valid influencer credentials", async () => {
    const { POST } = await import("@/app/api/v1/auth/route");
    const request = createJsonRequest("/api/v1/auth", {
      email: "priya@demo.com",
      pin: "1234",
    });
    const response = await POST(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.user.role).toBe("influencer");
  });
});
