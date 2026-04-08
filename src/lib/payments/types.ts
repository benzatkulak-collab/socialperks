/**
 * Payment Processing System — Type Definitions
 *
 * All TypeScript types and interfaces used across the payment subsystem:
 * accounts, ledger entries, Stripe integration, escrow, and tax reporting.
 */

// ─── Account Types ───────────────────────────────────────────────────────────

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export type AccountSubtype =
  | "cash"
  | "accounts_receivable"
  | "escrow"
  | "perk_liability"
  | "platform_equity"
  | "campaign_revenue"
  | "service_revenue"
  | "perk_expense"
  | "payout_expense"
  | "fee_expense"
  | "influencer_payable"
  | "business_receivable"
  | "refund_payable";

export type AccountOwnerType = "business" | "influencer" | "platform";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  currency: string;
  balance: number;
  ownerId: string;
  ownerType: AccountOwnerType;
  frozen: boolean;
  createdAt: string;
}

// ─── Ledger Entry Types ──────────────────────────────────────────────────────

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  accountType: AccountType;
  debit: number;
  credit: number;
  currency: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Transaction {
  id: string;
  entries: LedgerEntry[];
  description: string;
  reference: string;
  referenceType: string;
  status: "posted" | "pending" | "voided";
  createdAt: string;
  metadata: Record<string, unknown>;
}

// ─── Stripe Types ────────────────────────────────────────────────────────────

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  platformAccountId: string;
}

export interface PayoutRequest {
  influencerId: string;
  amount: number;
  currency: string;
  stripeConnectAccountId: string;
  description: string;
}

export interface PayoutResult {
  success: boolean;
  payoutId: string | null;
  error: string | null;
  status: "pending" | "in_transit" | "paid" | "failed" | "canceled";
}

export interface ConnectedAccount {
  id: string;
  influencerId: string;
  stripeAccountId: string;
  status: "pending" | "active" | "restricted" | "disabled";
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  country: string;
  currency: string;
  createdAt: string;
}

export interface PaymentIntent {
  id: string;
  businessId: string;
  amount: number;
  currency: string;
  status: "created" | "processing" | "succeeded" | "failed" | "refunded";
  stripePaymentIntentId: string | null;
  description: string;
  createdAt: string;
  completedAt: string | null;
  metadata: Record<string, unknown>;
}

export interface RefundResult {
  success: boolean;
  refundId: string | null;
  amount: number;
  error: string | null;
  status: "pending" | "succeeded" | "failed";
}

// ─── Escrow Types ────────────────────────────────────────────────────────────

export interface EscrowHold {
  id: string;
  campaignId: string;
  businessId: string;
  amount: number;
  currency: string;
  status: "held" | "partially_released" | "fully_released" | "refunded";
  heldAt: string;
  releasedAmount: number;
  refundedAmount: number;
  releases: EscrowRelease[];
}

export interface EscrowRelease {
  id: string;
  escrowId: string;
  influencerId: string;
  submissionId: string;
  amount: number;
  releasedAt: string;
}

// ─── Tax Types ───────────────────────────────────────────────────────────────

export interface TaxRecord {
  influencerId: string;
  year: number;
  totalEarnings: number;
  totalPayouts: number;
  totalWithholding: number;
  forms: TaxForm[];
}

export interface TaxForm {
  type: "1099-NEC" | "1099-K";
  generated: boolean;
  sentAt: string | null;
}

export interface TaxSummary {
  influencerId: string;
  year: number;
  totalEarnings: number;
  totalPayouts: number;
  totalWithholding: number;
  requiresForm1099NEC: boolean;
  requiresForm1099K: boolean;
  forms: TaxForm[];
  quarters: QuarterlyBreakdown[];
}

export interface QuarterlyBreakdown {
  quarter: 1 | 2 | 3 | 4;
  earnings: number;
  payouts: number;
}
