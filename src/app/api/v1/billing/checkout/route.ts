/**
 * POST /api/v1/billing/checkout
 *
 * Creates a Stripe Checkout Session for upgrading to a paid plan.
 * Body: { plan: "pro" | "enterprise", interval: "monthly" | "annual" }
 *
 * When STRIPE_SECRET_KEY is not configured, returns a mock checkout URL
 * pointing at the simulated success page so dev/demo flows keep working.
 */

import type { NextRequest } from "next/server";
import { ok, err, withTiming, requireAuth, parseBody } from "../../_shared";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { getOrCreateCustomerId } from "@/lib/billing/store";

type Plan = "pro" | "enterprise";
type Interval = "monthly" | "annual";

interface CheckoutBody {
  plan?: Plan;
  interval?: Interval;
}

const PRICE_ID_MAP: Record<Plan, Record<Interval, string | undefined>> = {
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
  },
};

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const POST = withTiming(async (req: NextRequest) => {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const body = await parseBody<CheckoutBody>(req);
  const plan = body?.plan;
  const interval = body?.interval ?? "monthly";

  if (plan !== "pro" && plan !== "enterprise") {
    return err("INVALID_PLAN", "plan must be 'pro' or 'enterprise'", 400);
  }
  if (interval !== "monthly" && interval !== "annual") {
    return err("INVALID_INTERVAL", "interval must be 'monthly' or 'annual'", 400);
  }

  const appUrl = getAppUrl();
  const successUrl = `${appUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/upgrade?cancelled=1`;

  // ─── Mock mode: no Stripe configured ─────────────────────────────────────
  if (!stripe || !isStripeConfigured()) {
    const mockSessionId = `cs_mock_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    return ok({
      url: `${appUrl}/upgrade/success?session_id=${mockSessionId}&mock=1&plan=${plan}&interval=${interval}`,
      sessionId: mockSessionId,
      mock: true,
    });
  }

  // ─── Real Stripe checkout ────────────────────────────────────────────────
  const priceId = PRICE_ID_MAP[plan][interval];
  if (!priceId) {
    return err(
      "PRICE_NOT_CONFIGURED",
      `Stripe price ID is not configured for plan=${plan} interval=${interval}`,
      500
    );
  }

  try {
    const customerId = getOrCreateCustomerId(user.businessId ?? user.id);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: {
        userId: user.id,
        businessId: user.businessId ?? "",
        plan,
        interval,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          businessId: user.businessId ?? "",
          plan,
          interval,
          customerId,
        },
      },
    });

    return ok({
      url: session.url,
      sessionId: session.id,
      mock: false,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown Stripe error";
    return err("STRIPE_ERROR", message, 502);
  }
});
