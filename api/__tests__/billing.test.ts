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

describe("POST /v1/billing — create_checkout", () => {
  it("creates checkout session for valid plan", async () => {
    const res = await post("/v1/billing", { action: "create_checkout", plan: "starter", billingPeriod: "monthly" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.session).toBeDefined();
    expect(body.data.session.url).toContain("checkout.stripe.com");
  });

  it("rejects invalid plan", async () => {
    const res = await post("/v1/billing", { action: "create_checkout", plan: "nonexistent" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_PLAN");
  });

  it("rejects invalid billing period", async () => {
    const res = await post("/v1/billing", { action: "create_checkout", plan: "starter", billingPeriod: "weekly" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_PERIOD");
  });
});

describe("POST /v1/billing — get_subscription", () => {
  it("returns free tier when no subscription exists", async () => {
    const res = await post("/v1/billing", { action: "get_subscription", businessId: "no-sub-biz" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.subscription).toBeNull();
    expect(body.data.plan).toBe("free");
  });
});

describe("POST /v1/billing — create_portal", () => {
  it("creates portal session", async () => {
    const res = await post("/v1/billing", { action: "create_portal" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.portalSession).toBeDefined();
    expect(body.data.portalSession.url).toContain("billing.stripe.com");
  });
});

describe("POST /v1/billing — invalid action", () => {
  it("rejects unknown action", async () => {
    const res = await post("/v1/billing", { action: "destroy_everything" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_ACTION");
  });
});

describe("POST /v1/billing — auth required", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await app.request("/v1/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_subscription" }),
    });
    expect(res.status).toBe(401);
  });
});
