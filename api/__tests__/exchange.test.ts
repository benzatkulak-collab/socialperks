import { describe, it, expect } from "vitest";
import { app } from "../src/app.js";

const authed = (path: string, opts: RequestInit = {}) =>
  app.request(path, { ...opts, headers: { ...opts.headers as Record<string, string>, Authorization: "Bearer demo-token-test" } });

const post = (path: string, body: Record<string, unknown>) =>
  authed(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("GET /v1/exchange/opportunities", () => {
  it("returns opportunities without auth", async () => {
    const res = await app.request("/v1/exchange/opportunities");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("opportunities");
  });
});

describe("GET /v1/exchange/market", () => {
  it("returns market data without auth", async () => {
    const res = await app.request("/v1/exchange/market");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("includes cache headers", async () => {
    const res = await app.request("/v1/exchange/market");
    expect(res.headers.get("cache-control")).toContain("max-age");
  });
});

describe("POST /v1/exchange/orders", () => {
  it("requires authentication", async () => {
    const res = await app.request("/v1/exchange/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side: "buy", actionId: "ig_post", platformId: "ig", price: 5, quantity: 10 }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects invalid side", async () => {
    const res = await post("/v1/exchange/orders", { side: "hold", actionId: "ig_post", platformId: "ig", price: 5, quantity: 10 });
    expect(res.status).toBe(400);
  });

  it("rejects missing actionId", async () => {
    const res = await post("/v1/exchange/orders", { side: "buy", platformId: "ig", price: 5, quantity: 10 });
    expect(res.status).toBe(400);
  });

  it("rejects negative price", async () => {
    const res = await post("/v1/exchange/orders", { side: "buy", actionId: "ig_post", platformId: "ig", price: -1, quantity: 10 });
    expect(res.status).toBe(400);
  });
});

describe("POST /v1/exchange/enroll", () => {
  it("requires platforms array", async () => {
    const res = await post("/v1/exchange/enroll", { niches: ["fitness"] });
    expect(res.status).toBe(400);
  });

  it("requires niches array", async () => {
    const res = await post("/v1/exchange/enroll", { platforms: ["ig"] });
    expect(res.status).toBe(400);
  });
});
