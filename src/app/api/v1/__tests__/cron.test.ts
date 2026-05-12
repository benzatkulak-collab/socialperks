/**
 * Integration tests for GET /api/v1/cron
 *
 * Auth via the `key` query param matched against CRON_SECRET (constant-time).
 * Verifies: missing secret -> 503, missing/bad key -> 401, valid key + valid
 * task -> 200, unknown task -> 400.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000, limit: 100 }),
  rateLimitHeaders: () => ({}),
}));

import { GET } from "../cron/route";
import { createRequest, parseResponse } from "./helpers";

const TEST_SECRET = "test-cron-secret-do-not-use-in-prod";

describe("Cron API", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("GET /cron — without CRON_SECRET env returns 503", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(
      createRequest("/api/v1/cron", { searchParams: { task: "cleanup-expired", key: "anything" } })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(503);
    expect(data.error.code).toBe("CRON_NOT_CONFIGURED");
  });

  it("GET /cron — without key returns 401", async () => {
    const res = await GET(
      createRequest("/api/v1/cron", { searchParams: { task: "cleanup-expired" } })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /cron — with wrong key returns 401", async () => {
    const res = await GET(
      createRequest("/api/v1/cron", {
        searchParams: { task: "cleanup-expired", key: "wrong-secret" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /cron — with valid key but no task returns 400", async () => {
    const res = await GET(
      createRequest("/api/v1/cron", { searchParams: { key: TEST_SECRET } })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.error.code).toBe("MISSING_TASK");
  });

  it("GET /cron — unknown task returns 400", async () => {
    const res = await GET(
      createRequest("/api/v1/cron", {
        searchParams: { task: "no-such-task", key: TEST_SECRET },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.error.code).toBe("UNKNOWN_TASK");
  });

  it("GET /cron — valid key + valid task returns 200 with task result", async () => {
    const res = await GET(
      createRequest("/api/v1/cron", {
        searchParams: { task: "cleanup-expired", key: TEST_SECRET },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.task).toBe("cleanup-expired");
    expect(data.data.ranAt).toBeDefined();
    expect(typeof data.data.durationMs).toBe("number");
    expect(typeof data.data.success).toBe("boolean");
    expect(data.data.result).toBeDefined();
    expect(typeof data.data.result.processed).toBe("number");
    expect(typeof data.data.result.succeeded).toBe("number");
    expect(typeof data.data.result.failed).toBe("number");
  });

  it("GET /cron — key comparison is length-safe (different-length wrong key still 401)", async () => {
    const res = await GET(
      createRequest("/api/v1/cron", {
        searchParams: { task: "cleanup-expired", key: "x" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });
});
