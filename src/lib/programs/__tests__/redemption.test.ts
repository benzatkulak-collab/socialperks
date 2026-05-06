import { afterEach, describe, expect, it } from "vitest";
import {
  generateRedemptionCode,
  formatRedemptionCode,
  findSubmissionByRedemptionCode,
} from "../redemption";
import { programSubmissions, type ProgramSubmission } from "../store";

afterEach(() => {
  programSubmissions.clear();
});

function fakeSubmission(overrides: Partial<ProgramSubmission> = {}): ProgramSubmission {
  return {
    id: crypto.randomUUID(),
    programId: "prg-1",
    memberId: "sms:+15551234567",
    actionId: "ig_st",
    platformId: "ig",
    proofUrl: "https://x",
    proofType: "url",
    points: 1,
    status: "pending",
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    redemptionCode: null,
    redeemedAt: null,
    notifiedChannel: null,
    notifiedContact: null,
    ...overrides,
  };
}

describe("generateRedemptionCode", () => {
  it("returns 8 characters from the unambiguous alphabet", () => {
    const allowed = /^[ABCDEFGHJKMNPQRSTVWXYZ23456789]{8}$/;
    for (let i = 0; i < 100; i++) {
      expect(allowed.test(generateRedemptionCode())).toBe(true);
    }
  });

  it("produces sufficiently distinct values", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(generateRedemptionCode());
    // 30^8 ≈ 6.5 * 10^11 — 200 samples should be 200 unique.
    expect(seen.size).toBe(200);
  });
});

describe("formatRedemptionCode", () => {
  it("inserts a hyphen between the two halves", () => {
    expect(formatRedemptionCode("ABCD2345")).toBe("ABCD-2345");
  });
  it("returns the input unchanged on wrong length", () => {
    expect(formatRedemptionCode("ABC")).toBe("ABC");
  });
});

describe("findSubmissionByRedemptionCode", () => {
  it("looks up by stored (no-hyphen) code", () => {
    const sub = fakeSubmission({ redemptionCode: "ABCD2345" });
    programSubmissions.set(sub.id, sub);
    const found = findSubmissionByRedemptionCode("prg-1", "ABCD2345");
    expect(found?.id).toBe(sub.id);
  });
  it("accepts the display form (with hyphen)", () => {
    const sub = fakeSubmission({ redemptionCode: "ABCD2345" });
    programSubmissions.set(sub.id, sub);
    const found = findSubmissionByRedemptionCode("prg-1", "ABCD-2345");
    expect(found?.id).toBe(sub.id);
  });
  it("scopes by programId", () => {
    const sub = fakeSubmission({ programId: "prg-other", redemptionCode: "ABCD2345" });
    programSubmissions.set(sub.id, sub);
    expect(findSubmissionByRedemptionCode("prg-1", "ABCD2345")).toBeNull();
  });
  it("returns null for unknown codes", () => {
    expect(findSubmissionByRedemptionCode("prg-1", "ZZZZ9999")).toBeNull();
  });
  it("returns null for malformed codes", () => {
    expect(findSubmissionByRedemptionCode("prg-1", "AB")).toBeNull();
  });
});
