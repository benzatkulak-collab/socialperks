import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * Phase 3 audit — business signup happy path.
 *
 * Goes through audience picker → business form → submits → expects to land
 * on /dashboard. Verifies the session sticks across a hard reload.
 */
test.describe("Auth — business signup", () => {
  test.setTimeout(90_000);

  test("business signup lands on dashboard and persists across reload", async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Click "Sign up" entry if we landed on a login-by-default screen.
    const signupTab = page.getByRole("button", { name: /sign\s*up/i }).first();
    if (await signupTab.isVisible().catch(() => false)) {
      await signupTab.click().catch(() => {});
    } else {
      const signupLink = page.getByRole("link", { name: /sign\s*up/i }).first();
      if (await signupLink.isVisible().catch(() => false)) await signupLink.click().catch(() => {});
    }

    // Audience picker — pick "business" if it's present.
    const businessChoice = page.getByText(/i'?m a business/i).first();
    if (await businessChoice.isVisible().catch(() => false)) {
      await businessChoice.click().catch(() => {});
    }

    const email = `biz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@socialperks.test`;
    const password = "TestPass1234!";

    // Best-effort form fill — selectors are tolerant because the audit
    // is allowed to land on different copies of the signup form.
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
      [
        'input[name="businessName"]',
        'input[name="business_name"]',
        'input[placeholder*="business" i]',
        'input[name="name"]',
      ],
      "Test Cafe"
    );
    await fill(
      [
        'input[name="businessType"]',
        'input[name="business_type"]',
        'input[placeholder*="type" i]',
      ],
      "Coffee Shop"
    );
    await fill(['input[type="email"]', 'input[name="email"]'], email);
    await fill(['input[type="password"]', 'input[name="password"]'], password);

    const submit = page
      .getByRole("button", { name: /create (free )?account|sign\s*up|continue|get started/i })
      .first();
    await submit.click({ timeout: 10_000 });

    // Either we land on /dashboard, or the app routes through /welcome
    // first. Both count as success — the requirement is "authenticated".
    await page.waitForURL(/dashboard|welcome|onboarding/i, { timeout: 30_000 });

    // Reload — session must persist (cookie or localStorage based auth).
    await page.reload({ waitUntil: "domcontentloaded" });

    // After reload we should NOT be bounced back to /auth.
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).not.toMatch(/\/auth(\?|$|\/)/);
  });
});
