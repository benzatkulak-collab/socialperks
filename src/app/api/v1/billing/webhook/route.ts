/**
 * POST /api/v1/billing/webhook
 *
 * Stripe webhook handler. No auth (uses Stripe-Signature header).
 * Handles: checkout.session.completed, customer.subscription.updated,
 * customer.subscription.deleted, invoice.payment_failed.
 * Includes 5-minute replay protection.
 */

import type { NextRequest } from "next/server";
import { ok, err, withTiming } from "../../_shared";
import {
  subscriptions,
  generateStripeId,
  persistSubscription,
  type Subscription,
} from "@/lib/billing/store";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { businessRepo } from "@/lib/db/repositories";
import { emailQueue } from "@/lib/jobs/registry";
import { creditReferral, findReferralByReferee } from "@/lib/referrals";
import { markEventProcessed } from "@/lib/webhook-dedup";

// ─── Replay Protection ──────────────────────────────────────────────────────

const processedEvents = new Map<string, number>();
const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
let pruneCounter = 0;

function pruneProcessedEvents(): void {
  const cutoff = Date.now() - REPLAY_WINDOW_MS;
  for (const [id, timestamp] of processedEvents) {
    if (timestamp < cutoff) processedEvents.delete(id);
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // No auth — Stripe signs the webhook payload
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return err("MISSING_SIGNATURE", "Stripe-Signature header is required", 401);
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // SECURITY: In production, refuse to fall through to mock-mode if the
  // Stripe webhook secret is missing. Previously, the absence of the
  // secret silently bypassed signature verification — any attacker could
  // forge a Stripe event payload and mint subscriptions, cancel
  // subscriptions, or trigger referral credits.
  if (process.env.NODE_ENV === "production" && (!stripe || !isStripeConfigured() || !webhookSecret)) {
    return err(
      "BILLING_NOT_CONFIGURED",
      "Stripe webhook verification is not configured. Refusing to process webhooks without signature verification in production.",
      503
    );
  }

  let body: Record<string, unknown>;
  let eventId: string;
  let eventType: string;

  // Real Stripe signature verification when configured
  if (stripe && isStripeConfigured() && webhookSecret) {
    try {
      const rawBody = await req.text();
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      body = event as unknown as Record<string, unknown>;
      eventId = event.id;
      eventType = event.type;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Webhook signature verification failed";
      return err("INVALID_SIGNATURE", message, 400);
    }
  } else {
    // Mock mode: parse timestamp for replay protection
    let eventTimestamp: number | null = null;
    for (const part of signature.split(",")) {
      const [key, value] = part.split("=");
      if (key === "t" && value) {
        eventTimestamp = parseInt(value, 10);
        break;
      }
    }

    if (eventTimestamp) {
      const eventAge = Date.now() - eventTimestamp * 1000;
      if (eventAge > REPLAY_WINDOW_MS) {
        return err("REPLAY_DETECTED", "Event timestamp is too old (>5 minutes)", 400);
      }
    }

    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return err("INVALID_BODY", "Request body is not valid JSON", 400);
    }

    eventId = (body.id as string) ?? crypto.randomUUID();
    eventType = body.type as string;
  }

  if (!eventType) {
    return err("MISSING_EVENT_TYPE", "Event type is required", 400);
  }

  // Check for duplicate event — atomic, cross-instance via Postgres.
  // Was per-instance Map; a replay hitting a different cold-start
  // instance would have succeeded.
  const isFirst = await markEventProcessed(eventId, "stripe");
  if (!isFirst) {
    return ok({ received: true, duplicate: true });
  }
  // Keep the in-memory map for the legacy prune logic — the DB is
  // authoritative now but this stays to avoid regressing in dev mode.
  if (++pruneCounter % 50 === 0) pruneProcessedEvents();
  processedEvents.set(eventId, Date.now());

  const eventData = (body.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;

  // ── Handle event types ──────────────────────────────────────────────────

  switch (eventType) {
    case "checkout.session.completed": {
      console.warn(`[Billing Webhook] checkout.session.completed — event=${eventId}`);

      if (eventData) {
        const customerId = eventData.customer as string;
        const subscriptionId = eventData.subscription as string;
        const metadata = eventData.metadata as Record<string, string> | undefined;
        const businessId = metadata?.businessId;
        const plan = metadata?.plan ?? "starter";
        const billingPeriod = (metadata?.billingPeriod ?? "monthly") as "monthly" | "annual";

        if (!businessId || !subscriptionId) {
          console.error(`[Billing Webhook] Missing required metadata — businessId=${businessId}, subscriptionId=${subscriptionId}, event=${eventId}`);
          break;
        }

        // Idempotency: skip if subscription already exists
        if (subscriptions.has(subscriptionId)) {
          console.warn(`[Billing Webhook] Subscription ${subscriptionId} already exists — skipping`);
          break;
        }

        try {
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + (billingPeriod === "annual" ? 12 : 1));

          const sub: Subscription = {
            id: subscriptionId,
            businessId,
            customerId: customerId ?? generateStripeId("cus"),
            plan,
            billingPeriod,
            status: "active",
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: periodEnd.toISOString(),
            cancelAtPeriodEnd: false,
            createdAt: now.toISOString(),
          };
          await persistSubscription(sub);
          console.warn(`[Billing Webhook] Created subscription ${subscriptionId} for business ${businessId}`);
        } catch (e) {
          // If subscription creation fails, remove from processed events so Stripe can retry
          processedEvents.delete(eventId);
          console.error(`[Billing Webhook] Failed to create subscription — event=${eventId}`, e);
          return err("PROCESSING_FAILED", "Failed to process checkout event", 500);
        }

        // ── Welcome email (Stripe sends its own receipt; this is the
        // product-side onboarding email with next steps).
        // Failures here must NOT fail the webhook — Stripe will retry
        // and we'd end up double-creating the subscription. Best-effort.
        try {
          const business = await businessRepo.findById(businessId);
          if (business?.email && business?.name) {
            emailQueue.add({
              type: "subscription-started",
              to: business.email,
              name: business.name,
              plan,
              billingPeriod,
            });
          }
        } catch (e) {
          console.error(`[Billing Webhook] Failed to enqueue welcome email — event=${eventId}`, e);
        }

        // ── Referral credit. If this customer was referred, the referrer
        // earns the credit at the moment of paid conversion. Best-effort
        // for the same reason as above.
        try {
          const referral = findReferralByReferee(businessId);
          if (referral && referral.status !== "credited") {
            creditReferral(referral.id);
            console.warn(
              `[Billing Webhook] Credited referral ${referral.id} (referrer ${referral.referrerId}) for paid conversion of ${businessId}`
            );
          }
        } catch (e) {
          console.error(`[Billing Webhook] Failed to credit referral — event=${eventId}`, e);
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      console.warn(`[Billing Webhook] customer.subscription.updated — event=${eventId}`);

      if (eventData) {
        const subscriptionId = eventData.id as string;
        const existing = subscriptionId ? subscriptions.get(subscriptionId) : undefined;
        if (existing) {
          const status = eventData.status as Subscription["status"] | undefined;
          const cancelAtPeriodEnd = eventData.cancel_at_period_end as boolean | undefined;
          await persistSubscription({
            ...existing,
            ...(status && { status }),
            ...(typeof cancelAtPeriodEnd === "boolean" && { cancelAtPeriodEnd }),
          });
          console.warn(`[Billing Webhook] Updated subscription ${subscriptionId}`);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      console.warn(`[Billing Webhook] customer.subscription.deleted — event=${eventId}`);

      if (eventData) {
        const subscriptionId = eventData.id as string;
        const existing = subscriptionId ? subscriptions.get(subscriptionId) : undefined;
        if (existing) {
          await persistSubscription({ ...existing, status: "canceled" });
          console.warn(`[Billing Webhook] Canceled subscription ${subscriptionId}`);
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      console.warn(`[Billing Webhook] invoice.payment_failed — event=${eventId}`);

      if (eventData) {
        const subscriptionId = eventData.subscription as string;
        const existing = subscriptionId ? subscriptions.get(subscriptionId) : undefined;
        if (existing) {
          await persistSubscription({ ...existing, status: "past_due" });
          console.warn(`[Billing Webhook] Marked subscription ${subscriptionId} as past_due`);
        }
      }
      break;
    }

    default:
      console.warn(`[Billing Webhook] Unhandled event type: ${eventType} — event=${eventId}`);
  }

  return ok({ received: true });
});
