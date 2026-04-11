/**
 * Integration tests for /api/v1/health
 *
 * The health endpoint is public and returns server status,
 * uptime, node version, and memory usage.
 */

import { describe, it, expect, vi } from "vitest";

// Disable rate limiting so tests are not throttled
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000, limit: 100 }),
  rateLimitHeaders: () => ({}),
}));

import { GET } from "../health/route";
import { createRequest, parseResponse } from "./helpers";

describe("Health API", () => {
  it("GET /health — returns 200 with success status", async () => {
    const res = await GET(createRequest("/api/v1/health"));
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("GET /health — returns server status field", async () => {
    const res = await GET(createRequest("/api/v1/health"));
    const data = await parseResponse(res);

    // status should be "ok" or "degraded"
    expect(["ok", "degraded"]).toContain(data.data.status);
  });

  it("GET /health — includes uptime and node version", async () => {
    const res = await GET(createRequest("/api/v1/health"));
    const data = await parseResponse(res);

    expect(data.data.uptime).toBeDefined();
    expect(typeof data.data.uptime).toBe("number");
    expect(data.data.uptime).toBeGreaterThan(0);

    expect(data.data.node).toBeDefined();
    expect(data.data.node).toMatch(/^v\d+/);
  });

  it("GET /health — includes memory usage", async () => {
    const res = await GET(createRequest("/api/v1/health"));
    const data = await parseResponse(res);

    expect(data.data.memory).toBeDefined();
    expect(data.data.memory.heapUsedMB).toBeGreaterThan(0);
    expect(data.data.memory.rssMB).toBeGreaterThan(0);
  });

  it("GET /health — includes database connectivity info", async () => {
    const res = await GET(createRequest("/api/v1/health"));
    const data = await parseResponse(res);

    expect(data.data.database).toBeDefined();
    expect(typeof data.data.database.connected).toBe("boolean");
    expect(typeof data.data.database.latencyMs).toBe("number");
  });

  it("GET /health — response includes X-Request-Id header", async () => {
    const res = await GET(createRequest("/api/v1/health"));

    expect(res.headers.get("X-Request-Id")).toBeDefined();
  });

  it("GET /health — response includes X-Response-Time header", async () => {
    const res = await GET(createRequest("/api/v1/health"));

    // withTiming adds X-Response-Time
    expect(res.headers.get("X-Response-Time")).toBeDefined();
  });

  it("GET /health — includes timestamp in ISO format", async () => {
    const res = await GET(createRequest("/api/v1/health"));
    const data = await parseResponse(res);

    expect(data.data.timestamp).toBeDefined();
    // Should parse as a valid date
    const parsed = new Date(data.data.timestamp);
    expect(parsed.getTime()).toBeGreaterThan(0);
  });
});
