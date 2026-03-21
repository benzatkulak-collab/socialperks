import { NextRequest } from "next/server";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import {
  PLANS,
  subscriptions,
  generateStripeId,
  getOrCreateCustomerId,
  type Subscription,
} from "@/lib/billing/store";
import { tenantManager } from "@/lib/multi-tenant";
import type { TenantPlan } from "@/lib/multi-tenant";
import { logger } from "@/lib/logging";

/**
 * POST /api/v1/billing — Manage subscriptions
 *
 * Actions:
 *   - "create_checkout" — Create a Stripe Checkout Session
 *   - "create_portal" — Create a Stripe Customer Portal session
 *   - "get_subscription" — Get current subscription status
 */
export async function POST(request: NextRequest) {
  const startTime = performance.now();
  logger.info("POST /api/v1/billing", { method: "POST", path: "/api/v1/billing" });

  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const action = body.action;

    if (!action || typeof action !== "string") {
      return apiError("MISSING_ACTION", "action is required (create_checkout, create_portal, get_subscription)");
    }

    switch (action) {
      case "create_checkout": {
        const planTier = body.plan as string;
        const billingPeriod = (body.billingPeriod as string) ?? "monthly";

        if (!planTier || !PLANS[planTier]) {
          return apiError(
            "INVALID_PLAN",
            `plan must be one of: ${Object.keys(PLANS).join(", ")}`
          );
        }

        if (billingPeriod !== "monthly" && billingPeriod !== "annual") {
          return apiError("INVALID_PERIOD", "billingPeriod must be 'monthly' or 'annual'");
        }

        const plan = PLANS[planTier];
        const priceId = billingPeriod === "annual" ? plan.annualPriceId : plan.monthlyPriceId;
        const businessId = body.businessId ?? auth.userId ?? "unknown";
        const customerId = getOrCreateCustomerId(businessId);

        // Mock Stripe Checkout Session
        const sessionId = generateStripeId("cs");
        const session = {
          id: sessionId,
          object: "checkout.session",
          url: `https://checkout.stripe.com/c/pay/${sessionId}`,
          mode: "subscription",
          status: "open",
          customer: customerId,
          client_reference_id: businessId,
          line_items: [
            {
              price: priceId,
              quantity: 1,
              description: `${plan.name} (${billingPeriod})`,
            },
          ],
          amount_total: billingPeriod === "annual" ? plan.annualPrice * 100 : plan.monthlyPrice * 100,
          currency: "usd",
          success_url: `${body.successUrl ?? "http://localhost:3000"}?session_id=${sessionId}`,
          cancel_url: body.cancelUrl ?? "http://localhost:3000/pricing",
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };

        // Update tenant plan and limits when subscription is created
        try {
          const validTenantPlans: TenantPlan[] = ["starter", "professional", "enterprise"];
          if (validTenantPlans.includes(planTier as TenantPlan)) {
            // Try to find the tenant by business ID slug and update their plan
            const tenant = tenantManager.getBySlug(businessId);
            if (tenant) {
              tenantManager.update(tenant.id, { plan: planTier as TenantPlan });
              logger.info("Tenant plan updated via billing", { tenantId: tenant.id, plan: planTier });
            }
          }
        } catch {
          // Tenant update is best-effort — subscription is the source of truth
        }

        return apiResponse({ session });
      }

      case "create_portal": {
        const businessId = body.businessId ?? auth.userId ?? "unknown";
        const customerId = getOrCreateCustomerId(businessId);

        // Mock Stripe Customer Portal session
        const portalSessionId = generateStripeId("bps");
        const portalSession = {
          id: portalSessionId,
          object: "billing_portal.session",
          url: `https://billing.stripe.com/p/session/${portalSessionId}`,
          customer: customerId,
          return_url: body.returnUrl ?? "http://localhost:3000/settings",
          created: Math.floor(Date.now() / 1000),
        };

        return apiResponse({ portalSession });
      }

      case "get_subscription": {
        const businessId = body.businessId ?? auth.userId ?? "unknown";

        // Look up existing subscription
        let currentSub: Subscription | null = null;
        for (const sub of subscriptions.values()) {
          if (sub.businessId === businessId && sub.status !== "canceled") {
            currentSub = sub;
            break;
          }
        }

        if (!currentSub) {
          return apiResponse({
            subscription: null,
            plan: "free",
            message: "No active subscription. Using free tier.",
          });
        }

        const planConfig = PLANS[currentSub.plan];

        return apiResponse({
          subscription: {
            id: currentSub.id,
            plan: currentSub.plan,
            planName: planConfig?.name ?? currentSub.plan,
            billingPeriod: currentSub.billingPeriod,
            status: currentSub.status,
            currentPeriodStart: currentSub.currentPeriodStart,
            currentPeriodEnd: currentSub.currentPeriodEnd,
            cancelAtPeriodEnd: currentSub.cancelAtPeriodEnd,
            features: planConfig?.features ?? [],
          },
        });
      }

      default:
        return apiError("INVALID_ACTION", `Unknown action: ${action}. Use create_checkout, create_portal, or get_subscription.`);
    }
  } catch (err) {
    logger.error("Billing request failed", err);
    return apiError("BILLING_ERROR", "Failed to process billing request", 500);
  }
}
