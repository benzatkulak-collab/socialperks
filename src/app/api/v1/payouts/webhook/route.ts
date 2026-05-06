/**
 * POST /api/v1/payouts/webhook
 *
 * Stripe Connect webhook handler. No auth (uses Stripe-Signature header).
 * Handles: account.updated, transfer.created, transfer.paid, transfer.failed.
 * Includes 5-minute replay protection.
 *
 * Uses the same signature verification pattern as the billing webhook.
 */

import type { NextRequest } from "next/server";
import { ok, err, withTiming } from "../../_shared";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import {
  handleAccountUpdated,
  handleTransferCreated,
  handleTransferPaid,
  handleTransferFailed,
} from "@/lib/payouts";

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

  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

  // SECURITY: In production, refuse to operate without a verified secret.
  // Previously fell through to mock mode, which let attackers forge
  // payout events.
  if (process.env.NODE_ENV === "production" && (!stripe || !isStripeConfigured() || !webhookSecret)) {
    return err(
      "PAYOUTS_NOT_CONFIGURED",
      "Stripe Connect webhook verification is not configured. Refusing to process events without signature verification in production.",
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
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
      body = event as unknown as Record<string, unknown>;
      eventId = event.id;
      eventType = event.type;
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Webhook signature verification failed";
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
        return err(
          "REPLAY_DETECTED",
          "Event timestamp is too old (>5 minutes)",
          400
        );
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

  // Check for duplicate event
  if (++pruneCounter % 50 === 0) pruneProcessedEvents();
  if (processedEvents.has(eventId)) {
    return ok({ received: true, duplicate: true });
  }
  processedEvents.set(eventId, Date.now());

  const eventData = (body.data as Record<string, unknown>)?.object as
    | Record<string, unknown>
    | undefined;

  // ── Handle event types ──────────────────────────────────────────────────

  switch (eventType) {
    case "account.updated": {
      console.warn(
        `[Payouts Webhook] account.updated — event=${eventId}`
      );

      if (eventData) {
        const accountId = eventData.id as string;
        const detailsSubmitted = eventData.details_submitted as boolean;
        const payoutsEnabled = eventData.payouts_enabled as boolean;

        if (accountId) {
          handleAccountUpdated(
            accountId,
            detailsSubmitted ?? false,
            payoutsEnabled ?? false
          );
        }
      }
      break;
    }

    case "transfer.created": {
      console.warn(
        `[Payouts Webhook] transfer.created — event=${eventId}`
      );

      if (eventData) {
        const transferId = eventData.id as string;
        if (transferId) {
          handleTransferCreated(transferId);
        }
      }
      break;
    }

    case "transfer.paid": {
      console.warn(
        `[Payouts Webhook] transfer.paid — event=${eventId}`
      );

      if (eventData) {
        const transferId = eventData.id as string;
        if (transferId) {
          handleTransferPaid(transferId);
        }
      }
      break;
    }

    case "transfer.failed": {
      console.warn(
        `[Payouts Webhook] transfer.failed — event=${eventId}`
      );

      if (eventData) {
        const transferId = eventData.id as string;
        const failureMessage =
          (eventData.failure_message as string) ??
          "Transfer failed (no reason provided)";
        if (transferId) {
          handleTransferFailed(transferId, failureMessage);
        }
      }
      break;
    }

    default:
      console.warn(
        `[Payouts Webhook] Unhandled event type: ${eventType} — event=${eventId}`
      );
  }

  return ok({ received: true });
});
