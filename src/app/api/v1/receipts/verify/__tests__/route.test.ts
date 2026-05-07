import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { signReceipt, _resetReceiptStore } from "@/lib/receipts";

let _ipCounter = 0;
function makeReq(body: unknown): NextRequest {
  _ipCounter += 1;
  return new NextRequest(
    new URL("http://localhost:3000/api/v1/receipts/verify"),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "x-real-ip": `127.80.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`,
      },
    }
  );
}

beforeEach(() => {
  _resetReceiptStore();
});

afterEach(() => {
  _resetReceiptStore();
});

describe("POST /api/v1/receipts/verify", () => {
  it("returns valid:true for a fresh receipt", async () => {
    const r = signReceipt({
      submissionId: "s1",
      campaignId: "c1",
      businessId: "b1",
      submitterUserId: "u1",
      actionId: "ig_st",
      platformId: "ig",
      proofUrl: "https://x",
      perkValue: 10,
      perkType: "dol",
      approvedAt: new Date().toISOString(),
    });

    const res = await POST(makeReq({ token: r.token }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.valid).toBe(true);
    expect(body.data.payload.submissionId).toBe("s1");
    expect(body.data.payload.businessId).toBe("b1");
    expect(body.data.algorithm).toBe("HMAC-SHA256");
    expect(body.data.issuer).toBe("social-perks.app");
  });

  it("returns valid:false on tampered tokens (generic error message)", async () => {
    const r = signReceipt({
      submissionId: "s2",
      campaignId: "c1",
      businessId: "b1",
      submitterUserId: null,
      actionId: "ig_st",
      platformId: "ig",
      proofUrl: "https://x",
      perkValue: 10,
      perkType: "dol",
      approvedAt: new Date().toISOString(),
    });

    // Tamper with the signature
    const [prefix, payload] = r.token.split(".");
    const fakeSig = Buffer.alloc(32).toString("base64url");
    const tampered = `${prefix}.${payload}.${fakeSig}`;

    const res = await POST(makeReq({ token: tampered }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.valid).toBe(false);
    expect(body.data.error).toBe("invalid_or_expired_receipt");
    // Generic error — must NOT reveal "signature_mismatch" to public callers
    expect(JSON.stringify(body.data)).not.toMatch(/signature_mismatch/);
  });

  it("rejects missing token", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("MISSING_TOKEN");
  });

  it("rejects oversized tokens", async () => {
    const res = await POST(makeReq({ token: "x".repeat(5000) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("TOKEN_TOO_LONG");
  });

  it("rejects garbage tokens with valid:false", async () => {
    const res = await POST(makeReq({ token: "not-a-token" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.valid).toBe(false);
  });
});
