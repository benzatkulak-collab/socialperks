import { describe, it, expect } from "vitest";
import { shouldSendWeeklyDigest } from "../send-weekly-digests";

// The weekly digest cron iterates every business. We must NOT email dead
// signups a "your campaigns are waiting" blast every week (spam + CAN-SPAM
// risk) — the weekly digest goes only to businesses with something live to
// report on. Inactive accounts are the onboarding-drip's job, not this one.

describe("shouldSendWeeklyDigest", () => {
  it("sends when the business has an email and at least one active campaign", () => {
    expect(shouldSendWeeklyDigest({ email: "owner@cafe.com", activeCampaigns: 2 })).toBe(true);
  });

  it("does NOT send when there is no email to address", () => {
    expect(shouldSendWeeklyDigest({ email: "", activeCampaigns: 3 })).toBe(false);
  });

  it("does NOT send to a business with zero active campaigns (no weekly spam to dead signups)", () => {
    expect(shouldSendWeeklyDigest({ email: "owner@cafe.com", activeCampaigns: 0 })).toBe(false);
  });
});
