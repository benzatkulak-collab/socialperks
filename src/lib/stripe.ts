// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Stripe Integration
//
// Lazy-initializes the Stripe SDK only when STRIPE_SECRET_KEY is set.
// This allows the app to run without Stripe configured (dev/demo mode).
// ══════════════════════════════════════════════════════════════════════════════

import Stripe from "stripe";

// ─── Configuration ───────────────────────────────────────────────────────────

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_API_VERSION = "2026-02-25.clover";

// ─── Client Instance ─────────────────────────────────────────────────────────

/**
 * Stripe client instance. Null when STRIPE_SECRET_KEY is not configured.
 * API version is pinned to ensure consistent behavior across deployments.
 */
export const stripe: Stripe | null = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
    })
  : null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check whether Stripe is properly configured for this environment.
 */
export function isStripeConfigured(): boolean {
  return STRIPE_SECRET_KEY != null && STRIPE_SECRET_KEY.length > 0;
}

// ─── Billing Plans ───────────────────────────────────────────────────────────

/**
 * Plan definitions live elsewhere, split by concern — this module does NOT
 * define plans, to avoid a third drifting copy (which is exactly what used
 * to live here):
 *   - `billing/store.ts` → `PLANS`: display names, prices, and Stripe price
 *     IDs. Source of truth for the pricing page and checkout.
 *   - `billing/enforcement.ts` → `PLAN_LIMITS`: campaign / usage / feature
 *     gating. Source of truth for what a plan can actually do.
 *
 * This module exports only the Stripe client + `isStripeConfigured`.
 */
