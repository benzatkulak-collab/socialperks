import { describe, it, expect, beforeEach } from "vitest";
import {
  generateReferralCode,
  createReferralLink,
  createReferral,
  getReferralsByReferrer,
  getReferralByCode,
  trackReferralSignup,
  creditReferral,
  getReferralStats,
  _resetReferrals,
} from "@/lib/referrals";

describe("Referral System", () => {
  beforeEach(() => {
    _resetReferrals();
  });

  // ─── Code Generation ────────────────────────────────────────────────────

  describe("generateReferralCode", () => {
    it("generates a code in REF-XXXX-XXXX format", () => {
      const code = generateReferralCode("biz_001");
      expect(code).toMatch(/^REF-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it("returns the same code for the same business (idempotent)", () => {
      const code1 = generateReferralCode("biz_001");
      const code2 = generateReferralCode("biz_001");
      expect(code1).toBe(code2);
    });

    it("generates different codes for different businesses", () => {
      const code1 = generateReferralCode("biz_001");
      const code2 = generateReferralCode("biz_002");
      expect(code1).not.toBe(code2);
    });
  });

  // ─── Referral Link ──────────────────────────────────────────────────────

  describe("createReferralLink", () => {
    it("creates a full URL from a referral code", () => {
      const link = createReferralLink("REF-ABCD-1234");
      expect(link).toContain("/ref/REF-ABCD-1234");
    });

    it("includes the base URL", () => {
      const link = createReferralLink("REF-TEST-CODE");
      expect(link).toMatch(/^https?:\/\/.+\/ref\/REF-TEST-CODE$/);
    });
  });

  // ─── Create and Track Referral ──────────────────────────────────────────

  describe("createReferral", () => {
    it("creates a pending referral", () => {
      const code = generateReferralCode("biz_001");
      const ref = createReferral("biz_001", "owner@shop.com", "friend@business.com", code);

      expect(ref.id).toMatch(/^ref_/);
      expect(ref.referrerId).toBe("biz_001");
      expect(ref.referrerEmail).toBe("owner@shop.com");
      expect(ref.refereeEmail).toBe("friend@business.com");
      expect(ref.status).toBe("pending");
      expect(ref.creditAmount).toBe(10);
      expect(ref.refereeId).toBeNull();
      expect(ref.convertedAt).toBeNull();
      expect(ref.creditedAt).toBeNull();
      expect(ref.createdAt).toBeTruthy();
    });

    it("associates referral with referrer", () => {
      const code = generateReferralCode("biz_001");
      createReferral("biz_001", "owner@shop.com", "friend@business.com", code);
      const referrals = getReferralsByReferrer("biz_001");
      expect(referrals).toHaveLength(1);
      expect(referrals[0].refereeEmail).toBe("friend@business.com");
    });
  });

  describe("trackReferralSignup", () => {
    it("records a signup against an existing referral", () => {
      const code = generateReferralCode("biz_001");
      createReferral("biz_001", "owner@shop.com", "friend@business.com", code);

      const updated = trackReferralSignup(code, "usr_new_001", "friend@business.com");

      expect(updated.status).toBe("signed_up");
      expect(updated.refereeId).toBe("usr_new_001");
      expect(updated.convertedAt).toBeTruthy();
    });

    it("creates a new referral if none exists for code + email pair", () => {
      const code = generateReferralCode("biz_001");
      // No createReferral call — signup with code only
      const ref = trackReferralSignup(code, "usr_new_002", "new@business.com");

      expect(ref.status).toBe("signed_up");
      expect(ref.refereeId).toBe("usr_new_002");
      expect(ref.refereeEmail).toBe("new@business.com");
      expect(ref.code).toBe(code);
    });

    it("links back to the referrer's business ID", () => {
      const code = generateReferralCode("biz_abc");
      const ref = trackReferralSignup(code, "usr_new_003", "another@business.com");

      expect(ref.referrerId).toBe("biz_abc");
      // Referral should appear in referrer's list
      const referrals = getReferralsByReferrer("biz_abc");
      expect(referrals).toHaveLength(1);
    });
  });

  // ─── Credit Referral ────────────────────────────────────────────────────

  describe("creditReferral", () => {
    it("marks a signed_up referral as credited", () => {
      const code = generateReferralCode("biz_001");
      const ref = trackReferralSignup(code, "usr_001", "user@example.com");

      const credited = creditReferral(ref.id);

      expect(credited.status).toBe("credited");
      expect(credited.creditedAt).toBeTruthy();
    });

    it("is idempotent when already credited", () => {
      const code = generateReferralCode("biz_001");
      const ref = trackReferralSignup(code, "usr_001", "user@example.com");

      creditReferral(ref.id);
      const second = creditReferral(ref.id);

      expect(second.status).toBe("credited");
    });

    it("throws if referral is still pending", () => {
      const code = generateReferralCode("biz_001");
      const ref = createReferral("biz_001", "owner@shop.com", "friend@example.com", code);

      expect(() => creditReferral(ref.id)).toThrow(
        "Cannot credit a referral that has not been converted yet"
      );
    });

    it("throws if referral does not exist", () => {
      expect(() => creditReferral("ref_nonexistent")).toThrow("Referral not found");
    });
  });

  // ─── Stats ──────────────────────────────────────────────────────────────

  describe("getReferralStats", () => {
    it("returns zero stats for a business with no referrals", () => {
      const stats = getReferralStats("biz_empty");
      expect(stats).toEqual({
        totalReferred: 0,
        totalConverted: 0,
        totalCredits: 0,
        pendingCredits: 0,
      });
    });

    it("calculates stats correctly with mixed referral states", () => {
      const code = generateReferralCode("biz_001");

      // Pending referral
      createReferral("biz_001", "owner@shop.com", "pending@example.com", code);

      // Signed up referral (not yet credited)
      const ref1 = trackReferralSignup(code, "usr_001", "converted1@example.com");

      // Credited referral
      const ref2 = trackReferralSignup(code, "usr_002", "converted2@example.com");
      creditReferral(ref2.id);

      const stats = getReferralStats("biz_001");

      expect(stats.totalReferred).toBe(3);
      expect(stats.totalConverted).toBe(2);
      expect(stats.totalCredits).toBe(10); // 1 credited @ $10
      expect(stats.pendingCredits).toBe(10); // 1 signed_up @ $10
    });

    it("accumulates credits across multiple credited referrals", () => {
      const code = generateReferralCode("biz_001");

      const r1 = trackReferralSignup(code, "usr_a", "a@example.com");
      const r2 = trackReferralSignup(code, "usr_b", "b@example.com");
      const r3 = trackReferralSignup(code, "usr_c", "c@example.com");

      creditReferral(r1.id);
      creditReferral(r2.id);
      creditReferral(r3.id);

      const stats = getReferralStats("biz_001");
      expect(stats.totalCredits).toBe(30); // 3 x $10
      expect(stats.pendingCredits).toBe(0);
    });
  });

  // ─── Duplicate Code Prevention ──────────────────────────────────────────

  describe("Duplicate code prevention", () => {
    it("never generates duplicate codes across many businesses", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const code = generateReferralCode(`biz_${i}`);
        expect(codes.has(code)).toBe(false);
        codes.add(code);
      }
      expect(codes.size).toBe(100);
    });
  });

  // ─── getReferralByCode ────────────────────────────────────────────────

  describe("getReferralByCode", () => {
    it("returns null for unknown code", () => {
      expect(getReferralByCode("REF-NOPE-CODE")).toBeNull();
    });

    it("finds a referral by code:email composite key", () => {
      const code = generateReferralCode("biz_001");
      const created = createReferral("biz_001", "owner@shop.com", "friend@biz.com", code);

      const found = getReferralByCode(`${code}:friend@biz.com`);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });
  });
});
