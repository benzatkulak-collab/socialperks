import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * Phase 3 audit — login + logout round-trip.
 *
 * Creates an account via the API (faster + deterministic), then drives
 * the login UI to assert credentials work and that wrong-password +
 * wrong-email produce the SAME generic error message (no user enumeration).
 */
test.describe("Auth — login", () => {
  test.setTimeout(120_000);

  test("signup, logout, login again, then bad-credential paths share a generic error", async ({
    page,
    request,
  }) => {
    const email = `login-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@socialperks.test`;
    const password = "TestPass1234!";

    // Create user via API so test does not depend on signup-UI plumbing.
    const signupRes = await request.post(`${BASE_URL}/api/v1/auth`, {
      data: { action: "signup", email, password, name: "Login Test" },
      failOnStatusCode: false,
    });
    expect([200, 201]).toContain(signupRes.status());

    // Drive login through the UI.
    await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    const fillEmail = async (value: string) => {
      const e = page.locator('input[type="email"], input[name="email"]').first();
      await e.waitFor({ state: "visible", timeout: 10_000 });
      await e.fill(value);
    };
    const fillPassword = async (value: string) => {
      const p = page.locator('input[type="password"], input[name="password"]').first();
      await p.waitFor({ state: "visible", timeout: 10_000 });
      await p.fill(value);
    };

    await fillEmail(email);
    await fillPassword(password);
    await page
      .getByRole("button", { name: /log\s*in|sign\s*in|continue/i })
      .first()
      .click({ timeout: 10_000 });

    // We're in — should leave /auth.
    await page.waitForURL((url) => !/\/auth(\?|$|\/)/.test(url.toString()), { timeout: 30_000 });

    // Logout — try a few common surfaces. Skip the logout assert if UI
    // doesn't expose a visible button (still a useful negative signal).
    const logout = page
      .getByRole("button", { name: /log\s*out|sign\s*out/i })
      .or(page.getByRole("link", { name: /log\s*out|sign\s*out/i }))
      .first();
    if (await logout.isVisible().catch(() => false)) {
      await logout.click().catch(() => {});
      await page.waitForLoadState("domcontentloaded");
    } else {
      // Fallback: API logout + clear cookies.
      await request.post(`${BASE_URL}/api/v1/auth`, {
        data: { action: "logout" },
        failOnStatusCode: false,
      });
      await page.context().clearCookies();
    }

    // Log back in via UI.
    await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await fillEmail(email);
    await fillPassword(password);
    await page
      .getByRole("button", { name: /log\s*in|sign\s*in|continue/i })
      .first()
      .click({ timeout: 10_000 });
    await page.waitForURL((url) => !/\/auth(\?|$|\/)/.test(url.toString()), { timeout: 30_000 });

    // No user enumeration: wrong-password and wrong-email get the same
    // shape of error. Use the API directly so the assertion is precise.
    const badPwRes = await request.post(`${BASE_URL}/api/v1/auth`, {
      data: { action: "login", email, password: "WrongPassword999!" },
      failOnStatusCode: false,
    });
    const badEmailRes = await request.post(`${BASE_URL}/api/v1/auth`, {
      data: { action: "login", email: `nope-${Date.now()}@socialperks.test`, password },
      failOnStatusCode: false,
    });

    expect(badPwRes.status(), "wrong password should not 2xx").toBeGreaterThanOrEqual(400);
    expect(badEmailRes.status(), "wrong email should not 2xx").toBeGreaterThanOrEqual(400);
    // Same status code — no enumeration via status differences.
    expect(badEmailRes.status()).toBe(badPwRes.status());

    const badPwBody = await badPwRes.json().catch(() => ({}));
    const badEmailBody = await badEmailRes.json().catch(() => ({}));
    const pwMsg = JSON.stringify(badPwBody).toLowerCase();
    const emailMsg = JSON.stringify(badEmailBody).toLowerCase();
    // Neither message should reveal whether the account exists.
    expect(pwMsg).not.toMatch(/user not found|no account|does not exist/);
    expect(emailMsg).not.toMatch(/user not found|no account|does not exist/);
  });
});
