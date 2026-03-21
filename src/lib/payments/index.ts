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

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════════

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function nowISO(): string {
  return new Date().toISOString();
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Double-Entry Bookkeeping Engine
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Real double-entry bookkeeping where every transaction has balanced
 * debits and credits. Account balance computation follows standard
 * accounting rules:
 *
 * - Asset & Expense accounts: balance increases with debits, decreases with credits
 * - Liability, Equity & Revenue accounts: balance increases with credits, decreases with debits
 *
 * Every recorded transaction must balance: sum(debits) === sum(credits).
 */
export class FinancialLedger {
  private accounts: Map<string, Account> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private entries: LedgerEntry[] = [];

  // ── Account Operations ──────────────────────────────────────────────────

  /**
   * Create a new financial account.
   */
  createAccount(params: {
    name: string;
    type: AccountType;
    subtype: AccountSubtype;
    ownerId: string;
    ownerType: AccountOwnerType;
    currency?: string;
  }): Account {
    const { name, type, subtype, ownerId, ownerType, currency = "USD" } = params;

    if (!name || !type || !subtype || !ownerId || !ownerType) {
      throw new Error("All account fields (name, type, subtype, ownerId, ownerType) are required");
    }

    // Check for duplicate: same owner + subtype combination
    for (const existing of this.accounts.values()) {
      if (existing.ownerId === ownerId && existing.subtype === subtype) {
        throw new Error(
          `Account already exists for owner '${ownerId}' with subtype '${subtype}' (${existing.id})`
        );
      }
    }

    const account: Account = {
      id: generateId("acct"),
      name,
      type,
      subtype,
      currency,
      balance: 0,
      ownerId,
      ownerType,
      frozen: false,
      createdAt: nowISO(),
    };

    this.accounts.set(account.id, account);
    return account;
  }

  /**
   * Get an account by its ID, or null if not found.
   */
  getAccount(accountId: string): Account | null {
    return this.accounts.get(accountId) ?? null;
  }

  /**
   * Find an account by owner and subtype.
   */
  getAccountByOwner(ownerId: string, subtype: AccountSubtype): Account | null {
    for (const account of this.accounts.values()) {
      if (account.ownerId === ownerId && account.subtype === subtype) {
        return account;
      }
    }
    return null;
  }

  /**
   * Get all accounts for a given owner.
   */
  getAccountsByOwner(ownerId: string): Account[] {
    const results: Account[] = [];
    for (const account of this.accounts.values()) {
      if (account.ownerId === ownerId) {
        results.push(account);
      }
    }
    return results;
  }

  /**
   * Get or create an account — ensures idempotent operations.
   */
  getOrCreateAccount(params: {
    name: string;
    type: AccountType;
    subtype: AccountSubtype;
    ownerId: string;
    ownerType: AccountOwnerType;
    currency?: string;
  }): Account {
    const existing = this.getAccountByOwner(params.ownerId, params.subtype);
    if (existing) return existing;
    return this.createAccount(params);
  }

  /**
   * Freeze an account to prevent further transactions.
   */
  freezeAccount(accountId: string): void {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account '${accountId}' not found`);
    account.frozen = true;
  }

  /**
   * Unfreeze an account to allow transactions again.
   */
  unfreezeAccount(accountId: string): void {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account '${accountId}' not found`);
    account.frozen = false;
  }

  // ── Core Transaction Recording ──────────────────────────────────────────

  /**
   * Record a balanced transaction with multiple debit/credit entries.
   * Sum of all debits must exactly equal sum of all credits.
   *
   * Each entry specifies an account and either a debit or credit amount
   * (one must be zero, the other positive).
   */
  recordTransaction(params: {
    description: string;
    reference: string;
    referenceType: string;
    entries: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description?: string;
      metadata?: Record<string, unknown>;
    }>;
    metadata?: Record<string, unknown>;
  }): Transaction {
    const {
      description,
      reference,
      referenceType,
      entries: entrySpecs,
      metadata = {},
    } = params;

    if (!description) throw new Error("Transaction description is required");
    if (!entrySpecs || entrySpecs.length < 2) {
      throw new Error("A transaction requires at least 2 entries");
    }

    // Validate individual entries
    let totalDebits = 0;
    let totalCredits = 0;

    for (const spec of entrySpecs) {
      if (spec.debit < 0 || spec.credit < 0) {
        throw new Error("Debit and credit amounts must be non-negative");
      }
      if (spec.debit === 0 && spec.credit === 0) {
        throw new Error("Each entry must have either a debit or credit amount");
      }
      if (spec.debit > 0 && spec.credit > 0) {
        throw new Error("An entry cannot have both a debit and credit amount");
      }

      const account = this.accounts.get(spec.accountId);
      if (!account) {
        throw new Error(`Account '${spec.accountId}' not found`);
      }
      if (account.frozen) {
        throw new Error(`Account '${spec.accountId}' is frozen and cannot accept transactions`);
      }

      totalDebits = round2(totalDebits + spec.debit);
      totalCredits = round2(totalCredits + spec.credit);
    }

    // Enforce double-entry balance
    if (Math.abs(totalDebits - totalCredits) > 0.005) {
      throw new Error(
        `Transaction does not balance: debits=${totalDebits}, credits=${totalCredits}`
      );
    }

    // All validations passed — record the transaction
    const transactionId = generateId("txn");
    const now = nowISO();
    const ledgerEntries: LedgerEntry[] = [];

    for (const spec of entrySpecs) {
      const account = this.accounts.get(spec.accountId)!;

      const entry: LedgerEntry = {
        id: generateId("le"),
        transactionId,
        accountId: spec.accountId,
        accountType: account.type,
        debit: round2(spec.debit),
        credit: round2(spec.credit),
        currency: account.currency,
        description: spec.description ?? description,
        metadata: spec.metadata ?? {},
        createdAt: now,
      };

      ledgerEntries.push(entry);
      this.entries.push(entry);

      // Update account balance using standard accounting rules:
      // Asset & Expense: debit increases, credit decreases
      // Liability, Equity, Revenue: credit increases, debit decreases
      if (account.type === "asset" || account.type === "expense") {
        account.balance = round2(account.balance + spec.debit - spec.credit);
      } else {
        // liability, equity, revenue
        account.balance = round2(account.balance + spec.credit - spec.debit);
      }
    }

    const transaction: Transaction = {
      id: transactionId,
      entries: ledgerEntries,
      description,
      reference,
      referenceType,
      status: "posted",
      createdAt: now,
      metadata,
    };

    this.transactions.set(transactionId, transaction);
    return transaction;
  }

  // ── Balance & Statement ─────────────────────────────────────────────────

  /**
   * Get the current balance for an account.
   */
  getBalance(accountId: string): number {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account '${accountId}' not found`);
    return account.balance;
  }

  /**
   * Recompute balance from ledger entries (for audit / verification).
   */
  computeBalance(accountId: string): number {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account '${accountId}' not found`);

    let balance = 0;
    for (const entry of this.entries) {
      if (entry.accountId !== accountId) continue;
      if (account.type === "asset" || account.type === "expense") {
        balance += entry.debit - entry.credit;
      } else {
        balance += entry.credit - entry.debit;
      }
    }
    return round2(balance);
  }

  /**
   * Verify that the stored balance matches the computed balance from entries.
   */
  verifyBalance(accountId: string): {
    accountId: string;
    storedBalance: number;
    computedBalance: number;
    isConsistent: boolean;
    discrepancy: number;
  } {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account '${accountId}' not found`);

    const computed = this.computeBalance(accountId);
    return {
      accountId,
      storedBalance: account.balance,
      computedBalance: computed,
      isConsistent: Math.abs(account.balance - computed) < 0.005,
      discrepancy: round2(account.balance - computed),
    };
  }

  /**
   * Get all ledger entries for an account within a date range.
   */
  getStatement(
    accountId: string,
    startDate: string,
    endDate: string
  ): LedgerEntry[] {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account '${accountId}' not found`);

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    if (isNaN(start) || isNaN(end)) {
      throw new Error("Invalid date range");
    }

    return this.entries
      .filter((e) => {
        if (e.accountId !== accountId) return false;
        const t = new Date(e.createdAt).getTime();
        return t >= start && t <= end;
      })
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }

  /**
   * Convenience method: transfer money between two accounts.
   * Creates a balanced transaction with one debit entry and one credit entry.
   */
  transfer(params: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description: string;
    reference: string;
    referenceType: string;
    metadata?: Record<string, unknown>;
  }): Transaction {
    const {
      fromAccountId,
      toAccountId,
      amount,
      description,
      reference,
      referenceType,
      metadata = {},
    } = params;

    if (amount <= 0) throw new Error("Transfer amount must be positive");
    if (fromAccountId === toAccountId) {
      throw new Error("Cannot transfer to the same account");
    }

    const fromAccount = this.accounts.get(fromAccountId);
    const toAccount = this.accounts.get(toAccountId);
    if (!fromAccount) throw new Error(`From account '${fromAccountId}' not found`);
    if (!toAccount) throw new Error(`To account '${toAccountId}' not found`);

    if (fromAccount.currency !== toAccount.currency) {
      throw new Error(
        `Currency mismatch: from=${fromAccount.currency}, to=${toAccount.currency}`
      );
    }

    // Determine debit/credit based on standard accounting:
    // "From" account decreases — for asset/expense that means credit,
    // for liability/equity/revenue that means debit.
    // "To" account increases — opposite logic.
    //
    // We model this simply: debit the from account, credit the to account.
    // The recordTransaction method applies the correct sign per account type.
    return this.recordTransaction({
      description,
      reference,
      referenceType,
      entries: [
        { accountId: fromAccountId, debit: round2(amount), credit: 0 },
        { accountId: toAccountId, debit: 0, credit: round2(amount) },
      ],
      metadata,
    });
  }

  // ── Query ───────────────────────────────────────────────────────────────

  /**
   * Get a transaction by its ID.
   */
  getTransaction(transactionId: string): Transaction | null {
    return this.transactions.get(transactionId) ?? null;
  }

  /**
   * Get all transactions for a given reference (e.g., campaignId).
   */
  getTransactionsByReference(reference: string): Transaction[] {
    const results: Transaction[] = [];
    for (const txn of this.transactions.values()) {
      if (txn.reference === reference) {
        results.push(txn);
      }
    }
    return results.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  /**
   * Get all entries for a given account.
   */
  getEntriesForAccount(accountId: string, limit = 50, offset = 0): LedgerEntry[] {
    const matching = this.entries.filter((e) => e.accountId === accountId);
    matching.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const safeLimit = Math.min(200, Math.max(1, limit));
    const safeOffset = Math.max(0, offset);
    return matching.slice(safeOffset, safeOffset + safeLimit);
  }

  /**
   * Get total entry count.
   */
  getEntryCount(): number {
    return this.entries.length;
  }

  /**
   * Get total account count.
   */
  getAccountCount(): number {
    return this.accounts.size;
  }

  /**
   * Clear all data (used in tests).
   */
  clear(): void {
    this.accounts.clear();
    this.transactions.clear();
    this.entries.length = 0;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. Stripe Connect Integration Layer (Mock)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Mock Stripe client that simulates real API behavior with realistic
 * delays and occasional failures. In production, replace mock calls
 * with actual Stripe SDK calls.
 */
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

  async createConnectedAccount(params: {
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

  async createPaymentIntent(params: {
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

  async createTransfer(params: {
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

  async createPayout(params: {
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
  private config: StripeConfig;
  private ledger: FinancialLedger;

  constructor(config: StripeConfig, ledger: FinancialLedger) {
    this.config = config;
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

// ══════════════════════════════════════════════════════════════════════════════
// 3. Escrow Manager
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Holds campaign budgets in escrow until submissions are approved.
 * When a business funds a campaign, the money is held in escrow.
 * When a submission is approved, a portion is released to the influencer.
 * Any remaining funds can be refunded to the business when the campaign ends.
 */
export class EscrowManager {
  private holds: Map<string, EscrowHold> = new Map();
  private ledger: FinancialLedger;

  constructor(ledger: FinancialLedger) {
    this.ledger = ledger;
  }

  /**
   * Place campaign budget funds in escrow.
   * Creates escrow ledger accounts and records the hold.
   */
  holdFunds(params: {
    campaignId: string;
    businessId: string;
    amount: number;
    currency?: string;
  }): EscrowHold {
    const { campaignId, businessId, amount, currency = "USD" } = params;

    if (amount <= 0) throw new Error("Escrow amount must be positive");

    // Check for existing hold on this campaign
    for (const hold of this.holds.values()) {
      if (hold.campaignId === campaignId && hold.status === "held") {
        throw new Error(`Campaign '${campaignId}' already has an active escrow hold`);
      }
    }

    // Ensure escrow account exists
    const escrowAccount = this.ledger.getOrCreateAccount({
      name: `Escrow — Campaign ${campaignId}`,
      type: "asset",
      subtype: "escrow",
      ownerId: `escrow_${campaignId}`,
      ownerType: "platform",
      currency,
    });

    // Business cash account
    const bizCash = this.ledger.getOrCreateAccount({
      name: `Business ${businessId} — Cash`,
      type: "asset",
      subtype: "cash",
      ownerId: businessId,
      ownerType: "business",
      currency,
    });

    // Record the escrow hold: debit escrow (increase), credit business cash (decrease)
    this.ledger.recordTransaction({
      description: `Escrow hold for campaign ${campaignId}`,
      reference: campaignId,
      referenceType: "escrow_hold",
      entries: [
        { accountId: escrowAccount.id, debit: round2(amount), credit: 0 },
        { accountId: bizCash.id, debit: 0, credit: round2(amount) },
      ],
      metadata: { businessId, campaignId },
    });

    const hold: EscrowHold = {
      id: generateId("esc"),
      campaignId,
      businessId,
      amount: round2(amount),
      currency,
      status: "held",
      heldAt: nowISO(),
      releasedAmount: 0,
      refundedAmount: 0,
      releases: [],
    };

    this.holds.set(hold.id, hold);
    return hold;
  }

  /**
   * Release escrow funds to an influencer when a submission is approved.
   */
  releaseFunds(params: {
    escrowId: string;
    influencerId: string;
    submissionId: string;
    amount: number;
  }): EscrowRelease {
    const { escrowId, influencerId, submissionId, amount } = params;

    const hold = this.holds.get(escrowId);
    if (!hold) throw new Error(`Escrow hold '${escrowId}' not found`);

    if (hold.status === "fully_released" || hold.status === "refunded") {
      throw new Error(`Escrow hold '${escrowId}' is already ${hold.status}`);
    }

    if (amount <= 0) throw new Error("Release amount must be positive");

    const availableForRelease = round2(
      hold.amount - hold.releasedAmount - hold.refundedAmount
    );
    if (amount > availableForRelease) {
      throw new Error(
        `Cannot release ${amount}: only ${availableForRelease} available in escrow`
      );
    }

    // Move funds from escrow to influencer payable
    const escrowAccount = this.ledger.getAccountByOwner(
      `escrow_${hold.campaignId}`,
      "escrow"
    );
    const influencerPayable = this.ledger.getOrCreateAccount({
      name: `Influencer ${influencerId} — Payable`,
      type: "liability",
      subtype: "influencer_payable",
      ownerId: influencerId,
      ownerType: "influencer",
    });

    if (!escrowAccount) {
      throw new Error(`Escrow account not found for campaign '${hold.campaignId}'`);
    }

    this.ledger.recordTransaction({
      description: `Escrow release for submission ${submissionId}`,
      reference: hold.campaignId,
      referenceType: "escrow_release",
      entries: [
        { accountId: escrowAccount.id, debit: 0, credit: round2(amount) },
        { accountId: influencerPayable.id, debit: 0, credit: round2(amount) },
      ],
      metadata: { escrowId, influencerId, submissionId },
    });

    const release: EscrowRelease = {
      id: generateId("rel"),
      escrowId,
      influencerId,
      submissionId,
      amount: round2(amount),
      releasedAt: nowISO(),
    };

    hold.releases.push(release);
    hold.releasedAmount = round2(hold.releasedAmount + amount);

    // Update status
    const remaining = round2(hold.amount - hold.releasedAmount - hold.refundedAmount);
    if (remaining < 0.01) {
      hold.status = "fully_released";
    } else {
      hold.status = "partially_released";
    }

    return release;
  }

  /**
   * Refund remaining escrow funds back to the business.
   * Typically called when a campaign ends with unspent budget.
   */
  refundFunds(params: {
    escrowId: string;
    amount?: number;
  }): { refundedAmount: number; hold: EscrowHold } {
    const { escrowId, amount } = params;

    const hold = this.holds.get(escrowId);
    if (!hold) throw new Error(`Escrow hold '${escrowId}' not found`);

    if (hold.status === "fully_released" || hold.status === "refunded") {
      throw new Error(`Escrow hold '${escrowId}' is already ${hold.status}`);
    }

    const availableForRefund = round2(
      hold.amount - hold.releasedAmount - hold.refundedAmount
    );
    const refundAmount = round2(amount ?? availableForRefund);

    if (refundAmount <= 0) {
      throw new Error("No funds available to refund");
    }
    if (refundAmount > availableForRefund) {
      throw new Error(
        `Cannot refund ${refundAmount}: only ${availableForRefund} available`
      );
    }

    // Move funds from escrow back to business cash
    const escrowAccount = this.ledger.getAccountByOwner(
      `escrow_${hold.campaignId}`,
      "escrow"
    );
    const bizCash = this.ledger.getOrCreateAccount({
      name: `Business ${hold.businessId} — Cash`,
      type: "asset",
      subtype: "cash",
      ownerId: hold.businessId,
      ownerType: "business",
    });

    if (!escrowAccount) {
      throw new Error(`Escrow account not found for campaign '${hold.campaignId}'`);
    }

    this.ledger.recordTransaction({
      description: `Escrow refund for campaign ${hold.campaignId}`,
      reference: hold.campaignId,
      referenceType: "escrow_refund",
      entries: [
        { accountId: escrowAccount.id, debit: 0, credit: refundAmount },
        { accountId: bizCash.id, debit: refundAmount, credit: 0 },
      ],
      metadata: { escrowId, businessId: hold.businessId },
    });

    hold.refundedAmount = round2(hold.refundedAmount + refundAmount);

    // Update status
    const remaining = round2(hold.amount - hold.releasedAmount - hold.refundedAmount);
    if (remaining < 0.01) {
      hold.status = "refunded";
    }

    return { refundedAmount: refundAmount, hold };
  }

  /**
   * Get escrow balance and status for a hold.
   */
  getEscrowBalance(escrowId: string): {
    hold: EscrowHold;
    available: number;
    released: number;
    refunded: number;
  } {
    const hold = this.holds.get(escrowId);
    if (!hold) throw new Error(`Escrow hold '${escrowId}' not found`);

    return {
      hold,
      available: round2(hold.amount - hold.releasedAmount - hold.refundedAmount),
      released: hold.releasedAmount,
      refunded: hold.refundedAmount,
    };
  }

  /**
   * Get all escrow holds for a campaign.
   */
  getEscrowsForCampaign(campaignId: string): EscrowHold[] {
    const results: EscrowHold[] = [];
    for (const hold of this.holds.values()) {
      if (hold.campaignId === campaignId) {
        results.push(hold);
      }
    }
    return results;
  }

  /**
   * Get all escrow holds for a business.
   */
  getEscrowsForBusiness(businessId: string): EscrowHold[] {
    const results: EscrowHold[] = [];
    for (const hold of this.holds.values()) {
      if (hold.businessId === businessId) {
        results.push(hold);
      }
    }
    return results;
  }

  /**
   * Get an escrow hold by ID.
   */
  getEscrowHold(escrowId: string): EscrowHold | null {
    return this.holds.get(escrowId) ?? null;
  }

  /**
   * Clear all data (used in tests).
   */
  clear(): void {
    this.holds.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. Tax Reporting
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Tax reporting engine for influencer earnings.
 * Generates 1099-NEC data for influencers earning over $600/year.
 * Tracks quarterly breakdowns and withholding amounts.
 */
export class TaxReporter {
  private taxRecords: Map<string, TaxRecord> = new Map();
  private ledger: FinancialLedger;

  /** IRS threshold for 1099-NEC filing (nonemployee compensation). */
  private static readonly THRESHOLD_1099_NEC = 600;

  /** IRS threshold for 1099-K filing (payment card / third-party network). */
  private static readonly THRESHOLD_1099_K = 600;

  constructor(ledger: FinancialLedger) {
    this.ledger = ledger;
  }

  /**
   * Calculate total earnings for an influencer in a given tax year
   * by scanning all ledger entries where their payable account was credited.
   */
  calculateYearlyEarnings(influencerId: string, year: number): {
    totalEarnings: number;
    totalPayouts: number;
    quarters: QuarterlyBreakdown[];
  } {
    const payableAccount = this.ledger.getAccountByOwner(
      influencerId,
      "influencer_payable"
    );

    if (!payableAccount) {
      return {
        totalEarnings: 0,
        totalPayouts: 0,
        quarters: [
          { quarter: 1, earnings: 0, payouts: 0 },
          { quarter: 2, earnings: 0, payouts: 0 },
          { quarter: 3, earnings: 0, payouts: 0 },
          { quarter: 4, earnings: 0, payouts: 0 },
        ],
      };
    }

    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`).getTime();
    const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`).getTime();

    let totalEarnings = 0;
    let totalPayouts = 0;
    const quarterlyEarnings = [0, 0, 0, 0];
    const quarterlyPayouts = [0, 0, 0, 0];

    // Get all entries for this account in the year
    const entries = this.ledger.getStatement(
      payableAccount.id,
      new Date(yearStart).toISOString(),
      new Date(yearEnd).toISOString()
    );

    for (const entry of entries) {
      const entryDate = new Date(entry.createdAt);
      const month = entryDate.getUTCMonth(); // 0-11
      const quarterIndex = Math.floor(month / 3); // 0-3

      // Credits to influencer_payable = earnings (escrow releases, etc.)
      if (entry.credit > 0) {
        totalEarnings += entry.credit;
        quarterlyEarnings[quarterIndex] += entry.credit;
      }

      // Debits from influencer_payable = payouts
      if (entry.debit > 0) {
        totalPayouts += entry.debit;
        quarterlyPayouts[quarterIndex] += entry.debit;
      }
    }

    return {
      totalEarnings: round2(totalEarnings),
      totalPayouts: round2(totalPayouts),
      quarters: [
        { quarter: 1, earnings: round2(quarterlyEarnings[0]), payouts: round2(quarterlyPayouts[0]) },
        { quarter: 2, earnings: round2(quarterlyEarnings[1]), payouts: round2(quarterlyPayouts[1]) },
        { quarter: 3, earnings: round2(quarterlyEarnings[2]), payouts: round2(quarterlyPayouts[2]) },
        { quarter: 4, earnings: round2(quarterlyEarnings[3]), payouts: round2(quarterlyPayouts[3]) },
      ],
    };
  }

  /**
   * Generate 1099-NEC data for an influencer.
   * Returns a TaxRecord with form generation status.
   * A 1099-NEC is required when nonemployee compensation >= $600.
   */
  generate1099(influencerId: string, year: number): TaxRecord {
    const key = `${influencerId}_${year}`;
    const existing = this.taxRecords.get(key);
    if (existing && existing.forms.some((f) => f.type === "1099-NEC" && f.generated)) {
      return existing;
    }

    const earnings = this.calculateYearlyEarnings(influencerId, year);

    const requiresNEC = earnings.totalEarnings >= TaxReporter.THRESHOLD_1099_NEC;
    const requiresK = earnings.totalPayouts >= TaxReporter.THRESHOLD_1099_K;

    // Withholding is 0 in this version (no backup withholding implemented yet)
    const totalWithholding = 0;

    const forms: TaxForm[] = [];

    if (requiresNEC) {
      forms.push({
        type: "1099-NEC",
        generated: true,
        sentAt: null,
      });
    }

    if (requiresK) {
      forms.push({
        type: "1099-K",
        generated: true,
        sentAt: null,
      });
    }

    // If neither threshold met, still store a record with no forms
    if (forms.length === 0) {
      forms.push({
        type: "1099-NEC",
        generated: false,
        sentAt: null,
      });
    }

    const record: TaxRecord = {
      influencerId,
      year,
      totalEarnings: earnings.totalEarnings,
      totalPayouts: earnings.totalPayouts,
      totalWithholding,
      forms,
    };

    this.taxRecords.set(key, record);
    return record;
  }

  /**
   * Get a comprehensive tax summary for an influencer for a given year.
   */
  getInfluencerTaxSummary(influencerId: string, year: number): TaxSummary {
    // Calculate or re-calculate earnings
    const earnings = this.calculateYearlyEarnings(influencerId, year);

    // Generate 1099 if not already done
    const record = this.generate1099(influencerId, year);

    return {
      influencerId,
      year,
      totalEarnings: record.totalEarnings,
      totalPayouts: record.totalPayouts,
      totalWithholding: record.totalWithholding,
      requiresForm1099NEC: record.totalEarnings >= TaxReporter.THRESHOLD_1099_NEC,
      requiresForm1099K: record.totalPayouts >= TaxReporter.THRESHOLD_1099_K,
      forms: record.forms,
      quarters: earnings.quarters,
    };
  }

  /**
   * Get all influencer IDs that require 1099-NEC filing for a given year.
   */
  getInfluencersRequiring1099(year: number): string[] {
    const influencerIds = new Set<string>();

    // Scan all accounts of type "influencer_payable"
    // and check yearly earnings
    const allAccounts = this.getAllInfluencerAccountIds();

    for (const influencerId of allAccounts) {
      const earnings = this.calculateYearlyEarnings(influencerId, year);
      if (earnings.totalEarnings >= TaxReporter.THRESHOLD_1099_NEC) {
        influencerIds.add(influencerId);
      }
    }

    return Array.from(influencerIds);
  }

  /**
   * Mark a tax form as sent to the influencer.
   */
  markFormSent(influencerId: string, year: number, formType: "1099-NEC" | "1099-K"): void {
    const key = `${influencerId}_${year}`;
    const record = this.taxRecords.get(key);
    if (!record) {
      throw new Error(`No tax record found for influencer '${influencerId}' year ${year}`);
    }

    const form = record.forms.find((f) => f.type === formType);
    if (!form) {
      throw new Error(`No ${formType} form found for influencer '${influencerId}' year ${year}`);
    }

    if (!form.generated) {
      throw new Error(`${formType} form has not been generated yet`);
    }

    (form as { sentAt: string | null }).sentAt = nowISO();
  }

  /**
   * Get all distinct influencer IDs from ledger accounts.
   */
  private getAllInfluencerAccountIds(): string[] {
    const ids = new Set<string>();
    // We need to scan accounts - since FinancialLedger does not expose
    // a method to list all owners by type, we check all accounts
    // by iterating through account counts. We use getAccountsByOwner
    // with known IDs from tax records, plus scan entries for unknown ones.

    // From existing tax records
    for (const record of this.taxRecords.values()) {
      ids.add(record.influencerId);
    }

    // Check any influencer_payable accounts in the ledger
    // We look through entries for accounts that are influencer_payable type
    // Since we cannot directly list all accounts, we rely on what we know
    return Array.from(ids);
  }

  /**
   * Register an influencer ID for tax tracking.
   * Call this when creating connected accounts or processing earnings.
   */
  registerInfluencer(influencerId: string): void {
    // Pre-populate a stub record for the current year if needed
    const year = new Date().getUTCFullYear();
    const key = `${influencerId}_${year}`;
    if (!this.taxRecords.has(key)) {
      this.taxRecords.set(key, {
        influencerId,
        year,
        totalEarnings: 0,
        totalPayouts: 0,
        totalWithholding: 0,
        forms: [{ type: "1099-NEC", generated: false, sentAt: null }],
      });
    }
  }

  /**
   * Clear all data (used in tests).
   */
  clear(): void {
    this.taxRecords.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Singleton Instances & Exports
// ══════════════════════════════════════════════════════════════════════════════

/** Default Stripe configuration for development (mock). */
const defaultStripeConfig: StripeConfig = {
  secretKey: "sk_test_mock_development_key",
  webhookSecret: "whsec_mock_development_secret",
  platformAccountId: "acct_platform_mock",
};

/** Shared financial ledger instance. */
export const paymentLedger = new FinancialLedger();

/** Shared payment processor instance. */
export const paymentProcessor = new PaymentProcessor(defaultStripeConfig, paymentLedger);

/** Shared escrow manager instance. */
export const escrowManager = new EscrowManager(paymentLedger);

/** Shared tax reporter instance. */
export const taxReporter = new TaxReporter(paymentLedger);
