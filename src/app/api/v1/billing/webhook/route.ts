import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  subscriptions,
  PLANS,
  generateStripeId,
  type Subscription,
} from "@/lib/billing/store";
import { logger } from "@/lib/logging";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Verify Stripe webhook signature.
 * In production this uses the `stripe` SDK's `constructEvent()`.
 * Here we validate the header format and check against the secret.
 */
function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): { valid: boolean; error?: string } {
  if (!signatureHeader) {
    return { valid: false, error: "Missing Stripe-Signature header" };
  }

  // Parse the Stripe signature header: t=timestamp,v1=signature
  const elements = signatureHeader.split(",");
  const tsElement = elements.find((e) => e.startsWith("t="));
  const sigElement = elements.find((e) => e.startsWith("v1="));

  if (!tsElement || !sigElement) {
    return { valid: false, error: "Invalid signature format" };
  }

  const timestamp = parseInt(tsElement.slice(2), 10);
  const now = Math.floor(Date.now() / 1000);

  // Reject if timestamp is more than 5 minutes old (replay protection)
  if (Math.abs(now - timestamp) > 300) {
    return { valid: false, error: "Webhook timestamp outside tolerance window" };
  }

  if (!secret) {
    return { valid: false, error: "Webhook secret not configured" };
  }

  // Compute HMAC-SHA256 of `${timestamp}.${payload}` and compare to signature
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const sigValue = sigElement.slice(3); // strip "v1=" prefix
  if (expectedSig.length !== sigValue.length) {
    return { valid: false, error: "Invalid signature" };
  }

  const sigMatches = crypto.timingSafeEqual(
    Buffer.from(expectedSig, "hex"),
    Buffer.from(sigValue, "hex")
  );
  if (!sigMatches) {
    return { valid: false, error: "Invalid signature" };
  }

  return { valid: true };
}

// ─── Webhook Event Types ────────────────────────────────────────────────────

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
}

// ─── Webhook Handler ────────────────────────────────────────────────────────

/**
 * POST /api/v1/billing/webhook — Stripe webhook handler
 *
 * Processes events:
 *   - checkout.session.completed — Activate subscription
 *   - customer.subscription.updated — Update plan
 *   - customer.subscription.deleted — Downgrade to free
 *   - invoice.payment_failed — Flag payment issue
 *
 * No auth middleware — webhooks are verified by Stripe signature.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_demo_secret";

  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("stripe-signature");

    // Verify webhook signature
    const verification = verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error },
        { status: 400 }
      );
    }

    const event: StripeWebhookEvent = JSON.parse(rawBody);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer as string;
        const businessId = (session.client_reference_id as string) ?? customerId;
        const subscriptionId = (session.subscription as string) ?? generateStripeId("sub");

        // Determine plan from the line items or metadata
        const metadata = (session.metadata as Record<string, string>) ?? {};
        const planTier = metadata.plan ?? "starter";
        const billingPeriod = (metadata.billing_period as "monthly" | "annual") ?? "monthly";

        const now = new Date();
        const periodEnd = new Date(now);
        if (billingPeriod === "annual") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        const subscription: Subscription = {
          id: subscriptionId,
          businessId,
          customerId,
          plan: planTier,
          billingPeriod,
          status: "active",
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
          cancelAtPeriodEnd: false,
          createdAt: now.toISOString(),
        };

        subscriptions.set(businessId, subscription);

        return NextResponse.json({
          received: true,
          action: "subscription_activated",
          subscriptionId,
          plan: planTier,
        });
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer as string;

        // Find existing subscription by customer ID
        let existingSub: Subscription | null = null;
        let subKey: string | null = null;
        for (const [key, s] of subscriptions.entries()) {
          if (s.customerId === customerId || s.id === (sub.id as string)) {
            existingSub = s;
            subKey = key;
            break;
          }
        }

        if (existingSub && subKey) {
          const items = (sub.items as { data?: Array<{ price?: { id?: string } }> })?.data;
          const newPriceId = items?.[0]?.price?.id;

          // Determine plan from price ID
          let newPlan = existingSub.plan;
          if (newPriceId) {
            for (const [tier, config] of Object.entries(PLANS)) {
              if (config.monthlyPriceId === newPriceId || config.annualPriceId === newPriceId) {
                newPlan = tier;
                break;
              }
            }
          }

          const updatedSub: Subscription = {
            ...existingSub,
            plan: newPlan,
            status: (sub.status as Subscription["status"]) ?? existingSub.status,
            cancelAtPeriodEnd: (sub.cancel_at_period_end as boolean) ?? existingSub.cancelAtPeriodEnd,
            currentPeriodStart: sub.current_period_start
              ? new Date((sub.current_period_start as number) * 1000).toISOString()
              : existingSub.currentPeriodStart,
            currentPeriodEnd: sub.current_period_end
              ? new Date((sub.current_period_end as number) * 1000).toISOString()
              : existingSub.currentPeriodEnd,
          };

          subscriptions.set(subKey, updatedSub);

          return NextResponse.json({
            received: true,
            action: "subscription_updated",
            plan: newPlan,
            status: updatedSub.status,
          });
        }

        return NextResponse.json({
          received: true,
          action: "subscription_update_skipped",
          reason: "subscription_not_found",
        });
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = sub.customer as string;

        for (const [key, s] of subscriptions.entries()) {
          if (s.customerId === customerId || s.id === (sub.id as string)) {
            subscriptions.set(key, {
              ...s,
              status: "canceled",
              cancelAtPeriodEnd: false,
            });

            return NextResponse.json({
              received: true,
              action: "subscription_canceled",
              businessId: s.businessId,
              previousPlan: s.plan,
            });
          }
        }

        return NextResponse.json({
          received: true,
          action: "subscription_delete_skipped",
          reason: "subscription_not_found",
        });
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string;

        for (const [key, s] of subscriptions.entries()) {
          if (s.customerId === customerId || s.id === subscriptionId) {
            subscriptions.set(key, {
              ...s,
              status: "past_due",
            });

            return NextResponse.json({
              received: true,
              action: "payment_failed",
              businessId: s.businessId,
              plan: s.plan,
              status: "past_due",
            });
          }
        }

        return NextResponse.json({
          received: true,
          action: "payment_failure_skipped",
          reason: "subscription_not_found",
        });
      }

      default:
        // Acknowledge unhandled event types
        return NextResponse.json({
          received: true,
          action: "ignored",
          eventType: event.type,
        });
    }
  } catch (err) {
    logger.error("Billing webhook processing failed", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
