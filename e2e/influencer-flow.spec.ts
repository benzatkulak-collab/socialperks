import { test, expect, Page } from "@playwright/test";

/**
 * Helper: login as a demo influencer user and wait for the portal to load.
 */
async function loginAsInfluencer(page: Page) {
  await page.goto("/dashboard#login");
  await expect(
    page.getByRole("heading", { name: /Welcome back/i })
  ).toBeVisible({ timeout: 15000 });

  await page.getByPlaceholder(/you@yourbusiness\.com/i).fill("priya@demo.com");
  await page.getByPlaceholder(/your password/i).fill("1234");
  await page.getByRole("button", { name: /Log In/i }).click();

  // Wait for influencer portal to load
  await expect(
    page.getByRole("button", { name: /Log Out/i })
  ).toBeVisible({ timeout: 15000 });
}

test.describe("Influencer Portal Flow", () => {
  test.describe("Dashboard", () => {
    test("influencer portal shows creator dashboard", async ({ page }) => {
      await loginAsInfluencer(page);

      // Should see the influencer greeting
      await expect(
        page.getByText(/Hey,/i).first()
      ).toBeVisible();

      // Dashboard tab content
      await expect(
        page.getByText(/creator dashboard/i).first()
      ).toBeVisible();
    });

    test("dashboard shows stats cards", async ({ page }) => {
      await loginAsInfluencer(page);

      // Stats should be visible
      await expect(page.getByText(/Total Earned/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Pending Review/i)).toBeVisible();
      await expect(page.getByText(/Total Followers/i)).toBeVisible();
      await expect(page.getByText(/Engagement Rate/i)).toBeVisible();
    });

    test("dashboard shows platforms section", async ({ page }) => {
      await loginAsInfluencer(page);

      await expect(
        page.getByText(/Your Platforms/i)
      ).toBeVisible({ timeout: 10000 });
    });

    test("dashboard shows get started card with discover link", async ({ page }) => {
      await loginAsInfluencer(page);

      await expect(
        page.getByText(/Get Started/i).first()
      ).toBeVisible({ timeout: 10000 });

      await expect(
        page.getByRole("button", { name: /Discover Campaigns/i })
      ).toBeVisible();
    });
  });

  test.describe("Navigation Tabs", () => {
    test("portal has Dashboard, Discover, Earnings, and Profile tabs", async ({ page }) => {
      await loginAsInfluencer(page);

      // Tab labels should be visible in the sub-nav
      await expect(page.getByText("Dashboard").first()).toBeVisible();
      await expect(page.getByText("Discover").first()).toBeVisible();
      await expect(page.getByText("Earnings").first()).toBeVisible();
      await expect(page.getByText("Profile").first()).toBeVisible();
    });

    test("clicking Discover tab shows campaign marketplace", async ({ page }) => {
      await loginAsInfluencer(page);

      // Click the Discover tab
      await page.getByText("Discover").first().click();

      // Should show discover page
      await expect(
        page.getByRole("heading", { name: /Discover Campaigns/i })
      ).toBeVisible({ timeout: 10000 });

      // Should show campaign count
      await expect(
        page.getByText(/campaigns from local businesses/i)
      ).toBeVisible();
    });

    test("clicking Discover via Get Started button works", async ({ page }) => {
      await loginAsInfluencer(page);

      // Use the "Discover Campaigns" button from the Get Started card
      await page.getByRole("button", { name: /Discover Campaigns/i }).click();

      await expect(
        page.getByRole("heading", { name: /Discover Campaigns/i })
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Discover & Campaign Interaction", () => {
    test("discover page shows campaign cards", async ({ page }) => {
      await loginAsInfluencer(page);
      await page.getByText("Discover").first().click();

      await expect(
        page.getByRole("heading", { name: /Discover Campaigns/i })
      ).toBeVisible({ timeout: 10000 });

      // Should have at least one campaign card visible
      // Campaign cards contain business names and perk values
      await expect(
        page.getByText(/off|dollars|perk/i).first()
      ).toBeVisible({ timeout: 10000 });
    });

    test("discover page has search and filter controls", async ({ page }) => {
      await loginAsInfluencer(page);
      await page.getByText("Discover").first().click();

      await expect(
        page.getByRole("heading", { name: /Discover Campaigns/i })
      ).toBeVisible({ timeout: 10000 });

      // Search input
      await expect(
        page.getByPlaceholder(/Search campaigns or businesses/i)
      ).toBeVisible();

      // Platform filter dropdown
      await expect(
        page.locator("select").first()
      ).toBeVisible();
    });

    test("search filters campaigns in discover", async ({ page }) => {
      await loginAsInfluencer(page);
      await page.getByText("Discover").first().click();

      await expect(
        page.getByRole("heading", { name: /Discover Campaigns/i })
      ).toBeVisible({ timeout: 10000 });

      // Type a search query
      const searchInput = page.getByPlaceholder(/Search campaigns or businesses/i);
      await searchInput.fill("nonexistent-search-term-xyz");

      // Campaign count should update (may show 0)
      await expect(
        page.getByText(/0 campaigns from local businesses/i)
      ).toBeVisible({ timeout: 5000 });
    });

    test("clicking a campaign card opens submission modal", async ({ page }) => {
      await loginAsInfluencer(page);
      await page.getByText("Discover").first().click();

      await expect(
        page.getByRole("heading", { name: /Discover Campaigns/i })
      ).toBeVisible({ timeout: 10000 });

      // Click the first "Submit Proof" or "Apply" button on a campaign card
      const submitButton = page.getByRole("button", { name: /Submit Proof|Apply|Earn/i }).first();
      if (await submitButton.isVisible({ timeout: 5000 })) {
        await submitButton.click();

        // Submission modal should appear
        await expect(
          page.getByRole("dialog", { name: /Submit proof/i })
        ).toBeVisible({ timeout: 5000 });

        // Modal should have proof URL input
        await expect(
          page.getByLabel(/Proof URL/i)
        ).toBeVisible();

        // Close the modal
        await page.getByRole("button", { name: /Close modal/i }).click();
        await expect(
          page.getByRole("dialog", { name: /Submit proof/i })
        ).not.toBeVisible();
      }
    });

    test("submission modal validates proof URL is required", async ({ page }) => {
      await loginAsInfluencer(page);
      await page.getByText("Discover").first().click();

      await expect(
        page.getByRole("heading", { name: /Discover Campaigns/i })
      ).toBeVisible({ timeout: 10000 });

      const submitButton = page.getByRole("button", { name: /Submit Proof|Apply|Earn/i }).first();
      if (await submitButton.isVisible({ timeout: 5000 })) {
        await submitButton.click();

        // Try submitting without a proof URL
        const modalSubmit = page.getByRole("button", { name: /Submit$/i }).first();
        if (await modalSubmit.isVisible({ timeout: 3000 })) {
          await modalSubmit.click();

          // Should show validation error
          await expect(
            page.getByText(/Please provide a proof URL/i)
          ).toBeVisible();
        }
      }
    });
  });

  test.describe("Profile", () => {
    test("profile tab shows influencer details", async ({ page }) => {
      await loginAsInfluencer(page);
      await page.getByText("Profile").first().click();

      // Should show profile content
      await expect(
        page.getByText(/Profile|Bio|Location/i).first()
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Logout", () => {
    test("log out from influencer portal returns to landing", async ({ page }) => {
      await loginAsInfluencer(page);

      await page.getByRole("button", { name: /Log Out/i }).click();

      await expect(
        page.getByText("Your customers love you").first()
      ).toBeVisible({ timeout: 15000 });
    });
  });
});
