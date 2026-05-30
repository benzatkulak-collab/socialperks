import { describe, it, expect } from "vitest";

// =============================================================================
// Stripe Integration
// =============================================================================

describe("Stripe integration", () => {
  it("stripe is null when STRIPE_SECRET_KEY is not set", async () => {
    // In the test environment, STRIPE_SECRET_KEY is not set
    const { stripe } = await import("../stripe");
    expect(stripe).toBeNull();
  });

  it("isStripeConfigured returns false without STRIPE_SECRET_KEY", async () => {
    const { isStripeConfigured } = await import("../stripe");
    expect(isStripeConfigured()).toBe(false);
  });
});
