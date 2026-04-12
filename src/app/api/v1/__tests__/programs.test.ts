/**
 * Integration tests for /api/v1/programs
 *
 * GET  — List programs (requires businessId query param)
 * POST — Create program (requires auth)
 */

import { describe, it, expect, beforeAll, vi } from "vitest";

// Disable rate limiting so tests are not throttled
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000, limit: 100 }),
  rateLimitHeaders: () => ({}),
}));

import { GET, POST } from "../programs/route";
import { POST as authPost } from "../auth/route";
import { createRequest, parseResponse, authHeaders } from "./helpers";

describe("Programs API", () => {
  let token: string;
  let userId: string;
  let businessId: string;

  beforeAll(async () => {
    const email = `programs-test-${Date.now()}@example.com`;
    const res = await authPost(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: {
          action: "signup",
          email,
          password: "TestPass123!",
          name: "Programs Tester",
          role: "business",
        },
      })
    );
    const data = await res.json();
    token = data.data?.accessToken || "";
    userId = data.data?.user?.id || "";
    businessId = data.data?.user?.businessId || userId;
  });

  // ── GET ────────────────────────────────────────────────────────────────────

  it("GET /programs — requires businessId query param", async () => {
    const res = await GET(createRequest("/api/v1/programs"));
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("MISSING_BUSINESS_ID");
  });

  it("GET /programs — lists programs for businessId", async () => {
    const res = await GET(
      createRequest("/api/v1/programs", {
        searchParams: { businessId },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data.programs)).toBe(true);
    expect(data.data.pagination).toBeDefined();
    expect(typeof data.data.pagination.page).toBe("number");
    expect(typeof data.data.pagination.total).toBe("number");
  });

  // ── POST ───────────────────────────────────────────────────────────────────

  it("POST /programs — without auth returns 401", async () => {
    const res = await POST(
      createRequest("/api/v1/programs", {
        method: "POST",
        body: {
          businessId,
          name: "Test Program",
        },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it("POST /programs — missing name returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/programs", {
        method: "POST",
        body: { businessId },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("MISSING_NAME");
  });

  it("POST /programs — creates program with valid data", async () => {
    const res = await POST(
      createRequest("/api/v1/programs", {
        method: "POST",
        body: {
          businessId,
          name: "Loyalty Program",
          description: "Earn perks for social media actions",
          cycle: "monthly",
        },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.program).toBeDefined();
    expect(data.data.program.name).toBe("Loyalty Program");
    expect(data.data.program.status).toBe("active");
    expect(data.data.program.businessId).toBe(businessId);
  });
});
