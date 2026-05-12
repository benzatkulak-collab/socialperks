import { test, expect, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

const iphone13 = devices["iPhone 13"];

/**
 * Phase 3 audit — mobile responsive homepage.
 *
 * Uses the iPhone 13 device profile. Asserts:
 *  - the page renders
 *  - no horizontal scroll (document width fits viewport)
 *  - a mobile menu opens if there's a hamburger
 *  - email input is usable (focusable + accepts input)
 */
test.use({ ...iphone13 });

test.describe("Mobile responsive", () => {
  test("homepage fits viewport and has no horizontal scroll", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15_000 });

    const { docWidth, vpWidth } = await page.evaluate(() => ({
      docWidth: document.documentElement.scrollWidth,
      vpWidth: window.innerWidth,
    }));
    // Allow 2px margin for sub-pixel rendering quirks.
    expect(docWidth, `doc width ${docWidth} vs viewport ${vpWidth}`).toBeLessThanOrEqual(vpWidth + 2);
  });

  test("mobile menu opens when hamburger is tapped", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const hamburger = page
      .getByRole("button", { name: /menu|open menu|navigation/i })
      .or(page.locator('button[aria-label*="menu" i]'))
      .first();
    if (!(await hamburger.isVisible().catch(() => false))) {
      test.skip(true, "no mobile hamburger button present");
      return;
    }
    await hamburger.tap();
    await page.waitForTimeout(400);
    // After opening, there should be at least one nav link visible.
    const link = page.locator('nav a, [role="dialog"] a').first();
    await expect(link).toBeVisible({ timeout: 5_000 });
  });

  test("forms accept input on mobile", async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const email = page.locator('input[type="email"], input[name="email"]').first();
    if (!(await email.isVisible().catch(() => false))) {
      test.skip(true, "auth email input not visible");
      return;
    }
    await email.tap();
    await email.fill("mobile-test@socialperks.test");
    await expect(email).toHaveValue("mobile-test@socialperks.test");
  });
});
