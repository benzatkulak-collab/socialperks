/**
 * POST /api/v1/billing/portal
 *
 * Creates a Stripe Customer Portal session for managing the current
 * user's subscription, payment methods, and invoices.
 *
 * Falls back to a mock URL (back to /upgrade) when Stripe isn't configured.
 */

import type { NextRequest } from "next/server";
import { ok, err, withTiming, requireAuth } from "../../_shared";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { subscriptions, getOrCreateCustomerId } from "@/lib/billing/store";

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const POST = withTiming(async (req: NextRequest) => {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const appUrl = getAppUrl();
  const returnUrl = `${appUrl}/dashboard?portal=closed`;

  // ─── Mock mode ──────────────────────────────────────────────────────────
  if (!stripe || !isStripeConfigured()) {
    return ok({
      url: `${appUrl}/upgrade?portal=mock`,
      mock: true,
    });
  }

  // Look up the customer id from any existing subscription, otherwise mint
  // one tied to the business — useful when the user has signed in but the
  // webhook hasn't yet recorded a row.
  const businessKey = user.businessId ?? user.id;
  let customerId: string | null = null;
  for (const sub of subscriptions.values()) {
    if (sub.businessId === businessKey) {
      customerId = sub.customerId;
      break;
    }
  }
  if (!customerId) {
    customerId = getOrCreateCustomerId(businessKey);
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return ok({ url: session.url, mock: false });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown Stripe error";
    return err("STRIPE_PORTAL_ERROR", message, 502);
  }
});
