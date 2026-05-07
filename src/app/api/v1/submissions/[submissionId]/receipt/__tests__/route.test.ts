import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { signReceipt, _resetReceiptStore } from "@/lib/receipts";

let _ipCounter = 0;
function makeReq(submissionId: string): NextRequest {
  _ipCounter += 1;
  return new NextRequest(
    new URL(`http://localhost:3000/api/v1/submissions/${submissionId}/receipt`),
    {
      headers: {
        "x-real-ip": `127.81.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`,
      },
    }
  );
}

function makeCtx(submissionId: string) {
  return { params: Promise.resolve({ submissionId }) };
}

beforeEach(() => {
  _resetReceiptStore();
});

afterEach(() => {
  _resetReceiptStore();
});

describe("GET /api/v1/submissions/:submissionId/receipt", () => {
  it("returns the signed receipt for an approved submission", async () => {
    const r = signReceipt({
      submissionId: "sub_42",
      campaignId: "c1",
      businessId: "b1",
      submitterUserId: "u1",
      actionId: "ig_st",
      platformId: "ig",
      proofUrl: "https://x",
      perkValue: 25,
      perkType: "dol",
      approvedAt: new Date().toISOString(),
    });

    const res = await GET(makeReq("sub_42"), makeCtx("sub_42"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.token).toBe(r.token);
    expect(body.data.payload.submissionId).toBe("sub_42");
    expect(body.data.algorithm).toBe("HMAC-SHA256");
    expect(body.data.verifyEndpoint).toBe("POST /api/v1/receipts/verify");
  });

  it("returns 404 for a submission with no receipt yet", async () => {
    const res = await GET(makeReq("sub_does_not_exist"), makeCtx("sub_does_not_exist"));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NO_RECEIPT");
  });

  it("rejects malformed submissionId", async () => {
    const oversized = "x".repeat(300);
    const res = await GET(makeReq(oversized), makeCtx(oversized));
    expect(res.status).toBe(400);
  });

  it("emits cache headers", async () => {
    signReceipt({
      submissionId: "sub_cache",
      campaignId: "c1",
      businessId: "b1",
      submitterUserId: null,
      actionId: "ig_st",
      platformId: "ig",
      proofUrl: "https://x",
      perkValue: 5,
      perkType: "dol",
      approvedAt: new Date().toISOString(),
    });

    const res = await GET(makeReq("sub_cache"), makeCtx("sub_cache"));
    expect(res.headers.get("Cache-Control")).toMatch(/max-age=300/);
  });
});
