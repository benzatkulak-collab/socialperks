/**
 * Financial Ledger — Double-Entry Bookkeeping for Social Perks
 *
 * Every financial event on the platform produces a balanced ledger entry:
 * one account is debited, another is credited by the same amount.
 * This ensures the books always balance and provides a full audit trail.
 *
 * Storage: in-memory Maps (ready for Postgres + Prisma migration).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type LedgerEntryType =
  | "perk_awarded"
  | "perk_redeemed"
  | "perk_expired"
  | "influencer_earned"
  | "influencer_payout"
  | "subscription_charge"
  | "platform_fee"
  | "refund"
  | "adjustment";

export type AccountOwnerType = "business" | "influencer" | "customer" | "platform";

export type AccountType = "perk_balance" | "earnings" | "subscription" | "platform_revenue";

export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  currency: string;
  description: string;
  relatedEntityId: string;
  relatedEntityType: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface Account {
  id: string;
  ownerId: string;
  ownerType: AccountOwnerType;
  type: AccountType;
  balance: number;
  currency: string;
  createdAt: string;
}

export interface RevenueReport {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  subscriptions: number;
  fees: number;
  perksDistributed: number;
  entryCount: number;
}

export interface BusinessSpendReport {
  businessId: string;
  totalPerks: number;
  totalSubscription: number;
  totalFees: number;
  totalSpend: number;
}

export interface InfluencerEarningsReport {
  influencerId: string;
  totalEarned: number;
  totalPaid: number;
  pendingBalance: number;
}

export interface BalanceVerification {
  accountId: string;
  storedBalance: number;
  calculatedBalance: number;
  isConsistent: boolean;
  discrepancy: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateAccountId(): string {
  return `acc_${crypto.randomUUID()}`;
}

function generateEntryId(): string {
  return `txn_${crypto.randomUUID()}`;
}

// ─── Financial Ledger ───────────────────────────────────────────────────────

class FinancialLedger {
  private accounts: Map<string, Account> = new Map();
  private entries: LedgerEntry[] = [];
  private readonly maxEntries = 200_000;
  /** Warnings accumulated during operations (e.g., approaching limits). */
  private _warnings: string[] = [];

  // ── Account Operations ──────────────────────────────────────────────────

  /**
   * Create a new financial account for an entity on the platform.
   * Each (ownerId, type) combination must be unique.
   */
  createAccount(
    ownerId: string,
    ownerType: AccountOwnerType,
    type: AccountType,
    currency: string = "USD"
  ): Account {
    if (!ownerId || typeof ownerId !== "string") {
      throw new Error("ownerId is required");
    }
    if (!ownerType) {
      throw new Error("ownerType is required");
    }
    if (!type) {
      throw new Error("account type is required");
    }

    // Prevent duplicate accounts for the same owner + type
    const existing = this.getAccountByOwner(ownerId, type);
    if (existing) {
      throw new Error(
        `Account already exists for owner '${ownerId}' with type '${type}' (${existing.id})`
      );
    }

    const account: Account = {
      id: generateAccountId(),
      ownerId,
      ownerType,
      type,
      balance: 0,
      currency,
      createdAt: new Date().toISOString(),
    };

    this.accounts.set(account.id, account);
    return account;
  }

  /** Get an account by its ID. */
  getAccount(accountId: string): Account | null {
    return this.accounts.get(accountId) ?? null;
  }

  /** Find an account by owner ID and account type. */
  getAccountByOwner(ownerId: string, type: AccountType): Account | null {
    for (const account of this.accounts.values()) {
      if (account.ownerId === ownerId && account.type === type) {
        return account;
      }
    }
    return null;
  }

  /** Get all accounts for a given owner. */
  getAccountsByOwner(ownerId: string): Account[] {
    const results: Account[] = [];
    for (const account of this.accounts.values()) {
      if (account.ownerId === ownerId) {
        results.push(account);
      }
    }
    return results;
  }

  /** Get the current balance of an account. */
  getBalance(accountId: string): number {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account '${accountId}' not found`);
    }
    return account.balance;
  }

  // ── Core Double-Entry Transaction ───────────────────────────────────────

  /**
   * Record a double-entry transaction: debit one account, credit another.
   *
   * Debit decreases the debit account balance.
   * Credit increases the credit account balance.
   * The total across all accounts always sums to zero.
   */
  recordTransaction(
    type: LedgerEntryType,
    debitAccountId: string,
    creditAccountId: string,
    amount: number,
    description: string,
    relatedEntityId: string,
    relatedEntityType: string,
    metadata: Record<string, unknown> = {}
  ): LedgerEntry {
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      throw new Error("Transaction amount must be a finite positive number");
    }
    if (!description || typeof description !== "string") {
      throw new Error("Transaction description is required");
    }

    const debitAccount = this.accounts.get(debitAccountId);
    if (!debitAccount) {
      throw new Error(`Debit account '${debitAccountId}' not found`);
    }

    const creditAccount = this.accounts.get(creditAccountId);
    if (!creditAccount) {
      throw new Error(`Credit account '${creditAccountId}' not found`);
    }

    if (debitAccount.currency !== creditAccount.currency) {
      throw new Error(
        `Currency mismatch: debit account '${debitAccountId}' is ${debitAccount.currency}, credit account '${creditAccountId}' is ${creditAccount.currency}. Convert to a common currency before recording the transaction.`
      );
    }

    // Apply the double entry using integer cents to prevent floating-point accumulation.
    // Converting to cents → integer math → back to dollars ensures at most one
    // rounding operation per transaction, with no accumulated drift.
    const amountCents = Math.round(amount * 100);
    debitAccount.balance = (Math.round(debitAccount.balance * 100) - amountCents) / 100;
    creditAccount.balance = (Math.round(creditAccount.balance * 100) + amountCents) / 100;

    const entry: LedgerEntry = {
      id: generateEntryId(),
      type,
      debitAccountId,
      creditAccountId,
      amount: amountCents / 100,
      currency: debitAccount.currency,
      description,
      relatedEntityId,
      relatedEntityType,
      createdAt: new Date().toISOString(),
      metadata,
    };

    this.entries.push(entry);

    // Bounds checking: warn when approaching max entries, evict oldest when exceeded
    if (this.entries.length > this.maxEntries) {
      const evictCount = Math.floor(this.maxEntries * 0.1);
      const warning = `[FinancialLedger] Entry limit exceeded (${this.entries.length}/${this.maxEntries}). Evicting oldest ${evictCount} entries.`;
      console.warn(warning);
      this._warnings.push(warning);
      this.entries.splice(0, evictCount);
    } else if (this.entries.length > this.maxEntries * 0.9) {
      const warning = `[FinancialLedger] Approaching entry limit: ${this.entries.length}/${this.maxEntries} (${((this.entries.length / this.maxEntries) * 100).toFixed(0)}%)`;
      console.warn(warning);
      this._warnings.push(warning);
    }

    return entry;
  }

  // ── Business Operations ─────────────────────────────────────────────────

  /**
   * Award a perk to a customer for completing a campaign action.
   * Debits the business perk_balance, credits the customer perk_balance.
   * Auto-creates customer account if it does not exist.
   */
  awardPerk(
    businessId: string,
    customerId: string,
    amount: number,
    campaignId: string,
    metadata: Record<string, unknown> = {}
  ): LedgerEntry {
    const businessAccount = this.getOrCreateAccount(
      businessId,
      "business",
      "perk_balance"
    );
    const customerAccount = this.getOrCreateAccount(
      customerId,
      "customer",
      "perk_balance"
    );

    return this.recordTransaction(
      "perk_awarded",
      businessAccount.id,
      customerAccount.id,
      amount,
      `Perk awarded for campaign ${campaignId}`,
      campaignId,
      "campaign",
      metadata
    );
  }

  /**
   * Redeem a perk — customer uses their balance at a business.
   * Debits customer perk_balance, credits business perk_balance (returned value).
   */
  redeemPerk(
    customerId: string,
    businessId: string,
    amount: number,
    perkId: string,
    metadata: Record<string, unknown> = {}
  ): LedgerEntry {
    const customerAccount = this.getOrCreateAccount(
      customerId,
      "customer",
      "perk_balance"
    );

    if (Math.round(customerAccount.balance * 100) < Math.round(amount * 100)) {
      throw new Error(
        `Insufficient perk balance: has ${customerAccount.balance}, needs ${amount}`
      );
    }

    const businessAccount = this.getOrCreateAccount(
      businessId,
      "business",
      "perk_balance"
    );

    return this.recordTransaction(
      "perk_redeemed",
      customerAccount.id,
      businessAccount.id,
      amount,
      `Perk redeemed: ${perkId}`,
      perkId,
      "perk",
      metadata
    );
  }

  /**
   * Expire an unused perk — remove value from customer balance.
   * Debits customer perk_balance, credits platform revenue (expired perks).
   */
  expirePerk(
    customerId: string,
    amount: number,
    perkId: string,
    metadata: Record<string, unknown> = {}
  ): LedgerEntry {
    const customerAccount = this.getOrCreateAccount(
      customerId,
      "customer",
      "perk_balance"
    );

    const platformAccount = this.getOrCreateAccount(
      "platform",
      "platform",
      "platform_revenue"
    );

    return this.recordTransaction(
      "perk_expired",
      customerAccount.id,
      platformAccount.id,
      amount,
      `Perk expired: ${perkId}`,
      perkId,
      "perk",
      metadata
    );
  }

  /**
   * Charge a business for their subscription plan.
   * Debits business subscription account, credits platform revenue.
   */
  chargeSubscription(
    businessId: string,
    planAmount: number,
    metadata: Record<string, unknown> = {}
  ): LedgerEntry {
    const businessAccount = this.getOrCreateAccount(
      businessId,
      "business",
      "subscription"
    );
    const platformAccount = this.getOrCreateAccount(
      "platform",
      "platform",
      "platform_revenue"
    );

    return this.recordTransaction(
      "subscription_charge",
      businessAccount.id,
      platformAccount.id,
      planAmount,
      `Subscription charge for business ${businessId}`,
      businessId,
      "business",
      metadata
    );
  }

  /**
   * Charge a platform fee on a transaction (e.g., percentage of perk value).
   * Debits business subscription account, credits platform revenue.
   */
  chargePlatformFee(
    businessId: string,
    feeAmount: number,
    relatedEntityId: string,
    relatedEntityType: string,
    metadata: Record<string, unknown> = {}
  ): LedgerEntry {
    const businessAccount = this.getOrCreateAccount(
      businessId,
      "business",
      "subscription"
    );
    const platformAccount = this.getOrCreateAccount(
      "platform",
      "platform",
      "platform_revenue"
    );

    return this.recordTransaction(
      "platform_fee",
      businessAccount.id,
      platformAccount.id,
      feeAmount,
      `Platform fee for ${relatedEntityType} ${relatedEntityId}`,
      relatedEntityId,
      relatedEntityType,
      metadata
    );
  }

  // ── Influencer Operations ───────────────────────────────────────────────

  /**
   * Record an influencer earning from completing a campaign.
   * Debits business subscription account, credits influencer earnings.
   */
  recordInfluencerEarning(
    influencerId: string,
    businessId: string,
    amount: number,
    campaignId: string,
    metadata: Record<string, unknown> = {}
  ): LedgerEntry {
    const businessAccount = this.getOrCreateAccount(
      businessId,
      "business",
      "subscription"
    );
    const influencerAccount = this.getOrCreateAccount(
      influencerId,
      "influencer",
      "earnings"
    );

    return this.recordTransaction(
      "influencer_earned",
      businessAccount.id,
      influencerAccount.id,
      amount,
      `Influencer earning for campaign ${campaignId}`,
      campaignId,
      "campaign",
      metadata
    );
  }

  /**
   * Process an influencer payout (withdrawal to external bank).
   * Debits influencer earnings, credits platform revenue (as the outflow ledger).
   * In production, this would trigger a Stripe Connect transfer.
   */
  processInfluencerPayout(
    influencerId: string,
    amount: number,
    metadata: Record<string, unknown> = {}
  ): LedgerEntry {
    const influencerAccount = this.getOrCreateAccount(
      influencerId,
      "influencer",
      "earnings"
    );

    if (Math.round(influencerAccount.balance * 100) < Math.round(amount * 100)) {
      throw new Error(
        `Insufficient earnings balance: has ${influencerAccount.balance}, needs ${amount}`
      );
    }

    // Platform revenue acts as the outflow clearing account.
    // In production this would be a separate "payouts" liability account.
    const platformAccount = this.getOrCreateAccount(
      "platform",
      "platform",
      "platform_revenue"
    );

    return this.recordTransaction(
      "influencer_payout",
      influencerAccount.id,
      platformAccount.id,
      amount,
      `Payout to influencer ${influencerId}`,
      influencerId,
      "influencer",
      metadata
    );
  }

  // ── Refund & Adjustment ─────────────────────────────────────────────────

  /**
   * Refund a previous transaction. Creates a reverse entry.
   */
  refund(
    originalEntryId: string,
    reason: string,
    metadata: Record<string, unknown> = {}
  ): LedgerEntry {
    const original = this.entries.find((e) => e.id === originalEntryId);
    if (!original) {
      throw new Error(`Ledger entry '${originalEntryId}' not found`);
    }

    // Reverse: what was debited gets credited, what was credited gets debited
    return this.recordTransaction(
      "refund",
      original.creditAccountId,
      original.debitAccountId,
      original.amount,
      `Refund of ${originalEntryId}: ${reason}`,
      originalEntryId,
      "ledger_entry",
      { ...metadata, originalEntryId, refundReason: reason }
    );
  }

  /**
   * Manual adjustment — for corrections or administrative actions.
   */
  adjustment(
    debitAccountId: string,
    creditAccountId: string,
    amount: number,
    reason: string,
    metadata: Record<string, unknown> = {}
  ): LedgerEntry {
    return this.recordTransaction(
      "adjustment",
      debitAccountId,
      creditAccountId,
      amount,
      `Adjustment: ${reason}`,
      "manual",
      "adjustment",
      { ...metadata, adjustmentReason: reason }
    );
  }

  // ── Query Operations ────────────────────────────────────────────────────

  /**
   * Get transaction history for an account (as debit or credit party).
   */
  getTransactionHistory(
    accountId: string,
    limit: number = 50,
    offset: number = 0
  ): LedgerEntry[] {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account '${accountId}' not found`);
    }

    const matching = this.entries.filter(
      (e) => e.debitAccountId === accountId || e.creditAccountId === accountId
    );

    // Newest first
    matching.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const safeLimit = Math.min(200, Math.max(1, limit));
    const safeOffset = Math.max(0, offset);

    return matching.slice(safeOffset, safeOffset + safeLimit);
  }

  /**
   * Generate a revenue report for a date range.
   * Tallies platform revenue from subscriptions, fees, and perk distribution.
   */
  getRevenueReport(startDate: string, endDate: string): RevenueReport {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    if (isNaN(start) || isNaN(end)) {
      throw new Error("Invalid date range");
    }

    let totalRevenue = 0;
    let subscriptions = 0;
    let fees = 0;
    let perksDistributed = 0;
    let entryCount = 0;

    for (const entry of this.entries) {
      const entryTime = new Date(entry.createdAt).getTime();
      if (entryTime < start || entryTime > end) continue;

      entryCount++;

      switch (entry.type) {
        case "subscription_charge":
          subscriptions += entry.amount;
          totalRevenue += entry.amount;
          break;
        case "platform_fee":
          fees += entry.amount;
          totalRevenue += entry.amount;
          break;
        case "perk_awarded":
          perksDistributed += entry.amount;
          break;
        case "perk_expired":
          // Expired perks flow to platform revenue
          totalRevenue += entry.amount;
          break;
        case "refund":
          totalRevenue -= entry.amount;
          break;
      }
    }

    return {
      startDate,
      endDate,
      totalRevenue: round2(totalRevenue),
      subscriptions: round2(subscriptions),
      fees: round2(fees),
      perksDistributed: round2(perksDistributed),
      entryCount,
    };
  }

  /**
   * Get a spend summary for a business: perks distributed, subscriptions, fees.
   */
  getBusinessSpend(businessId: string): BusinessSpendReport {
    const businessAccounts = this.getAccountsByOwner(businessId);
    const accountIds = new Set(businessAccounts.map((a) => a.id));

    let totalPerks = 0;
    let totalSubscription = 0;
    let totalFees = 0;

    for (const entry of this.entries) {
      // Only count entries where the business is the debit (paying) side
      if (!accountIds.has(entry.debitAccountId)) continue;

      switch (entry.type) {
        case "perk_awarded":
          totalPerks += entry.amount;
          break;
        case "subscription_charge":
          totalSubscription += entry.amount;
          break;
        case "platform_fee":
          totalFees += entry.amount;
          break;
        case "influencer_earned":
          totalFees += entry.amount;
          break;
      }
    }

    // Subtract refunds where the business was credited back
    for (const entry of this.entries) {
      if (entry.type !== "refund") continue;
      if (!accountIds.has(entry.creditAccountId)) continue;

      // Determine what the original refunded entry was for
      const originalId = entry.metadata.originalEntryId as string | undefined;
      if (originalId) {
        const original = this.entries.find((e) => e.id === originalId);
        if (original) {
          switch (original.type) {
            case "perk_awarded":
              totalPerks -= entry.amount;
              break;
            case "subscription_charge":
              totalSubscription -= entry.amount;
              break;
            case "platform_fee":
              totalFees -= entry.amount;
              break;
          }
        }
      }
    }

    return {
      businessId,
      totalPerks: round2(totalPerks),
      totalSubscription: round2(totalSubscription),
      totalFees: round2(totalFees),
      totalSpend: round2(totalPerks + totalSubscription + totalFees),
    };
  }

  /**
   * Get earnings summary for an influencer: earned, paid out, pending.
   */
  getInfluencerEarnings(influencerId: string): InfluencerEarningsReport {
    const earningsAccount = this.getAccountByOwner(influencerId, "earnings");

    let totalEarned = 0;
    let totalPaid = 0;

    if (earningsAccount) {
      for (const entry of this.entries) {
        if (
          entry.type === "influencer_earned" &&
          entry.creditAccountId === earningsAccount.id
        ) {
          totalEarned += entry.amount;
        }
        if (
          entry.type === "influencer_payout" &&
          entry.debitAccountId === earningsAccount.id
        ) {
          totalPaid += entry.amount;
        }
      }
    }

    return {
      influencerId,
      totalEarned: round2(totalEarned),
      totalPaid: round2(totalPaid),
      pendingBalance: round2(totalEarned - totalPaid),
    };
  }

  // ── Audit ───────────────────────────────────────────────────────────────

  /**
   * Recalculate an account balance from all ledger entries and compare
   * to the stored balance. Returns whether they match.
   */
  verifyBalance(accountId: string): BalanceVerification {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account '${accountId}' not found`);
    }

    let calculatedCents = 0;

    for (const entry of this.entries) {
      const entryCents = Math.round(entry.amount * 100);
      if (entry.debitAccountId === accountId) {
        calculatedCents -= entryCents;
      }
      if (entry.creditAccountId === accountId) {
        calculatedCents += entryCents;
      }
    }

    const calculated = calculatedCents / 100;
    const storedCents = Math.round(account.balance * 100);

    return {
      accountId,
      storedBalance: account.balance,
      calculatedBalance: calculated,
      isConsistent: storedCents === calculatedCents,
      discrepancy: (storedCents - calculatedCents) / 100,
    };
  }

  /**
   * Get all ledger entries related to a specific entity (campaign, perk, etc.).
   */
  getAuditTrail(entityId: string): LedgerEntry[] {
    return this.entries
      .filter((e) => e.relatedEntityId === entityId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }

  /**
   * Get all entries of a specific type.
   */
  getEntriesByType(type: LedgerEntryType): LedgerEntry[] {
    return this.entries.filter((e) => e.type === type);
  }

  /**
   * Get total entry count (useful for health checks).
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

  // ── Warnings ───────────────────────────────────────────────────────────

  /**
   * Get accumulated warnings (approaching limits, evictions, etc.).
   * Call drainWarnings() to retrieve and clear.
   */
  getWarnings(): readonly string[] {
    return this._warnings;
  }

  /**
   * Retrieve and clear all accumulated warnings.
   * Useful for including in API responses or health checks.
   */
  drainWarnings(): string[] {
    const warnings = [...this._warnings];
    this._warnings = [];
    return warnings;
  }

  // ── Internal Helpers ────────────────────────────────────────────────────

  /**
   * Get or create an account — ensures idempotent operations.
   */
  private getOrCreateAccount(
    ownerId: string,
    ownerType: AccountOwnerType,
    type: AccountType,
    currency: string = "USD"
  ): Account {
    const existing = this.getAccountByOwner(ownerId, type);
    if (existing) return existing;
    return this.createAccount(ownerId, ownerType, type, currency);
  }

  // ── Store Access (for testing / admin) ──────────────────────────────────

  /** Clear all data — used in tests. */
  clear(): void {
    this.accounts.clear();
    this.entries.length = 0;
    this._warnings = [];
  }

  /** Get raw accounts map — used in tests. */
  getAccountsStore(): Map<string, Account> {
    return this.accounts;
  }

  /** Get raw entries array — used in tests. */
  getEntriesStore(): LedgerEntry[] {
    return this.entries;
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const ledger = new FinancialLedger();

export { FinancialLedger };
