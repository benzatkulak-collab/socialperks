/**
 * Payment Processing System — Stripe Connect Integration Layer
 *
 * ⚠️  IMPORTANT — TWO STRIPE CODE PATHS EXIST IN THIS REPO. Don't mix them up.
 *
 *   1. THIS FILE (`src/lib/payments/stripe.ts`)
 *      - Uses an in-process MockStripeClient. ALL calls are simulated.
 *      - Used by the `paymentProcessor` singleton in `./index.ts`.
 *      - Wraps the financial ledger. Internal accounting layer.
 *      - Does NOT talk to Stripe even with STRIPE_SECRET_KEY set.
 *
 *   2. `src/lib/stripe.ts` + `/api/v1/billing/route.ts`
 *      - The REAL Stripe SDK path. Lazily instantiates `new Stripe(...)`.
 *      - This is what processes customer-facing checkout, portal, webhooks.
 *      - When STRIPE_SECRET_KEY is unset, returns mock URLs.
 *
 * If you're wiring up actual paying customers, work on #2. #1 is the
 * internal payouts/ledger plumbing that will be migrated when we
 * stand up Stripe Connect for creator payouts (months out).
 *
 * Storage: in-memory Maps (ready for Postgres + Prisma migration).
 */

import type {
  StripeConfig,
  ConnectedAccount,
  PaymentIntent,
  PayoutRequest,
  PayoutResult,
  RefundResult,
} from "./types";
import type { FinancialLedger } from "./ledger";
import { generateId, round2, nowISO } from "./helpers";

// ── Mock Stripe Client ────────────────────────────────────────────────────

class MockStripeClient {
  private failureRate: number;

  constructor(failureRate = 0.02) {
    this.failureRate = failureRate;
  }

  private shouldFail(): boolean {
    return Math.random() < this.failureRate;
  }

