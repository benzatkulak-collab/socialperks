import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import {
  programs,
  programMembers,
  programSubmissions,
  registerClaimCode,
  _resetClaimCodeIndex,
  type PerkProgram,
} from "@/lib/programs/store";
import { signClaimToken } from "@/lib/customer-otp";

const TEST_CODE = "AAAA22";
const TEST_PHONE = "+15551234567";
const TEST_EMAIL = "claim@example.com";

let _ipCounter = 0;
function makeReq(code: string, body: unknown): NextRequest {
  _ipCounter += 1;
  return new NextRequest(
    new URL(`http://localhost:3000/api/v1/claim/${code}/submit`),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "x-real-ip": `127.1.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`,
      },
    }
  );
}

function makeCtx(code: string) {
  return { params: Promise.resolve({ code }) };
}

function fakeProgram(overrides: Partial<PerkProgram> = {}): PerkProgram {
  return {
    id: "prg-1",
    businessId: "b1",
    claimCode: TEST_CODE,
    name: "Yoga Loyalty",
    description: "",
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
    ...overrides,
  };
}

function validBody(extra: Record<string, unknown> = {}) {
  return {
    token: signClaimToken("prg-1", "sms", TEST_PHONE),
    actionId: "ig_st",
    platformId: "ig",
    proofUrl: "https://instagram.com/p/CXYZ123",
    proofType: "url",
    ...extra,
  };
}

beforeEach(() => {
  programs.clear();
  programMembers.clear();
  programSubmissions.clear();
  _resetClaimCodeIndex();
  const program = fakeProgram();
  programs.set(program.id, program);
  registerClaimCode(program.claimCode, program.id);
});

afterEach(() => {
  programs.clear();
  programMembers.clear();
  programSubmissions.clear();
  _resetClaimCodeIndex();
});

describe("POST /api/v1/claim/:code/submit", () => {
  it("creates a submission and auto-enrolls the member on first call", async () => {
    const res = await POST(makeReq(TEST_CODE, validBody()), makeCtx(TEST_CODE));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.submission.status).toBe("pending");
    expect(body.data.submission.points).toBe(1);
    expect(body.data.member.memberId).toBe(`sms:${TEST_PHONE}`);
    expect(programSubmissions.size).toBe(1);
    expect(programMembers.size).toBe(1);
  });

  it("reuses the existing member on second submit", async () => {
    await POST(makeReq(TEST_CODE, validBody()), makeCtx(TEST_CODE));
    const res = await POST(
      makeReq(TEST_CODE, validBody({ proofUrl: "https://instagram.com/p/CXYZ124" })),
      makeCtx(TEST_CODE)
    );
    expect(res.status).toBe(201);
    expect(programMembers.size).toBe(1);
    expect(programSubmissions.size).toBe(2);
  });

  it("rejects without a token", async () => {
    const res = await POST(
      makeReq(TEST_CODE, { ...validBody(), token: undefined }),
      makeCtx(TEST_CODE)
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("MISSING_TOKEN");
  });

  it("rejects an invalid token", async () => {
    const res = await POST(
      makeReq(TEST_CODE, { ...validBody(), token: "garbage.not.real" }),
      makeCtx(TEST_CODE)
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("INVALID_TOKEN");
  });

  it("rejects token issued for a different program", async () => {
    const res = await POST(
      makeReq(TEST_CODE, {
        ...validBody(),
        token: signClaimToken("prg-OTHER", "sms", TEST_PHONE),
      }),
      makeCtx(TEST_CODE)
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("TOKEN_PROGRAM_MISMATCH");
  });

  it("rejects malformed claim code", async () => {
    const res = await POST(makeReq("BAD", validBody()), makeCtx("BAD"));
    expect(res.status).toBe(400);
  });

  it("rejects an action not in the program rules", async () => {
    const res = await POST(
      makeReq(TEST_CODE, validBody({ actionId: "tt_video", platformId: "tt" })),
      makeCtx(TEST_CODE)
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    // either UNKNOWN_ACTION (if tt_video isn't a real action id) or ACTION_NOT_ALLOWED
    expect(["UNKNOWN_ACTION", "ACTION_NOT_ALLOWED"]).toContain(body.error.code);
  });

  it("rejects bad proof URL", async () => {
    const res = await POST(
      makeReq(TEST_CODE, validBody({ proofUrl: "not-a-url" })),
      makeCtx(TEST_CODE)
    );
    expect(res.status).toBe(400);
  });

  it("404s on inactive programs", async () => {
    programs.clear();
    const program = fakeProgram({ status: "ended" });
    programs.set(program.id, program);
    registerClaimCode(program.claimCode, program.id);
    const res = await POST(makeReq(TEST_CODE, validBody()), makeCtx(TEST_CODE));
    expect(res.status).toBe(404);
  });

  it("enforces per-cycle cap", async () => {
    // maxPerCycle is 3 in the fixture. Submit 3 successes then expect 429.
    for (let i = 0; i < 3; i++) {
      const res = await POST(
        makeReq(TEST_CODE, validBody({ proofUrl: `https://instagram.com/p/X${i}` })),
        makeCtx(TEST_CODE)
      );
      expect(res.status).toBe(201);
    }
    const res = await POST(
      makeReq(TEST_CODE, validBody({ proofUrl: `https://instagram.com/p/X-final` })),
      makeCtx(TEST_CODE)
    );
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("CYCLE_LIMIT_REACHED");
  });

  it("works with email-channel tokens too", async () => {
    const token = signClaimToken("prg-1", "email", TEST_EMAIL);
    const res = await POST(
      makeReq(TEST_CODE, {
        ...validBody(),
        token,
      }),
      makeCtx(TEST_CODE)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.member.memberId).toBe(`email:${TEST_EMAIL}`);
    expect(body.data.member.email).toBe(TEST_EMAIL);
  });
});
