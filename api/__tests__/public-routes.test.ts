import { describe, it, expect } from "vitest";
import { app } from "../src/app.js";

describe("GET /v1/benchmarks", () => {
  it("returns benchmarks for valid businessType", async () => {
    const res = await app.request("/v1/benchmarks?businessType=yoga");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.benchmarks).toBeDefined();
    expect(body.data.benchmarks.businessType).toBe("yoga");
  });

  it("returns error for missing businessType", async () => {
    const res = await app.request("/v1/benchmarks");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_PARAM");
  });

  it("includes cache headers", async () => {
    const res = await app.request("/v1/benchmarks?businessType=yoga");
    expect(res.headers.get("cache-control")).toContain("max-age=1800");
  });
});

describe("GET /v1/actions", () => {
  it("returns actions list with pagination", async () => {
    const res = await app.request("/v1/actions");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.actions)).toBe(true);
    expect(body.data.pagination).toBeDefined();
    expect(body.data.pagination.total).toBeGreaterThan(0);
  });

  it("filters by platformId", async () => {
    const res = await app.request("/v1/actions?platformId=ig");
    const body = await res.json();
    expect(body.data.actions.every((a: Record<string, unknown>) => a.platformId === "ig")).toBe(true);
  });

  it("filters by maxEffort", async () => {
    const res = await app.request("/v1/actions?maxEffort=2");
    const body = await res.json();
    expect(body.data.actions.every((a: Record<string, unknown>) => (a.effort as number) <= 2)).toBe(true);
  });

  it("filters by action type", async () => {
    const res = await app.request("/v1/actions?type=review");
    const body = await res.json();
    expect(body.data.actions.every((a: Record<string, unknown>) => a.type === "review")).toBe(true);
  });

  it("paginates results", async () => {
    const res = await app.request("/v1/actions?perPage=5&page=1");
    const body = await res.json();
    expect(body.data.actions.length).toBeLessThanOrEqual(5);
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.perPage).toBe(5);
  });

  it("includes cache headers", async () => {
    const res = await app.request("/v1/actions");
    expect(res.headers.get("cache-control")).toContain("max-age=3600");
  });
});

describe("GET /v1/influencers", () => {
  it("returns influencer list", async () => {
    const res = await app.request("/v1/influencers");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.influencers)).toBe(true);
  });
});

describe("GET /v1/programs", () => {
  it("requires businessId parameter", async () => {
    const res = await app.request("/v1/programs");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_PARAM");
  });

  it("returns programs for businessId", async () => {
    const res = await app.request("/v1/programs?businessId=test-biz");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("programs");
  });
});

describe("GET /v1/campaigns", () => {
  it("returns campaigns list with pagination", async () => {
    const res = await app.request("/v1/campaigns");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("campaigns");
    expect(body.data).toHaveProperty("pagination");
  });
});

describe("GET /v1/submissions", () => {
  it("returns submissions list", async () => {
    const res = await app.request("/v1/submissions");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("submissions");
    expect(body.data).toHaveProperty("pagination");
  });

  it("rejects invalid status filter", async () => {
    const res = await app.request("/v1/submissions?status=invalid");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_STATUS");
  });
});
