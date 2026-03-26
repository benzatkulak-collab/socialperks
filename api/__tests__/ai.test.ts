import { describe, it, expect } from "vitest";
import { app } from "../src/app.js";

const post = (path: string, body: Record<string, unknown>, token = "demo-token-test") =>
  app.request(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

describe("POST /v1/ai/generate", () => {
  it("generates campaigns for valid business type", async () => {
    const res = await post("/v1/ai/generate", { businessType: "yoga studio", businessSize: "small" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.campaigns)).toBe(true);
    expect(body.data.campaigns.length).toBeGreaterThan(0);
    expect(body.data.meta.businessType).toBe("yoga studio");
  });

  it("rejects missing businessType", async () => {
    const res = await post("/v1/ai/generate", { businessSize: "small" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_BUSINESS_TYPE");
  });

  it("rejects empty businessType", async () => {
    const res = await post("/v1/ai/generate", { businessType: "  " });
    expect(res.status).toBe(400);
  });

  it("defaults to small business size", async () => {
    const res = await post("/v1/ai/generate", { businessType: "cafe" });
    const body = await res.json();
    expect(body.data.meta.businessSize).toBe("small");
  });

  it("requires authentication", async () => {
    const res = await app.request("/v1/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessType: "yoga" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /v1/ai/recommend", () => {
  it("returns recommendations for valid input", async () => {
    const res = await post("/v1/ai/recommend", { businessType: "restaurant", goals: ["reviews"] });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.recommendations)).toBe(true);
  });

  it("rejects missing businessType", async () => {
    const res = await post("/v1/ai/recommend", { goals: ["reviews"] });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_FIELD");
  });
});

describe("POST /v1/ai/quick-start", () => {
  it("returns single recommendation", async () => {
    const res = await post("/v1/ai/quick-start", { businessType: "bakery" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.recommendation).toBeDefined();
  });

  it("rejects missing businessType", async () => {
    const res = await post("/v1/ai/quick-start", {});
    expect(res.status).toBe(400);
  });
});

describe("POST /v1/ai/campaign-agent", () => {
  it("generates marketing plan", async () => {
    const res = await post("/v1/ai/campaign-agent", {
      businessId: "biz-1",
      name: "Test Yoga Studio",
      type: "Yoga Studio",
      size: "small",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.plan).toBeDefined();
    expect(body.data.plan.recommendations).toBeDefined();
  });

  it("rejects missing required fields", async () => {
    const res = await post("/v1/ai/campaign-agent", { businessId: "biz-1" });
    expect(res.status).toBe(400);
  });
});
