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
//
// SINGLE SOURCE OF TRUTH: plan slugs, prices, and Stripe Price IDs live in
// src/lib/billing/store.ts (PLANS); enforced limits live in
// src/lib/billing/enforcement.ts (PLAN_LIMITS). This file used to export its
// OWN PLANS map keyed "pro" reading STRIPE_PRICE_PRO — a divergent registry
// (the live one is keyed "professional" reading STRIPE_PRICE_PROFESSIONAL_*),
// which is exactly the mismatch that once capped paying customers at free
// limits. It was orphaned (imported only by its own test), so it's removed to
// kill the divergence trap. Import plan config from billing/store.ts instead.
