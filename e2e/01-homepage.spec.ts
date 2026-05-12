import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * Phase 3 audit — homepage critical-path E2E.
 *
 * Validates the public landing page renders, has a hero, has at least one
 * primary CTA, and that the global nav + activity ticker don't crash the
 * page on initial paint.
 */
test.describe("Homepage", () => {
  test("loads and renders hero + CTAs without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const res = await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    expect(res?.status(), "homepage should return 2xx").toBeLessThan(400);

    // Hero — at least one large heading on the page.
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible({ timeout: 15_000 });
    const headingText = (await heading.textContent())?.trim() ?? "";
    expect(headingText.length).toBeGreaterThan(3);

    // At least one CTA — match common labels used on the landing page.
    const ctaCandidates = [
      page.getByRole("link", { name: /sign\s*up/i }).first(),
      page.getByRole("button", { name: /sign\s*up/i }).first(),
      page.getByRole("link", { name: /get started/i }).first(),
      page.getByRole("link", { name: /start free/i }).first(),
      page.getByRole("link", { name: /try (it )?free/i }).first(),
      page.getByRole("link", { name: /pricing/i }).first(),
    ];
    let ctaVisible = false;
    for (const c of ctaCandidates) {
      if (await c.isVisible().catch(() => false)) {
        ctaVisible = true;
        break;
      }
    }
    expect(ctaVisible, "at least one CTA should be visible").toBe(true);

    // No uncaught JS errors that would white-screen the page.
    const fatal = consoleErrors.filter(
      (e) => !/favicon|manifest|sourcemap|chrome-extension/i.test(e)
    );
    expect(fatal, `console errors: ${fatal.join("\n")}`).toEqual([]);
  });

  test("primary nav links navigate without 5xx", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Look for a nav region. If site has no nav we don't want to fail the
    // suite — just skip the inner asserts.
    const navLinks = page.locator("header a, nav a");
    const count = await navLinks.count();
    if (count === 0) {
      test.skip(true, "no nav links found");
      return;
    }

    // Click up to 3 internal links and ensure each lands successfully.
    let tested = 0;
    for (let i = 0; i < count && tested < 3; i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute("href");
      if (!href || !href.startsWith("/")) continue;
      if (href.startsWith("/api")) continue;
      const res = await page.goto(`${BASE_URL}${href}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const status = res?.status() ?? 0;
      expect(status, `nav link ${href}`).toBeLessThan(500);
      tested++;
    }
  });

  test("live activity ticker does not crash the page", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // The ticker may or may not be on the page — what matters is the page
    // still has its hero/heading after a few seconds of ticker activity.
    await page.waitForTimeout(2_500);
    await expect(page.locator("h1").first()).toBeVisible();
  });
});
