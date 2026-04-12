/**
 * Integration tests for /api/v1/batch
 *
 * POST — Bulk operations for campaigns and submissions (requires auth + CSRF)
 */

import { describe, it, expect, beforeAll, vi } from "vitest";

// Disable rate limiting so tests are not throttled
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000, limit: 100 }),
  rateLimitHeaders: () => ({}),
}));

import { POST } from "../batch/route";
import { POST as authPost } from "../auth/route";
import { createRequest, parseResponse, authHeaders } from "./helpers";

describe("Batch API", () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const email = `batch-test-${Date.now()}@example.com`;
    const res = await authPost(
      createRequest("/api/v1/auth", {
        method: "POST",
        body: {
          action: "signup",
          email,
          password: "TestPass123!",
          name: "Batch Tester",
          role: "business",
        },
      })
    );
    const data = await res.json();
    token = data.data?.accessToken || "";
    userId = data.data?.user?.id || "";
  });

  // ── Auth required ──────────────────────────────────────────────────────────

  it("POST /batch — without auth returns 401", async () => {
    const res = await POST(
      createRequest("/api/v1/batch", {
        method: "POST",
        body: {
          action: "bulk-approve-submissions",
          ids: ["sub_001"],
        },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(401);
    expect(data.success).toBe(false);
  });

  // ── Validation: missing action ──────────────────────────────────────────────

  it("POST /batch — missing action field returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/batch", {
        method: "POST",
        body: { ids: ["sub_001"] },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INVALID_ACTION");
  });

  // ── Validation: invalid action ──────────────────────────────────────────────

  it("POST /batch — invalid action returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/batch", {
        method: "POST",
        body: { action: "not-a-real-action", ids: ["sub_001"] },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INVALID_ACTION");
  });

  // ── Validation: missing ids ─────────────────────────────────────────────────

  it("POST /batch — missing ids array returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/batch", {
        method: "POST",
        body: { action: "bulk-approve-submissions" },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INVALID_IDS");
  });

  // ── Validation: empty ids ───────────────────────────────────────────────────

  it("POST /batch — empty ids array returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/batch", {
        method: "POST",
        body: { action: "bulk-approve-submissions", ids: [] },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("EMPTY_IDS");
  });

  // ── Validation: batch too large ─────────────────────────────────────────────

  it("POST /batch — batch too large (>100 items) returns 400", async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `sub_${String(i).padStart(3, "0")}`);
    const res = await POST(
      createRequest("/api/v1/batch", {
        method: "POST",
        body: { action: "bulk-approve-submissions", ids },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("BATCH_TOO_LARGE");
  });

  // ── Bulk approve with valid IDs ─────────────────────────────────────────────

  it("POST /batch — bulk-approve-submissions with valid IDs returns result", async () => {
    const res = await POST(
      createRequest("/api/v1/batch", {
        method: "POST",
        body: {
          action: "bulk-approve-submissions",
          ids: ["sub_nonexistent_001", "sub_nonexistent_002"],
        },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(typeof data.data.total).toBe("number");
    expect(typeof data.data.successCount).toBe("number");
    expect(typeof data.data.failedCount).toBe("number");
    expect(Array.isArray(data.data.succeeded)).toBe(true);
    expect(Array.isArray(data.data.failed)).toBe(true);
    // Non-existent submissions should show up as failures
    expect(data.data.failedCount).toBe(2);
  });

  // ── Bulk reject requires reason ─────────────────────────────────────────────

  it("POST /batch — bulk-reject-submissions without reason returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/batch", {
        method: "POST",
        body: {
          action: "bulk-reject-submissions",
          ids: ["sub_001"],
        },
        headers: authHeaders(token, userId),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("REASON_REQUIRED");
  });
});
