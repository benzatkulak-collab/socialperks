/**
 * Integration tests for /api/v1/campaigns
 *
 * GET  — List campaigns (public, with optional tenant scoping)
 * POST — Create & launch campaign (requires auth + tenant)
 *
 * Note: Free plan limits 1 active campaign. Validation-focused tests run
 * first (before any campaign is created) and the creation test runs last.
 * After creation, subsequent POSTs correctly return 403 (plan limit).
 */

import { describe, it, expect, beforeAll, vi } from "vitest";

// Disable rate limiting so tests are not throttled
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000, limit: 100 }),
  rateLimitHeaders: () => ({}),
}));

import { GET, POST } from "../campaigns/route";
import { POST as authPost } from "../auth/route";
import { createRequest, parseResponse, authHeaders } from "./helpers";

describe("Campaigns API", () => {
  let token: string;
  let businessId: string;
  let userId: string;

  beforeAll(async () => {
    const email = `camp-test-${Date.now()}@example.com`;
    const res = await authPost(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: {
          action: "signup",
          email,
          password: "TestPass123!",
          name: "Campaign Tester",
          role: "business",
        },
      })
    );
    const data = await res.json();
    token = data.data?.accessToken || "";
    businessId = data.data?.user?.businessId || "";
    userId = data.data?.user?.id || "";
  });

  // ── GET ────────────────────────────────────────────────────────────────────

  it("GET /campaigns — returns campaigns list (public, no auth)", async () => {
    const res = await GET(createRequest("/api/v1/campaigns"));
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data.campaigns)).toBe(true);
    expect(typeof data.data.total).toBe("number");
    expect(typeof data.data.page).toBe("number");
    expect(typeof data.data.perPage).toBe("number");
    expect(typeof data.data.totalPages).toBe("number");
  });

  it("GET /campaigns — supports pagination params", async () => {
    const res = await GET(
      createRequest("/api/v1/campaigns", {
        searchParams: { page: "1", perPage: "5" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.page).toBe(1);
    expect(data.data.perPage).toBe(5);
  });

  it("GET /campaigns — filters by state=active", async () => {
    const res = await GET(
      createRequest("/api/v1/campaigns", {
        searchParams: { state: "active" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.campaigns)).toBe(true);
  });

  it("GET /campaigns — invalid state filter returns 400", async () => {
    const res = await GET(
      createRequest("/api/v1/campaigns", {
        searchParams: { state: "invalid_state" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INVALID_STATE");
  });

  it("GET /campaigns — with auth scopes to tenant", async () => {
    const res = await GET(
      createRequest("/api/v1/campaigns", {
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.campaigns)).toBe(true);
  });

  // ── POST (auth check) ─────────────────────────────────────────────────────

  it("POST /campaigns — without auth returns 401", async () => {
    const res = await POST(
      createRequest("/api/v1/campaigns", {
        method: "POST",
        body: {
          businessId: "biz_test",
          name: "Test Campaign",
          actions: ["ggl_rv"],
          discountValue: 15,
          discountType: "pct",
        },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(401);
    expect(data.success).toBe(false);
  });

  // ── POST (validation — run BEFORE creation so plan limit is not reached) ──

  it("POST /campaigns — missing name returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/campaigns", {
        method: "POST",
        body: { businessId },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("POST /campaigns — empty actions array returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/campaigns", {
        method: "POST",
        body: {
          businessId,
          name: "Bad Campaign",
          actions: [],
          discountValue: 10,
          discountType: "pct",
        },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INVALID_ACTIONS");
  });

  it("POST /campaigns — invalid discount type returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/campaigns", {
        method: "POST",
        body: {
          businessId,
          name: "Bad Discount Type",
          actions: ["ggl_rv"],
          discountValue: 10,
          discountType: "invalid",
        },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INVALID_DISCOUNT_TYPE");
  });

  // ── POST (successful creation — runs last) ────────────────────────────────

  it("POST /campaigns — creates campaign with valid data", async () => {
    const res = await POST(
      createRequest("/api/v1/campaigns", {
        method: "POST",
        body: {
          businessId,
          name: "Integration Test Campaign",
          actions: ["ggl_rv"],
          discountValue: 10,
          discountType: "pct",
          expiresInDays: 30,
        },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.campaign).toBeDefined();
    expect(data.data.campaign.name).toBe("Integration Test Campaign");
    expect(data.data.campaign.discountValue).toBe(10);
    expect(data.data.campaign.discountType).toBe("pct");
  });

  it("POST /campaigns — exceeding plan limit returns 403", async () => {
    // After creating 1 campaign above, free plan limit (1) is reached
    const res = await POST(
      createRequest("/api/v1/campaigns", {
        method: "POST",
        body: {
          businessId,
          name: "Over Limit Campaign",
          actions: ["ggl_rv"],
          discountValue: 5,
          discountType: "pct",
        },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(403);
    expect(data.success).toBe(false);
  });
});
