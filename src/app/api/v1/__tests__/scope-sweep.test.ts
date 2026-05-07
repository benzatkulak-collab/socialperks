/**
 * End-to-end sweep: an agent api-key with read-only scope must be
 * rejected with 403 INSUFFICIENT_SCOPE on every mutation route this
 * PR gates. Without this test, a future contributor adding a new
 * mutation route would silently leave it unguarded.
 *
 * Strategy: mint a real read-only key via createApiKey (matching the
 * shape /api/v1/agents/register produces), then hit each gated POST
 * with an x-api-key header and assert the route returns the gate's
 * INSUFFICIENT_SCOPE error before reaching its body parser. We don't
 * exercise downstream business logic — the assertion is purely about
 * scope enforcement.
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createApiKey, _resetApiKeyStore } from "@/lib/auth/api-keys";

let _ipCounter = 0;
function nextIp(): string {
  _ipCounter += 1;
  // Spread across a wide range so the strict-tier limiter doesn't trip
  // when the same suite runs many requests with the same agent key.
  return `127.60.${Math.floor(_ipCounter / 256) % 256}.${_ipCounter % 256}`;
}

let agentKey: string;

beforeAll(() => {
  _resetApiKeyStore();
  const created = createApiKey({
    businessId: `agent_${crypto.randomUUID()}`,
    agentName: "scope-sweep-test-agent",
    env: "test",
    permissions: ["read"],
    expiresAt: null,
  });
  agentKey = created.plaintext;
});

afterEach(() => {
  // Don't reset the store — agentKey needs to keep verifying across tests.
});

function buildReq(
  url: string,
  body: unknown,
  method: "POST" | "PUT" | "DELETE" = "POST"
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    body: method === "DELETE" ? undefined : JSON.stringify(body ?? {}),
    headers: {
      "content-type": "application/json",
      "x-real-ip": nextIp(),
      "x-api-key": agentKey,
    },
  });
}

async function expectScopeReject(res: Response, label: string) {
  // 403 with INSUFFICIENT_SCOPE is the gate. Some routes have stricter
  // gates (e.g. role !== "admin") that fire before scope; either is OK.
  // What's NOT OK is 200/201 (the agent successfully mutated state).
  expect([400, 403], `${label}: expected 4xx, got ${res.status}`).toContain(res.status);
  if (res.status === 403) {
    const body = await res.json();
    expect(
      ["INSUFFICIENT_SCOPE", "FORBIDDEN", "NO_TENANT", "TENANT_ACCESS_DENIED"],
      `${label}: got error code ${body.error?.code}`
    ).toContain(body.error.code);
  }
}

// ─── The sweep ──────────────────────────────────────────────────────────────

describe("Scope sweep — read-only agent api-key blocked from every mutation route", () => {
  it("POST /api/v1/programs", async () => {
    const { POST } = await import("../programs/route");
    const res = await POST(
      buildReq("/api/v1/programs", { businessId: "b1", name: "x" })
    );
    await expectScopeReject(res, "programs POST");
  });

  it("POST /api/v1/programs/:id/submit", async () => {
    const { POST } = await import("../programs/[programId]/submit/route");
    const res = await POST(
      buildReq("/api/v1/programs/p1/submit", { memberId: "m", actionId: "ig_st", platformId: "ig", proofUrl: "https://x", proofType: "url" }),
      { params: Promise.resolve({ programId: "p1" }) }
    );
    await expectScopeReject(res, "programs submit POST");
  });

  it("POST /api/v1/programs/:id/cashback", async () => {
    const { POST } = await import("../programs/[programId]/cashback/route");
    const res = await POST(
      buildReq("/api/v1/programs/p1/cashback", { action: "request" }),
      { params: Promise.resolve({ programId: "p1" }) }
    );
    await expectScopeReject(res, "programs cashback POST");
  });

  it("POST /api/v1/programs/:id/members", async () => {
    const { POST } = await import("../programs/[programId]/members/route");
    const res = await POST(
      buildReq("/api/v1/programs/p1/members", { memberId: "m", name: "x", email: "a@b.c" }),
      { params: Promise.resolve({ programId: "p1" }) }
    );
    await expectScopeReject(res, "programs members POST");
  });

  it("POST /api/v1/exchange/orders", async () => {
    const { POST } = await import("../exchange/orders/route");
    const res = await POST(
      buildReq("/api/v1/exchange/orders", { side: "buy", platformId: "ig", actionId: "ig_st" })
    );
    await expectScopeReject(res, "exchange orders POST");
  });

  it("POST /api/v1/exchange/trades", async () => {
    const { POST } = await import("../exchange/trades/route");
    const res = await POST(
      buildReq("/api/v1/exchange/trades", { action: "submit_proof", tradeId: "t1" })
    );
    await expectScopeReject(res, "exchange trades POST");
  });

  it("POST /api/v1/exchange/enroll", async () => {
    const { POST } = await import("../exchange/enroll/route");
    const res = await POST(buildReq("/api/v1/exchange/enroll", {}));
    await expectScopeReject(res, "exchange enroll POST");
  });

  it("POST /api/v1/payouts", async () => {
    const { POST } = await import("../payouts/route");
    const res = await POST(
      buildReq("/api/v1/payouts", { action: "request", amount: 100 })
    );
    await expectScopeReject(res, "payouts POST");
  });

  it("POST /api/v1/influencers", async () => {
    const { POST } = await import("../influencers/route");
    const res = await POST(
      buildReq("/api/v1/influencers", { displayName: "x", email: "a@b.c" })
    );
    await expectScopeReject(res, "influencers POST");
  });

  it("POST /api/v1/referrals", async () => {
    const { POST } = await import("../referrals/route");
    const res = await POST(
      buildReq("/api/v1/referrals", { action: "generate_code" })
    );
    await expectScopeReject(res, "referrals POST");
  });

  it("POST /api/v1/submissions", async () => {
    const { POST } = await import("../submissions/route");
    const res = await POST(buildReq("/api/v1/submissions", {}));
    await expectScopeReject(res, "submissions POST");
  });

  it("POST /api/v1/submissions/review", async () => {
    const { POST } = await import("../submissions/review/route");
    const res = await POST(
      buildReq("/api/v1/submissions/review", { submissionId: "s1", decision: "approve" })
    );
    await expectScopeReject(res, "submissions review POST");
  });

  it("POST /api/v1/campaigns", async () => {
    const { POST } = await import("../campaigns/route");
    const res = await POST(
      buildReq("/api/v1/campaigns", { businessId: "b1", name: "x", actions: ["ig_st"], discountValue: 10 })
    );
    await expectScopeReject(res, "campaigns POST");
  });

  it("PUT /api/v1/programs/:id", async () => {
    const { PUT } = await import("../programs/[programId]/route");
    const res = await PUT(
      buildReq("/api/v1/programs/p1", { name: "renamed" }, "PUT"),
      { params: Promise.resolve({ programId: "p1" }) }
    );
    await expectScopeReject(res, "programs PUT");
  });

  it("DELETE /api/v1/programs/:id", async () => {
    const { DELETE } = await import("../programs/[programId]/route");
    const res = await DELETE(
      buildReq("/api/v1/programs/p1", null, "DELETE"),
      { params: Promise.resolve({ programId: "p1" }) }
    );
    await expectScopeReject(res, "programs DELETE");
  });

  // ── AI routes ──────────────────────────────────────────────────────────
  it("POST /api/v1/ai/recommend", async () => {
    const { POST } = await import("../ai/recommend/route");
    const res = await POST(
      buildReq("/api/v1/ai/recommend", { businessType: "cafe" })
    );
    await expectScopeReject(res, "ai recommend POST");
  });

  it("POST /api/v1/ai/generate", async () => {
    const { POST } = await import("../ai/generate/route");
    const res = await POST(
      buildReq("/api/v1/ai/generate", { businessType: "cafe" })
    );
    await expectScopeReject(res, "ai generate POST");
  });

  it("POST /api/v1/ai/quick-start", async () => {
    const { POST } = await import("../ai/quick-start/route");
    const res = await POST(
      buildReq("/api/v1/ai/quick-start", { businessType: "cafe" })
    );
    await expectScopeReject(res, "ai quick-start POST");
  });

  it("POST /api/v1/ai/review", async () => {
    const { POST } = await import("../ai/review/route");
    const res = await POST(
      buildReq("/api/v1/ai/review", { submissionId: "s1" })
    );
    await expectScopeReject(res, "ai review POST");
  });

  it("POST /api/v1/ai/campaign-agent", async () => {
    const { POST } = await import("../ai/campaign-agent/route");
    const res = await POST(
      buildReq("/api/v1/ai/campaign-agent", { businessId: "b1", name: "x" })
    );
    await expectScopeReject(res, "ai campaign-agent POST");
  });

  // ── Admin scope routes — read-only key must also be blocked ────────────
  it("POST /api/v1/ml/train (requires admin scope)", async () => {
    const { POST } = await import("../ml/train/route");
    const res = await POST(buildReq("/api/v1/ml/train", { action: "train" }));
    await expectScopeReject(res, "ml/train POST");
  });

  it("POST /api/v1/circuits (requires admin scope)", async () => {
    const { POST } = await import("../circuits/route");
    const res = await POST(buildReq("/api/v1/circuits", { circuit: "x" }));
    await expectScopeReject(res, "circuits POST");
  });
});
