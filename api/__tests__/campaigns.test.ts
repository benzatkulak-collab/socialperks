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

describe("POST /v1/campaigns", () => {
  it("creates campaign with valid data", async () => {
    const res = await post("/v1/campaigns", {
      businessId: "test",
      name: "Test Campaign",
      actions: ["ig_post"],
      discountValue: 10,
      discountType: "dol",
    }, "demo-token-test");
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Test Campaign");
    expect(body.data.status).toBe("active");
  });

  it("rejects missing required fields", async () => {
    const res = await post("/v1/campaigns", { businessId: "test", name: "No Actions" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_FIELDS");
  });

  it("rejects empty actions array", async () => {
    const res = await post("/v1/campaigns", {
      businessId: "test", name: "Empty Actions", actions: [],
      discountValue: 10, discountType: "dol",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_ACTIONS");
  });

  it("rejects negative discount value", async () => {
    const res = await post("/v1/campaigns", {
      businessId: "test", name: "Negative", actions: ["ig_post"],
      discountValue: -5, discountType: "dol",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_PERK");
  });

  it("rejects percentage over 100", async () => {
    const res = await post("/v1/campaigns", {
      businessId: "test", name: "Over 100", actions: ["ig_post"],
      discountValue: 150, discountType: "pct",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_PERK");
  });

  it("rejects invalid discount type", async () => {
    const res = await post("/v1/campaigns", {
      businessId: "test", name: "Bad Type", actions: ["ig_post"],
      discountValue: 10, discountType: "yen",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_DISCOUNT_TYPE");
  });

  it("requires authentication", async () => {
    const res = await app.request("/v1/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: "test", name: "No Auth", actions: ["ig_post"], discountValue: 10, discountType: "dol" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /v1/seed", () => {
  it("returns seed data in non-production", async () => {
    const res = await app.request("/v1/seed", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("businesses");
    expect(body.data).toHaveProperty("influencers");
  });
});
