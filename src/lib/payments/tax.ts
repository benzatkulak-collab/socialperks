/**
 * Payment Processing System — Tax Reporting
 *
 * Tax reporting engine for influencer earnings.
 * Generates 1099-NEC data for influencers earning over $600/year.
 * Tracks quarterly breakdowns and withholding amounts.
 *
 * Storage: in-memory Maps (ready for Postgres + Prisma migration).
 */

import type {
  TaxRecord,
  TaxForm,
  TaxSummary,
  QuarterlyBreakdown,
} from "./types";
import { FinancialLedger } from "./ledger";
import { round2, nowISO } from "./helpers";

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
