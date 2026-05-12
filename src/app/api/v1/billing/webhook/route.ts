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
  type Subscription,
} from "@/lib/billing/store";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { logger, logError } from "@/lib/logging";
import { logAuditEvent } from "@/lib/audit";

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

// ─── Outcome Logger ─────────────────────────────────────────────────────────

type WebhookOutcome = "processed" | "skipped" | "errored";

function logOutcome(
  outcome: WebhookOutcome,
  eventId: string,
  eventType: string,
  startedAt: number,
  extra: Record<string, unknown> = {},
): void {
  const level = outcome === "errored" ? "error" : "info";
  logger[level]("stripe webhook outcome", {
    path: "/api/v1/billing/webhook",
    eventId,
    eventType,
    outcome,
    durationMs: Math.round(performance.now() - startedAt),
    ...extra,
  });
}

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  const startedAt = performance.now();

  // No auth — Stripe signs the webhook payload
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    logger.warn("stripe webhook missing signature", { path: "/api/v1/billing/webhook" });
    return err("MISSING_SIGNATURE", "Stripe-Signature header is required", 401);
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
      logError(e, {
        method: "POST",
        path: "/api/v1/billing/webhook",
        outcome: "errored",
        stage: "signature_verification",
      });
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
        logger.warn("stripe webhook replay detected", {
          path: "/api/v1/billing/webhook",
          eventAgeMs: eventAge,
        });
        return err("REPLAY_DETECTED", "Event timestamp is too old (>5 minutes)", 400);
      }
    }

    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch (e) {
      logError(e, {
        method: "POST",
        path: "/api/v1/billing/webhook",
        outcome: "errored",
        stage: "body_parse",
      });
      return err("INVALID_BODY", "Request body is not valid JSON", 400);
    }

    eventId = (body.id as string) ?? crypto.randomUUID();
    eventType = body.type as string;
  }

  if (!eventType) {
    logger.warn("stripe webhook missing event type", { path: "/api/v1/billing/webhook", eventId });
    return err("MISSING_EVENT_TYPE", "Event type is required", 400);
  }

  // Receipt log — fires before any branching so we always know it arrived.
  logger.info("stripe webhook received", {
    path: "/api/v1/billing/webhook",
    eventId,
    eventType,
  });

  // Check for duplicate event
  if (++pruneCounter % 50 === 0) pruneProcessedEvents();
  if (processedEvents.has(eventId)) {
    // Idempotent: return 200 but do nothing
    logOutcome("skipped", eventId, eventType, startedAt, { reason: "duplicate" });
    return ok({ received: true, duplicate: true });
  }
  processedEvents.set(eventId, Date.now());

  const eventData = (body.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;

  // ── Handle event types ──────────────────────────────────────────────────

  try {
    switch (eventType) {
      case "checkout.session.completed": {
        if (eventData) {
          const customerId = eventData.customer as string;
          const subscriptionId = eventData.subscription as string;
          const metadata = eventData.metadata as Record<string, string> | undefined;
          // FIX #8: Payment Links populate client_reference_id at the top level of
          // the session object, not metadata. Fall back to it so Payment Link
          // purchases are properly attributed to a business.
          const clientReferenceId = eventData.client_reference_id as string | undefined;
          const businessId = metadata?.businessId ?? clientReferenceId;
          // FIX #3: Accept "pro" (current canonical) AND any plan slug. Default to "pro"
          // since Payment Links don't carry plan metadata by default.
          const plan = metadata?.plan ?? "pro";
          // FIX #14: Checkout writes "interval", not "billingPeriod". Accept both so
          // annual subscriptions correctly land as annual (not silently monthly).
          const billingPeriod = (metadata?.billingPeriod ?? metadata?.interval ?? "monthly") as "monthly" | "annual";

          if (businessId && subscriptionId) {
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
            subscriptions.set(subscriptionId, sub);

            logAuditEvent({
              userId: businessId,
              role: "business",
              action: "subscription_created",
              entityType: "subscription",
              entityId: subscriptionId,
              metadata: { plan, billingPeriod, source: "stripe_webhook", eventId },
            });

            logOutcome("processed", eventId, eventType, startedAt, {
              subscriptionId,
              businessId,
              plan,
              billingPeriod,
            });
          } else {
            logOutcome("skipped", eventId, eventType, startedAt, {
              reason: "missing_business_or_subscription_id",
              hasBusinessId: Boolean(businessId),
              hasSubscriptionId: Boolean(subscriptionId),
            });
          }
        } else {
          logOutcome("skipped", eventId, eventType, startedAt, { reason: "no_event_data" });
        }
        break;
      }

      case "customer.subscription.updated": {
        if (eventData) {
          const subscriptionId = eventData.id as string;
          const existing = subscriptionId ? subscriptions.get(subscriptionId) : undefined;
          if (existing) {
            const status = eventData.status as Subscription["status"] | undefined;
            const cancelAtPeriodEnd = eventData.cancel_at_period_end as boolean | undefined;
            // FIX #4: Persist period dates so trial→paid transitions update the
            // billing window. Stripe sends Unix timestamps (seconds, not ms).
            const currentPeriodStart = eventData.current_period_start as number | undefined;
            const currentPeriodEnd = eventData.current_period_end as number | undefined;
            subscriptions.set(subscriptionId, {
              ...existing,
              ...(status && { status }),
              ...(typeof cancelAtPeriodEnd === "boolean" && { cancelAtPeriodEnd }),
              ...(typeof currentPeriodStart === "number" && {
                currentPeriodStart: new Date(currentPeriodStart * 1000).toISOString(),
              }),
              ...(typeof currentPeriodEnd === "number" && {
                currentPeriodEnd: new Date(currentPeriodEnd * 1000).toISOString(),
              }),
            });

            logAuditEvent({
              userId: existing.businessId,
              role: "business",
              action: "subscription_changed",
              entityType: "subscription",
              entityId: subscriptionId,
              metadata: { status, cancelAtPeriodEnd, source: "stripe_webhook", eventId },
            });

            logOutcome("processed", eventId, eventType, startedAt, {
              subscriptionId,
              status,
              cancelAtPeriodEnd,
            });
          } else if (subscriptionId) {
            // FIX #9: Log when an update arrives for an unknown subscription so
            // we don't silently drop events (likely a sync issue or missed
            // checkout.session.completed).
            logOutcome("skipped", eventId, eventType, startedAt, {
              reason: "unknown_subscription",
              subscriptionId,
            });
          } else {
            logOutcome("skipped", eventId, eventType, startedAt, { reason: "no_subscription_id" });
          }
        } else {
          logOutcome("skipped", eventId, eventType, startedAt, { reason: "no_event_data" });
        }
        break;
      }

      case "customer.subscription.deleted": {
        if (eventData) {
          const subscriptionId = eventData.id as string;
          const existing = subscriptionId ? subscriptions.get(subscriptionId) : undefined;
          if (existing) {
            subscriptions.set(subscriptionId, { ...existing, status: "canceled" });

            logAuditEvent({
              userId: existing.businessId,
              role: "business",
              action: "subscription_canceled",
              entityType: "subscription",
              entityId: subscriptionId,
              metadata: { source: "stripe_webhook", eventId },
            });

            logOutcome("processed", eventId, eventType, startedAt, {
              subscriptionId,
              status: "canceled",
            });
          } else {
            logOutcome("skipped", eventId, eventType, startedAt, {
              reason: "unknown_subscription",
              subscriptionId,
            });
          }
        } else {
          logOutcome("skipped", eventId, eventType, startedAt, { reason: "no_event_data" });
        }
        break;
      }

      case "invoice.payment_failed": {
        if (eventData) {
          const subscriptionId = eventData.subscription as string;
          const existing = subscriptionId ? subscriptions.get(subscriptionId) : undefined;
          if (existing) {
            subscriptions.set(subscriptionId, { ...existing, status: "past_due" });

            logAuditEvent({
              userId: existing.businessId,
              role: "business",
              action: "invoice_payment_failed",
              entityType: "subscription",
              entityId: subscriptionId,
              metadata: { source: "stripe_webhook", eventId },
            });

            logOutcome("processed", eventId, eventType, startedAt, {
              subscriptionId,
              status: "past_due",
            });
          } else {
            logOutcome("skipped", eventId, eventType, startedAt, {
              reason: "unknown_subscription",
              subscriptionId,
            });
          }
        } else {
          logOutcome("skipped", eventId, eventType, startedAt, { reason: "no_event_data" });
        }
        break;
      }

      default:
        logOutcome("skipped", eventId, eventType, startedAt, { reason: "unhandled_event_type" });
    }
  } catch (e) {
    logError(e, {
      method: "POST",
      path: "/api/v1/billing/webhook",
      eventId,
      eventType,
      stage: "event_handler",
    });
    logOutcome("errored", eventId, eventType, startedAt, {
      error: e instanceof Error ? e.message : String(e),
    });
    // Return 500 so Stripe retries the webhook.
    return err("WEBHOOK_HANDLER_FAILED", "Webhook handler threw", 500);
  }

  return ok({ received: true });
});
