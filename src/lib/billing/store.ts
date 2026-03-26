import crypto from "crypto";

// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Billing Store
// Shared subscription state and plan configuration used by both the billing
// API route and the Stripe webhook handler.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Plan Configuration ─────────────────────────────────────────────────────

export interface PlanConfig {
  name: string;
  monthlyPriceId: string;
  annualPriceId: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  starter: {
    name: "Starter",
    monthlyPriceId: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? "price_starter_monthly",
    annualPriceId: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? "price_starter_annual",
    monthlyPrice: 29,
    annualPrice: 290,
    features: ["5 active campaigns", "Basic analytics", "Email support"],
  },
  professional: {
    name: "Professional",
    monthlyPriceId: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY ?? "price_professional_monthly",
    annualPriceId: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL ?? "price_professional_annual",
    monthlyPrice: 79,
    annualPrice: 790,
    features: ["25 active campaigns", "Advanced analytics", "Priority support", "API access"],
  },
  enterprise: {
    name: "Enterprise",
    monthlyPriceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? "price_enterprise_monthly",
    annualPriceId: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL ?? "price_enterprise_annual",
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

// ─── In-Memory Store (mock — production uses Stripe + DB) ───────────────────

export const subscriptions = new Map<string, Subscription>();

// ─── Helpers ────────────────────────────────────────────────────────────────

export function generateStripeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function getOrCreateCustomerId(businessId: string): string {
  for (const sub of subscriptions.values()) {
    if (sub.businessId === businessId) return sub.customerId;
  }
  return generateStripeId("cus");
}
