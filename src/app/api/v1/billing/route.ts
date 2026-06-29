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
  hydrateSubscriptions,
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

    // SECURITY: Reject open-redirect URLs. Stripe redirects users to whatever
    // success/cancel URL we pass, so attacker-supplied hosts enable phishing
    // (capturing session_id post-checkout). Both URLs must point at THIS site —
    // but "this site" legitimately includes the apex, www, Vercel preview/alias
    // hosts, and localhost. Derive the allow-set from the request's own host
    // plus configured env (www-normalized) so the guard never blocks a real
    // checkout on www/preview, while still refusing arbitrary external hosts.
    const stripWww = (h: string) => h.replace(/^www\./i, "");
    const allowedHosts = new Set<string>();
    for (const raw of [
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : null,
      req.headers.get("origin"),
      req.headers.get("host") ? `https://${req.headers.get("host")}` : null,
    ]) {
      if (!raw) continue;
      try {
        allowedHosts.add(stripWww(new URL(raw).host));
      } catch {
        /* ignore unparseable */
      }
    }
    for (const [name, value] of [["successUrl", successUrl], ["cancelUrl", cancelUrl]] as const) {
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        return err("INVALID_URL", `${name} is not a valid URL`, 400);
      }
      if (allowedHosts.size > 0 && !allowedHosts.has(stripWww(parsed.host))) {
        return err("INVALID_URL", `${name} must point at this site`, 400);
      }
    }

    // Warm the subscription cache so the customer-reuse loop below finds an
    // existing Stripe customer for a returning business (avoids minting a
    // duplicate Stripe Customer on every cold-start checkout).
    await hydrateSubscriptions();
    const customerId = getOrCreateCustomerId(businessId);
    const planConfig = PLANS[plan];
    const priceId =
      billingPeriod === "annual"
        ? planConfig.annualPriceId
        : planConfig.monthlyPriceId;

    // Stripe is live but this plan/period has no price ID configured. Refuse
    // clearly instead of handing Stripe a bogus id (which 502s mid-checkout)
    // or falling through to a fake/mock success URL and burning the customer.
    if (stripe && isStripeConfigured() && !priceId) {
      return err(
        "BILLING_NOT_CONFIGURED",
        `The ${plan} (${billingPeriod}) plan isn't available for purchase yet. Please reach out and we'll get you set up.`,
        503,
      );
    }

    // Real Stripe when configured
    if (stripe && isStripeConfigured() && priceId) {
      try {
        // Resolve a REAL Stripe customer. Reuse the one from a prior
        // (webhook-provisioned) subscription if present; otherwise create one
        // now. CRITICAL: never pass a locally-fabricated "cus_<uuid>" (what
        // getOrCreateCustomerId returns for a brand-new business) to Stripe —
        // it isn't a real Stripe customer, so checkout.sessions.create would
        // fail with "No such customer", breaking every first-time buyer in the
        // signup->checkout funnel.
        let stripeCustomerId: string | undefined;
        for (const sub of subscriptions.values()) {
          if (sub.businessId === businessId && sub.customerId.startsWith("cus_")) {
            stripeCustomerId = sub.customerId;
            break;
          }
        }
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            metadata: { businessId },
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

        // mode is derived from the secret key prefix so the frontend can
        // surface a clear test/live indicator without reading env vars.
        const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
        const mode: "live" | "test" =
          stripeKey.startsWith("sk_live_") ? "live" : "test";
        return ok({
          sessionId: session.id,
          url: session.url,
          plan,
          billingPeriod,
          customerId: stripeCustomerId,
          mode,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Stripe checkout failed";
        return err("STRIPE_ERROR", message, 502);
      }
    }

    // Stripe not configured. In production this is a hard error —
    // returning a fake checkout URL would silently fail at payment time
    // and burn a real customer. Refuse to pretend.
    if (process.env.NODE_ENV === "production") {
      return err(
        "BILLING_UNAVAILABLE",
        "Billing isn't configured on this server yet. Email us if you'd like to be one of the first paying customers.",
        503,
      );
    }

    // Dev/staging only: return a clearly-labeled mock URL so local UX
    // testing isn't blocked. Frontend renders a "demo mode" notice.
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
      mode: "demo" as const,
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

    // Ensure the in-memory cache is warm before reading it. On a serverless
    // cold start the Map is empty until hydrated from Postgres; without this
    // await a paying customer's dashboard would briefly report "free".
    await hydrateSubscriptions();

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

  // ── get_usage ───────────────────────────────────────────────────────────
  // Returns current-month usage (campaigns / completions / AI generations)
  // alongside the plan's limits so the dashboard can render usage bars and
  // upgrade prompts. Tenant-isolated — only the caller's own business.
  if (action === "get_usage") {
    const { businessId } = body;
    if (!businessId) {
      return err("MISSING_BUSINESS_ID", "businessId is required", 400);
    }
    const usageAccess = checkResourceAccess(tenant, businessId);
    if (usageAccess) return usageAccess;

    // Warm the subscription cache first (mirrors get_subscription) so a paying
    // customer's dashboard isn't shown "free" limits on a cold serverless
    // instance before hydration races in.
    await hydrateSubscriptions();
    // Lazy import to keep getUsageSummary out of the critical path of
    // create_checkout/create_portal which don't need it.
    const { getUsageSummary, getBusinessPlan, getPlanLimits } = await import(
      "@/lib/billing/enforcement"
    );
    const plan = getBusinessPlan(businessId);
    const limits = getPlanLimits(plan);
    const usage = getUsageSummary(businessId);

    // Replace Infinity with null for JSON-friendly transport. Clients
    // render "unlimited" when limit is null.
    const safe = (n: number) => (Number.isFinite(n) ? n : null);
    return ok({
      plan,
      limits: {
        maxCampaigns: safe(limits.maxCampaigns),
        maxCompletionsPerMonth: safe(limits.maxCompletionsPerMonth),
        maxActions: safe(limits.maxActions),
        aiGenerations: safe(limits.aiGenerations),
        hasAnalytics: limits.hasAnalytics,
        hasApiAccess: limits.hasApiAccess,
        hasQrCodes: limits.hasQrCodes,
      },
      usage: {
        month: usage.month,
        campaigns: { used: usage.campaigns.used, limit: safe(usage.campaigns.limit) },
        completions: { used: usage.completions.used, limit: safe(usage.completions.limit) },
        aiGenerations: { used: usage.aiGenerations.used, limit: safe(usage.aiGenerations.limit) },
      },
    });
  }

  return err("INVALID_ACTION", `Unknown action: '${action}'. Valid actions: create_checkout, create_portal, get_subscription, get_usage`, 400);
});
