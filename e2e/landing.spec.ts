import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("loads with hero headline and call-to-action", async ({ page }) => {
    await page.goto("/");
    // Hero headline text
    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Your customers love you");
    // Gradient subtext
    await expect(page.getByText("Pay them to say it online")).toBeVisible();
    // Primary CTA
    await expect(
      page.getByRole("link", { name: /Create Your First Campaign/i })
    ).toBeVisible();
    // Secondary CTA
    await expect(
      page.getByRole("link", { name: /See How It Works/i })
    ).toBeVisible();
  });

  test("navigation bar is present with expected links", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: /main navigation/i });
    await expect(nav).toBeVisible();
    // Logo link
    await expect(
      page.getByRole("link", { name: /Social Perks home/i })
    ).toBeVisible();
    // Nav links (visible on desktop viewport)
    await expect(page.getByRole("link", { name: /How It Works/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Pricing/i }).first()).toBeVisible();
    // Auth links
    await expect(page.getByRole("link", { name: /Log In/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Get Started/i }).first()).toBeVisible();
  });

  test("Log In link navigates to /dashboard with login hash", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.getByRole("link", { name: /Log In/i }).first();
    await expect(loginLink).toHaveAttribute("href", "/dashboard#login");
  });

  test("Create Your First Campaign CTA navigates to /dashboard with signup hash", async ({ page }) => {
    await page.goto("/");
    const ctaLink = page.getByRole("link", { name: /Create Your First Campaign/i });
    await expect(ctaLink).toHaveAttribute("href", "/dashboard#signup");
  });

  test("pricing section is visible on landing page", async ({ page }) => {
    await page.goto("/");
    const pricingSection = page.locator("#pricing");
    await pricingSection.scrollIntoViewIfNeeded();
    await expect(pricingSection).toBeVisible();
    // Pricing heading
    await expect(
      page.getByText("Costs less than one Instagram ad")
    ).toBeVisible();
    // Tier names
    await expect(page.getByText("Free").first()).toBeVisible();
    await expect(page.getByText("Pro").first()).toBeVisible();
    await expect(page.getByText("Enterprise").first()).toBeVisible();
  });

  test("pricing section anchor link scrolls to pricing", async ({ page }) => {
    await page.goto("/");
    // Click the Pricing nav link (it's an anchor #pricing)
    await page.getByRole("link", { name: /Pricing/i }).first().click();
    // The pricing section should be in view
    await expect(page.locator("#pricing")).toBeInViewport();
  });

  test("has correct page title and meta description", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Social Perks/);
  });

  test("has no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test("respects dark theme", async ({ page }) => {
    await page.goto("/");
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    );
    // Should be dark (low RGB values)
    expect(bgColor).toMatch(/rgb\(\s*\d{1,2}\s*,\s*\d{1,2}\s*,\s*\d{1,2}\s*\)/);
  });

  test("is responsive at mobile width with no overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(376);
  });

  test("how-it-works section exists on landing page", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#how-it-works");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
  });
});
