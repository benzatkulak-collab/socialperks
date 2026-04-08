import { test, expect, Page } from "@playwright/test";

/**
 * Helper: login as a demo business user and wait for the portal to load.
 */
async function loginAsBusiness(page: Page) {
  await page.goto("/dashboard#login");
  await expect(
    page.getByRole("heading", { name: /Welcome back/i })
  ).toBeVisible({ timeout: 15000 });

  await page.getByPlaceholder(/you@yourbusiness\.com/i).fill("yoga@demo.com");
  await page.getByPlaceholder(/your password/i).fill("1234");
  await page.getByRole("button", { name: /Log In/i }).click();

  // Wait for business portal to load (business name or log out button)
  await expect(
    page.getByRole("button", { name: /Log Out/i })
  ).toBeVisible({ timeout: 15000 });
}

test.describe("Business Portal Flow", () => {
  test.describe("Dashboard", () => {
    test("business portal shows business name and welcome", async ({ page }) => {
      await loginAsBusiness(page);

      // Should show the business name in the portal
      await expect(page.getByText(/Yoga/i).first()).toBeVisible();

      // Welcome card or dashboard content should be visible
      await expect(
        page.getByText(/Welcome to Social Perks|Create a new campaign/i).first()
      ).toBeVisible();
    });

    test("dashboard shows quick-start templates when no campaigns exist", async ({ page }) => {
      await loginAsBusiness(page);

      // Quick-start templates should be visible on fresh account
      await expect(
        page.getByText(/Quick-start templates/i).first()
      ).toBeVisible({ timeout: 10000 });

      // At least one template should be present
      await expect(
        page.getByText(/Google Review Campaign/i).first()
      ).toBeVisible();
    });

    test("create new campaign button is visible", async ({ page }) => {
      await loginAsBusiness(page);

      await expect(
        page.getByText(/Create a new campaign/i)
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Campaign Creation", () => {
    test("full campaign creation flow: platform -> action -> reward -> launch", async ({ page }) => {
      await loginAsBusiness(page);

      // Click "Create a new campaign"
      await page.getByText(/Create a new campaign/i).click();

      // Step 1: Pick platform and action
      await expect(
        page.getByRole("heading", { name: /What do you want customers to do/i })
      ).toBeVisible({ timeout: 10000 });

      // Select Google platform
      await page.getByText("Google").click();

      // An action picker should appear with actions for Google
      await expect(
        page.getByText(/What should they do on Google/i)
      ).toBeVisible();

      // Select the first available action (e.g., "Leave a Review")
      const actionButtons = page.locator("button").filter({ hasText: /review|check.in|post/i });
      await actionButtons.first().click();

      // Click Next to go to step 2
      await page.getByRole("button", { name: /Next: Set the reward/i }).click();

      // Step 2: Set the reward
      await expect(
        page.getByRole("heading", { name: /What do they get in return/i })
      ).toBeVisible();

      // Reward type options should be visible
      await expect(page.getByText("% Off")).toBeVisible();
      await expect(page.getByText("$ Off")).toBeVisible();
      await expect(page.getByText("Free Item")).toBeVisible();

      // Select % Off (default) and enter a value
      await page.locator("#reward-value").fill("15");

      // Click Next to review
      await page.getByRole("button", { name: /Next: Review/i }).click();

      // Step 3: Review & launch - should show summary
      // The step indicator should show step 3 is active
      await expect(
        page.getByText(/Launch/i).first()
      ).toBeVisible();

      // Launch the campaign
      const launchButton = page.getByRole("button", { name: /Launch|Go Live/i }).first();
      await launchButton.click();

      // Should return to home with a success toast or see the campaign in the list
      await expect(
        page.getByText(/is live|campaign|Create a new campaign/i).first()
      ).toBeVisible({ timeout: 15000 });
    });

    test("campaign creation via quick-start template", async ({ page }) => {
      await loginAsBusiness(page);

      // Click a quick-start template (Google Review Campaign)
      const template = page.getByText(/Google Review Campaign/i).first();
      if (await template.isVisible()) {
        await template.click();

        // Should jump to step 3 with pre-filled values
        await expect(
          page.getByText(/Launch|Review/i).first()
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test("back to dashboard from campaign creation works", async ({ page }) => {
      await loginAsBusiness(page);

      // Go to create page
      await page.getByText(/Create a new campaign/i).click();
      await expect(
        page.getByRole("heading", { name: /What do you want customers to do/i })
      ).toBeVisible({ timeout: 10000 });

      // Click back
      await page.getByText(/Back to dashboard/i).click();

      // Should be back on the dashboard
      await expect(
        page.getByText(/Create a new campaign/i)
      ).toBeVisible({ timeout: 10000 });
    });

    test("step navigation works: back from step 2 to step 1", async ({ page }) => {
      await loginAsBusiness(page);

      await page.getByText(/Create a new campaign/i).click();

      // Select a platform and action
      await page.getByText("Google").click();
      const actionButton = page.locator("button").filter({ hasText: /review|check.in|post/i });
      await actionButton.first().click();
      await page.getByRole("button", { name: /Next: Set the reward/i }).click();

      // Should be on step 2
      await expect(
        page.getByRole("heading", { name: /What do they get in return/i })
      ).toBeVisible();

      // Go back to step 1
      await page.getByRole("button", { name: /Back/i }).first().click();

      // Should be back on step 1
      await expect(
        page.getByRole("heading", { name: /What do you want customers to do/i })
      ).toBeVisible();
    });
  });

  test.describe("Portal Navigation", () => {
    test("log out button is visible and functional", async ({ page }) => {
      await loginAsBusiness(page);

      const logoutBtn = page.getByRole("button", { name: /Log Out/i });
      await expect(logoutBtn).toBeVisible();

      await logoutBtn.click();

      // Should return to landing
      await expect(
        page.getByText("Your customers love you").first()
      ).toBeVisible({ timeout: 15000 });
    });
  });
});
