/**
 * Payment Processing System — Escrow Manager
 *
 * Holds campaign budgets in escrow until submissions are approved.
 * When a business funds a campaign, the money is held in escrow.
 * When a submission is approved, a portion is released to the influencer.
 * Any remaining funds can be refunded to the business when the campaign ends.
 *
 * Storage: in-memory Maps (ready for Postgres + Prisma migration).
 */

import type { EscrowHold, EscrowRelease } from "./types";
import type { FinancialLedger } from "./ledger";
import { generateId, round2, nowISO } from "./helpers";

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
