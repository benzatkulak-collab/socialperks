// ==============================================================================
// Social Perks -- Stripe Integration
//
// Lazy-initializes the Stripe SDK only when STRIPE_SECRET_KEY is set.
// This allows the app to run without Stripe configured (dev/demo mode).
// ==============================================================================

import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

/**
 * Stripe client instance. Null when STRIPE_SECRET_KEY is not configured.
 */
export const stripe: Stripe | null = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY)
  : null;

/**
 * Check whether Stripe is properly configured for this environment.
 */
export function isStripeConfigured(): boolean {
  return STRIPE_SECRET_KEY != null && STRIPE_SECRET_KEY.length > 0;
}

/**
 * Plans available for billing. Maps to Stripe Price IDs in production.
 */
export const PLANS = {
  free: {
    name: "Free",
    priceId: process.env.STRIPE_PRICE_FREE ?? null,
    maxCampaigns: 3,
    maxActions: 5,
  },
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_STARTER ?? null,
    maxCampaigns: 10,
    maxActions: 20,
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRICE_PRO ?? null,
    maxCampaigns: 50,
    maxActions: 107,
  },
  enterprise: {
    name: "Enterprise",
    priceId: process.env.STRIPE_PRICE_ENTERPRISE ?? null,
    maxCampaigns: Infinity,
    maxActions: 107,
  },
} as const;
