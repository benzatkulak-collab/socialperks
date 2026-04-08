/**
 * Payment Processing System for Social Perks
 *
 * Complete financial infrastructure including:
 * 1. Double-Entry Bookkeeping Engine (proper debits/credits per account type)
 * 2. Stripe Connect Integration Layer (mock client for development)
 * 3. Escrow Manager (hold campaign budgets until submission approval)
 * 4. Tax Reporting (1099-NEC generation for influencer payouts)
 *
 * Storage: in-memory Maps (ready for Postgres + Prisma migration).
 */

// ── Re-export all types ──────────────────────────────────────────────────────
export type {
  AccountType,
  AccountSubtype,
  AccountOwnerType,
  Account,
  LedgerEntry,
  Transaction,
  StripeConfig,
  PayoutRequest,
  PayoutResult,
  ConnectedAccount,
  PaymentIntent,
  RefundResult,
  EscrowHold,
  EscrowRelease,
  TaxRecord,
  TaxForm,
  TaxSummary,
  QuarterlyBreakdown,
} from "./types";

// ── Re-export classes ────────────────────────────────────────────────────────
export { FinancialLedger } from "./ledger";
export { PaymentProcessor } from "./stripe";
export { EscrowManager } from "./escrow";
export { TaxReporter } from "./tax";

// ── Singleton Instances ──────────────────────────────────────────────────────

import type { StripeConfig } from "./types";
import { FinancialLedger } from "./ledger";
import { PaymentProcessor } from "./stripe";
import { EscrowManager } from "./escrow";
import { TaxReporter } from "./tax";

/** Default Stripe configuration for development (mock). */
const defaultStripeConfig: StripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || (() => {
    if (process.env.NODE_ENV === "production") throw new Error("FATAL: STRIPE_SECRET_KEY must be set in production");
    return "sk_test_mock_development_key";
  })(),
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || (() => {
    if (process.env.NODE_ENV === "production") throw new Error("FATAL: STRIPE_WEBHOOK_SECRET must be set in production");
    return "whsec_dev_only_mock_secret";
  })(),
  platformAccountId: process.env.STRIPE_PLATFORM_ACCOUNT_ID || "acct_platform_mock",
};

/** Shared financial ledger instance. */
export const paymentLedger = new FinancialLedger();

/** Shared payment processor instance. */
export const paymentProcessor = new PaymentProcessor(defaultStripeConfig, paymentLedger);

/** Shared escrow manager instance. */
export const escrowManager = new EscrowManager(paymentLedger);

/** Shared tax reporter instance. */
export const taxReporter = new TaxReporter(paymentLedger);
