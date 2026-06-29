import crypto from "crypto";
import { db, InMemoryConnection } from "@/lib/db/connection";
import { captureError } from "@/lib/monitoring";

// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Billing Store
// Shared subscription state and plan configuration used by both the billing
// API route and the Stripe webhook handler.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Plan Configuration ─────────────────────────────────────────────────────

export interface PlanConfig {
  name: string;
  monthlyPriceId: string | null;
  annualPriceId: string | null;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  starter: {
    name: "Starter",
    monthlyPriceId: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? null,
    annualPriceId: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? null,
    monthlyPrice: 10,
    annualPrice: 100,
    features: ["5 active campaigns", "Basic analytics", "Email support"],
  },
  professional: {
    name: "Professional",
    monthlyPriceId: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY ?? null,
    annualPriceId: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL ?? null,
    monthlyPrice: 25,
    annualPrice: 200,
    features: ["25 active campaigns", "Advanced analytics", "Priority support", "API access"],
  },
  enterprise: {
    name: "Enterprise",
    monthlyPriceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? null,
    annualPriceId: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL ?? null,
    monthlyPrice: 249,
    annualPrice: 2490,
    features: [
      "Unlimited campaigns",
      "White-label",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
};

// ─── Subscription Types ─────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  businessId: string;
  customerId: string;
  plan: string;
  billingPeriod: "monthly" | "annual";
  status: "active" | "past_due" | "canceled" | "trialing";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

// ─── In-Memory Store ────────────────────────────────────────────────────────
//
// IMPORTANT: This is a write-through cache, NOT durable storage.
// A redeploy or restart drops all entries.
//
// For the first ~10 paying customers this is acceptable because:
//   1. Stripe is the source of truth for every subscription state.
//   2. The webhook handler rehydrates the cache on the next event.
//   3. `rehydrateFromStripe(businessId)` below provides on-demand recovery.
//
// Before scaling beyond a handful of subscriptions: replace this Map with
// a Postgres-backed repository. Schema sketch:
//   CREATE TABLE business_subscriptions (
//     id UUID PRIMARY KEY,
//     business_id UUID NOT NULL REFERENCES businesses(id),
//     stripe_customer_id TEXT NOT NULL,
//     stripe_subscription_id TEXT NOT NULL UNIQUE,
//     plan VARCHAR(50) NOT NULL,
//     billing_period VARCHAR(20) NOT NULL,
//     status VARCHAR(20) NOT NULL,
//     current_period_start TIMESTAMPTZ NOT NULL,
//     current_period_end TIMESTAMPTZ NOT NULL,
//     cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
//   );
// Then wire it into src/lib/db/schema.ts and migrate.

export const subscriptions = new Map<string, Subscription>();

// ─── Helpers ────────────────────────────────────────────────────────────────

export function generateStripeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

const usingDb = !(db instanceof InMemoryConnection);

/**
 * Write-through persistence for a subscription.
 * Updates the in-memory cache AND the DB (when available).
 * Both writes are best-effort; the in-memory write always succeeds.
 */
export async function persistSubscription(sub: Subscription): Promise<void> {
  // In-memory mode (dev/test): the Map IS the store.
  if (!usingDb) {
    subscriptions.set(sub.id, sub);
    return;
  }
  try {
    await db.query(
      `INSERT INTO business_subscriptions
         (id, business_id, stripe_customer_id, stripe_subscription_id, plan,
          billing_period, status, current_period_start, current_period_end,
          cancel_at_period_end, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (stripe_subscription_id) DO UPDATE SET
         status = EXCLUDED.status,
         plan = EXCLUDED.plan,
         billing_period = EXCLUDED.billing_period,
         current_period_start = EXCLUDED.current_period_start,
         current_period_end = EXCLUDED.current_period_end,
         cancel_at_period_end = EXCLUDED.cancel_at_period_end,
         updated_at = NOW()`,
      [
        crypto.randomUUID(),
        sub.businessId,
        sub.customerId,
        sub.id,
        sub.plan,
        sub.billingPeriod,
        sub.status,
        sub.currentPeriodStart,
        sub.currentPeriodEnd,
        sub.cancelAtPeriodEnd,
        sub.createdAt,
      ],
    );
    // Cache only AFTER the durable write succeeds — a failed write must not
    // leave a Map entry that makes the retry's idempotency check skip it.
    subscriptions.set(sub.id, sub);
  } catch (e) {
    captureError(e, { source: "billing.persistSubscription", subscriptionId: sub.id, businessId: sub.businessId });
    // Re-throw so the webhook returns 5xx and the event is retried (paired with
    // unmarkEventProcessed in the route). Swallowing here left a paid
    // subscription only in the volatile in-memory Map, lost on the next cold
    // start, while Stripe marked the event delivered and never retried.
    throw e;
  }
}

// ─── DB-authoritative lifecycle updates ──────────────────────────────────────
//
// Stripe lifecycle events (canceled / past_due / plan change) must revoke or
// change entitlement EVEN ON A COLD SERVERLESS INSTANCE where the in-memory Map
// is empty. The old handlers read `subscriptions.get(id)` and no-op'd on a cold
// Map, so a cancellation never reached Postgres and getBusinessPlan kept
// granting the paid plan forever. These write to Postgres directly by
// stripe_subscription_id (the durable source of truth) and patch the Map only
// if it happens to be warm.

export interface SubscriptionPatch {
  status?: Subscription["status"];
  cancelAtPeriodEnd?: boolean;
  plan?: string;
  billingPeriod?: "monthly" | "annual";
}

/**
 * Update a subscription by its Stripe id, authoritative against Postgres.
 * Returns true if a row was updated (or, in in-memory mode, the Map had it),
 * false if no such subscription exists. THROWS on a real DB error so the webhook
 * 5xxs and Stripe retries — a transient DB blip must not silently drop a
 * cancellation.
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  patch: SubscriptionPatch,
): Promise<boolean> {
  const cached = subscriptions.get(subscriptionId);
  if (cached) {
    subscriptions.set(subscriptionId, {
      ...cached,
      ...(patch.status && { status: patch.status }),
      ...(typeof patch.cancelAtPeriodEnd === "boolean" && { cancelAtPeriodEnd: patch.cancelAtPeriodEnd }),
      ...(patch.plan && { plan: patch.plan }),
      ...(patch.billingPeriod && { billingPeriod: patch.billingPeriod }),
    });
  }

  if (!usingDb) return cached !== undefined;

  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (patch.status !== undefined) { sets.push(`status = $${i++}`); vals.push(patch.status); }
  if (patch.cancelAtPeriodEnd !== undefined) { sets.push(`cancel_at_period_end = $${i++}`); vals.push(patch.cancelAtPeriodEnd); }
  if (patch.plan !== undefined) { sets.push(`plan = $${i++}`); vals.push(patch.plan); }
  if (patch.billingPeriod !== undefined) { sets.push(`billing_period = $${i++}`); vals.push(patch.billingPeriod); }
  if (sets.length === 0) return cached !== undefined;
  sets.push(`updated_at = NOW()`);
  vals.push(subscriptionId);

  try {
    const res = await db.query<{ stripe_subscription_id: string }>(
      `UPDATE business_subscriptions SET ${sets.join(", ")}
        WHERE stripe_subscription_id = $${i}
        RETURNING stripe_subscription_id`,
      vals,
    );
    return res.rows.length > 0;
  } catch (e) {
    captureError(e, { source: "billing.updateSubscriptionStatus", subscriptionId });
    throw e;
  }
}

/** Reverse-lookup a Stripe price id back to a plan slug + billing period. */
export function planFromPriceId(
  priceId: string | null | undefined,
): { plan: string; billingPeriod: "monthly" | "annual" } | null {
  if (!priceId) return null;
  for (const [slug, cfg] of Object.entries(PLANS)) {
    if (cfg.monthlyPriceId && cfg.monthlyPriceId === priceId) return { plan: slug, billingPeriod: "monthly" };
    if (cfg.annualPriceId && cfg.annualPriceId === priceId) return { plan: slug, billingPeriod: "annual" };
  }
  return null;
}

export function getOrCreateCustomerId(businessId: string): string {
  for (const sub of subscriptions.values()) {
    if (sub.businessId === businessId) return sub.customerId;
  }
  return generateStripeId("cus");
}

// ─── Cold-start hydration ────────────────────────────────────────────────────
//
// The `subscriptions` Map is per-process and empty on every serverless cold
// start. Without rehydration, getBusinessPlan() (in billing/enforcement.ts,
// which reads this Map) reports "free" for a paying customer until the next
// Stripe webhook happens to repopulate the cache — silently downgrading them
// while Stripe keeps billing. We warm the Map from Postgres once per process.
// getBusinessPlan stays synchronous; the first read on a cold instance may
// briefly miss (returns "free") while this runs, then self-corrects.

interface SubscriptionRow {
  stripe_subscription_id: string;
  business_id: string;
  stripe_customer_id: string;
  plan: string;
  billing_period: string;
  status: string;
  current_period_start: string | Date;
  current_period_end: string | Date;
  cancel_at_period_end: boolean;
  created_at: string | Date;
}

function toIso(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

function rowToSubscription(r: SubscriptionRow): Subscription {
  return {
    id: r.stripe_subscription_id,
    businessId: r.business_id,
    customerId: r.stripe_customer_id,
    plan: r.plan,
    billingPeriod: r.billing_period === "annual" ? "annual" : "monthly",
    status: r.status as Subscription["status"],
    currentPeriodStart: toIso(r.current_period_start),
    currentPeriodEnd: toIso(r.current_period_end),
    cancelAtPeriodEnd: Boolean(r.cancel_at_period_end),
    createdAt: toIso(r.created_at),
  };
}

let _hydrationPromise: Promise<void> | null = null;

/**
 * Load all live subscriptions from Postgres into the in-memory Map. Runs once
 * per process (cached promise). Best-effort: on error we log, clear the cached
 * promise so a later call can retry, and never throw — a DB blip must not block
 * billing reads or checkout.
 */
export function hydrateSubscriptions(): Promise<void> {
  if (!usingDb) return Promise.resolve();
  if (_hydrationPromise) return _hydrationPromise;
  _hydrationPromise = (async () => {
    try {
      const result = await db.query<SubscriptionRow>(
        `SELECT stripe_subscription_id, business_id, stripe_customer_id, plan,
                billing_period, status, current_period_start, current_period_end,
                cancel_at_period_end, created_at
           FROM business_subscriptions
          WHERE status IN ('active', 'trialing', 'past_due')`,
      );
      for (const row of result.rows) {
        const sub = rowToSubscription(row);
        // Don't clobber a fresher entry a webhook wrote after hydration began.
        if (!subscriptions.has(sub.id)) subscriptions.set(sub.id, sub);
      }
    } catch (e) {
      console.error(
        "[billing] subscription hydration failed:",
        e instanceof Error ? e.message : e,
      );
      _hydrationPromise = null;
    }
  })();
  return _hydrationPromise;
}

// Warm the cache as soon as this module loads on a fresh instance, so it's
// likely populated before the first billing read happens.
void hydrateSubscriptions();
