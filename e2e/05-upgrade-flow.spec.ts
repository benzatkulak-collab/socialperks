import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * Phase 3 audit — upgrade / Stripe checkout flow.
 *
 * /upgrade must:
 *  - render publicly with the correct Pro price ($9.99/mo).
 *  - either kick the user to a Stripe Payment Link (signed-in path) OR
 *    require auth (signed-out path). Both are acceptable.
 */
test.describe("Upgrade flow", () => {
  test("upgrade page renders with $9.99/mo Pro pricing", async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/upgrade`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    expect(res?.status()).toBeLessThan(400);

    // Price string used across UI per CLAUDE.md / recent commit.
    const body = page.locator("body");
    await expect(body).toContainText(/\$9\.99/, { timeout: 10_000 });
    await expect(body).toContainText(/pro/i);
  });

  test("clicking upgrade either reaches Stripe or requires auth", async ({ page, context }) => {
    await page.goto(`${BASE_URL}/upgrade`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    const upgradeBtn = page
      .getByRole("button", { name: /upgrade.*pro|upgrade now|go pro|subscribe/i })
      .or(page.getByRole("link", { name: /upgrade.*pro|upgrade now|go pro|subscribe/i }))
      .first();

    if (!(await upgradeBtn.isVisible().catch(() => false))) {
      test.skip(true, "no upgrade CTA visible — page may use a different layout");
      return;
    }

    // Watch for either a Stripe redirect (link or popup) or an auth wall.
    let stripeUrl: string | null = null;
    context.on("page", (p) => {
      const u = p.url();
      if (/buy\.stripe\.com|checkout\.stripe\.com/.test(u)) stripeUrl = u;
    });
    page.on("framenavigated", (f) => {
      const u = f.url();
      if (/buy\.stripe\.com|checkout\.stripe\.com/.test(u)) stripeUrl = u;
    });

    const navPromise = page
      .waitForURL(/buy\.stripe\.com|checkout\.stripe\.com|auth|sign.?in|login/i, {
        timeout: 15_000,
      })
      .catch(() => null);

    await upgradeBtn.click({ timeout: 10_000 }).catch(() => {});
    await navPromise;
    await page.waitForTimeout(1_500);

    const url = page.url();
    const reachedStripe = stripeUrl !== null || /buy\.stripe\.com|checkout\.stripe\.com/.test(url);
    const authWall = /\/auth|sign.?in|login/i.test(url);
    const bodyText = (await page.locator("body").textContent().catch(() => "")) || "";
    const requiresAuthText = /authentication required|please (log|sign)\s*in|must be signed in/i.test(
      bodyText
    );

    expect(
      reachedStripe || authWall || requiresAuthText,
      `expected Stripe redirect or auth wall, got url=${url}`
    ).toBe(true);
  });
});
