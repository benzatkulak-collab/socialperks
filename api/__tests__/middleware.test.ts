import { describe, it, expect } from "vitest";
import { app } from "../src/app.js";

describe("Tracing middleware", () => {
  it("adds X-Request-Id header", async () => {
    const res = await app.request("/v1/health");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("adds X-Response-Time header", async () => {
    const res = await app.request("/v1/health");
    expect(res.headers.get("x-response-time")).toMatch(/\d+ms/);
  });

  it("generates unique request IDs", async () => {
    const res1 = await app.request("/v1/health");
    const res2 = await app.request("/v1/health");
    expect(res1.headers.get("x-request-id")).not.toBe(res2.headers.get("x-request-id"));
  });
});

describe("Auth middleware", () => {
  it("rejects requests without auth on protected routes", async () => {
    const res = await app.request("/v1/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessType: "test" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("accepts demo token in non-production", async () => {
    const res = await app.request("/v1/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer demo-token-mybiz" },
      body: JSON.stringify({ businessType: "yoga" }),
    });
    expect(res.status).toBe(200);
  });

  it("accepts API key with sk_ prefix", async () => {
    const res = await app.request("/v1/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": "sk_test_longkey123" },
      body: JSON.stringify({ businessType: "yoga" }),
    });
    expect(res.status).toBe(200);
  });

  it("rejects short API keys", async () => {
    const res = await app.request("/v1/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": "sk_ab" },
      body: JSON.stringify({ businessType: "yoga" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("CORS", () => {
  it("returns CORS headers on preflight", async () => {
    const res = await app.request("/v1/health", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:3000" },
    });
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
  });
});

describe("404 handling", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await app.request("/v1/nonexistent");
    expect(res.status).toBe(404);
  });
});
