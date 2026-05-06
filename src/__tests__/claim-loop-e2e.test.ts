/**
 * End-to-end test for the customer-side claim loop, exercised at the
 * route-handler level (vitest, in-process — no dev server required).
 *
 * Walks through:
 *   1. Business creates a program → claim code is minted
 *   2. Customer fetches GET /api/v1/claim/:code         (PR A)
 *   3. Customer requests an OTP via /customer/otp/request (PR B)
 *   4. Customer verifies the OTP → claim token          (PR B)
 *   5. Customer submits proof via /claim/:code/submit   (PR C)
 *      → redemption code returned, optimistic delivery via SMS/email
 *   6. Business approves & redeems via /programs/:id/submissions/:id/redeem (PR D)
 *   7. Second redeem returns 409                        (PR D)
 *
 * Why vitest and not Playwright: the in-memory store holds OTP state in
 * the same process the route handlers run in. With a separate browser
 * process hitting a dev server we'd need a test-only endpoint to leak
 * the OTP back; here we just import `createOtp` directly. Cleaner.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { NextRequest } from "next/server";
import {
  programs,
  programMembers,
  programSubmissions,
  generateClaimCode,
  registerClaimCode,
  _resetClaimCodeIndex,
  type PerkProgram,
} from "@/lib/programs/store";
import { createOtp, _resetCustomerOtpStore } from "@/lib/customer-otp";

import { GET as claimGET } from "../app/api/v1/claim/[code]/route";
import { POST as otpRequestPOST } from "../app/api/v1/customer/otp/request/route";
import { POST as otpVerifyPOST } from "../app/api/v1/customer/otp/verify/route";
import { POST as submitPOST } from "../app/api/v1/claim/[code]/submit/route";
import { POST as redeemPOST } from "../app/api/v1/programs/[programId]/submissions/[submissionId]/redeem/route";
import { signJWT } from "@/lib/auth";

const TEST_BUSINESS_ID = "b1";
const TEST_PHONE = "+15551234567";

let _ipCounter = 0;
function ip(): string {
  _ipCounter += 1;
  return `127.50.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`;
}

function jsonReq(url: string, body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-real-ip": ip(), ...headers },
  });
}

function getReq(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    headers: { "x-real-ip": ip() },
  });
}

function ownerToken(): string {
  return signJWT({
    sub: "user-owner",
    role: "business",
    email: "owner@example.com",
    businessId: TEST_BUSINESS_ID,
    type: "access",
  });
}

function seedProgram(): PerkProgram {
  const claimCode = generateClaimCode();
  const program: PerkProgram = {
    id: crypto.randomUUID(),
    businessId: TEST_BUSINESS_ID,
    claimCode,
    name: "Yoga Loyalty",
    description: "Post about your class on IG, get 10% off membership",
    status: "active",
    rules: [
      { actionId: "ig_st", platformId: "ig", pointsPerAction: 1, maxPerCycle: 3 },
    ],
    tiers: [
      { name: "Bronze", requiredActions: 1, perkValue: 10, perkType: "pct" },
    ],
    cycle: "monthly",
    cycleStartDay: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  programs.set(program.id, program);
  registerClaimCode(claimCode, program.id);
  return program;
}

beforeEach(() => {
  programs.clear();
  programMembers.clear();
  programSubmissions.clear();
  _resetClaimCodeIndex();
  _resetCustomerOtpStore();
});

afterEach(() => {
  programs.clear();
  programMembers.clear();
  programSubmissions.clear();
  _resetClaimCodeIndex();
  _resetCustomerOtpStore();
});

describe("Claim loop — end to end", () => {
  it("walks the full path from program creation to redemption", async () => {
    // ── 1) Business creates a program (simulated via direct seed) ───
    const program = seedProgram();
    expect(program.claimCode).toMatch(/^[A-Z2-9]{6}$/);

    // ── 2) Customer fetches the claim landing payload ───────────────
    const landingRes = await claimGET(
      getReq(`/api/v1/claim/${program.claimCode}`),
      { params: Promise.resolve({ code: program.claimCode }) }
    );
    expect(landingRes.status).toBe(200);
    const landingBody = await landingRes.json();
    expect(landingBody.data.programId).toBe(program.id);
    expect(landingBody.data.claimCode).toBe(program.claimCode);
    expect(landingBody.data.actions[0].actionId).toBe("ig_st");
    expect(landingBody.data.topTier?.perkValue).toBe(10);

    // ── 3) Customer requests an OTP ─────────────────────────────────
    const otpReqRes = await otpRequestPOST(
      jsonReq("/api/v1/customer/otp/request", {
        code: program.claimCode,
        channel: "sms",
        contact: TEST_PHONE,
      })
    );
    expect(otpReqRes.status).toBe(200);
    const otpReqBody = await otpReqRes.json();
    expect(otpReqBody.data.delivered).toBe(true);

    // We need the actual OTP. The route doesn't return it (deliberately —
    // it's delivered out-of-band). For the e2e we replace the OTP with
    // one we generated ourselves so we can simulate the customer reading
    // their SMS.
    const { code: knownCode } = await createOtp(program.id, "sms", TEST_PHONE);

    // ── 4) Customer verifies the OTP ────────────────────────────────
    const verifyRes = await otpVerifyPOST(
      jsonReq("/api/v1/customer/otp/verify", {
        code: program.claimCode,
        channel: "sms",
        contact: TEST_PHONE,
        otp: knownCode,
      })
    );
    expect(verifyRes.status).toBe(200);
    const verifyBody = await verifyRes.json();
    const claimToken = verifyBody.data.token as string;
    expect(claimToken).toBeTruthy();

    // ── 5) Customer submits proof ───────────────────────────────────
    const submitRes = await submitPOST(
      jsonReq(`/api/v1/claim/${program.claimCode}/submit`, {
        token: claimToken,
        actionId: "ig_st",
        platformId: "ig",
        proofUrl: "https://instagram.com/p/CtestE2E",
        proofType: "url",
      }),
      { params: Promise.resolve({ code: program.claimCode }) }
    );
    expect(submitRes.status).toBe(201);
    const submitBody = await submitRes.json();
    const submissionId = submitBody.data.submission.id as string;
    const redemptionCode = submitBody.data.redemptionCode as string;
    expect(submissionId).toBeTruthy();
    expect(redemptionCode).toMatch(/^[A-Z2-9]{8}$/);
    expect(submitBody.data.redemptionCodeDisplay).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(submitBody.data.member.memberId).toBe(`sms:${TEST_PHONE}`);

    // The submission should be persisted and unredeemed.
    const stored = programSubmissions.get(submissionId);
    expect(stored?.redemptionCode).toBe(redemptionCode);
    expect(stored?.redeemedAt).toBeNull();
    expect(stored?.notifiedChannel).toBe("sms");

    // ── 6) Business approves & redeems ──────────────────────────────
    const redeemRes = await redeemPOST(
      jsonReq(
        `/api/v1/programs/${program.id}/submissions/${submissionId}/redeem`,
        { code: redemptionCode },
        { authorization: `Bearer ${ownerToken()}` }
      ),
      { params: Promise.resolve({ programId: program.id, submissionId }) }
    );
    expect(redeemRes.status).toBe(200);
    const redeemBody = await redeemRes.json();
    expect(redeemBody.data.submission.status).toBe("approved");
    expect(redeemBody.data.submission.redeemedAt).toBeTruthy();

    // ── 7) Second redeem returns 409 ────────────────────────────────
    const redeemRes2 = await redeemPOST(
      jsonReq(
        `/api/v1/programs/${program.id}/submissions/${submissionId}/redeem`,
        {},
        { authorization: `Bearer ${ownerToken()}` }
      ),
      { params: Promise.resolve({ programId: program.id, submissionId }) }
    );
    expect(redeemRes2.status).toBe(409);
    expect((await redeemRes2.json()).error.code).toBe("ALREADY_REDEEMED");
  });

  it("rejects a token issued for a different program", async () => {
    const programA = seedProgram();
    const programB = seedProgram();

    // OTP-verify against programA
    const { code: codeA } = await createOtp(programA.id, "sms", TEST_PHONE);
    const verifyRes = await otpVerifyPOST(
      jsonReq("/api/v1/customer/otp/verify", {
        code: programA.claimCode,
        channel: "sms",
        contact: TEST_PHONE,
        otp: codeA,
      })
    );
    expect(verifyRes.status).toBe(200);
    const tokenForA = (await verifyRes.json()).data.token as string;

    // Try to use it on programB's code
    const submitRes = await submitPOST(
      jsonReq(`/api/v1/claim/${programB.claimCode}/submit`, {
        token: tokenForA,
        actionId: "ig_st",
        platformId: "ig",
        proofUrl: "https://instagram.com/p/CtestX",
        proofType: "url",
      }),
      { params: Promise.resolve({ code: programB.claimCode }) }
    );
    expect(submitRes.status).toBe(403);
    expect((await submitRes.json()).error.code).toBe("TOKEN_PROGRAM_MISMATCH");
  });

  it("rejects redeem from a different business", async () => {
    const program = seedProgram();
    const { code } = await createOtp(program.id, "email", "user@example.com");
    const verifyBody = await (
      await otpVerifyPOST(
        jsonReq("/api/v1/customer/otp/verify", {
          code: program.claimCode,
          channel: "email",
          contact: "user@example.com",
          otp: code,
        })
      )
    ).json();

    const submitBody = await (
      await submitPOST(
        jsonReq(`/api/v1/claim/${program.claimCode}/submit`, {
          token: verifyBody.data.token,
          actionId: "ig_st",
          platformId: "ig",
          proofUrl: "https://instagram.com/p/CtestE",
          proofType: "url",
        }),
        { params: Promise.resolve({ code: program.claimCode }) }
      )
    ).json();
    const submissionId = submitBody.data.submission.id;

    const otherToken = signJWT({
      sub: "user-other",
      role: "business",
      email: "other@example.com",
      businessId: "b-other",
      type: "access",
    });
    const res = await redeemPOST(
      jsonReq(
        `/api/v1/programs/${program.id}/submissions/${submissionId}/redeem`,
        {},
        { authorization: `Bearer ${otherToken}` }
      ),
      { params: Promise.resolve({ programId: program.id, submissionId }) }
    );
    expect([403, 404]).toContain(res.status);
  });
});
