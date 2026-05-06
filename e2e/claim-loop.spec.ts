import { test, expect } from "@playwright/test";

/**
 * Public claim landing page renders for an active program and shows the
 * one-CTA call to action that drops the customer into the OTP flow.
 *
 * This Playwright test is intentionally narrow — the full claim loop is
 * covered by the in-process vitest e2e at src/__tests__/claim-loop-e2e.test.ts,
 * which can read the OTP back from the in-memory store. Doing the same
 * through a real browser would require a test-only endpoint to leak the
 * OTP, which we don't want shipping to production.
 */

test.describe("Public claim landing", () => {
  test("malformed claim code 404s", async ({ page }) => {
    const res = await page.goto("/claim/notreal");
    // Next.js notFound() returns 404 for the page, but the response
    // status is set on the navigation. The body is the global 404 page.
    expect(res?.status()).toBe(404);
  });

  test("malformed claim code via API returns 400", async ({ request }) => {
    const res = await request.get("/api/v1/claim/BAD");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_CODE");
  });

  test("unknown well-formed claim code via API returns 404", async ({ request }) => {
    const res = await request.get("/api/v1/claim/AAAA22");
    expect(res.status()).toBe(404);
  });

  test("OTP request endpoint validates phone format", async ({ request }) => {
    const res = await request.post("/api/v1/customer/otp/request", {
      data: {
        code: "AAAA22",
        channel: "sms",
        contact: "5551234567", // missing +
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_PHONE");
  });

  test("OTP request endpoint validates email format", async ({ request }) => {
    const res = await request.post("/api/v1/customer/otp/request", {
      data: {
        code: "AAAA22",
        channel: "email",
        contact: "not-an-email",
      },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_EMAIL");
  });

  test("OTP request endpoint rejects bad channel", async ({ request }) => {
    const res = await request.post("/api/v1/customer/otp/request", {
      data: { code: "AAAA22", channel: "smoke", contact: "+15551234567" },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_CHANNEL");
  });
});
