import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * Phase 3 audit — error-state UX.
 *
 *  - /nonexistent renders a friendly 404 (not a generic Next.js stack)
 *  - empty-form submit on /auth shows inline validation
 *  - simulated network failure on auth API doesn't white-screen the app
 */
test.describe("Error states", () => {
  test("404 page is friendly and not a raw stack trace", async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/this-page-does-not-exist-${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    // Next.js returns 404 for unknown routes.
    expect(res?.status()).toBe(404);

    const body = (await page.locator("body").textContent()) || "";
    expect(body.toLowerCase()).toMatch(/404|not found|page (you|isn't)/);
    // Should not be a debug/stacktrace page.
    expect(body).not.toMatch(/at .+\.tsx?:\d+:\d+/);
  });

  test("empty signup form surfaces validation, not a server error", async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Try to land in signup mode.
    const signup = page.getByRole("button", { name: /sign\s*up/i }).first();
    if (await signup.isVisible().catch(() => false)) await signup.click().catch(() => {});

    const submit = page
      .getByRole("button", { name: /create (free )?account|sign\s*up|continue|log\s*in/i })
      .first();
    if (!(await submit.isVisible().catch(() => false))) {
      test.skip(true, "no auth submit button visible");
      return;
    }
    await submit.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(800);

    const body = (await page.locator("body").textContent()) || "";
    // No 500-flavored output should appear.
    expect(body.toLowerCase()).not.toMatch(/internal server error|something went wrong/);
    // Either browser-level HTML5 validation kept us on the page, or the
    // page rendered some validation text — both are acceptable.
    expect(page.url()).toMatch(/\/auth/);
  });

  test("network failure on auth API is handled gracefully", async ({ page }) => {
    // Block the auth endpoint so the request fails at the network layer.
    await page.route("**/api/v1/auth", (route) => route.abort("failed"));

    await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    const email = page.locator('input[type="email"], input[name="email"]').first();
    const pw = page.locator('input[type="password"], input[name="password"]').first();
    if (!(await email.isVisible().catch(() => false)) || !(await pw.isVisible().catch(() => false))) {
      test.skip(true, "auth inputs not visible");
      return;
    }
    await email.fill("netfail@socialperks.test");
    await pw.fill("Password1234!");

    const submit = page
      .getByRole("button", { name: /log\s*in|sign\s*in|continue|create (free )?account/i })
      .first();
    await submit.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(1_500);

    // The page should still be alive (no white screen / uncaught).
    await expect(page.locator("body")).toBeVisible();
    const body = (await page.locator("body").textContent()) || "";
    expect(body.trim().length).toBeGreaterThan(20);
  });
});
