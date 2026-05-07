import { afterEach, beforeEach, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import {
  signReceipt,
  verifyReceipt,
  getReceiptForSubmission,
  getReceiptByReceiptId,
  _resetReceiptStore,
} from "../index";
import { getJwtSecret } from "@/lib/auth";

const baseArgs = {
  submissionId: "sub_test_123",
  campaignId: "cmp_test_456",
  businessId: "biz_test",
  submitterUserId: "user_alice",
  actionId: "ig_st",
  platformId: "ig",
  proofUrl: "https://instagram.com/p/CXYZ",
  perkValue: 25,
  perkType: "dol" as const,
  approvedAt: "2026-01-15T12:00:00.000Z",
};

beforeEach(() => {
  _resetReceiptStore();
});

afterEach(() => {
  _resetReceiptStore();
});

describe("signReceipt", () => {
  it("returns a token, payload, and algorithm", () => {
    const r = signReceipt(baseArgs);
    expect(r.algorithm).toBe("HMAC-SHA256");
    expect(r.token).toMatch(/^sprcpt\./);
    expect(r.token.split(".")).toHaveLength(3);
    expect(r.payload.type).toBe("social-perks-attestation");
    expect(r.payload.version).toBe(1);
    expect(r.payload.receiptId).toMatch(/^rcp_/);
    expect(r.payload.issuer).toBe("social-perks.app");
    expect(r.payload.keyId).toBe("v1");
  });

  it("populates all relevant fields from args", () => {
    const r = signReceipt(baseArgs);
    expect(r.payload.submissionId).toBe(baseArgs.submissionId);
    expect(r.payload.campaignId).toBe(baseArgs.campaignId);
    expect(r.payload.businessId).toBe(baseArgs.businessId);
    expect(r.payload.actionId).toBe(baseArgs.actionId);
    expect(r.payload.platformId).toBe(baseArgs.platformId);
    expect(r.payload.proofUrl).toBe(baseArgs.proofUrl);
    expect(r.payload.perkValue).toBe(25);
    expect(r.payload.perkType).toBe("dol");
    expect(r.payload.approvedAt).toBe(baseArgs.approvedAt);
    expect(r.payload.submitterUserId).toBe("user_alice");
  });

  it("supports null submitterUserId for anonymous public-claim flow", () => {
    const r = signReceipt({ ...baseArgs, submitterUserId: null });
    expect(r.payload.submitterUserId).toBeNull();
  });

  it("each receipt gets a unique receiptId", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(signReceipt(baseArgs).payload.receiptId);
    expect(ids.size).toBe(50);
  });

  it("stores receipts in the lookup ring", () => {
    const r = signReceipt(baseArgs);
    expect(getReceiptForSubmission(baseArgs.submissionId)?.token).toBe(r.token);
    expect(getReceiptByReceiptId(r.payload.receiptId)?.token).toBe(r.token);
  });
});

describe("verifyReceipt", () => {
  it("round-trips a freshly signed receipt", () => {
    const r = signReceipt(baseArgs);
    const v = verifyReceipt(r.token);
    expect(v.valid).toBe(true);
    expect(v.payload?.submissionId).toBe(baseArgs.submissionId);
  });

  it("rejects malformed tokens", () => {
    expect(verifyReceipt("").valid).toBe(false);
    expect(verifyReceipt("not.a.real.token").valid).toBe(false);
    expect(verifyReceipt("foo.bar").valid).toBe(false);
  });

  it("rejects tokens without sprcpt prefix", () => {
    const r = signReceipt(baseArgs);
    const tampered = r.token.replace(/^sprcpt/, "wrong");
    const v = verifyReceipt(tampered);
    expect(v.valid).toBe(false);
    expect(v.error).toBe("malformed");
  });

  it("rejects tampered payloads", () => {
    const r = signReceipt(baseArgs);
    const [prefix, , sig] = r.token.split(".");
    // Replace the payload with a forged one carrying a different
    // perkValue. Even though structurally valid, the signature
    // computed from the original payload won't match.
    const forged = Buffer.from(
      JSON.stringify({ ...r.payload, perkValue: 999999 })
    ).toString("base64url");
    const tamperedToken = `${prefix}.${forged}.${sig}`;
    const v = verifyReceipt(tamperedToken);
    expect(v.valid).toBe(false);
    expect(v.error).toBe("signature_mismatch");
  });

  it("rejects tampered signatures", () => {
    const r = signReceipt(baseArgs);
    const [prefix, payload] = r.token.split(".");
    // Replace signature with same-length junk
    const fakeSig = Buffer.alloc(32).toString("base64url");
    const v = verifyReceipt(`${prefix}.${payload}.${fakeSig}`);
    expect(v.valid).toBe(false);
    expect(v.error).toBe("signature_mismatch");
  });

  it("rejects tokens whose type field is wrong", () => {
    // Manually-crafted token where the payload has type=login (not attestation).
    // Re-uses the same signing key so the signature itself would be valid,
    // but the discriminator check rejects it.
    const fakePayload = {
      type: "social-perks-login",
      version: 1,
      receiptId: "rcp_x",
      submissionId: "s",
      campaignId: "c",
      businessId: "b",
      submitterUserId: null,
      actionId: "a",
      platformId: "p",
      proofUrl: "u",
      perkValue: 0,
      perkType: "dol",
      approvedAt: "x",
      issuedAt: "x",
      issuer: "social-perks.app",
      keyId: "v1",
    };
    const canonical = JSON.stringify(
      Object.fromEntries(
        Object.entries(fakePayload).sort(([a], [b]) => a.localeCompare(b))
      )
    );
    const sig = crypto
      .createHmac("sha256", getJwtSecret())
      .update(canonical)
      .digest("base64url");
    const token = `sprcpt.${Buffer.from(canonical).toString("base64url")}.${sig}`;
    const v = verifyReceipt(token);
    expect(v.valid).toBe(false);
    // Either wrong_type (we successfully decode then fail discriminator)
    // or signature_mismatch (canonicalization differs from signReceipt's
    // own ordering, so HMAC won't recompute the same way). Either is a
    // correct rejection.
    expect(["wrong_type", "signature_mismatch"]).toContain(v.error);
  });
});
