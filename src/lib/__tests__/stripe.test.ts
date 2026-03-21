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

  it("PLANS object has expected plan names", async () => {
    const { PLANS } = await import("../stripe");

    expect(PLANS.free.name).toBe("Free");
    expect(PLANS.starter.name).toBe("Starter");
    expect(PLANS.pro.name).toBe("Pro");
    expect(PLANS.enterprise.name).toBe("Enterprise");
  });

  it("PLANS have correct campaign limits", async () => {
    const { PLANS } = await import("../stripe");

    expect(PLANS.free.maxCampaigns).toBe(3);
    expect(PLANS.starter.maxCampaigns).toBe(10);
    expect(PLANS.pro.maxCampaigns).toBe(50);
    expect(PLANS.enterprise.maxCampaigns).toBe(Infinity);
  });
});
