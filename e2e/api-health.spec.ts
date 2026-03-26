import { test, expect } from "@playwright/test";

test.describe("API Health (via proxy)", () => {
  test("health endpoint returns 200", async ({ request }) => {
    const res = await request.get("/api/v1/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("healthy");
  });

  test("benchmarks endpoint returns data", async ({ request }) => {
    const res = await request.get("/api/v1/benchmarks?businessType=yoga");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.benchmarks).toBeDefined();
  });

  test("auth login works via API", async ({ request }) => {
    const res = await request.post("/api/v1/auth", {
      data: { action: "login", email: "yoga@demo.com", pin: "1234" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe("yoga@demo.com");
  });

  test("AI generate works with auth", async ({ request }) => {
    const res = await request.post("/api/v1/ai/generate", {
      headers: { Authorization: "Bearer demo-token-test" },
      data: { businessType: "yoga studio", businessSize: "small" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.campaigns.length).toBeGreaterThan(0);
  });

  test("unauthenticated AI request returns 401", async ({ request }) => {
    const res = await request.post("/api/v1/ai/generate", {
      data: { businessType: "yoga" },
    });
    expect(res.status()).toBe(401);
  });
});
