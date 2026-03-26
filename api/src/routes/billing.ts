import crypto from "crypto";
import { Hono } from "hono";
import { apiResponse, apiError } from "../helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { PLANS, subscriptions, generateStripeId, getOrCreateCustomerId, type Subscription } from "@/lib/billing/store";
import { tenantManager } from "@/lib/multi-tenant";
import type { TenantPlan } from "@/lib/multi-tenant";
import { logger } from "@/lib/logging";

const app = new Hono();

// POST /v1/billing — Subscription management
app.post("/", rateLimit("standard"), requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const action = body.action;
    const userId = c.get("userId");

    if (!action || typeof action !== "string") return apiError(c, "MISSING_ACTION", "action is required (create_checkout, create_portal, get_subscription)");

    switch (action) {
      case "create_checkout": {
        const planTier = body.plan as string;
        const billingPeriod = (body.billingPeriod as string) ?? "monthly";
        if (!planTier || !PLANS[planTier]) return apiError(c, "INVALID_PLAN", `plan must be one of: ${Object.keys(PLANS).join(", ")}`);
        if (billingPeriod !== "monthly" && billingPeriod !== "annual") return apiError(c, "INVALID_PERIOD", "billingPeriod must be 'monthly' or 'annual'");
        const plan = PLANS[planTier];
        const priceId = billingPeriod === "annual" ? plan.annualPriceId : plan.monthlyPriceId;
        const businessId = body.businessId ?? userId ?? "unknown";
        const customerId = getOrCreateCustomerId(businessId);
        const sessionId = generateStripeId("cs");
        const session = { id: sessionId, object: "checkout.session", url: `https://checkout.stripe.com/c/pay/${sessionId}`, mode: "subscription", status: "open", customer: customerId, client_reference_id: businessId, line_items: [{ price: priceId, quantity: 1, description: `${plan.name} (${billingPeriod})` }], amount_total: billingPeriod === "annual" ? plan.annualPrice * 100 : plan.monthlyPrice * 100, currency: "usd", success_url: `${body.successUrl ?? "http://localhost:3000"}?session_id=${sessionId}`, cancel_url: body.cancelUrl ?? "http://localhost:3000/pricing", expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() };
        try { const validTenantPlans: TenantPlan[] = ["starter", "professional", "enterprise"]; if (validTenantPlans.includes(planTier as TenantPlan)) { const tenant = tenantManager.getBySlug(businessId); if (tenant) tenantManager.update(tenant.id, { plan: planTier as TenantPlan }); } } catch { /* best-effort */ }
        return apiResponse(c, { session });
      }
      case "create_portal": {
        const businessId = body.businessId ?? userId ?? "unknown";
        const customerId = getOrCreateCustomerId(businessId);
        const portalSessionId = generateStripeId("bps");
        return apiResponse(c, { portalSession: { id: portalSessionId, object: "billing_portal.session", url: `https://billing.stripe.com/p/session/${portalSessionId}`, customer: customerId, return_url: body.returnUrl ?? "http://localhost:3000/settings", created: Math.floor(Date.now() / 1000) } });
      }
      case "get_subscription": {
        const businessId = body.businessId ?? userId ?? "unknown";
        let currentSub: Subscription | null = null;
        for (const sub of subscriptions.values()) { if (sub.businessId === businessId && sub.status !== "canceled") { currentSub = sub; break; } }
        if (!currentSub) return apiResponse(c, { subscription: null, plan: "free", message: "No active subscription. Using free tier." });
        const planConfig = PLANS[currentSub.plan];
        return apiResponse(c, { subscription: { id: currentSub.id, plan: currentSub.plan, planName: planConfig?.name ?? currentSub.plan, billingPeriod: currentSub.billingPeriod, status: currentSub.status, currentPeriodStart: currentSub.currentPeriodStart, currentPeriodEnd: currentSub.currentPeriodEnd, cancelAtPeriodEnd: currentSub.cancelAtPeriodEnd, features: planConfig?.features ?? [] } });
      }
      default:
        return apiError(c, "INVALID_ACTION", `Unknown action: ${action}. Use create_checkout, create_portal, or get_subscription.`);
    }
  } catch (err) {
    logger.error("Billing request failed", err);
    return apiError(c, "BILLING_ERROR", "Failed to process billing request", 500);
  }
});