  private simulateDelay(): Promise<void> {
    const ms = 100 + Math.random() * 400;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async createConnectedAccount(_params: {
    email: string;
    country: string;
  }): Promise<{ id: string; status: string }> {
    await this.simulateDelay();
    if (this.shouldFail()) {
      throw new Error("Stripe API error: Unable to create connected account");
    }
    return {
      id: `acct_${crypto.randomUUID()}`,
      status: "pending",
    };
  }

  async createPaymentIntent(_params: {
    amount: number;
    currency: string;
    description: string;
    metadata: Record<string, unknown>;
  }): Promise<{ id: string; status: string; clientSecret: string }> {
    await this.simulateDelay();
    if (this.shouldFail()) {
      throw new Error("Stripe API error: Payment intent creation failed");
    }
    return {
      id: `pi_${crypto.randomUUID()}`,
      status: "succeeded",
      clientSecret: `pi_secret_${crypto.randomUUID()}`,
    };
  }

  async createTransfer(_params: {
    amount: number;
    currency: string;
    destination: string;
    description: string;
  }): Promise<{ id: string; status: string }> {
    await this.simulateDelay();
    if (this.shouldFail()) {
      throw new Error("Stripe API error: Transfer creation failed");
    }
    return {
      id: `tr_${crypto.randomUUID()}`,
      status: "pending",
    };
  }

  async createPayout(_params: {
    amount: number;
    currency: string;
    stripeAccount: string;
    description: string;
  }): Promise<{ id: string; status: string }> {
    await this.simulateDelay();
    if (this.shouldFail()) {
      throw new Error("Stripe API error: Payout creation failed");
    }
    const statuses = ["pending", "in_transit", "paid"];
    return {
      id: `po_${crypto.randomUUID()}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
    };
  }

  async createRefund(params: {
    paymentIntentId: string;
    amount: number;
  }): Promise<{ id: string; status: string; amount: number }> {
    await this.simulateDelay();
    if (this.shouldFail()) {
      throw new Error("Stripe API error: Refund creation failed");
    }
    return {
      id: `re_${crypto.randomUUID()}`,
      status: "succeeded",
      amount: params.amount,
    };
  }

  async getPayoutStatus(payoutId: string): Promise<{ id: string; status: string }> {
    await this.simulateDelay();
    // Simulate progression of payout status
    const statuses = ["pending", "in_transit", "paid"];
    return {
      id: payoutId,
      status: statuses[Math.floor(Math.random() * statuses.length)],
    };
  }

  async getAccountStatus(accountId: string): Promise<{
    id: string;
    payoutsEnabled: boolean;
    chargesEnabled: boolean;
    status: string;
  }> {
    await this.simulateDelay();
    return {
      id: accountId,
      payoutsEnabled: true,
      chargesEnabled: true,
      status: "active",
    };
  }
}

// ── Payment Processor ─────────────────────────────────────────────────────

/**
 * Payment processor that wraps Stripe Connect operations.
 * Uses a mock Stripe client for development; swap in the real
 * Stripe SDK for production.
 */
export class PaymentProcessor {
  private stripe: MockStripeClient;
  private connectedAccounts: Map<string, ConnectedAccount> = new Map();
  private paymentIntents: Map<string, PaymentIntent> = new Map();
  private payoutResults: Map<string, PayoutResult> = new Map();
  private ledger: FinancialLedger;

  constructor(_config: StripeConfig, ledger: FinancialLedger) {
    this.ledger = ledger;
    this.stripe = new MockStripeClient();
  }

  /**
   * Create a Stripe Connected Account for an influencer so they can
   * receive payouts.
   */
  async createConnectedAccount(params: {
    influencerId: string;
    email: string;
    country?: string;
    currency?: string;
  }): Promise<ConnectedAccount> {
    const { influencerId, email, country = "US", currency = "USD" } = params;

    // Check if already exists
    for (const acct of this.connectedAccounts.values()) {
      if (acct.influencerId === influencerId) {
        return acct;
      }
    }

    const stripeResult = await this.stripe.createConnectedAccount({
      email,
      country,
    });

    const connected: ConnectedAccount = {
      id: generateId("ca"),
      influencerId,
      stripeAccountId: stripeResult.id,
      status: "pending",
      payoutsEnabled: false,
      chargesEnabled: false,
      country,
      currency,
      createdAt: nowISO(),
    };

    this.connectedAccounts.set(connected.id, connected);

    // Create ledger accounts for the influencer
    this.ledger.getOrCreateAccount({
      name: `Influencer ${influencerId} — Payable`,
      type: "liability",
      subtype: "influencer_payable",
      ownerId: influencerId,
      ownerType: "influencer",
      currency,
    });

    return connected;
  }

  /**
   * Get a connected account for an influencer.
   */
  getConnectedAccount(influencerId: string): ConnectedAccount | null {
    for (const acct of this.connectedAccounts.values()) {
      if (acct.influencerId === influencerId) {
        return acct;
      }
    }
    return null;
  }

  /**
   * Process a business payment (charge their card/account) for a campaign budget.
   * Records the payment in the ledger as: debit business cash, credit platform cash.
   */
  async processBusinessPayment(params: {
    businessId: string;
    amount: number;
    currency?: string;
    campaignId: string;
    description: string;
  }): Promise<PaymentIntent> {
    const {
      businessId,
      amount,
      currency = "USD",
      campaignId,
      description,
    } = params;

    if (amount <= 0) throw new Error("Payment amount must be positive");

    const stripeResult = await this.stripe.createPaymentIntent({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency,
      description,
      metadata: { businessId, campaignId },
    });

    const intent: PaymentIntent = {
      id: generateId("pay"),
      businessId,
      amount: round2(amount),
      currency,
      status: stripeResult.status === "succeeded" ? "succeeded" : "processing",
      stripePaymentIntentId: stripeResult.id,
      description,
      createdAt: nowISO(),
      completedAt: stripeResult.status === "succeeded" ? nowISO() : null,
      metadata: { campaignId },
    };

    this.paymentIntents.set(intent.id, intent);

    // Record in ledger if payment succeeded
    if (intent.status === "succeeded") {
      const bizCash = this.ledger.getOrCreateAccount({
        name: `Business ${businessId} — Cash`,
        type: "asset",
        subtype: "cash",
        ownerId: businessId,
        ownerType: "business",
        currency,
      });

      const platformCash = this.ledger.getOrCreateAccount({
        name: "Platform — Cash",
        type: "asset",
        subtype: "cash",
        ownerId: "platform",
        ownerType: "platform",
        currency,
      });

      const bizReceivable = this.ledger.getOrCreateAccount({
        name: `Business ${businessId} — Receivable`,
        type: "asset",
        subtype: "business_receivable",
        ownerId: businessId,
        ownerType: "business",
        currency,
      });

      // Business pays platform: debit platform cash (increase), credit biz receivable
      // Also debit biz receivable to track what they paid, credit biz cash
      this.ledger.recordTransaction({
        description: `Business payment for campaign ${campaignId}`,
        reference: campaignId,
        referenceType: "campaign",
        entries: [
          { accountId: platformCash.id, debit: round2(amount), credit: 0 },
          { accountId: bizReceivable.id, debit: 0, credit: round2(amount) },
        ],
        metadata: { paymentIntentId: intent.id, businessId },
      });

      // Reflect deduction from business cash
      this.ledger.recordTransaction({
        description: `Cash outflow for campaign ${campaignId}`,
        reference: campaignId,
        referenceType: "campaign",
        entries: [
          { accountId: bizReceivable.id, debit: round2(amount), credit: 0 },
          { accountId: bizCash.id, debit: 0, credit: round2(amount) },
        ],
        metadata: { paymentIntentId: intent.id, businessId },
      });
    }

    return intent;
  }

  /**
   * Process an influencer payout via Stripe Connect.
   */
  async processInfluencerPayout(request: PayoutRequest): Promise<PayoutResult> {
    const {
      influencerId,
      amount,
      currency,
      stripeConnectAccountId,
      description,
    } = request;

    if (amount <= 0) {
      return {
        success: false,
        payoutId: null,
        error: "Payout amount must be positive",
        status: "failed",
      };
    }

    // Verify connected account exists
    let connectedAccount: ConnectedAccount | null = null;
    for (const acct of this.connectedAccounts.values()) {
      if (acct.stripeAccountId === stripeConnectAccountId) {
        connectedAccount = acct;
        break;
      }
    }

    if (!connectedAccount) {
      return {
        success: false,
        payoutId: null,
        error: `No connected account found for Stripe account '${stripeConnectAccountId}'`,
        status: "failed",
      };
    }

    try {
      // First transfer to connected account, then trigger payout
      await this.stripe.createTransfer({
        amount: Math.round(amount * 100),
        currency,
        destination: stripeConnectAccountId,
        description,
      });

      const payoutResult = await this.stripe.createPayout({
        amount: Math.round(amount * 100),
        currency,
        stripeAccount: stripeConnectAccountId,
        description,
      });

      const result: PayoutResult = {
        success: true,
        payoutId: payoutResult.id,
        error: null,
        status: payoutResult.status as PayoutResult["status"],
      };

      this.payoutResults.set(payoutResult.id, result);

      // Record in ledger: debit influencer payable (decrease liability),
      // credit platform cash (decrease asset)
      const influencerPayable = this.ledger.getAccountByOwner(
        influencerId,
        "influencer_payable"
      );
      const platformCash = this.ledger.getAccountByOwner("platform", "cash");

      if (influencerPayable && platformCash) {
        this.ledger.recordTransaction({
          description: `Influencer payout: ${description}`,
          reference: influencerId,
          referenceType: "influencer_payout",
          entries: [
            { accountId: influencerPayable.id, debit: round2(amount), credit: 0 },
            { accountId: platformCash.id, debit: 0, credit: round2(amount) },
          ],
          metadata: { payoutId: payoutResult.id, influencerId },
        });
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown payout error";
      return {
        success: false,
        payoutId: null,
        error: message,
        status: "failed",
      };
    }
  }

  /**
   * Refund a business payment (full or partial).
   */
  async processRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
  }): Promise<RefundResult> {
    const { paymentIntentId, amount, reason } = params;

    // Find the original payment
    let originalPayment: PaymentIntent | null = null;
    for (const pi of this.paymentIntents.values()) {
      if (pi.id === paymentIntentId || pi.stripePaymentIntentId === paymentIntentId) {
        originalPayment = pi;
        break;
      }
    }

    if (!originalPayment) {
      return {
        success: false,
        refundId: null,
        amount: 0,
        error: `Payment '${paymentIntentId}' not found`,
        status: "failed",
      };
    }

    if (originalPayment.status !== "succeeded") {
      return {
        success: false,
        refundId: null,
        amount: 0,
        error: `Cannot refund payment with status '${originalPayment.status}'`,
        status: "failed",
      };
    }

    const refundAmount = round2(amount ?? originalPayment.amount);
    if (refundAmount <= 0 || refundAmount > originalPayment.amount) {
      return {
        success: false,
        refundId: null,
        amount: 0,
        error: `Invalid refund amount: ${refundAmount}`,
        status: "failed",
      };
    }

    try {
      const stripeRefund = await this.stripe.createRefund({
        paymentIntentId: originalPayment.stripePaymentIntentId ?? "",
        amount: Math.round(refundAmount * 100),
      });

      // Update original payment status
      if (refundAmount >= originalPayment.amount) {
        (originalPayment as { status: string }).status = "refunded";
      }

      // Record refund in ledger: reverse the original entries
      const platformCash = this.ledger.getAccountByOwner("platform", "cash");
      const refundPayable = this.ledger.getOrCreateAccount({
        name: `Business ${originalPayment.businessId} — Refund Payable`,
        type: "liability",
        subtype: "refund_payable",
        ownerId: originalPayment.businessId,
        ownerType: "business",
      });

      if (platformCash) {
        this.ledger.recordTransaction({
          description: `Refund for payment ${originalPayment.id}${reason ? `: ${reason}` : ""}`,
          reference: originalPayment.id,
          referenceType: "refund",
          entries: [
            { accountId: refundPayable.id, debit: 0, credit: refundAmount },
            { accountId: platformCash.id, debit: 0, credit: refundAmount },
          ],
          metadata: {
            originalPaymentId: originalPayment.id,
            stripeRefundId: stripeRefund.id,
            reason: reason ?? "none",
          },
        });
      }

      return {
        success: true,
        refundId: stripeRefund.id,
        amount: refundAmount,
        error: null,
        status: stripeRefund.status as RefundResult["status"],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown refund error";
      return {
        success: false,
        refundId: null,
        amount: 0,
        error: message,
        status: "failed",
      };
    }
  }

  /**
   * Check the status of a payout.
   */
  async getPayoutStatus(payoutId: string): Promise<PayoutResult> {
    // Check cached result first
    const cached = this.payoutResults.get(payoutId);

    try {
      const stripeStatus = await this.stripe.getPayoutStatus(payoutId);
      const result: PayoutResult = {
        success: true,
        payoutId,
        error: null,
        status: stripeStatus.status as PayoutResult["status"],
      };

      this.payoutResults.set(payoutId, result);
      return result;
    } catch {
      if (cached) return cached;
      return {
        success: false,
        payoutId,
        error: "Unable to retrieve payout status",
        status: "failed",
      };
    }
  }

  /**
   * Get a payment intent by ID.
   */
  getPaymentIntent(paymentIntentId: string): PaymentIntent | null {
    return this.paymentIntents.get(paymentIntentId) ?? null;
  }

  /**
   * Get all payment intents for a business.
   */
  getBusinessPayments(businessId: string): PaymentIntent[] {
    const results: PaymentIntent[] = [];
    for (const pi of this.paymentIntents.values()) {
      if (pi.businessId === businessId) {
        results.push(pi);
      }
    }
    return results.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Clear all data (used in tests).
   */
  clear(): void {
    this.connectedAccounts.clear();
    this.paymentIntents.clear();
    this.payoutResults.clear();
  }
}
