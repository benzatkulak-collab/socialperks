import { describe, it, expect, beforeEach } from "vitest";
import {
  getDueEmails,
  markSent,
  hasSent,
  resetSentState,
  businessSequence,
  influencerSequence,
  type DripUser,
} from "../drip";

// -- Helpers ------------------------------------------------------------------

function daysAgo(days: number): string {
  const date = new Date("2026-04-05T12:00:00Z");
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

const NOW = new Date("2026-04-05T12:00:00Z");

function makeBusinessUser(overrides: Partial<DripUser> = {}): DripUser {
  return {
    id: "usr_biz_001",
    email: "test@business.com",
    name: "Test Business",
    role: "business",
    businessType: "restaurant",
    signupDate: daysAgo(1),
    hasCampaigns: false,
    campaignCount: 0,
    plan: "free",
    ...overrides,
  };
}

function makeInfluencerUser(overrides: Partial<DripUser> = {}): DripUser {
  return {
    id: "usr_inf_001",
    email: "test@influencer.com",
    name: "Test Creator",
    role: "influencer",
    signupDate: daysAgo(1),
    hasCampaigns: false,
    campaignCount: 0,
    plan: "free",
    ...overrides,
  };
}

// -- Tests --------------------------------------------------------------------

describe("drip sequence engine", () => {
  beforeEach(() => {
    resetSentState();
  });

  // ── Day 1 email due for user signed up yesterday ──────────────────────────

  describe("Day 1 email due for user signed up yesterday", () => {
    it("returns day-1 business email for user signed up 1 day ago", () => {
      const user = makeBusinessUser({ signupDate: daysAgo(1) });
      const due = getDueEmails([user], NOW);

      expect(due.length).toBe(1);
      expect(due[0].stepIndex).toBe(0); // first step (day 1)
      expect(due[0].step.delayDays).toBe(1);
      expect(due[0].user.id).toBe(user.id);
    });

    it("returns day-1 influencer email for user signed up 1 day ago", () => {
      const user = makeInfluencerUser({ signupDate: daysAgo(1) });
      const due = getDueEmails([user], NOW);

      expect(due.length).toBe(1);
      expect(due[0].stepIndex).toBe(0);
      expect(due[0].step.delayDays).toBe(1);
    });
  });

  // ── Day 3 campaign reminder skipped if user has campaigns ─────────────────

  describe("Day 3 campaign reminder skipped if user has campaigns", () => {
    it("includes day-3 email when business has no campaigns", () => {
      const user = makeBusinessUser({
        signupDate: daysAgo(3),
        hasCampaigns: false,
      });
      const due = getDueEmails([user], NOW);

      const day3 = due.find((d) => d.step.delayDays === 3);
      expect(day3).toBeDefined();
      expect(day3!.stepIndex).toBe(1);
    });

    it("skips day-3 email when business has campaigns", () => {
      const user = makeBusinessUser({
        signupDate: daysAgo(3),
        hasCampaigns: true,
        campaignCount: 2,
      });
      const due = getDueEmails([user], NOW);

      const day3 = due.find((d) => d.step.delayDays === 3);
      expect(day3).toBeUndefined();
    });
  });

  // ── Day 14 upgrade skipped if user is on pro ──────────────────────────────

  describe("Day 14 upgrade skipped if user is on pro", () => {
    it("includes day-14 upgrade email for free plan users", () => {
      const user = makeBusinessUser({
        signupDate: daysAgo(14),
        plan: "free",
      });
      const due = getDueEmails([user], NOW);

      const day14 = due.find((d) => d.step.delayDays === 14);
      expect(day14).toBeDefined();
    });

    it("skips day-14 upgrade email for pro plan users", () => {
      const user = makeBusinessUser({
        signupDate: daysAgo(14),
        plan: "pro",
      });
      const due = getDueEmails([user], NOW);

      const day14 = due.find((d) => d.step.delayDays === 14);
      expect(day14).toBeUndefined();
    });

    it("skips day-14 upgrade email for professional plan users", () => {
      // Regression: checkout stores plan="professional"; the condition used
      // to check only "pro", so paying Professional users were nagged to
      // upgrade to the tier they already had.
      const user = makeBusinessUser({
        signupDate: daysAgo(14),
        plan: "professional",
      });
      const due = getDueEmails([user], NOW);

      const day14 = due.find((d) => d.step.delayDays === 14);
      expect(day14).toBeUndefined();
    });

    it("skips day-14 upgrade email for enterprise plan users", () => {
      const user = makeBusinessUser({
        signupDate: daysAgo(14),
        plan: "enterprise",
      });
      const due = getDueEmails([user], NOW);

      const day14 = due.find((d) => d.step.delayDays === 14);
      expect(day14).toBeUndefined();
    });
  });

  // ── markSent prevents duplicate sends ─────────────────────────────────────

  describe("markSent prevents duplicate sends", () => {
    it("marks a step as sent and hasSent returns true", () => {
      expect(hasSent("usr_001", 0)).toBe(false);
      markSent("usr_001", 0);
      expect(hasSent("usr_001", 0)).toBe(true);
    });

    it("getDueEmails excludes already-sent steps", () => {
      const user = makeBusinessUser({ signupDate: daysAgo(3) });

      // Before marking sent: day 1 and day 3 are both due
      let due = getDueEmails([user], NOW);
      const beforeCount = due.length;
      expect(beforeCount).toBeGreaterThanOrEqual(2);

      // Mark day-1 (stepIndex 0) as sent
      markSent(user.id, 0);

      due = getDueEmails([user], NOW);
      expect(due.length).toBe(beforeCount - 1);
      expect(due.find((d) => d.stepIndex === 0)).toBeUndefined();
    });

    it("does not affect other users when marking sent", () => {
      const user1 = makeBusinessUser({ id: "usr_001", signupDate: daysAgo(1) });
      const user2 = makeBusinessUser({ id: "usr_002", signupDate: daysAgo(1) });

      markSent("usr_001", 0);

      const due = getDueEmails([user1, user2], NOW);
      expect(due.find((d) => d.user.id === "usr_001")).toBeUndefined();
      expect(due.find((d) => d.user.id === "usr_002")).toBeDefined();
    });
  });

  // ── Influencer sequence has correct steps ─────────────────────────────────

  describe("influencer sequence has correct steps", () => {
    it("has 3 steps", () => {
      expect(influencerSequence.length).toBe(3);
    });

    it("has steps at day 1, 3, and 7", () => {
      expect(influencerSequence[0].delayDays).toBe(1);
      expect(influencerSequence[1].delayDays).toBe(3);
      expect(influencerSequence[2].delayDays).toBe(7);
    });

    it("returns all 3 steps for influencer signed up 7+ days ago", () => {
      const user = makeInfluencerUser({ signupDate: daysAgo(7) });
      const due = getDueEmails([user], NOW);

      expect(due.length).toBe(3);
      expect(due[0].step.delayDays).toBe(1);
      expect(due[1].step.delayDays).toBe(3);
      expect(due[2].step.delayDays).toBe(7);
    });
  });

  // ── getDueEmails returns empty for new signups (day 0) ────────────────────

  describe("getDueEmails returns empty for new signups (day 0)", () => {
    it("returns no emails for business signed up today", () => {
      const user = makeBusinessUser({ signupDate: daysAgo(0) });
      const due = getDueEmails([user], NOW);

      expect(due.length).toBe(0);
    });

    it("returns no emails for influencer signed up today", () => {
      const user = makeInfluencerUser({ signupDate: daysAgo(0) });
      const due = getDueEmails([user], NOW);

      expect(due.length).toBe(0);
    });

    it("returns no emails for user signed up a few hours ago", () => {
      // Signed up 12 hours ago (same day)
      const signup = new Date(NOW);
      signup.setHours(signup.getHours() - 12);

      const user = makeBusinessUser({ signupDate: signup.toISOString() });
      const due = getDueEmails([user], NOW);

      expect(due.length).toBe(0);
    });
  });

  // ── Business sequence structure ───────────────────────────────────────────

  describe("business sequence has correct structure", () => {
    it("has 4 steps", () => {
      expect(businessSequence.length).toBe(4);
    });

    it("has steps at day 1, 3, 7, and 14", () => {
      expect(businessSequence[0].delayDays).toBe(1);
      expect(businessSequence[1].delayDays).toBe(3);
      expect(businessSequence[2].delayDays).toBe(7);
      expect(businessSequence[3].delayDays).toBe(14);
    });

    it("day-3 step has a condition function", () => {
      expect(typeof businessSequence[1].condition).toBe("function");
    });

    it("day-14 step has a condition function", () => {
      expect(typeof businessSequence[3].condition).toBe("function");
    });
  });

  // ── Template rendering ────────────────────────────────────────────────────

  describe("template rendering", () => {
    it("business day-1 template includes subject and html", () => {
      const user = makeBusinessUser();
      const result = businessSequence[0].templateFn(user);

      expect(result.subject).toBe("Your first campaign in 60 seconds");
      expect(result.html).toContain("Test Business");
      expect(result.html).toContain("<!DOCTYPE html>");
    });

    it("business day-7 template includes business type", () => {
      const user = makeBusinessUser({ businessType: "yoga studio" });
      const result = businessSequence[2].templateFn(user);

      expect(result.subject).toContain("yoga studio");
      expect(result.html).toContain("yoga studio");
    });

    it("influencer day-1 template includes subject and html", () => {
      const user = makeInfluencerUser();
      const result = influencerSequence[0].templateFn(user);

      expect(result.subject).toBe("Start earning with Social Perks");
      expect(result.html).toContain("Test Creator");
    });

    it("templates escape HTML in user names", () => {
      const user = makeBusinessUser({ name: '<script>alert("xss")</script>' });
      const result = businessSequence[0].templateFn(user);

      expect(result.html).not.toContain("<script>");
      expect(result.html).toContain("&lt;script&gt;");
    });
  });
});
