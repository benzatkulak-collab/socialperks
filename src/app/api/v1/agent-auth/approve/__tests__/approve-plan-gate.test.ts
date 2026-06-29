/**
 * agent-auth/approve plan-gate tests — POST /api/v1/agent-auth/approve.
 *
 * The agent-OAuth consent flow mints the SAME API credential as POST
 * /api/v1/api-keys, so it must enforce the SAME "API access" (Pro+) entitlement.
 * Without this, a free-tier owner could bypass the api-keys gate entirely by
 * going approve -> token. Proves: free is blocked (403), Pro is allowed.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { signJWT } from "@/lib/auth";
import { generateCsrfToken } from "@/lib/security/csrf";
import { subscriptions, type Subscription } from "@/lib/billing/store";

function makeActiveSub(businessId: string, plan: string): Subscription {
  const now = new Date();
  return {
    id: `sub_${businessId}`,
    businessId,
    customerId: `cus_${businessId}`,
    plan,
    billingPeriod: "monthly",
    status: "active",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: new Date(now.getTime() + 30 * 86_400_000).toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: now.toISOString(),
  };
}

function approveReq(businessId: string, sub: string): NextRequest {
  const token = signJWT({
    sub,
    role: "business",
    email: `${sub}@example.com`,
    businessId,
    type: "access",
  });
  return new NextRequest("http://localhost/api/v1/agent-auth/approve", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "x-csrf-token": generateCsrfToken(sub),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      agentName: "test-agent",
      scope: ["read.campaigns", "write.campaigns"],
      redirectUri: "https://example.com/callback",
    }),
  });
}

beforeEach(() => {
  subscriptions.clear();
});

describe("POST /api/v1/agent-auth/approve — plan gate", () => {
  it("blocks a free-tier business from authorizing an agent (403)", async () => {
    const res = await POST(approveReq("biz_free_agent", "user_free_agent"));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("PLAN_LIMIT_EXCEEDED");
  });

  it("allows a Pro business to authorize an agent (returns a code)", async () => {
    const BIZ = "biz_pro_agent";
    subscriptions.set(`sub_${BIZ}`, makeActiveSub(BIZ, "professional"));

    const res = await POST(approveReq(BIZ, "user_pro_agent"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(typeof json.data.code).toBe("string");
    expect(json.data.code.length).toBeGreaterThan(0);
  });
});
