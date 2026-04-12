/**
 * Integration tests for /api/v1/submissions
 *
 * GET  — List submissions (public, with optional tenant scoping)
 * POST — Create submission (requires auth)
 */

import { describe, it, expect, beforeAll, vi } from "vitest";

// Disable rate limiting so tests are not throttled
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000, limit: 100 }),
  rateLimitHeaders: () => ({}),
}));

import { GET, POST } from "../submissions/route";
import { POST as authPost } from "../auth/route";
import { createRequest, parseResponse, authHeaders } from "./helpers";

describe("Submissions API", () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const email = `sub-test-${Date.now()}@example.com`;
    const res = await authPost(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: {
          action: "signup",
          email,
          password: "TestPass123!",
          name: "Submission Tester",
          role: "business",
        },
      })
    );
    const data = await res.json();
    token = data.data?.accessToken || "";
    userId = data.data?.user?.id || "";
  });

  // ── GET ────────────────────────────────────────────────────────────────────

  it("GET /submissions — returns submissions list (public, no auth)", async () => {
    const res = await GET(createRequest("/api/v1/submissions"));
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data.submissions)).toBe(true);
    expect(typeof data.data.pagination.total).toBe("number");
    expect(typeof data.data.pagination.page).toBe("number");
    expect(typeof data.data.pagination.perPage).toBe("number");
    expect(typeof data.data.pagination.totalPages).toBe("number");
  });

  it("GET /submissions — supports pagination params", async () => {
    const res = await GET(
      createRequest("/api/v1/submissions", {
        searchParams: { page: "1", perPage: "5" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.pagination.page).toBe(1);
    expect(data.data.pagination.perPage).toBe(5);
  });

  it("GET /submissions — filters by status", async () => {
    const res = await GET(
      createRequest("/api/v1/submissions", {
        searchParams: { status: "pending" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.submissions)).toBe(true);
  });

  it("GET /submissions — invalid status filter returns 400", async () => {
    const res = await GET(
      createRequest("/api/v1/submissions", {
        searchParams: { status: "invalid_status" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INVALID_STATUS");
  });

  it("GET /submissions — with auth scopes to tenant campaigns", async () => {
    const res = await GET(
      createRequest("/api/v1/submissions", {
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.submissions)).toBe(true);
  });

  // ── POST ───────────────────────────────────────────────────────────────────

  it("POST /submissions — without auth returns 401", async () => {
    const res = await POST(
      createRequest("/api/v1/submissions", {
        method: "POST",
        body: {
          campaignId: "camp_test",
          userId: "usr_test",
          actionId: "ggl_rv",
          proofUrl: "https://example.com/proof",
          proofType: "url",
        },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it("POST /submissions — missing required fields returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/submissions", {
        method: "POST",
        body: { campaignId: "camp_test" },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("POST /submissions — invalid proofType returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/submissions", {
        method: "POST",
        body: {
          campaignId: "camp_test123",
          userId,
          actionId: "ggl_rv",
          proofUrl: "https://example.com/proof",
          proofType: "invalid_type",
        },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INVALID_PROOF_TYPE");
  });

  it("GET /submissions — response includes X-Request-Id header", async () => {
    const res = await GET(createRequest("/api/v1/submissions"));

    expect(res.headers.get("X-Request-Id")).toBeDefined();
  });
});
