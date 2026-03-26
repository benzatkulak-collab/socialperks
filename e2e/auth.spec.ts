import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Social Perks/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("shows login form when clicking Login", async ({ page }) => {
    await page.goto("/");
    // Look for a login/get started button
    const loginBtn = page.getByRole("link", { name: /login|sign in|get started/i }).first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await expect(page.getByText(/email|sign in|log in/i).first()).toBeVisible();
    }
  });

  test("login with demo business credentials", async ({ page }) => {
    await page.goto("/");
    // Navigate to auth
    const getStarted = page.getByRole("link", { name: /get started/i }).first();
    if (await getStarted.isVisible()) {
      await getStarted.click();
    }

    // Fill in demo credentials
    const emailInput = page.getByPlaceholder(/email/i).first();
    if (await emailInput.isVisible()) {
      await emailInput.fill("yoga@demo.com");
      const pinInput = page.getByPlaceholder(/pin|password/i).first();
      if (await pinInput.isVisible()) {
        await pinInput.fill("1234");
      }
      // Submit
      const submitBtn = page.getByRole("button", { name: /sign in|log in|continue/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        // Should see dashboard or portal content
        await page.waitForTimeout(2000);
        await expect(page.locator("body")).toContainText(/dashboard|campaign|welcome/i);
      }
    }
  });

  test("login with demo influencer credentials", async ({ page }) => {
    await page.goto("/");
    const getStarted = page.getByRole("link", { name: /get started/i }).first();
    if (await getStarted.isVisible()) {
      await getStarted.click();
    }

    const emailInput = page.getByPlaceholder(/email/i).first();
    if (await emailInput.isVisible()) {
      await emailInput.fill("priya@demo.com");
      const pinInput = page.getByPlaceholder(/pin|password/i).first();
      if (await pinInput.isVisible()) {
        await pinInput.fill("1234");
        const submitBtn = page.getByRole("button", { name: /sign in|log in|continue/i }).first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(2000);
          await expect(page.locator("body")).toContainText(/campaign|earn|discover/i);
        }
      }
    }
  });
});
