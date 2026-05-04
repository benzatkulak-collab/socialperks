/**
 * POST /api/v1/billing
 *
 * Subscription management endpoint.
 * Actions: create_checkout, create_portal, get_subscription.
 *
 * Uses real Stripe when STRIPE_SECRET_KEY is set, falls back to mock URLs otherwise.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ok,
  err,
  rateLimit,
  parseBody,
  withTiming,
} from "../_shared";
import { withTenant, checkResourceAccess } from "../_tenant";
import {
  PLANS,
  subscriptions,
  generateStripeId,
  getOrCreateCustomerId,
  type Subscription,
} from "@/lib/billing/store";
import { stripe, isStripeConfigured } from "@/lib/stripe";

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth + tenant isolation
  const tenantResult = withTenant(req);
  if (tenantResult instanceof NextResponse) return tenantResult;
  const { tenant } = tenantResult;

  // Rate limit — standard
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // Parse body
  const body = await parseBody<{
    action: string;
    plan?: string;
    billingPeriod?: "monthly" | "annual";
    businessId?: string;
    successUrl?: string;
    cancelUrl?: string;
    returnUrl?: string;
  }>(req);
  if (body instanceof Response) return body;

  const { action } = body;

  // ── create_checkout ─────────────────────────────────────────────────────
  if (action === "create_checkout") {
    const { plan, billingPeriod, businessId, successUrl, cancelUrl } = body;

    if (!plan || !PLANS[plan]) {
      return err(
        "INVALID_PLAN",
        `Invalid plan. Valid plans: ${Object.keys(PLANS).join(", ")}`,
        400
      );
    }
    if (!billingPeriod || !["monthly", "annual"].includes(billingPeriod)) {
      return err("INVALID_BILLING_PERIOD", "billingPeriod must be 'monthly' or 'annual'", 400);
    }
    if (!businessId) {
      return err("MISSING_BUSINESS_ID", "businessId is required", 400);
    }
    // Tenant isolation: only manage billing for your own business
    const checkoutAccess = checkResourceAccess(tenant, businessId);
    if (checkoutAccess) return checkoutAccess;

    if (!successUrl || !cancelUrl) {
      return err("MISSING_URLS", "successUrl and cancelUrl are required", 400);
    }

    const customerId = getOrCreateCustomerId(businessId);
    const planConfig = PLANS[plan];
    const priceId =
      billingPeriod === "annual"
        ? planConfig.annualPriceId
        : planConfig.monthlyPriceId;

    // Real Stripe when configured
    if (stripe && isStripeConfigured() && priceId) {
      try {
        // Ensure Stripe customer exists
        let stripeCustomerId = customerId;
        if (!customerId.startsWith("cus_")) {
          const customer = await stripe.customers.create({
            metadata: { businessId, internalId: customerId },
          });
          stripeCustomerId = customer.id;
        }

        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          mode: "subscription",
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: { businessId, plan, billingPeriod },
        });

        return ok({
          sessionId: session.id,
          url: session.url,
          plan,
          billingPeriod,
          customerId: stripeCustomerId,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Stripe checkout failed";
        return err("STRIPE_ERROR", message, 502);
      }
    }

    // Mock checkout session
    const sessionId = generateStripeId("cs");
    const checkoutUrl = `https://checkout.stripe.com/c/pay/${sessionId}#fidkd2F0YHwnPyd1blpxYHZxWjA0T` +
      `&plan=${plan}&period=${billingPeriod}&price=${priceId}`;

    return ok({
      sessionId,
      url: checkoutUrl,
      plan,
      billingPeriod,
      customerId,
      mock: true,
    });
  }

  // ── create_portal ───────────────────────────────────────────────────────
  if (action === "create_portal") {
    const { businessId, returnUrl } = body;

    if (!businessId) {
      return err("MISSING_BUSINESS_ID", "businessId is required", 400);
    }
    // Tenant isolation: only manage billing for your own business
    const portalAccess = checkResourceAccess(tenant, businessId);
    if (portalAccess) return portalAccess;

    if (!returnUrl) {
      return err("MISSING_RETURN_URL", "returnUrl is required", 400);
    }

    const customerId = getOrCreateCustomerId(businessId);

    // Real Stripe when configured
    if (stripe && isStripeConfigured() && customerId.startsWith("cus_")) {
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl,
        });

        return ok({
          sessionId: session.id,
          url: session.url,
          customerId,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Stripe portal failed";
        return err("STRIPE_ERROR", message, 502);
      }
    }

    // Mock portal session
    const portalSessionId = generateStripeId("bps");
    const portalUrl = `https://billing.stripe.com/p/session/${portalSessionId}`;

    return ok({
      sessionId: portalSessionId,
      url: portalUrl,
      customerId,
      mock: true,
    });
  }

  // ── get_subscription ────────────────────────────────────────────────────
  if (action === "get_subscription") {
    const { businessId } = body;

    if (!businessId) {
      return err("MISSING_BUSINESS_ID", "businessId is required", 400);
    }
    // Tenant isolation: only view billing for your own business
    const subAccess = checkResourceAccess(tenant, businessId);
    if (subAccess) return subAccess;

    // Find active subscription for business
    let activeSub: Subscription | null = null;
    for (const sub of subscriptions.values()) {
      if (sub.businessId === businessId && sub.status !== "canceled") {
        activeSub = sub;
        break;
      }
    }

    if (!activeSub) {
      return ok({ subscription: null, plan: "free" });
    }

    return ok({
      subscription: activeSub,
      plan: activeSub.plan,
    });
  }

  return err("INVALID_ACTION", `Unknown action: '${action}'. Valid actions: create_checkout, create_portal, get_subscription`, 400);
});
