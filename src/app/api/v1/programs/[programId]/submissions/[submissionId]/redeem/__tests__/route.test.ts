import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as redeemPOST } from "../route";
import {
  programs,
  programSubmissions,
  registerClaimCode,
  _resetClaimCodeIndex,
  type PerkProgram,
  type ProgramSubmission,
} from "@/lib/programs/store";
import {
  generateRedemptionCode,
  formatRedemptionCode,
} from "@/lib/programs/redemption";
import { signJWT } from "@/lib/auth";

const TEST_PROGRAM_ID = "prg-1";
const TEST_BUSINESS_ID = "b1";

let _ipCounter = 0;
function makeReq(
  url: string,
  body: unknown,
  authToken: string
): NextRequest {
  _ipCounter += 1;
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-real-ip": `127.2.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`,
      authorization: `Bearer ${authToken}`,
    },
  });
}

function makeCtx(programId: string, submissionId: string) {
  return { params: Promise.resolve({ programId, submissionId }) };
}

function fakeProgram(overrides: Partial<PerkProgram> = {}): PerkProgram {
  return {
    id: TEST_PROGRAM_ID,
    businessId: TEST_BUSINESS_ID,
    claimCode: "AAAA22",
    name: "Yoga Loyalty",
    description: "",
    status: "active",
    rules: [],
    tiers: [],
    cycle: "monthly",
    cycleStartDay: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function fakeSubmission(
  overrides: Partial<ProgramSubmission> = {}
): ProgramSubmission {
  return {
    id: "sub-1",
    programId: TEST_PROGRAM_ID,
    memberId: "sms:+15551234567",
    actionId: "ig_st",
    platformId: "ig",
    proofUrl: "https://instagram.com/p/CXYZ",
    proofType: "url",
    points: 1,
    status: "pending",
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    redemptionCode: generateRedemptionCode(),
    redeemedAt: null,
    notifiedChannel: "sms",
    notifiedContact: "+15551234567",
    ...overrides,
  };
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

function otherOwnerToken(): string {
  return signJWT({
    sub: "user-other",
    role: "business",
    email: "other@example.com",
    businessId: "b-other",
    type: "access",
  });
}

beforeEach(() => {
  programs.clear();
  programSubmissions.clear();
  _resetClaimCodeIndex();
  const program = fakeProgram();
  programs.set(program.id, program);
  registerClaimCode(program.claimCode, program.id);
});

afterEach(() => {
  programs.clear();
  programSubmissions.clear();
  _resetClaimCodeIndex();
});

describe("POST /api/v1/programs/:programId/submissions/:submissionId/redeem", () => {
  it("redeems an unredeemed submission", async () => {
    const sub = fakeSubmission();
    programSubmissions.set(sub.id, sub);

    const res = await redeemPOST(
      makeReq(
        `/api/v1/programs/${TEST_PROGRAM_ID}/submissions/${sub.id}/redeem`,
        {},
        ownerToken()
      ),
      makeCtx(TEST_PROGRAM_ID, sub.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.submission.redeemedAt).toBeTruthy();
    expect(body.data.submission.status).toBe("approved");
  });

  it("returns 409 on second redeem", async () => {
    const sub = fakeSubmission();
    programSubmissions.set(sub.id, sub);

    await redeemPOST(
      makeReq(
        `/api/v1/programs/${TEST_PROGRAM_ID}/submissions/${sub.id}/redeem`,
        {},
        ownerToken()
      ),
      makeCtx(TEST_PROGRAM_ID, sub.id)
    );
    const res2 = await redeemPOST(
      makeReq(
        `/api/v1/programs/${TEST_PROGRAM_ID}/submissions/${sub.id}/redeem`,
        {},
        ownerToken()
      ),
      makeCtx(TEST_PROGRAM_ID, sub.id)
    );
    expect(res2.status).toBe(409);
    expect((await res2.json()).error.code).toBe("ALREADY_REDEEMED");
  });

  it("rejects when the optional code doesn't match", async () => {
    const sub = fakeSubmission();
    programSubmissions.set(sub.id, sub);

    const res = await redeemPOST(
      makeReq(
        `/api/v1/programs/${TEST_PROGRAM_ID}/submissions/${sub.id}/redeem`,
        { code: "WRONGGGG" },
        ownerToken()
      ),
      makeCtx(TEST_PROGRAM_ID, sub.id)
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("CODE_MISMATCH");
  });

  it("accepts the code with display hyphen", async () => {
    const sub = fakeSubmission();
    programSubmissions.set(sub.id, sub);

    const res = await redeemPOST(
      makeReq(
        `/api/v1/programs/${TEST_PROGRAM_ID}/submissions/${sub.id}/redeem`,
        { code: formatRedemptionCode(sub.redemptionCode!) },
        ownerToken()
      ),
      makeCtx(TEST_PROGRAM_ID, sub.id)
    );
    expect(res.status).toBe(200);
  });

  it("rejects cross-business access", async () => {
    const sub = fakeSubmission();
    programSubmissions.set(sub.id, sub);

    const res = await redeemPOST(
      makeReq(
        `/api/v1/programs/${TEST_PROGRAM_ID}/submissions/${sub.id}/redeem`,
        {},
        otherOwnerToken()
      ),
      makeCtx(TEST_PROGRAM_ID, sub.id)
    );
    expect([403, 404]).toContain(res.status);
  });

  it("rejects without auth", async () => {
    const sub = fakeSubmission();
    programSubmissions.set(sub.id, sub);

    const req = new NextRequest(
      new URL(
        `http://localhost:3000/api/v1/programs/${TEST_PROGRAM_ID}/submissions/${sub.id}/redeem`
      ),
      { method: "POST", body: "{}", headers: { "content-type": "application/json" } }
    );
    const res = await redeemPOST(req, makeCtx(TEST_PROGRAM_ID, sub.id));
    expect(res.status).toBe(401);
  });

  it("404s when the submission belongs to a different program", async () => {
    const sub = fakeSubmission({ programId: "prg-other" });
    programSubmissions.set(sub.id, sub);

    const res = await redeemPOST(
      makeReq(
        `/api/v1/programs/${TEST_PROGRAM_ID}/submissions/${sub.id}/redeem`,
        {},
        ownerToken()
      ),
      makeCtx(TEST_PROGRAM_ID, sub.id)
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 on submissions without a redemption code (legacy)", async () => {
    const sub = fakeSubmission({ redemptionCode: null });
    programSubmissions.set(sub.id, sub);

    const res = await redeemPOST(
      makeReq(
        `/api/v1/programs/${TEST_PROGRAM_ID}/submissions/${sub.id}/redeem`,
        {},
        ownerToken()
      ),
      makeCtx(TEST_PROGRAM_ID, sub.id)
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("NOT_REDEEMABLE");
  });
});
