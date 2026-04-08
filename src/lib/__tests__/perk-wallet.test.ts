import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  awardPerk,
  redeemPerk,
  safeRedeemPerk,
  getWallet,
  expirePerks,
  clearStore,
  getWalletStore,
  getPerkIndex,
  generateRedemptionCode,
} from "@/lib/perk-wallet";
import type { EarnedPerk, WalletSummary } from "@/lib/perk-wallet";

// ─── Mock dependencies ──────────────────────────────────────────────────────

vi.mock("@/lib/events", () => ({
  emitPerkEvent: vi.fn(),
}));

vi.mock("@/lib/financial-ledger", () => ({
  ledger: {
    awardPerk: vi.fn(),
    redeemPerk: vi.fn(),
  },
}));

// =============================================================================
// Perk Wallet System
// =============================================================================

describe("PerkWallet", () => {
  beforeEach(() => {
    clearStore();
  });

  // ─── Award Perk ───────────────────────────────────────────────────────────

  describe("awardPerk", () => {
    it("awards a dollar perk and returns success with perk data", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 15, "dol");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.campaignId).toBe("camp-1");
      expect(result.data!.submissionId).toBe("sub-1");
      expect(result.data!.value).toBe(15);
      expect(result.data!.type).toBe("dol");
      expect(result.data!.status).toBe("available");
      expect(result.data!.redeemedAt).toBeNull();
      expect(result.data!.id).toMatch(/^perk_/);
      expect(result.data!.redemptionCode).toBeTruthy();
    });

    it("awards a percentage perk", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 25, "pct");

      expect(result.success).toBe(true);
      expect(result.data!.value).toBe(25);
      expect(result.data!.type).toBe("pct");
    });

    it("rounds value to two decimal places", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 15.999, "dol");

      expect(result.success).toBe(true);
      expect(result.data!.value).toBe(16);
    });

    it("rounds fractional cents correctly", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10.005, "dol");

      expect(result.success).toBe(true);
      expect(result.data!.value).toBe(10.01);
    });

    it("sets earnedAt to the current time", () => {
      const before = Date.now();
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      const after = Date.now();

      const earnedAt = new Date(result.data!.earnedAt).getTime();
      expect(earnedAt).toBeGreaterThanOrEqual(before);
      expect(earnedAt).toBeLessThanOrEqual(after);
    });

    it("sets expiresAt to 30 days from now by default", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");

      const earned = new Date(result.data!.earnedAt).getTime();
      const expires = new Date(result.data!.expiresAt).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      expect(expires - earned).toBe(thirtyDaysMs);
    });

    it("respects custom expiryDays", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol", 7);

      const earned = new Date(result.data!.earnedAt).getTime();
      const expires = new Date(result.data!.expiresAt).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      expect(expires - earned).toBe(sevenDaysMs);
    });

    it("adds the perk to the wallet store and perk index", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      const perkId = result.data!.id;

      const store = getWalletStore();
      const wallet = store.get("user-1:biz-1");
      expect(wallet).toBeDefined();
      expect(wallet!.perks).toHaveLength(1);
      expect(wallet!.perks[0].id).toBe(perkId);

      const index = getPerkIndex();
      expect(index.get(perkId)).toBe("user-1:biz-1");
    });

    it("awards multiple perks to the same wallet", () => {
      awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      awardPerk("user-1", "biz-1", "camp-2", "sub-2", 20, "dol");

      const store = getWalletStore();
      const wallet = store.get("user-1:biz-1");
      expect(wallet!.perks).toHaveLength(2);
    });

    it("awards perks to separate wallets for different businesses", () => {
      awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      awardPerk("user-1", "biz-2", "camp-2", "sub-2", 20, "dol");

      const store = getWalletStore();
      expect(store.get("user-1:biz-1")!.perks).toHaveLength(1);
      expect(store.get("user-1:biz-2")!.perks).toHaveLength(1);
    });

    // ─── Validation errors ──────────────────────────────────────────────────

    it("rejects empty userId", () => {
      const result = awardPerk("", "biz-1", "camp-1", "sub-1", 10, "dol");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_USER_ID");
    });

    it("rejects empty businessId", () => {
      const result = awardPerk("user-1", "", "camp-1", "sub-1", 10, "dol");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_BUSINESS_ID");
    });

    it("rejects empty campaignId", () => {
      const result = awardPerk("user-1", "biz-1", "", "sub-1", 10, "dol");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_CAMPAIGN_ID");
    });

    it("rejects empty submissionId", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "", 10, "dol");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_SUBMISSION_ID");
    });

    it("rejects zero value", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 0, "dol");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_VALUE");
    });

    it("rejects negative value", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", -5, "dol");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_VALUE");
    });

    it("rejects NaN value", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", NaN, "dol");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_VALUE");
    });

    it("rejects Infinity value", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", Infinity, "dol");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_VALUE");
    });

    it("rejects percentage perk exceeding 100%", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 101, "pct");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_VALUE");
      expect(result.error!.message).toContain("100%");
    });

    it("allows exactly 100% for percentage perks", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 100, "pct");

      expect(result.success).toBe(true);
      expect(result.data!.value).toBe(100);
    });

    it("rejects invalid discount type", () => {
      // Force an invalid type to test the guard
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "invalid" as "dol");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_TYPE");
    });

    it("rejects expiryDays of zero", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol", 0);

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_EXPIRY");
    });

    it("rejects negative expiryDays", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol", -1);

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_EXPIRY");
    });

    it("rejects NaN expiryDays", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol", NaN);

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_EXPIRY");
    });

    it("rejects Infinity expiryDays", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol", Infinity);

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_EXPIRY");
    });

    // ─── Duplicate prevention ───────────────────────────────────────────────

    it("prevents duplicate award for the same submissionId", () => {
      const first = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      expect(first.success).toBe(true);

      const second = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      expect(second.success).toBe(false);
      expect(second.error!.code).toBe("DUPLICATE_AWARD");
    });

    it("allows same submissionId for different user-business pairs", () => {
      const first = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      const second = awardPerk("user-2", "biz-1", "camp-1", "sub-1", 10, "dol");

      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
    });
  });

  // ─── Redeem Perk ──────────────────────────────────────────────────────────

  describe("redeemPerk", () => {
    let perkId: string;

    beforeEach(() => {
      const award = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 20, "dol");
      perkId = award.data!.id;
    });

    it("redeems an available perk and returns success", () => {
      const result = redeemPerk(perkId, "user-1");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.perk.status).toBe("redeemed");
      expect(result.data!.perk.redeemedAt).toBeTruthy();
      expect(result.data!.redemptionCode).toBeTruthy();
    });

    it("marks the perk as redeemed in the wallet store", () => {
      redeemPerk(perkId, "user-1");

      const store = getWalletStore();
      const wallet = store.get("user-1:biz-1");
      const perk = wallet!.perks.find((p) => p.id === perkId);
      expect(perk!.status).toBe("redeemed");
      expect(perk!.redeemedAt).toBeTruthy();
    });

    it("prevents redeeming the same perk twice", () => {
      const first = redeemPerk(perkId, "user-1");
      expect(first.success).toBe(true);

      const second = redeemPerk(perkId, "user-1");
      expect(second.success).toBe(false);
      expect(second.error!.code).toBe("ALREADY_REDEEMED");
    });

    it("rejects redemption by a different user (unauthorized)", () => {
      const result = redeemPerk(perkId, "user-999");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("UNAUTHORIZED");
    });

    it("rejects redemption for a non-existent perkId", () => {
      const result = redeemPerk("perk_nonexistent", "user-1");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("NOT_FOUND");
    });

    it("rejects empty perkId", () => {
      const result = redeemPerk("", "user-1");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_PERK_ID");
    });

    it("rejects empty userId", () => {
      const result = redeemPerk(perkId, "");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("INVALID_USER_ID");
    });
  });

  // ─── Expiry Handling ──────────────────────────────────────────────────────

  describe("expiry handling", () => {
    it("redeemPerk rejects expired perks and updates status", () => {
      // Award with 1-day expiry, then manipulate time
      const award = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol", 1);
      const perkId = award.data!.id;

      // Manually set expiresAt to the past
      const store = getWalletStore();
      const wallet = store.get("user-1:biz-1")!;
      const perkIdx = wallet.perks.findIndex((p) => p.id === perkId);
      wallet.perks[perkIdx] = {
        ...wallet.perks[perkIdx],
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      const result = redeemPerk(perkId, "user-1");
      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("PERK_EXPIRED");

      // The perk status should now be "expired" in the store
      const updatedPerk = wallet.perks.find((p) => p.id === perkId);
      expect(updatedPerk!.status).toBe("expired");
    });

    it("expirePerks marks all overdue available perks as expired", () => {
      // Award two perks
      const award1 = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol", 1);
      const award2 = awardPerk("user-1", "biz-1", "camp-2", "sub-2", 20, "dol", 1);

      // Manually set both expiresAt to the past
      const store = getWalletStore();
      const wallet = store.get("user-1:biz-1")!;
      for (let i = 0; i < wallet.perks.length; i++) {
        wallet.perks[i] = {
          ...wallet.perks[i],
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        };
      }

      const result = expirePerks();

      expect(result.expired).toBe(2);
      expect(result.ids).toContain(award1.data!.id);
      expect(result.ids).toContain(award2.data!.id);

      // Both perks should be expired
      expect(wallet.perks[0].status).toBe("expired");
      expect(wallet.perks[1].status).toBe("expired");
    });

    it("expirePerks does not affect already redeemed perks", () => {
      const award = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol", 1);
      const perkId = award.data!.id;

      // Redeem it first
      redeemPerk(perkId, "user-1");

      // Now set expiresAt to the past
      const store = getWalletStore();
      const wallet = store.get("user-1:biz-1")!;
      const perkIdx = wallet.perks.findIndex((p) => p.id === perkId);
      wallet.perks[perkIdx] = {
        ...wallet.perks[perkIdx],
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      const result = expirePerks();

      expect(result.expired).toBe(0);
      expect(wallet.perks[perkIdx].status).toBe("redeemed");
    });

    it("expirePerks does not affect already expired perks", () => {
      const award = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol", 1);
      const perkId = award.data!.id;

      // Manually expire it
      const store = getWalletStore();
      const wallet = store.get("user-1:biz-1")!;
      const perkIdx = wallet.perks.findIndex((p) => p.id === perkId);
      wallet.perks[perkIdx] = { ...wallet.perks[perkIdx], status: "expired" };

      const result = expirePerks();

      expect(result.expired).toBe(0);
    });

    it("expirePerks does not touch perks that are not yet due", () => {
      awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol", 30);

      const result = expirePerks();

      expect(result.expired).toBe(0);
      expect(result.ids).toHaveLength(0);
    });

    it("expirePerks operates across multiple wallets", () => {
      const a1 = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol", 1);
      const a2 = awardPerk("user-2", "biz-2", "camp-2", "sub-2", 20, "dol", 1);
      awardPerk("user-3", "biz-3", "camp-3", "sub-3", 30, "dol", 365); // not expired

      // Expire the first two
      const store = getWalletStore();
      for (const [key, wallet] of store.entries()) {
        if (key === "user-3:biz-3") continue;
        for (let i = 0; i < wallet.perks.length; i++) {
          wallet.perks[i] = {
            ...wallet.perks[i],
            expiresAt: new Date(Date.now() - 1000).toISOString(),
          };
        }
      }

      const result = expirePerks();

      expect(result.expired).toBe(2);
      expect(result.ids).toContain(a1.data!.id);
      expect(result.ids).toContain(a2.data!.id);
    });
  });

  // ─── Get Wallet ───────────────────────────────────────────────────────────

  describe("getWallet", () => {
    it("returns empty summary for a user with no perks", () => {
      const summary = getWallet("user-none", "biz-1") as WalletSummary;

      expect(summary.userId).toBe("user-none");
      expect(summary.businessId).toBe("biz-1");
      expect(summary.perks).toHaveLength(0);
      expect(summary.totalAvailable).toBe(0);
      expect(summary.totalLifetime).toBe(0);
      expect(summary.activeCount).toBe(0);
      expect(summary.redeemedCount).toBe(0);
      expect(summary.expiredCount).toBe(0);
    });

    it("returns correct summary for a single business wallet", () => {
      awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      awardPerk("user-1", "biz-1", "camp-2", "sub-2", 25.50, "dol");

      const summary = getWallet("user-1", "biz-1") as WalletSummary;

      expect(summary.userId).toBe("user-1");
      expect(summary.businessId).toBe("biz-1");
      expect(summary.perks).toHaveLength(2);
      expect(summary.totalAvailable).toBe(35.50);
      expect(summary.totalLifetime).toBe(35.50);
      expect(summary.activeCount).toBe(2);
      expect(summary.redeemedCount).toBe(0);
      expect(summary.expiredCount).toBe(0);
    });

    it("reflects redeemed perks in the summary counts", () => {
      const a1 = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      awardPerk("user-1", "biz-1", "camp-2", "sub-2", 20, "dol");

      redeemPerk(a1.data!.id, "user-1");

      const summary = getWallet("user-1", "biz-1") as WalletSummary;

      expect(summary.activeCount).toBe(1);
      expect(summary.redeemedCount).toBe(1);
      expect(summary.totalAvailable).toBe(20);
      expect(summary.totalLifetime).toBe(30);
    });

    it("reflects expired perks in the summary (without mutating store)", () => {
      const a1 = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol", 1);

      // Set expiry to the past
      const store = getWalletStore();
      const wallet = store.get("user-1:biz-1")!;
      wallet.perks[0] = {
        ...wallet.perks[0],
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      const summary = getWallet("user-1", "biz-1") as WalletSummary;

      expect(summary.expiredCount).toBe(1);
      expect(summary.activeCount).toBe(0);
      expect(summary.totalAvailable).toBe(0);
      expect(summary.totalLifetime).toBe(10);

      // The store should NOT have been mutated (status still "available")
      expect(wallet.perks[0].status).toBe("available");
    });

    it("returns all wallets for a user across businesses when businessId is omitted", () => {
      awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      awardPerk("user-1", "biz-2", "camp-2", "sub-2", 20, "dol");
      awardPerk("user-1", "biz-3", "camp-3", "sub-3", 30, "dol");

      const summaries = getWallet("user-1") as WalletSummary[];

      expect(summaries).toHaveLength(3);
      const businessIds = summaries.map((s) => s.businessId).sort();
      expect(businessIds).toEqual(["biz-1", "biz-2", "biz-3"]);
    });

    it("returns empty array for a user with no wallets (no businessId)", () => {
      const summaries = getWallet("user-none") as WalletSummary[];

      expect(summaries).toEqual([]);
    });

    it("handles invalid userId gracefully", () => {
      const result = getWallet("", "biz-1") as WalletSummary;

      expect(result.perks).toHaveLength(0);
      expect(result.totalAvailable).toBe(0);
    });

    it("handles invalid userId without businessId gracefully", () => {
      const result = getWallet("") as WalletSummary[];

      expect(result).toEqual([]);
    });
  });

  // ─── Balance Calculations ─────────────────────────────────────────────────

  describe("balance calculations", () => {
    it("totalAvailable sums only available perks", () => {
      const a1 = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      awardPerk("user-1", "biz-1", "camp-2", "sub-2", 20, "dol");
      awardPerk("user-1", "biz-1", "camp-3", "sub-3", 30, "dol");

      // Redeem the first one
      redeemPerk(a1.data!.id, "user-1");

      const summary = getWallet("user-1", "biz-1") as WalletSummary;

      expect(summary.totalAvailable).toBe(50); // 20 + 30
      expect(summary.totalLifetime).toBe(60); // 10 + 20 + 30
    });

    it("totalLifetime includes all perks regardless of status", () => {
      const a1 = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      const a2 = awardPerk("user-1", "biz-1", "camp-2", "sub-2", 20, "dol");
      awardPerk("user-1", "biz-1", "camp-3", "sub-3", 30, "dol");

      // Redeem one, expire another
      redeemPerk(a1.data!.id, "user-1");

      const store = getWalletStore();
      const wallet = store.get("user-1:biz-1")!;
      const perkIdx = wallet.perks.findIndex((p) => p.id === a2.data!.id);
      wallet.perks[perkIdx] = {
        ...wallet.perks[perkIdx],
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      const summary = getWallet("user-1", "biz-1") as WalletSummary;

      expect(summary.totalLifetime).toBe(60);
      expect(summary.activeCount).toBe(1);
      expect(summary.redeemedCount).toBe(1);
      expect(summary.expiredCount).toBe(1);
    });

    it("handles floating point precision in totals", () => {
      // Award many small amounts that could cause float drift
      for (let i = 0; i < 100; i++) {
        awardPerk("user-1", "biz-1", `camp-${i}`, `sub-${i}`, 0.01, "dol");
      }

      const summary = getWallet("user-1", "biz-1") as WalletSummary;

      expect(summary.totalAvailable).toBe(1);
      expect(summary.totalLifetime).toBe(1);
    });

    it("counts percentage and dollar perks in the same wallet", () => {
      awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      awardPerk("user-1", "biz-1", "camp-2", "sub-2", 25, "pct");

      const summary = getWallet("user-1", "biz-1") as WalletSummary;

      expect(summary.activeCount).toBe(2);
      expect(summary.totalAvailable).toBe(35); // 10 + 25 (mixed types summed)
      expect(summary.totalLifetime).toBe(35);
    });
  });

  // ─── Safe Redeem Perk (Concurrency Lock) ──────────────────────────────────

  describe("safeRedeemPerk", () => {
    it("redeems a perk successfully (async)", async () => {
      const award = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      const perkId = award.data!.id;

      const result = await safeRedeemPerk(perkId, "user-1");

      expect(result.success).toBe(true);
      expect(result.data!.perk.status).toBe("redeemed");
    });

    it("prevents double-redemption under concurrent calls", async () => {
      const award = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      const perkId = award.data!.id;

      // Fire two concurrent redemptions
      const [r1, r2] = await Promise.all([
        safeRedeemPerk(perkId, "user-1"),
        safeRedeemPerk(perkId, "user-1"),
      ]);

      // Exactly one should succeed, the other should fail
      const successes = [r1, r2].filter((r) => r.success);
      const failures = [r1, r2].filter((r) => !r.success);

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      expect(failures[0].error!.code).toBe("ALREADY_REDEEMED");
    });

    it("handles concurrent redemptions for different perks independently", async () => {
      const a1 = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      const a2 = awardPerk("user-1", "biz-1", "camp-2", "sub-2", 20, "dol");

      const [r1, r2] = await Promise.all([
        safeRedeemPerk(a1.data!.id, "user-1"),
        safeRedeemPerk(a2.data!.id, "user-1"),
      ]);

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
    });
  });

  // ─── Redemption Code Generation ───────────────────────────────────────────

  describe("generateRedemptionCode", () => {
    it("generates an 8-character code", () => {
      const code = generateRedemptionCode();
      expect(code).toHaveLength(8);
    });

    it("only uses unambiguous characters (no I, O, 0, 1)", () => {
      const ambiguous = /[IO01]/;
      // Generate many codes to increase confidence
      for (let i = 0; i < 50; i++) {
        const code = generateRedemptionCode();
        expect(code).not.toMatch(ambiguous);
      }
    });

    it("only uses uppercase letters and digits", () => {
      const valid = /^[A-Z2-9]+$/;
      for (let i = 0; i < 50; i++) {
        const code = generateRedemptionCode();
        expect(code).toMatch(valid);
      }
    });

    it("generates unique codes (very high probability)", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        codes.add(generateRedemptionCode());
      }
      // With 30^8 possible codes, collisions in 1000 are astronomically unlikely
      expect(codes.size).toBe(1000);
    });
  });

  // ─── Clear Store ──────────────────────────────────────────────────────────

  describe("clearStore", () => {
    it("removes all wallets and perk index entries", () => {
      awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      awardPerk("user-2", "biz-2", "camp-2", "sub-2", 20, "dol");

      expect(getWalletStore().size).toBe(2);
      expect(getPerkIndex().size).toBe(2);

      clearStore();

      expect(getWalletStore().size).toBe(0);
      expect(getPerkIndex().size).toBe(0);
    });

    it("allows new awards after clearing", () => {
      awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      clearStore();

      // Should succeed because the store was cleared (no duplicate check conflict)
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      expect(result.success).toBe(true);
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles very small positive values", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 0.01, "dol");

      expect(result.success).toBe(true);
      expect(result.data!.value).toBe(0.01);
    });

    it("handles very large dollar values", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 999999.99, "dol");

      expect(result.success).toBe(true);
      expect(result.data!.value).toBe(999999.99);
    });

    it("handles expiryDays of 1", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol", 1);

      expect(result.success).toBe(true);
      const earned = new Date(result.data!.earnedAt).getTime();
      const expires = new Date(result.data!.expiresAt).getTime();
      expect(expires - earned).toBe(24 * 60 * 60 * 1000);
    });

    it("handles very long expiryDays", () => {
      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol", 3650);

      expect(result.success).toBe(true);
      const earned = new Date(result.data!.earnedAt).getTime();
      const expires = new Date(result.data!.expiresAt).getTime();
      expect(expires - earned).toBe(3650 * 24 * 60 * 60 * 1000);
    });

    it("redemption of an already-expired-status perk returns PERK_EXPIRED", () => {
      const award = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      const perkId = award.data!.id;

      // Manually set status to expired
      const store = getWalletStore();
      const wallet = store.get("user-1:biz-1")!;
      const perkIdx = wallet.perks.findIndex((p) => p.id === perkId);
      wallet.perks[perkIdx] = { ...wallet.perks[perkIdx], status: "expired" };

      const result = redeemPerk(perkId, "user-1");

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe("PERK_EXPIRED");
    });

    it("wallet key is deterministic for same userId+businessId", () => {
      awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      awardPerk("user-1", "biz-1", "camp-2", "sub-2", 20, "dol");

      // Both perks should live in the same wallet
      const store = getWalletStore();
      expect(store.size).toBe(1);
      expect(store.get("user-1:biz-1")!.perks).toHaveLength(2);
    });

    it("each awarded perk gets a unique id", () => {
      const a1 = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      const a2 = awardPerk("user-1", "biz-1", "camp-2", "sub-2", 20, "dol");

      expect(a1.data!.id).not.toBe(a2.data!.id);
    });

    it("each awarded perk gets a unique redemption code", () => {
      const a1 = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");
      const a2 = awardPerk("user-1", "biz-1", "camp-2", "sub-2", 20, "dol");

      expect(a1.data!.redemptionCode).not.toBe(a2.data!.redemptionCode);
    });
  });

  // ─── Event Emission ───────────────────────────────────────────────────────

  describe("event emission", () => {
    it("emits perk.awarded event when a perk is awarded", async () => {
      const { emitPerkEvent } = await import("@/lib/events");

      awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");

      expect(emitPerkEvent).toHaveBeenCalledWith(
        "perk.awarded",
        expect.stringMatching(/^perk_/),
        "user-1",
        expect.objectContaining({
          campaignId: "camp-1",
          businessId: "biz-1",
          submissionId: "sub-1",
          value: 10,
          type: "dol",
        })
      );
    });

    it("emits perk.redeemed event when a perk is redeemed", async () => {
      const { emitPerkEvent } = await import("@/lib/events");
      const award = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");

      redeemPerk(award.data!.id, "user-1");

      expect(emitPerkEvent).toHaveBeenCalledWith(
        "perk.redeemed",
        award.data!.id,
        "user-1",
        expect.objectContaining({
          campaignId: "camp-1",
          businessId: "biz-1",
          value: 10,
          type: "dol",
        })
      );
    });
  });

  // ─── Ledger Integration ───────────────────────────────────────────────────

  describe("ledger integration", () => {
    it("records award in financial ledger", async () => {
      const { ledger } = await import("@/lib/financial-ledger");

      awardPerk("user-1", "biz-1", "camp-1", "sub-1", 15, "dol");

      expect(ledger.awardPerk).toHaveBeenCalledWith("biz-1", "user-1", 15, "camp-1");
    });

    it("records redemption in financial ledger", async () => {
      const { ledger } = await import("@/lib/financial-ledger");
      const award = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 15, "dol");

      redeemPerk(award.data!.id, "user-1");

      expect(ledger.redeemPerk).toHaveBeenCalledWith(
        "user-1",
        "biz-1",
        15,
        award.data!.id
      );
    });

    it("continues even if ledger.awardPerk throws", async () => {
      const { ledger } = await import("@/lib/financial-ledger");
      (ledger.awardPerk as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error("Ledger failure");
      });

      const result = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");

      // The award should still succeed despite ledger failure
      expect(result.success).toBe(true);
    });

    it("continues even if ledger.redeemPerk throws", async () => {
      const { ledger } = await import("@/lib/financial-ledger");
      const award = awardPerk("user-1", "biz-1", "camp-1", "sub-1", 10, "dol");

      (ledger.redeemPerk as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error("Ledger failure");
      });

      const result = redeemPerk(award.data!.id, "user-1");

      // The redemption should still succeed despite ledger failure
      expect(result.success).toBe(true);
    });
  });
});
