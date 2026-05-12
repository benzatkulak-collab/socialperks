import { test, expect } from "@playwright/test";

/**
 * Smoke tests — the "is the site up?" suite. Mirrors scripts/smoke-test.sh
 * but runs inside Playwright so it can use the dev server config from
 * playwright.config.ts. Useful for local CI and as a Playwright-only
 * regression check.
 */
test.describe("Smoke", () => {
  test("homepage returns 200", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
  });

  test("/upgrade page returns 200", async ({ page }) => {
    const res = await page.goto("/upgrade");
    expect(res?.status()).toBe(200);
  });

  test("/auth page returns 200", async ({ page }) => {
    const res = await page.goto("/auth");
    expect(res?.status()).toBe(200);
  });

  test("/api/v1/health returns success", async ({ request }) => {
    const res = await request.get("/api/v1/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(["ok", "degraded"]).toContain(body.data.status);
  });

  test("auth signup accepts a new account", async ({ request }) => {
    const email = `smoke-${Date.now()}@example.com`;
    const res = await request.post("/api/v1/auth", {
      data: { action: "signup", email, password: "SmokeTest123!", name: "Smoke" },
    });
    // Accept 200/201 (success) — anything else means signup is broken.
    expect([200, 201]).toContain(res.status());
  });

  test("billing checkout requires auth", async ({ request }) => {
    const res = await request.post("/api/v1/billing/checkout", {
      data: { plan: "pro", interval: "monthly" },
    });
    expect(res.status()).toBe(401);
  });

  test("cron without key is rejected", async ({ request }) => {
    const res = await request.get("/api/v1/cron?task=cleanup-expired");
    // 401 when CRON_SECRET is set, 503 when not configured. Both are correct
    // — the route should never return 200 without a key.
    expect([401, 503]).toContain(res.status());
  });
});
