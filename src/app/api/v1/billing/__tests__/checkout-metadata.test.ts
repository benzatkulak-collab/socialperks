/**
 * create_checkout metadata test — POST /api/v1/billing { action: create_checkout }.
 *
 * Proves the OTHER half of zero-touch provisioning: the server-side Checkout
 * Session must carry metadata.businessId (+ plan + billingPeriod) so the webhook
 * can identify which business paid. Also guards the first-time-buyer customer
 * path: a brand-new business with no prior subscription must get a REAL Stripe
 * customer created (never a locally-fabricated cus_<uuid>, which Stripe rejects).
 *
 * Stripe is mocked so we can assert exactly what is sent to
 * checkout.sessions.create without a network call or live keys.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { signJWT } from "@/lib/auth";

const createSession = vi.fn();
const createCustomer = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: { create: (...args: unknown[]) => createCustomer(...args) },
    checkout: { sessions: { create: (...args: unknown[]) => createSession(...args) } },
  },
  isStripeConfigured: () => true,
}));

const BIZ = "biz_checkout_meta";

function authedCheckoutReq(body: Record<string, unknown>): NextRequest {
  const token = signJWT({
    sub: "user_checkout_meta",
    role: "business",
    email: "owner@example.com",
    businessId: BIZ,
    type: "access",
  });
  return new NextRequest("http://localhost/api/v1/billing", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  // PLANS in billing/store reads price IDs from env at module load — stub them
  // and reset the module graph so the freshly-imported route sees them.
  vi.stubEnv("STRIPE_PRICE_PROFESSIONAL_MONTHLY", "price_prof_monthly");
  vi.stubEnv("STRIPE_PRICE_PROFESSIONAL_ANNUAL", "price_prof_annual");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost");
  createCustomer.mockReset();
  createCustomer.mockResolvedValue({ id: "cus_created_1" });
  createSession.mockReset();
  createSession.mockResolvedValue({
    id: "cs_test_123",
    url: "https://checkout.stripe.com/c/pay/cs_test_123",
  });
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/v1/billing create_checkout", () => {
  it("creates a session carrying businessId + plan + billingPeriod metadata", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      authedCheckoutReq({
        action: "create_checkout",
        plan: "professional",
        billingPeriod: "annual",
        businessId: BIZ,
        successUrl: "http://localhost/dashboard?checkout=success",
        cancelUrl: "http://localhost/dashboard?checkout=cancelled",
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.sessionId).toBe("cs_test_123");
    expect(json.data.url).toContain("checkout.stripe.com");

    // The crux: the webhook keys off metadata.businessId to provision.
    expect(createSession).toHaveBeenCalledTimes(1);
    const arg = createSession.mock.calls[0][0] as {
      metadata: Record<string, string>;
      mode: string;
      customer: string;
      line_items: { price: string; quantity: number }[];
    };
    expect(arg.metadata).toEqual({
      businessId: BIZ,
      plan: "professional",
      billingPeriod: "annual",
    });
    expect(arg.mode).toBe("subscription");
    expect(arg.line_items[0].price).toBe("price_prof_annual");

    // First-time buyer: a REAL Stripe customer must be created and used.
    expect(createCustomer).toHaveBeenCalledTimes(1);
    expect(arg.customer).toBe("cus_created_1");
  });

  it("rejects an unknown plan before touching Stripe", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      authedCheckoutReq({
        action: "create_checkout",
        plan: "platinum",
        billingPeriod: "monthly",
        businessId: BIZ,
        successUrl: "http://localhost/dashboard?ok",
        cancelUrl: "http://localhost/dashboard?no",
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_PLAN");
    expect(createSession).not.toHaveBeenCalled();
  });
});
