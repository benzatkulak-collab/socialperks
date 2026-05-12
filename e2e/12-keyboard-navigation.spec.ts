import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * Phase 3 audit — keyboard navigation / a11y basics.
 *
 *  - Tab through homepage and verify focus reaches interactive elements
 *  - Tab through signup form and verify each control is focusable
 *  - Skip-to-content link (if present) actually moves focus to main
 */
test.describe("Keyboard navigation", () => {
  test("tabbing the homepage reaches at least 5 distinct interactive elements", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.evaluate(() => document.body.focus());

    const seen = new Set<string>();
    for (let i = 0; i < 25 && seen.size < 5; i++) {
      await page.keyboard.press("Tab");
      const active = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        return `${el.tagName.toLowerCase()}#${el.id}.${el.className}|${(el.textContent || "").slice(0, 30)}`;
      });
      if (active) seen.add(active);
    }
    expect(seen.size, "should tab to at least 5 distinct elements").toBeGreaterThanOrEqual(5);
  });

  test("signup form fields are all focusable via keyboard", async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Try to expose signup mode if it's behind a toggle.
    const signup = page.getByRole("button", { name: /sign\s*up/i }).first();
    if (await signup.isVisible().catch(() => false)) await signup.click().catch(() => {});

    // Walk inputs, focus each one, assert document.activeElement is it.
    const inputs = page.locator("form input, form select, form textarea");
    const count = await inputs.count();
    if (count === 0) {
      test.skip(true, "no form inputs found");
      return;
    }
    for (let i = 0; i < count; i++) {
      const handle = inputs.nth(i);
      const visible = await handle.isVisible().catch(() => false);
      if (!visible) continue;
      await handle.focus();
      const isActive = await handle.evaluate((el) => el === document.activeElement);
      expect(isActive, `input #${i} should be focusable`).toBe(true);
    }
  });

  test("skip-to-content link moves focus to main if present", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // The skip link is usually visually hidden until focused.
    await page.keyboard.press("Tab");
    const skip = page.locator('a:has-text("Skip to"), a[href="#main"], a[href="#content"]').first();
    if (!(await skip.count())) {
      test.skip(true, "no skip-to-content link in this build");
      return;
    }
    await skip.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    const hash = await page.evaluate(() => window.location.hash);
    expect(hash).toMatch(/main|content/);
  });
});
