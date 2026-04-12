import { test, expect } from "@playwright/test";
import { loginAsBusiness } from "./helpers/auth";

test.describe("Campaign Creation Flow", () => {
  test.describe("Landing & Navigation", () => {
    test("landing page loads with correct title", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle(/Social Perks/i);
    });

    test("landing page hero content is visible", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByRole("heading", { level: 1 })
      ).toContainText("Your customers love you");
      await expect(
        page.getByText("Pay them to say it online")
      ).toBeVisible();
    });

    test("CTA links point to dashboard", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByRole("link", { name: /Create Your First Campaign/i })
      ).toHaveAttribute("href", "/dashboard#signup");
    });
  });

  test.describe("Business Portal Access", () => {
    test("business portal is accessible after login", async ({ page }) => {
      await loginAsBusiness(page);

      // Should see business-related content
      await expect(page.getByText(/Yoga/i).first()).toBeVisible();
    });

    test("business portal shows campaign creation option", async ({ page }) => {
      await loginAsBusiness(page);

      // Dashboard should display campaign creation entry point
      await expect(
        page.getByText(/Create a new campaign/i)
      ).toBeVisible({ timeout: 10000 });
    });

    test("business portal shows quick-start templates", async ({ page }) => {
      await loginAsBusiness(page);

      await expect(
        page.getByText(/Quick-start templates/i).first()
      ).toBeVisible({ timeout: 10000 });

      // At least one template should be available
      await expect(
        page.getByText(/Google Review Campaign/i).first()
      ).toBeVisible();
    });
  });

  test.describe("Campaign Wizard", () => {
    test("campaign wizard opens with platform selection", async ({ page }) => {
      await loginAsBusiness(page);

      await page.getByText(/Create a new campaign/i).click();

      // Step 1 heading
      await expect(
        page.getByRole("heading", {
          name: /What do you want customers to do/i,
        })
      ).toBeVisible({ timeout: 10000 });

      // Google platform should be available
      await expect(page.getByText("Google")).toBeVisible();
    });

    test("selecting a platform shows action options", async ({ page }) => {
      await loginAsBusiness(page);

      await page.getByText(/Create a new campaign/i).click();
      await expect(
        page.getByRole("heading", {
          name: /What do you want customers to do/i,
        })
      ).toBeVisible({ timeout: 10000 });

      // Select Google
      await page.getByText("Google").click();

      // Action picker should appear
      await expect(
        page.getByText(/What should they do on Google/i)
      ).toBeVisible();
    });

    test("full wizard flow: platform -> action -> reward -> launch", async ({ page }) => {
      await loginAsBusiness(page);

      // Enter campaign creation
      await page.getByText(/Create a new campaign/i).click();
      await expect(
        page.getByRole("heading", {
          name: /What do you want customers to do/i,
        })
      ).toBeVisible({ timeout: 10000 });

      // Step 1: Pick platform
      await page.getByText("Google").click();

      // Pick an action (review, check-in, or post)
      const actionButtons = page
        .locator("button")
        .filter({ hasText: /review|check.in|post/i });
      await actionButtons.first().click();

      // Proceed to step 2
      await page
        .getByRole("button", { name: /Next: Set the reward/i })
        .click();

      // Step 2: Set reward
      await expect(
        page.getByRole("heading", {
          name: /What do they get in return/i,
        })
      ).toBeVisible();

      // Reward type options should appear
      await expect(page.getByText("% Off")).toBeVisible();
      await expect(page.getByText("$ Off")).toBeVisible();

      // Enter a reward value
      await page.locator("#reward-value").fill("15");

      // Proceed to step 3
      await page.getByRole("button", { name: /Next: Review/i }).click();

      // Step 3: Review & launch
      await expect(page.getByText(/Launch/i).first()).toBeVisible();

      const launchButton = page
        .getByRole("button", { name: /Launch|Go Live/i })
        .first();
      await launchButton.click();

      // Should return to dashboard or show success
      await expect(
        page.getByText(/is live|campaign|Create a new campaign/i).first()
      ).toBeVisible({ timeout: 15000 });
    });

    test("back navigation returns to previous step", async ({ page }) => {
      await loginAsBusiness(page);

      await page.getByText(/Create a new campaign/i).click();
      await expect(
        page.getByRole("heading", {
          name: /What do you want customers to do/i,
        })
      ).toBeVisible({ timeout: 10000 });

      // Go to step 2
      await page.getByText("Google").click();
      const actionButton = page
        .locator("button")
        .filter({ hasText: /review|check.in|post/i });
      await actionButton.first().click();
      await page
        .getByRole("button", { name: /Next: Set the reward/i })
        .click();

      await expect(
        page.getByRole("heading", {
          name: /What do they get in return/i,
        })
      ).toBeVisible();

      // Go back to step 1
      await page.getByRole("button", { name: /Back/i }).first().click();

      await expect(
        page.getByRole("heading", {
          name: /What do you want customers to do/i,
        })
      ).toBeVisible();
    });

    test("back to dashboard from wizard works", async ({ page }) => {
      await loginAsBusiness(page);

      await page.getByText(/Create a new campaign/i).click();
      await expect(
        page.getByRole("heading", {
          name: /What do you want customers to do/i,
        })
      ).toBeVisible({ timeout: 10000 });

      // Click back to dashboard
      await page.getByText(/Back to dashboard/i).click();

      await expect(
        page.getByText(/Create a new campaign/i)
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Quick-Start Templates", () => {
    test("clicking a template advances the wizard", async ({ page }) => {
      await loginAsBusiness(page);

      const template = page
        .getByText(/Google Review Campaign/i)
        .first();

      if (await template.isVisible()) {
        await template.click();

        // Should jump to review/launch step with pre-filled values
        await expect(
          page.getByText(/Launch|Review/i).first()
        ).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
