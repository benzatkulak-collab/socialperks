/**
 * API-key plan-gate tests — POST /api/v1/api-keys.
 *
 * Proves the "API access" premium feature is actually enforced (it was marketed
 * on Pro but unguarded — any free account could mint keys). A free business is
 * blocked with 403 PLAN_LIMIT_EXCEEDED; a business with an active Pro
 * subscription can create a key.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { signJWT } from "@/lib/auth";
import { generateCsrfToken } from "@/lib/security/csrf";
import { subscriptions, type Subscription } from "@/lib/billing/store";

function makeActiveSub(businessId: string, plan: string): Subscription {
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 86_400_000);
  return {
    id: `sub_${businessId}`,
    businessId,
    customerId: `cus_${businessId}`,
    plan,
    billingPeriod: "monthly",
    status: "active",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: end.toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: now.toISOString(),
  };
}

function createKeyReq(businessId: string, sub: string): NextRequest {
  const token = signJWT({
    sub,
    role: "business",
    email: `${sub}@example.com`,
    businessId,
    type: "access",
  });
  return new NextRequest("http://localhost/api/v1/api-keys", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "x-csrf-token": generateCsrfToken(sub),
      "content-type": "application/json",
    },
    body: JSON.stringify({ agentName: "test-agent" }),
  });
}

beforeEach(() => {
  subscriptions.clear();
});

describe("POST /api/v1/api-keys — plan gate", () => {
  it("blocks a free-tier business from minting API keys (403)", async () => {
    const res = await POST(createKeyReq("biz_free_apikeys", "user_free_apikeys"));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("PLAN_LIMIT_EXCEEDED");
  });

  it("allows a Pro business to mint an API key (201)", async () => {
    const BIZ = "biz_pro_apikeys";
    subscriptions.set(`sub_${BIZ}`, makeActiveSub(BIZ, "professional"));

    const res = await POST(createKeyReq(BIZ, "user_pro_apikeys"));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(typeof json.data.key).toBe("string");
    expect(json.data.key.length).toBeGreaterThan(0);
  });

  it("blocks a Starter business too — API access is Pro+ only (403)", async () => {
    const BIZ = "biz_starter_apikeys";
    subscriptions.set(`sub_${BIZ}`, makeActiveSub(BIZ, "starter"));

    const res = await POST(createKeyReq(BIZ, "user_starter_apikeys"));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("PLAN_LIMIT_EXCEEDED");
  });
});
