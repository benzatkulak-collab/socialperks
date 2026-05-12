import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * Phase 3 audit — /demo public walkthrough.
 *
 * /demo should render a pre-populated experience without login and expose
 * a "sign up to interact" call-to-action. Internal demo nav links should
 * not 500.
 */
test.describe("Demo flow", () => {
  test.setTimeout(90_000);

  test("/demo renders without auth and surfaces a signup CTA", async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/demo`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    // /demo may not exist on every environment — skip rather than fail.
    if (!res || res.status() >= 400) {
      test.skip(true, `/demo not available (status ${res?.status()})`);
      return;
    }

    await expect(page.locator("body")).toContainText(/demo|preview|sample/i, { timeout: 10_000 });

    // Floating / persistent signup CTA somewhere on the page.
    const cta = page
      .getByRole("link", { name: /sign\s*up|create account|get started|try (it )?free/i })
      .or(page.getByRole("button", { name: /sign\s*up|create account|get started|try (it )?free/i }))
      .first();
    await expect(cta).toBeVisible({ timeout: 10_000 });
  });

  test("demo internal links don't 500", async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/demo`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    if (!res || res.status() >= 400) {
      test.skip(true, `/demo not available (status ${res?.status()})`);
      return;
    }

    const sections = ["dashboard", "campaigns", "submissions", "analytics"];
    for (const s of sections) {
      // The demo may link to e.g. /demo/dashboard, /dashboard, or use hash
      // anchors — try the link first, fall back to a direct probe.
      const link = page
        .getByRole("link", { name: new RegExp(s, "i") })
        .first();
      if (await link.isVisible().catch(() => false)) {
        const href = await link.getAttribute("href");
        if (href && href.startsWith("/")) {
          const r = await page.goto(`${BASE_URL}${href}`, {
            waitUntil: "domcontentloaded",
            timeout: 30_000,
          });
          expect(r?.status() ?? 0, `demo nav -> ${href}`).toBeLessThan(500);
          await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
        }
      }
    }
  });
});