// POST /v1/billing/webhook — Stripe webhook handler (no auth, verified by signature)
app.post("/webhook", async (c) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_demo_secret";
  try {
    const rawBody = await c.req.text();
    const signatureHeader = c.req.header("stripe-signature");

    if (!signatureHeader) return c.json({ error: "Missing Stripe-Signature header" }, 400);
    const elements = signatureHeader.split(",");
    const tsElement = elements.find((e) => e.startsWith("t="));
    const sigElement = elements.find((e) => e.startsWith("v1="));
    if (!tsElement || !sigElement) return c.json({ error: "Invalid signature format" }, 400);
    const timestamp = parseInt(tsElement.slice(2), 10);
    if (isNaN(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return c.json({ error: "Webhook timestamp outside tolerance window" }, 400);
    const expectedSig = crypto.createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");
    const sigValue = sigElement.slice(3);
    const hexPattern = /^[0-9a-f]+$/i;
    if (!hexPattern.test(sigValue) || expectedSig.length !== sigValue.length) return c.json({ error: "Invalid signature" }, 400);
    try { if (!crypto.timingSafeEqual(Buffer.from(expectedSig, "hex"), Buffer.from(sigValue, "hex"))) return c.json({ error: "Invalid signature" }, 400); } catch { return c.json({ error: "Invalid signature" }, 400); }

    const event = JSON.parse(rawBody);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer as string;
        const businessId = (session.client_reference_id as string) ?? customerId;
        const subscriptionId = (session.subscription as string) ?? generateStripeId("sub");
        const metadata = (session.metadata as Record<string, string>) ?? {};
        const planTier = metadata.plan ?? "starter";
        const billingPeriod = (metadata.billing_period as "monthly" | "annual") ?? "monthly";
        const now = new Date(); const periodEnd = new Date(now); billingPeriod === "annual" ? periodEnd.setFullYear(periodEnd.getFullYear() + 1) : periodEnd.setMonth(periodEnd.getMonth() + 1);
        subscriptions.set(businessId, { id: subscriptionId, businessId, customerId, plan: planTier, billingPeriod, status: "active", currentPeriodStart: now.toISOString(), currentPeriodEnd: periodEnd.toISOString(), cancelAtPeriodEnd: false, createdAt: now.toISOString() });
        return c.json({ received: true, action: "subscription_activated", subscriptionId, plan: planTier });
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer as string;
        let existingSub: Subscription | null = null; let subKey: string | null = null;
        for (const [key, s] of subscriptions.entries()) { if (s.customerId === customerId || s.id === sub.id) { existingSub = s; subKey = key; break; } }
        if (existingSub && subKey) {
          const items = sub.items?.data; const newPriceId = items?.[0]?.price?.id;
          let newPlan = existingSub.plan; if (newPriceId) { for (const [tier, config] of Object.entries(PLANS)) { if (config.monthlyPriceId === newPriceId || config.annualPriceId === newPriceId) { newPlan = tier; break; } } }
          subscriptions.set(subKey, { ...existingSub, plan: newPlan, status: sub.status ?? existingSub.status, cancelAtPeriodEnd: sub.cancel_at_period_end ?? existingSub.cancelAtPeriodEnd, currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : existingSub.currentPeriodStart, currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : existingSub.currentPeriodEnd });
          return c.json({ received: true, action: "subscription_updated", plan: newPlan });
        }
        return c.json({ received: true, action: "subscription_update_skipped", reason: "subscription_not_found" });
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object; const customerId = sub.customer as string;
        for (const [key, s] of subscriptions.entries()) { if (s.customerId === customerId || s.id === sub.id) { subscriptions.set(key, { ...s, status: "canceled", cancelAtPeriodEnd: false }); return c.json({ received: true, action: "subscription_canceled", businessId: s.businessId, previousPlan: s.plan }); } }
        return c.json({ received: true, action: "subscription_delete_skipped", reason: "subscription_not_found" });
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object; const customerId = invoice.customer as string;
        for (const [key, s] of subscriptions.entries()) { if (s.customerId === customerId || s.id === invoice.subscription) { subscriptions.set(key, { ...s, status: "past_due" }); return c.json({ received: true, action: "payment_failed", businessId: s.businessId, plan: s.plan, status: "past_due" }); } }
        return c.json({ received: true, action: "payment_failure_skipped", reason: "subscription_not_found" });
      }
      default:
        return c.json({ received: true, action: "ignored", eventType: event.type });
    }
  } catch (err) {
    logger.error("Billing webhook processing failed", err);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

export default app;
