import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * Phase 3 audit — public marketing pages.
 *
 * Each route must return < 400 and produce zero uncaught JS errors. We
 * tolerate 404 (skip) for routes that don't exist in every environment,
 * but never accept 5xx.
 */
const ROUTES = ["/blog", "/pricing", "/developers", "/demo", "/case-studies", "/tools"];

test.describe("Public pages", () => {
  for (const route of ROUTES) {
    test(`${route} loads without console errors`, async ({ page }) => {
      const errs: string[] = [];
      page.on("pageerror", (e) => errs.push(String(e)));
      page.on("console", (m) => {
        if (m.type() === "error") errs.push(m.text());
      });

      const res = await page.goto(`${BASE_URL}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const status = res?.status() ?? 0;
      // Tolerate 404 for missing routes in some envs — but never 5xx.
      expect(status, `${route} status`).toBeLessThan(500);

      if (status >= 400) {
        test.skip(true, `${route} not present (status ${status})`);
        return;
      }

      // Body should have meaningful content.
      const text = (await page.locator("body").textContent()) || "";
      expect(text.trim().length).toBeGreaterThan(50);

      const fatal = errs.filter(
        (e) => !/favicon|manifest|sourcemap|chrome-extension/i.test(e)
      );
      expect(fatal, `console errors on ${route}: ${fatal.join("\n")}`).toEqual([]);
    });
  }
});
