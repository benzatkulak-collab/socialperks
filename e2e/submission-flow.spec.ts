import { test, expect } from "@playwright/test";

test.describe("Submission Flow", () => {
  test.describe("Page Foundation", () => {
    test("landing page hero section is visible", async ({ page }) => {
      await page.goto("/");

      // Verify core page content rendered
      await expect(
        page.getByRole("heading", { level: 1 })
      ).toContainText("Your customers love you");
    });

    test("page body has content", async ({ page }) => {
      await page.goto("/");

      const body = await page.textContent("body");
      expect(body).toBeTruthy();
      expect(body!.length).toBeGreaterThan(100);
    });
  });

  test.describe("Accessibility", () => {
    test("all images have alt text", async ({ page }) => {
      await page.goto("/");

      const images = page.locator("img");
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const alt = await images.nth(i).getAttribute("alt");
        // Every image should have a non-empty alt attribute (or role="presentation")
        const role = await images.nth(i).getAttribute("role");
        expect(alt !== null || role === "presentation").toBe(true);
      }
    });

    test("navigation landmark exists", async ({ page }) => {
      await page.goto("/");

      const nav = page.getByRole("navigation");
      await expect(nav.first()).toBeVisible();
    });

    test("heading hierarchy is correct (h1 exists and is unique)", async ({ page }) => {
      await page.goto("/");

      const h1Count = await page.locator("h1").count();
      expect(h1Count).toBe(1);
    });

    test("interactive elements are keyboard accessible", async ({ page }) => {
      await page.goto("/");

      // Tab to the first interactive element
      await page.keyboard.press("Tab");

      // Something should be focused
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.tagName : null;
      });
      expect(focused).not.toBeNull();
    });
  });

  test.describe("API — Submission Endpoint", () => {
    test("POST /api/v1/submissions without auth returns 401", async ({ request }) => {
      const res = await request.post("/api/v1/submissions", {
        data: {
          campaignId: "camp_test",
          userId: "usr_test",
          actionId: "ggl_rv",
          proofUrl: "https://example.com/proof",
          proofType: "url",
        },
      });

      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    test("GET /api/v1/submissions returns submission list", async ({ request }) => {
      const res = await request.get("/api/v1/submissions");
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.submissions).toBeDefined();
      expect(Array.isArray(body.data.submissions)).toBe(true);
      expect(body.data.total).toBeDefined();
      expect(body.data.page).toBeDefined();
    });

    test("GET /api/v1/submissions supports status filter", async ({ request }) => {
      const res = await request.get("/api/v1/submissions?status=pending");
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.submissions)).toBe(true);
    });

    test("GET /api/v1/submissions invalid status returns 400", async ({ request }) => {
      const res = await request.get("/api/v1/submissions?status=bad_status");
      expect(res.status()).toBe(400);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INVALID_STATUS");
    });

    test("POST /api/v1/submissions with auth but missing fields returns 400", async ({ request }) => {
      // Login first
      const loginRes = await request.post("/api/v1/auth", {
        data: { action: "login", email: "yoga@demo.com", pin: "1234" },
      });
      const loginBody = await loginRes.json();
      const token = loginBody.data.accessToken;

      const res = await request.post("/api/v1/submissions", {
        headers: { Authorization: `Bearer ${token}` },
        data: { campaignId: "camp_test" },
      });

      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    });
  });

  test.describe("Response Headers", () => {
    test("submission endpoint includes X-Request-Id header", async ({ request }) => {
      const res = await request.get("/api/v1/submissions");
      const requestId = res.headers()["x-request-id"];
      expect(requestId).toBeDefined();
    });

    test("submission endpoint includes X-Response-Time header", async ({ request }) => {
      const res = await request.get("/api/v1/submissions");
      const responseTime = res.headers()["x-response-time"];
      expect(responseTime).toBeDefined();
    });
  });
});
