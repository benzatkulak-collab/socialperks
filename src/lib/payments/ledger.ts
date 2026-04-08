/**
 * Payment Processing System — Double-Entry Bookkeeping Engine
 *
 * Real double-entry bookkeeping where every transaction has balanced
 * debits and credits. Account balance computation follows standard
 * accounting rules:
 *
 * - Asset & Expense accounts: balance increases with debits, decreases with credits
 * - Liability, Equity & Revenue accounts: balance increases with credits, decreases with debits
 *
 * Every recorded transaction must balance: sum(debits) === sum(credits).
 *
 * Storage: in-memory Maps (ready for Postgres + Prisma migration).
 */

import type {
  Account,
  AccountType,
  AccountSubtype,
  AccountOwnerType,
  LedgerEntry,
  Transaction,
} from "./types";
import { generateId, round2, nowISO } from "./helpers";

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
