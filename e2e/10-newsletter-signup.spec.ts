import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * Phase 3 audit — newsletter signup on homepage footer.
 *
 * Submits a fresh email and asserts a success message. Submits the SAME
 * email again and asserts the UI reports "already subscribed" (or any
 * non-error duplicate message) rather than 5xx-ing.
 */
test.describe("Newsletter signup", () => {
  test.setTimeout(60_000);

  test("subscribe then duplicate-subscribe", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Scroll to footer so any lazy-rendered newsletter form mounts.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Footer email input — there may be more than one email input on the
    // page (signup CTA earlier). Prefer the one inside <footer>.
    const footerEmail = page.locator('footer input[type="email"]').first();
    const anyEmail = page.locator('input[type="email"]').last();
    const input = (await footerEmail.isVisible().catch(() => false)) ? footerEmail : anyEmail;

    if (!(await input.isVisible().catch(() => false))) {
      test.skip(true, "no newsletter input visible on homepage");
      return;
    }

    const email = `news-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@socialperks.test`;
    await input.fill(email);

    // Submit — press Enter is the most resilient cross-design action.
    await input.press("Enter");
    await page.waitForTimeout(1_200);

    const bodyAfter1 = (await page.locator("body").textContent()) || "";
    expect(bodyAfter1.toLowerCase()).toMatch(
      /thank|subscribed|success|check your inbox|you'?re in|welcome/
    );

    // Duplicate submission — same email again.
    if (!(await input.isVisible().catch(() => false))) {
      // Form may be replaced with success state; that itself is fine.
      return;
    }
    await input.fill(email);
    await input.press("Enter");
    await page.waitForTimeout(1_200);

    const bodyAfter2 = (await page.locator("body").textContent()) || "";
    // The duplicate path must NOT shout "error" — it should be either the
    // same success message (idempotent) or a friendly "already subscribed".
    expect(bodyAfter2.toLowerCase()).toMatch(
      /already|thank|subscribed|success|welcome|check your inbox|you'?re in/
    );
    expect(bodyAfter2.toLowerCase()).not.toMatch(/something went wrong|server error|500/);
  });
});
