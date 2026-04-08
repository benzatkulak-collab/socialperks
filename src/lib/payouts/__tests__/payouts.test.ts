import { describe, it, expect, beforeEach } from "vitest";
import {
  createConnectAccount,
  getOnboardingLink,
  getAccountStatus,
  requestPayout,
  getPayoutHistory,
  handleAccountUpdated,
  handleTransferCreated,
  handleTransferPaid,
  handleTransferFailed,
  payoutAccounts,
  payoutRequests,
  _resetStores,
} from "../index";

// ═══════════════════════════════════════════════════════════════════════════════
// PAYOUT MANAGEMENT — TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Payout Management (mock mode)", () => {
  beforeEach(() => {
    _resetStores();
  });

  // ─── Account Creation ──────────────────────────────────────────────────────

  describe("createConnectAccount", () => {
    it("creates a mock Connect account with correct fields", async () => {
      const account = await createConnectAccount("inf_1", "creator@example.com");

      expect(account.influencerId).toBe("inf_1");
      expect(account.stripeAccountId).toBeTruthy();
      expect(account.stripeAccountId).toMatch(/^acct_/);
      expect(account.status).toBe("pending");
      expect(account.payoutsEnabled).toBe(false);
      expect(account.onboardingUrl).toBeNull();
      expect(account.createdAt).toBeTruthy();
      expect((account as Record<string, unknown>).mock).toBe(true);
    });

    it("returns existing account if already created", async () => {
      const first = await createConnectAccount("inf_2", "a@example.com");
      const second = await createConnectAccount("inf_2", "b@example.com");

      expect(first.stripeAccountId).toBe(second.stripeAccountId);
    });

    it("stores account in the internal map", async () => {
      await createConnectAccount("inf_3", "c@example.com");
      expect(payoutAccounts.has("inf_3")).toBe(true);
    });
  });

  // ─── Onboarding Link ──────────────────────────────────────────────────────

  describe("getOnboardingLink", () => {
    it("returns an onboarding URL for an existing account", async () => {
      await createConnectAccount("inf_4", "d@example.com");
      const link = await getOnboardingLink(
        "inf_4",
        "https://example.com/return",
        "https://example.com/refresh"
      );

      expect(link.url).toContain("connect.stripe.com");
      expect(link.url).toContain("onboarding");
      expect(link.mock).toBe(true);
    });

    it("throws if no account exists", async () => {
      await expect(
        getOnboardingLink("nonexistent", "https://a.com", "https://b.com")
      ).rejects.toThrow(/No payout account found/);
    });

    it("caches the onboarding URL on the account", async () => {
      await createConnectAccount("inf_5", "e@example.com");
      await getOnboardingLink(
        "inf_5",
        "https://example.com/return",
        "https://example.com/refresh"
      );

      const account = payoutAccounts.get("inf_5");
      expect(account?.onboardingUrl).toBeTruthy();
      expect(account?.onboardingUrl).toContain("connect.stripe.com");
    });
  });

  // ─── Account Status ────────────────────────────────────────────────────────

  describe("getAccountStatus", () => {
    it("returns null for unknown influencer", async () => {
      const status = await getAccountStatus("unknown");
      expect(status).toBeNull();
    });

    it("returns account status for existing account", async () => {
      await createConnectAccount("inf_6", "f@example.com");
      const status = await getAccountStatus("inf_6");

      expect(status).not.toBeNull();
      expect(status?.influencerId).toBe("inf_6");
      expect(status?.status).toBe("pending");
    });

    it("includes mock flag in mock mode", async () => {
      await createConnectAccount("inf_7", "g@example.com");
      const status = await getAccountStatus("inf_7");
      expect((status as Record<string, unknown>)?.mock).toBe(true);
    });
  });

  // ─── Payout Requests ──────────────────────────────────────────────────────

  describe("requestPayout", () => {
    it("throws if no account exists", async () => {
      await expect(requestPayout("nonexistent", 5000)).rejects.toThrow(
        /No payout account found/
      );
    });

    it("throws if account is not active", async () => {
      await createConnectAccount("inf_8", "h@example.com");
      await expect(requestPayout("inf_8", 5000)).rejects.toThrow(
        /Payouts are not enabled/
      );
    });

    it("throws for amounts below minimum ($10.00)", async () => {
      await createConnectAccount("inf_9", "i@example.com");
      // Manually activate the account for testing
      const account = payoutAccounts.get("inf_9")!;
      payoutAccounts.set("inf_9", {
        ...account,
        status: "active",
        payoutsEnabled: true,
      });

      await expect(requestPayout("inf_9", 500)).rejects.toThrow(
        /Minimum payout amount/
      );
      await expect(requestPayout("inf_9", 999)).rejects.toThrow(
        /Minimum payout amount/
      );
    });

    it("creates a payout request for valid amount", async () => {
      await createConnectAccount("inf_10", "j@example.com");
      const account = payoutAccounts.get("inf_10")!;
      payoutAccounts.set("inf_10", {
        ...account,
        status: "active",
        payoutsEnabled: true,
      });

      const payout = await requestPayout("inf_10", 2500);

      expect(payout.id).toMatch(/^po_/);
      expect(payout.influencerId).toBe("inf_10");
      expect(payout.amount).toBe(2500);
      expect(payout.currency).toBe("usd");
      expect(payout.status).toBe("processing");
      expect(payout.stripeTransferId).toMatch(/^tr_/);
      expect(payout.createdAt).toBeTruthy();
      expect(payout.completedAt).toBeNull();
      expect(payout.failureReason).toBeNull();
      expect((payout as Record<string, unknown>).mock).toBe(true);
    });

    it("stores payout in the internal map", async () => {
      await createConnectAccount("inf_11", "k@example.com");
      const account = payoutAccounts.get("inf_11")!;
      payoutAccounts.set("inf_11", {
        ...account,
        status: "active",
        payoutsEnabled: true,
      });

      const payout = await requestPayout("inf_11", 1500);
      expect(payoutRequests.has(payout.id)).toBe(true);
    });

    it("accepts minimum amount exactly ($10.00 = 1000 cents)", async () => {
      await createConnectAccount("inf_12", "l@example.com");
      const account = payoutAccounts.get("inf_12")!;
      payoutAccounts.set("inf_12", {
        ...account,
        status: "active",
        payoutsEnabled: true,
      });

      const payout = await requestPayout("inf_12", 1000);
      expect(payout.amount).toBe(1000);
      expect(payout.status).toBe("processing");
    });
  });

  // ─── Payout History ────────────────────────────────────────────────────────

  describe("getPayoutHistory", () => {
    it("returns empty array for unknown influencer", () => {
      const history = getPayoutHistory("unknown");
      expect(history).toEqual([]);
    });

    it("returns payouts sorted by newest first", async () => {
      await createConnectAccount("inf_13", "m@example.com");
      const account = payoutAccounts.get("inf_13")!;
      payoutAccounts.set("inf_13", {
        ...account,
        status: "active",
        payoutsEnabled: true,
      });

      await requestPayout("inf_13", 1000);
      await requestPayout("inf_13", 2000);
      await requestPayout("inf_13", 3000);

      const history = getPayoutHistory("inf_13");
      expect(history).toHaveLength(3);
      // Sorted newest first
      expect(history[0].amount).toBe(3000);
      expect(history[1].amount).toBe(2000);
      expect(history[2].amount).toBe(1000);
    });

    it("tracks multiple payouts for same influencer", async () => {
      await createConnectAccount("inf_14", "n@example.com");
      const account = payoutAccounts.get("inf_14")!;
      payoutAccounts.set("inf_14", {
        ...account,
        status: "active",
        payoutsEnabled: true,
      });

      await requestPayout("inf_14", 5000);
      await requestPayout("inf_14", 7500);

      const history = getPayoutHistory("inf_14");
      expect(history).toHaveLength(2);
      expect(history.every((p) => p.influencerId === "inf_14")).toBe(true);
    });
  });

  // ─── Account Status Transitions (Webhook Handlers) ────────────────────────

  describe("handleAccountUpdated", () => {
    it("transitions account from pending to active", async () => {
      await createConnectAccount("inf_15", "o@example.com");
      const account = payoutAccounts.get("inf_15")!;

      handleAccountUpdated(account.stripeAccountId!, true, true);

      const updated = payoutAccounts.get("inf_15")!;
      expect(updated.status).toBe("active");
      expect(updated.payoutsEnabled).toBe(true);
    });

    it("transitions account to restricted when details submitted but payouts disabled", async () => {
      await createConnectAccount("inf_16", "p@example.com");
      const account = payoutAccounts.get("inf_16")!;

      handleAccountUpdated(account.stripeAccountId!, true, false);

      const updated = payoutAccounts.get("inf_16")!;
      expect(updated.status).toBe("restricted");
      expect(updated.payoutsEnabled).toBe(false);
    });

    it("keeps account as pending when details not submitted", async () => {
      await createConnectAccount("inf_17", "q@example.com");
      const account = payoutAccounts.get("inf_17")!;

      handleAccountUpdated(account.stripeAccountId!, false, false);

      const updated = payoutAccounts.get("inf_17")!;
      expect(updated.status).toBe("pending");
    });
  });

  describe("handleTransferCreated", () => {
    it("marks payout as processing", async () => {
      await createConnectAccount("inf_18", "r@example.com");
      const account = payoutAccounts.get("inf_18")!;
      payoutAccounts.set("inf_18", {
        ...account,
        status: "active",
        payoutsEnabled: true,
      });

      const payout = await requestPayout("inf_18", 2000);
      handleTransferCreated(payout.stripeTransferId!);

      const updated = payoutRequests.get(payout.id)!;
      expect(updated.status).toBe("processing");
    });
  });

  describe("handleTransferPaid", () => {
    it("marks payout as completed with timestamp", async () => {
      await createConnectAccount("inf_19", "s@example.com");
      const account = payoutAccounts.get("inf_19")!;
      payoutAccounts.set("inf_19", {
        ...account,
        status: "active",
        payoutsEnabled: true,
      });

      const payout = await requestPayout("inf_19", 3000);
      handleTransferPaid(payout.stripeTransferId!);

      const updated = payoutRequests.get(payout.id)!;
      expect(updated.status).toBe("completed");
      expect(updated.completedAt).toBeTruthy();
    });
  });

  describe("handleTransferFailed", () => {
    it("marks payout as failed with reason", async () => {
      await createConnectAccount("inf_20", "t@example.com");
      const account = payoutAccounts.get("inf_20")!;
      payoutAccounts.set("inf_20", {
        ...account,
        status: "active",
        payoutsEnabled: true,
      });

      const payout = await requestPayout("inf_20", 4000);
      handleTransferFailed(payout.stripeTransferId!, "Insufficient funds");

      const updated = payoutRequests.get(payout.id)!;
      expect(updated.status).toBe("failed");
      expect(updated.failureReason).toBe("Insufficient funds");
      expect(updated.completedAt).toBeTruthy();
    });
  });

  // ─── Store Reset ───────────────────────────────────────────────────────────

  describe("_resetStores", () => {
    it("clears all stores", async () => {
      await createConnectAccount("inf_reset", "reset@example.com");
      const account = payoutAccounts.get("inf_reset")!;
      payoutAccounts.set("inf_reset", {
        ...account,
        status: "active",
        payoutsEnabled: true,
      });
      await requestPayout("inf_reset", 5000);

      expect(payoutAccounts.size).toBeGreaterThan(0);
      expect(payoutRequests.size).toBeGreaterThan(0);

      _resetStores();

      expect(payoutAccounts.size).toBe(0);
      expect(payoutRequests.size).toBe(0);
      expect(getPayoutHistory("inf_reset")).toEqual([]);
    });
  });
});
