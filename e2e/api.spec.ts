import { test, expect } from "@playwright/test";

test.describe("API Endpoints", () => {
  test.describe("Health", () => {
    test("GET /api/v1/health returns 200 with status ok", async ({ request }) => {
      const res = await request.get("/api/v1/health");
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("ok");
      expect(body.data.uptime).toBeGreaterThan(0);
      expect(body.data.node).toBeDefined();
      expect(body.data.memory).toBeDefined();
      expect(body.data.memory.heapUsedMB).toBeGreaterThan(0);
    });
  });

  test.describe("Authentication API", () => {
    test("POST /api/v1/auth login with demo business credentials returns user", async ({ request }) => {
      const res = await request.post("/api/v1/auth", {
        data: { action: "login", email: "yoga@demo.com", pin: "1234" },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user).toBeDefined();
      expect(body.data.user.email).toBe("yoga@demo.com");
      expect(body.data.user.role).toMatch(/business|enterprise/);
      expect(body.data.token).toBeDefined();
      expect(body.data.accessToken).toBeDefined();
    });

    test("POST /api/v1/auth login with demo influencer credentials returns user", async ({ request }) => {
      const res = await request.post("/api/v1/auth", {
        data: { action: "login", email: "priya@demo.com", pin: "1234" },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe("priya@demo.com");
      expect(body.data.user.role).toBe("influencer");
      expect(body.data.influencer).toBeDefined();
    });

    test("POST /api/v1/auth login with wrong credentials returns 401", async ({ request }) => {
      const res = await request.post("/api/v1/auth", {
        data: { action: "login", email: "wrong@email.com", password: "wrongpass" },
      });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    test("POST /api/v1/auth login without email returns error", async ({ request }) => {
      const res = await request.post("/api/v1/auth", {
        data: { action: "login", password: "1234" },
      });
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("MISSING_CREDENTIALS");
    });

    test("POST /api/v1/auth signup creates new user", async ({ request }) => {
      const uniqueEmail = `e2e-test-${Date.now()}@example.com`;
      const res = await request.post("/api/v1/auth", {
        data: {
          action: "signup",
          email: uniqueEmail,
          password: "securepass123",
          name: "E2E Test User",
          role: "business",
        },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe(uniqueEmail);
      expect(body.data.token).toBeDefined();
    });

    test("POST /api/v1/auth signup with short password returns error", async ({ request }) => {
      const res = await request.post("/api/v1/auth", {
        data: {
          action: "signup",
          email: `test-${Date.now()}@example.com`,
          password: "short",
          name: "Test",
        },
      });
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("WEAK_PASSWORD");
    });

    test("POST /api/v1/auth logout succeeds", async ({ request }) => {
      // First login to get a session
      const loginRes = await request.post("/api/v1/auth", {
        data: { action: "login", email: "yoga@demo.com", pin: "1234" },
      });
      const loginBody = await loginRes.json();
      const token = loginBody.data.accessToken;

      // Now logout
      const res = await request.post("/api/v1/auth", {
        headers: { Authorization: `Bearer ${token}` },
        data: { action: "logout" },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    test("GET /api/v1/auth without token returns 401", async ({ request }) => {
      const res = await request.get("/api/v1/auth");
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    test("GET /api/v1/auth with valid token returns user", async ({ request }) => {
      // Login first
      const loginRes = await request.post("/api/v1/auth", {
        data: { action: "login", email: "yoga@demo.com", pin: "1234" },
      });
      const loginBody = await loginRes.json();
      const token = loginBody.data.accessToken;

      // Validate session
      const res = await request.get("/api/v1/auth", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe("yoga@demo.com");
    });
  });

  test.describe("Campaigns API", () => {
    test("GET /api/v1/campaigns returns campaign list", async ({ request }) => {
      const res = await request.get("/api/v1/campaigns");
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.campaigns).toBeDefined();
      expect(Array.isArray(body.data.campaigns)).toBe(true);
      expect(body.data.total).toBeDefined();
      expect(body.data.page).toBeDefined();
    });

    test("POST /api/v1/campaigns requires authentication", async ({ request }) => {
      const res = await request.post("/api/v1/campaigns", {
        data: {
          businessId: "biz_test",
          name: "Test Campaign",
          actions: ["ggl_rv"],
          discountValue: 15,
          discountType: "pct",
        },
      });
      expect(res.status()).toBe(401);
    });

    test("POST /api/v1/campaigns creates campaign with auth", async ({ request }) => {
      // Login first
      const loginRes = await request.post("/api/v1/auth", {
        data: { action: "login", email: "yoga@demo.com", pin: "1234" },
      });
      const loginBody = await loginRes.json();
      const token = loginBody.data.accessToken;

      const res = await request.post("/api/v1/campaigns", {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          businessId: loginBody.data.user.businessId ?? loginBody.data.user.id,
          name: "E2E Test Campaign",
          description: "Created by E2E test",
          actions: ["ggl_rv"],
          discountValue: 10,
          discountType: "pct",
          expiresInDays: 30,
        },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.campaign).toBeDefined();
      expect(body.data.campaign.name).toBe("E2E Test Campaign");
    });

    test("GET /api/v1/campaigns supports state filter", async ({ request }) => {
      const res = await request.get("/api/v1/campaigns?state=active");
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.campaigns)).toBe(true);
    });
  });

  test.describe("Protected Endpoints", () => {
    test("POST /api/v1/ai/generate requires auth", async ({ request }) => {
      const res = await request.post("/api/v1/ai/generate", {
        data: { businessType: "yoga studio" },
      });
      expect(res.status()).toBe(401);
    });

    test("POST /api/v1/submissions requires auth", async ({ request }) => {
      const res = await request.post("/api/v1/submissions", {
        data: {
          campaignId: "test",
          userId: "test",
          actionId: "ggl_rv",
          proofUrl: "https://example.com",
        },
      });
      expect(res.status()).toBe(401);
    });

    test("POST /api/v1/billing requires auth", async ({ request }) => {
      const res = await request.post("/api/v1/billing", {
        data: { action: "subscribe", plan: "pro" },
      });
      expect(res.status()).toBe(401);
    });
  });

  test.describe("Public Reference Endpoints", () => {
    test("GET /api/v1/actions returns action library", async ({ request }) => {
      const res = await request.get("/api/v1/actions");
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    test("GET /api/v1/benchmarks returns benchmarks", async ({ request }) => {
      const res = await request.get("/api/v1/benchmarks?businessType=yoga");
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    test("GET /api/v1/pricing returns pricing data", async ({ request }) => {
      const res = await request.get("/api/v1/pricing");
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  test.describe("Response Headers", () => {
    test("API responses include request ID header", async ({ request }) => {
      const res = await request.get("/api/v1/health");
      const requestId = res.headers()["x-request-id"];
      expect(requestId).toBeDefined();
    });

    test("API responses include response time header", async ({ request }) => {
      const res = await request.get("/api/v1/health");
      const responseTime = res.headers()["x-response-time"];
      expect(responseTime).toBeDefined();
    });
  });
});
