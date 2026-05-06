import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as requestPOST } from "../request/route";
import { POST as verifyPOST } from "../verify/route";
import {
  programs,
  registerClaimCode,
  _resetClaimCodeIndex,
  type PerkProgram,
} from "@/lib/programs/store";
import {
  _resetCustomerOtpStore,
  verifyClaimToken,
} from "@/lib/customer-otp";

const TEST_CODE = "AAAA22";
const TEST_PHONE = "+15551234567";
const TEST_EMAIL = "claim@example.com";

// Each request gets a unique IP so the rate-limiter (5 req/min/IP for
// the strict tier) doesn't trip across tests. The limiter resolves IP
// from x-real-ip first, so we just set that header.
let _testIpCounter = 0;
function makeReq(body: unknown): NextRequest {
  _testIpCounter += 1;
  return new NextRequest(
    new URL(`http://localhost:3000/api/v1/customer/otp/x`),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "x-real-ip": `127.0.${Math.floor(_testIpCounter / 256)}.${_testIpCounter % 256}`,
      },
    }
  );
}

function fakeProgram(overrides: Partial<PerkProgram> = {}): PerkProgram {
  return {
    id: "prg-1",
    businessId: "b1",
    claimCode: TEST_CODE,
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

beforeEach(() => {
  programs.clear();
  _resetClaimCodeIndex();
  _resetCustomerOtpStore();
  const program = fakeProgram();
  programs.set(program.id, program);
  registerClaimCode(program.claimCode, program.id);
});

afterEach(() => {
  programs.clear();
  _resetClaimCodeIndex();
  _resetCustomerOtpStore();
});

describe("POST /api/v1/customer/otp/request", () => {
  it("rejects malformed claim codes", async () => {
    const res = await requestPOST(
      makeReq({ code: "BAD", channel: "sms", contact: TEST_PHONE })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_CODE");
  });

  it("rejects bad channel", async () => {
    const res = await requestPOST(
      makeReq({ code: TEST_CODE, channel: "smoke", contact: TEST_PHONE })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_CHANNEL");
  });

  it("rejects malformed phone for sms channel", async () => {
    const res = await requestPOST(
      makeReq({ code: TEST_CODE, channel: "sms", contact: "5551234567" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_PHONE");
  });

  it("rejects malformed email", async () => {
    const res = await requestPOST(
      makeReq({ code: TEST_CODE, channel: "email", contact: "not-an-email" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_EMAIL");
  });

  it("404s on inactive programs", async () => {
    programs.clear();
    const program = fakeProgram({ status: "paused" });
    programs.set(program.id, program);
    registerClaimCode(program.claimCode, program.id);

    const res = await requestPOST(
      makeReq({ code: TEST_CODE, channel: "sms", contact: TEST_PHONE })
    );
    expect(res.status).toBe(404);
  });

  it("issues an OTP for a valid SMS request", async () => {
    const res = await requestPOST(
      makeReq({ code: TEST_CODE, channel: "sms", contact: TEST_PHONE })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.delivered).toBe(true);
    expect(body.data.channel).toBe("sms");
    expect(body.data.expiresAt).toBeGreaterThan(Date.now());
  });

  it("issues an OTP for a valid email request", async () => {
    const res = await requestPOST(
      makeReq({ code: TEST_CODE, channel: "email", contact: TEST_EMAIL })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.delivered).toBe(true);
    expect(body.data.channel).toBe("email");
  });
});

describe("POST /api/v1/customer/otp/verify", () => {
  it("rejects with 401 when no OTP was issued", async () => {
    const res = await verifyPOST(
      makeReq({
        code: TEST_CODE,
        channel: "sms",
        contact: TEST_PHONE,
        otp: "123456",
      })
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("X-Otp-Reason")).toBe("not_found");
  });

  it("rejects bad OTPs without leaking which check failed", async () => {
    // Issue an OTP first
    await requestPOST(
      makeReq({ code: TEST_CODE, channel: "sms", contact: TEST_PHONE })
    );
    const res = await verifyPOST(
      makeReq({
        code: TEST_CODE,
        channel: "sms",
        contact: TEST_PHONE,
        otp: "000000",
      })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("VERIFICATION_FAILED");
    expect(res.headers.get("X-Otp-Reason")).toBe("wrong_code");
  });

  it("rejects malformed OTP shape", async () => {
    const res = await verifyPOST(
      makeReq({
        code: TEST_CODE,
        channel: "sms",
        contact: TEST_PHONE,
        otp: "abc",
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_OTP");
  });

  it("returns a valid claim token on success", async () => {
    // Issue OTP and capture it via the in-memory store.
    // Since the route doesn't return the code, we hook into the
    // customer-otp module by issuing through createOtp directly.
    const { createOtp } = await import("@/lib/customer-otp");
    const { code } = await createOtp("prg-1", "sms", TEST_PHONE);

    const res = await verifyPOST(
      makeReq({
        code: TEST_CODE,
        channel: "sms",
        contact: TEST_PHONE,
        otp: code,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeTruthy();
    expect(body.data.programId).toBe("prg-1");

    // Token decodes correctly
    const decoded = verifyClaimToken(body.data.token);
    expect(decoded?.programId).toBe("prg-1");
    expect(decoded?.channel).toBe("sms");
    expect(decoded?.contact).toBe(TEST_PHONE);
  });
});
