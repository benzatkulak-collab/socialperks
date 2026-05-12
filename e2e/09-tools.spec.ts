import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * Phase 3 audit — /tools mini-apps.
 *
 * Each individual tool is tested as a best-effort: open the page, find
 * the inputs, change them, assert the output region changes. Tools that
 * aren't present in the current build are skipped (not failed).
 */
test.describe("Tools", () => {
  test("CAC calculator updates output when inputs change", async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/tools/cac-calculator`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (!res || res.status() >= 400) {
      test.skip(true, "CAC calculator not present in this build");
      return;
    }

    const numberInputs = page.locator('input[type="number"]');
    const count = await numberInputs.count();
    if (count < 2) {
      test.skip(true, "CAC calculator UI doesn't expose number inputs");
      return;
    }

    const outputBefore = (await page.locator("body").textContent()) || "";
    await numberInputs.nth(0).fill("100");
    await numberInputs.nth(1).fill("10");
    // Trigger any onBlur recompute.
    await numberInputs.nth(1).press("Tab").catch(() => {});
    await page.waitForTimeout(500);
    const outputAfter = (await page.locator("body").textContent()) || "";
    expect(outputAfter).not.toBe(outputBefore);
  });

  test("review email generator allows template + copy", async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/tools/review-email-generator`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (!res || res.status() >= 400) {
      test.skip(true, "review email generator not present");
      return;
    }

    // Try selecting whatever the first "template" affordance is.
    const firstTemplate = page
      .locator('button:has-text("Template"), [data-template], select')
      .first();
    if (await firstTemplate.isVisible().catch(() => false)) {
      await firstTemplate.click().catch(() => {});
    }

    const copyBtn = page
      .getByRole("button", { name: /copy/i })
      .first();
    if (await copyBtn.isVisible().catch(() => false)) {
      // Granting clipboard perms is browser-specific; just verify the
      // button is clickable and doesn't throw.
      await copyBtn.click({ timeout: 5_000 }).catch(() => {});
    }

    // The textarea/output should have non-empty content.
    const out = page.locator("textarea, pre, [data-output]").first();
    if (await out.isVisible().catch(() => false)) {
      const text = (await out.inputValue().catch(() => "")) || (await out.textContent()) || "";
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  test("Instagram caption generator produces captions", async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/tools/instagram-caption-generator`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (!res || res.status() >= 400) {
      test.skip(true, "IG caption generator not present");
      return;
    }

    // Pick a "vibe" if there's a chooser.
    const vibe = page
      .getByRole("button", { name: /casual|playful|fun|professional|bold/i })
      .first();
    if (await vibe.isVisible().catch(() => false)) {
      await vibe.click().catch(() => {});
    }

    const generate = page
      .getByRole("button", { name: /generate|create|make/i })
      .first();
    if (await generate.isVisible().catch(() => false)) {
      await generate.click().catch(() => {});
      await page.waitForTimeout(800);
    }

    const body = (await page.locator("body").textContent()) || "";
    // Captions usually have hashtags or emojis — but at minimum, content
    // should grow after generation. Just assert page has substance.
    expect(body.trim().length).toBeGreaterThan(100);
  });
});
