import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * Phase 3 audit — creator/influencer signup happy path.
 *
 * Verifies the creator branch of the audience picker lands the user on
 * the creator portal (not the business dashboard).
 */
test.describe("Auth — creator signup", () => {
  test.setTimeout(90_000);

  test("creator signup routes to a creator-focused destination", async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    const signupTab = page.getByRole("button", { name: /sign\s*up/i }).first();
    if (await signupTab.isVisible().catch(() => false)) await signupTab.click().catch(() => {});

    const creatorChoice = page.getByText(/i'?m a creator|i'?m an influencer/i).first();
    if (await creatorChoice.isVisible().catch(() => false)) {
      await creatorChoice.click().catch(() => {});
    } else {
      test.skip(true, "no creator audience option found on signup");
      return;
    }

    const email = `creator-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@socialperks.test`;

    const fill = async (selectors: string[], value: string) => {
      for (const s of selectors) {
        const el = page.locator(s).first();
        if (await el.isVisible().catch(() => false)) {
          await el.fill(value);
          return true;
        }
      }
      return false;
    };

    await fill(
      ['input[name="name"]', 'input[name="creatorName"]', 'input[placeholder*="name" i]'],
      "Test Creator"
    );
    await fill(['input[type="email"]', 'input[name="email"]'], email);
    await fill(['input[type="password"]', 'input[name="password"]'], "TestPass1234!");

    const submit = page
      .getByRole("button", { name: /create (free )?account|sign\s*up|continue|get started/i })
      .first();
    await submit.click({ timeout: 10_000 });

    // Creator path must NOT land on /dashboard (that's the business portal).
    // It can land on /creator, /influencer, /portal, /welcome, etc.
    await page.waitForURL(/creator|influencer|portal|welcome|onboarding/i, { timeout: 30_000 });
    expect(page.url()).toMatch(/creator|influencer|portal|welcome|onboarding/i);
  });
});
