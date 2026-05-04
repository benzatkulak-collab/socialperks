import { test, expect, Page } from "@playwright/test";

/**
 * Helper: navigate to the login form on /dashboard.
 * The SocialPerksApp first shows a loading state while restoring session,
 * then lands on the "landing" screen. The #login hash triggers the auth form.
 */
async function goToLoginForm(page: Page) {
  await page.goto("/dashboard#login");
  // Wait for the auth form to appear (the "Welcome back" heading)
  await expect(
    page.getByRole("heading", { name: /Welcome back/i })
  ).toBeVisible({ timeout: 15000 });
}

test.describe("Authentication", () => {
  test.describe("Login", () => {
    test("login form displays email and password fields", async ({ page }) => {
      await goToLoginForm(page);
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /^Log In$/i })
      ).toBeVisible();
    });

    test("login with demo business account (yoga@demo.com)", async ({ page }) => {
      await goToLoginForm(page);

      // Fill credentials
      await page.getByPlaceholder(/you@yourbusiness\.com/i).fill("yoga@demo.com");
      await page.getByPlaceholder(/at least 8 characters/i).fill("1234");

      // Submit
      await page.getByRole("button", { name: /Log In/i }).click();

      // Should transition to business portal showing the business name
      await expect(
        page.getByText(/Yoga|Log Out/i).first()
      ).toBeVisible({ timeout: 15000 });

      // The Log Out button confirms we are in an authenticated portal
      await expect(
        page.getByRole("button", { name: /Log Out/i })
      ).toBeVisible();
    });

    test("login with demo influencer account (priya@demo.com)", async ({ page }) => {
      await goToLoginForm(page);

      await page.getByPlaceholder(/you@yourbusiness\.com/i).fill("priya@demo.com");
      await page.getByPlaceholder(/at least 8 characters/i).fill("1234");

      await page.getByRole("button", { name: /Log In/i }).click();

      // Should transition to influencer portal showing creator dashboard
      await expect(
        page.getByText(/Priya|creator|Dashboard/i).first()
      ).toBeVisible({ timeout: 15000 });

      await expect(
        page.getByRole("button", { name: /Log Out/i })
      ).toBeVisible();
    });

    test("login with wrong credentials shows error", async ({ page }) => {
      await goToLoginForm(page);

      await page.getByPlaceholder(/you@yourbusiness\.com/i).fill("wrong@email.com");
      await page.getByPlaceholder(/at least 8 characters/i).fill("wrongpass");

      await page.getByRole("button", { name: /Log In/i }).click();

      // Error message should appear
      await expect(
        page.getByRole("alert")
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText(/invalid|wrong|error/i).first()
      ).toBeVisible();
    });

    test("login with empty email shows validation error", async ({ page }) => {
      await goToLoginForm(page);

      // Leave email empty, fill password
      await page.getByPlaceholder(/at least 8 characters/i).fill("1234");
      await page.getByRole("button", { name: /Log In/i }).click();

      await expect(
        page.getByText(/email is required/i)
      ).toBeVisible();
    });

    test("login with empty password shows validation error", async ({ page }) => {
      await goToLoginForm(page);

      await page.getByPlaceholder(/you@yourbusiness\.com/i).fill("yoga@demo.com");
      // Leave password empty
      await page.getByRole("button", { name: /Log In/i }).click();

      await expect(
        page.getByText(/password is required/i)
      ).toBeVisible();
    });

    test("demo account hint is togglable", async ({ page }) => {
      await goToLoginForm(page);

      // Demo section should have a toggle
      const demoToggle = page.getByRole("button", { name: /Try a demo account/i });
      await expect(demoToggle).toBeVisible();

      // Click to show demo info
      await demoToggle.click();
      await expect(page.getByText(/Password for all: 1234/i)).toBeVisible();
      await expect(page.getByText(/yoga@demo\.com/i)).toBeVisible();

      // Click to hide
      const hideToggle = page.getByRole("button", { name: /Hide demo accounts/i });
      await hideToggle.click();
      await expect(page.getByText(/Password for all: 1234/i)).not.toBeVisible();
    });
  });

  test.describe("Signup", () => {
    test("navigating to signup shows role selection", async ({ page }) => {
      await goToLoginForm(page);

      // Click "Sign up free" link
      await page.getByRole("button", { name: /Sign up free/i }).click();

      // Should see the role selection screen
      await expect(
        page.getByRole("heading", { name: /Create your account/i })
      ).toBeVisible();
      await expect(page.getByText(/I'm a business/i)).toBeVisible();
      await expect(page.getByText(/I'm a creator/i)).toBeVisible();
    });

    test("selecting business role shows signup form with business fields", async ({ page }) => {
      await goToLoginForm(page);
      await page.getByRole("button", { name: /Sign up free/i }).click();

      // Select business role
      await page.getByText(/I'm a business/i).click();

      // Should see the business signup form
      await expect(
        page.getByRole("heading", { name: /Set up your business/i })
      ).toBeVisible();
      await expect(page.getByText("Business Name")).toBeVisible();
      await expect(page.getByText("Business Type")).toBeVisible();
      await expect(page.getByText("Email")).toBeVisible();
      await expect(page.getByText("Password")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Create Free Account/i })
      ).toBeVisible();
    });

    test("selecting creator role shows signup form with creator fields", async ({ page }) => {
      await goToLoginForm(page);
      await page.getByRole("button", { name: /Sign up free/i }).click();

      // Select creator role
      await page.getByText(/I'm a creator/i).click();

      // Should see the creator signup form
      await expect(
        page.getByRole("heading", { name: /Create your creator profile/i })
      ).toBeVisible();
      await expect(page.getByText("Display Name")).toBeVisible();
      await expect(page.getByText("Email")).toBeVisible();
      await expect(page.getByText("Password")).toBeVisible();
    });

    test("signup validates required fields", async ({ page }) => {
      await goToLoginForm(page);
      await page.getByRole("button", { name: /Sign up free/i }).click();
      await page.getByText(/I'm a business/i).click();

      // Try submitting empty form
      await page.getByRole("button", { name: /Create Free Account/i }).click();

      // Should show validation error for name
      await expect(
        page.getByText(/name is required/i)
      ).toBeVisible();
    });

    test("signup with new business account succeeds", async ({ page }) => {
      await goToLoginForm(page);
      await page.getByRole("button", { name: /Sign up free/i }).click();
      await page.getByText(/I'm a business/i).click();

      // Fill in all required fields
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await page.getByPlaceholder(/Maria's Coffee Shop/i).fill("Test E2E Business");
      await page.getByPlaceholder(/Coffee Shop, Yoga Studio/i).fill("Test Shop");
      await page.getByPlaceholder(/you@email\.com/i).fill(uniqueEmail);
      await page.getByPlaceholder(/At least 8 characters/i).fill("testpassword123");

      await page.getByRole("button", { name: /Create Free Account/i }).click();

      // Should transition to business portal
      await expect(
        page.getByRole("button", { name: /Log Out/i })
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("Logout", () => {
    test("logout returns to landing page", async ({ page }) => {
      // First login
      await goToLoginForm(page);
      await page.getByPlaceholder(/you@yourbusiness\.com/i).fill("yoga@demo.com");
      await page.getByPlaceholder(/at least 8 characters/i).fill("1234");
      await page.getByRole("button", { name: /Log In/i }).click();

      // Wait for portal — Log Out button exists once authed (may be covered
      // by the onboarding wizard modal, but it is in the DOM)
      await expect(
        page.getByRole("button", { name: /Log Out/i })
      ).toBeVisible({ timeout: 15000 });

      // Dismiss the onboarding wizard if it's blocking interaction
      const wizard = page.getByRole("dialog", { name: /Onboarding wizard/i });
      if (await wizard.isVisible().catch(() => false)) {
        await page.getByRole("button", { name: /Skip for now/i }).click();
        await expect(wizard).not.toBeVisible();
      }

      // Click logout
      await page.getByRole("button", { name: /Log Out/i }).click();

      // Should be back on the landing page with the hero
      await expect(
        page.getByText("Your customers love you").first()
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("Forgot Password", () => {
    test("forgot password flow shows reset confirmation", async ({ page }) => {
      await goToLoginForm(page);

      await page.getByRole("button", { name: /Forgot password\?/i }).click();

      // Should see reset password form
      await expect(
        page.getByRole("heading", { name: /Reset your password/i })
      ).toBeVisible();

      await page.getByPlaceholder(/you@yourbusiness\.com/i).fill("yoga@demo.com");
      await page.getByRole("button", { name: /Send Reset Link/i }).click();

      // Should show success confirmation
      await expect(
        page.getByText(/Check your email/i)
      ).toBeVisible({ timeout: 10000 });
    });
  });
});
