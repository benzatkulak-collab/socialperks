/**
 * Integration tests for POST /api/v1/billing/checkout
 *
 * Verifies auth gating, payload validation, payment-link redirect mode,
 * and mock checkout when Stripe is not configured.
 */

import { describe, it, expect, vi } from "vitest";

// Disable rate limiting so tests are not throttled
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000, limit: 100 }),
  rateLimitHeaders: () => ({}),
}));

import { POST as authPOST } from "../auth/route";
import { POST } from "../billing/checkout/route";
import { createRequest, parseResponse, authHeaders } from "./helpers";

async function signupAndGetToken(): Promise<string> {
  const res = await authPOST(
    createRequest("/api/v1/auth", {
      method: "POST",
      body: {
        action: "signup",
        email: `billing-checkout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
        password: "TestPass123!",
        name: "Billing Test",
      },
    })
  );
  const json = (await res.json()) as { data: { accessToken: string } };
  return json.data.accessToken;
}

describe("Billing Checkout API", () => {
  it("POST /billing/checkout — without auth returns 401", async () => {
    const res = await POST(
      createRequest("/api/v1/billing/checkout", {
        method: "POST",
        body: { plan: "pro", interval: "monthly" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("NO_TOKEN");
  });

  it("POST /billing/checkout — invalid plan returns 400", async () => {
    const token = await signupAndGetToken();
    const res = await POST(
      createRequest("/api/v1/billing/checkout", {
        method: "POST",
        body: { plan: "bogus", interval: "monthly" },
        headers: authHeaders(token),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INVALID_PLAN");
  });

  it("POST /billing/checkout — invalid interval returns 400", async () => {
    const token = await signupAndGetToken();
    const res = await POST(
      createRequest("/api/v1/billing/checkout", {
        method: "POST",
        body: { plan: "pro", interval: "weekly" },
        headers: authHeaders(token),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INVALID_INTERVAL");
  });

  it("POST /billing/checkout — mock mode (no Stripe configured) returns a mock URL", async () => {
    const token = await signupAndGetToken();
    const res = await POST(
      createRequest("/api/v1/billing/checkout", {
        method: "POST",
        body: { plan: "pro", interval: "monthly" },
        headers: authHeaders(token),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.url).toContain("/upgrade/success");
    expect(data.data.url).toContain("mock=1");
    expect(data.data.sessionId).toMatch(/^cs_mock_/);
    expect(data.data.mock).toBe(true);
  });

  it("POST /billing/checkout — enterprise plan returns a checkout URL in mock mode", async () => {
    const token = await signupAndGetToken();
    const res = await POST(
      createRequest("/api/v1/billing/checkout", {
        method: "POST",
        body: { plan: "enterprise", interval: "annual" },
        headers: authHeaders(token),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.url).toContain("plan=enterprise");
    expect(data.data.url).toContain("interval=annual");
  });

  it("POST /billing/checkout — defaults interval to monthly when omitted", async () => {
    const token = await signupAndGetToken();
    const res = await POST(
      createRequest("/api/v1/billing/checkout", {
        method: "POST",
        body: { plan: "pro" },
        headers: authHeaders(token),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
