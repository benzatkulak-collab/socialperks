/**
 * E2E Auth Helpers for Playwright tests
 *
 * Reusable login functions that match the existing auth patterns
 * in the Social Perks application (see e2e/auth.spec.ts for reference).
 */

import { Page, expect } from "@playwright/test";

/**
 * Navigate to the login form and authenticate as a demo business user.
 * Waits for the portal to fully load before returning.
 */
export async function loginAsBusiness(
  page: Page,
  email = "yoga@demo.com",
  password = "1234"
) {
  await page.goto("/dashboard#login");

  // Wait for the login form to appear
  await expect(
    page.getByRole("heading", { name: /Welcome back/i })
  ).toBeVisible({ timeout: 15000 });

  // Fill credentials
  await page.getByPlaceholder(/you@yourbusiness\.com/i).fill(email);
  await page.getByPlaceholder(/your password/i).fill(password);

  // Submit
  await page.getByRole("button", { name: /Log In/i }).click();

  // Wait for the business portal to load (Log Out button confirms auth)
  await expect(
    page.getByRole("button", { name: /Log Out/i })
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Navigate to the login form and authenticate as a demo influencer/creator.
 * Waits for the portal to fully load before returning.
 */
export async function loginAsInfluencer(
  page: Page,
  email = "priya@demo.com",
  password = "1234"
) {
  await page.goto("/dashboard#login");

  // Wait for the login form to appear
  await expect(
    page.getByRole("heading", { name: /Welcome back/i })
  ).toBeVisible({ timeout: 15000 });

  // Fill credentials
  await page.getByPlaceholder(/you@yourbusiness\.com/i).fill(email);
  await page.getByPlaceholder(/your password/i).fill(password);

  // Submit
  await page.getByRole("button", { name: /Log In/i }).click();

  // Wait for the influencer/creator portal to load
  await expect(
    page.getByRole("button", { name: /Log Out/i })
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Log out from the current session and wait for the landing page.
 */
export async function logout(page: Page) {
  await page.getByRole("button", { name: /Log Out/i }).click();

  // Should return to the landing page
  await expect(
    page.getByText("Your customers love you").first()
  ).toBeVisible({ timeout: 15000 });
}
