/**
 * Integration tests for POST /api/v1/leads/search
 *
 * Auth gating, payload validation, scoring + sort order.
 * Runs in mock mode (no GOOGLE_PLACES_API_KEY) so results are deterministic.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000, limit: 100 }),
  rateLimitHeaders: () => ({}),
}));

import { POST as authPOST } from "../auth/route";
import { POST } from "../leads/search/route";
import { createRequest, parseResponse, authHeaders } from "./helpers";

async function signupAndGetToken(): Promise<string> {
  const res = await authPOST(
    createRequest("/api/v1/auth", {
      method: "POST",
      body: {
        action: "signup",
        email: `leads-search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
        password: "TestPass123!",
        name: "Leads Test",
      },
    })
  );
  const json = (await res.json()) as { data: { accessToken: string } };
  return json.data.accessToken;
}

describe("Leads Search API", () => {
  it("POST /leads/search — without auth returns 401", async () => {
    const res = await POST(
      createRequest("/api/v1/leads/search", {
        method: "POST",
        body: { industry: "coffee shop", city: "Portland" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(401);
    expect(data.error.code).toBe("NO_TOKEN");
  });

  it("POST /leads/search — missing industry returns 400", async () => {
    const token = await signupAndGetToken();
    const res = await POST(
      createRequest("/api/v1/leads/search", {
        method: "POST",
        body: { city: "Portland" },
        headers: authHeaders(token),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.error.code).toBe("MISSING_FIELD");
  });

  it("POST /leads/search — missing city returns 400", async () => {
    const token = await signupAndGetToken();
    const res = await POST(
      createRequest("/api/v1/leads/search", {
        method: "POST",
        body: { industry: "coffee shop" },
        headers: authHeaders(token),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.error.code).toBe("MISSING_FIELD");
  });

  it("POST /leads/search — returns scored leads sorted by fit", async () => {
    const token = await signupAndGetToken();
    const res = await POST(
      createRequest("/api/v1/leads/search", {
        method: "POST",
        body: { industry: "coffee shop", city: "Portland", state: "OR" },
        headers: authHeaders(token),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.leads)).toBe(true);
    expect(data.data.leads.length).toBeGreaterThan(0);
    expect(data.data.mockMode).toBe(true);
    expect(typeof data.data.total).toBe("number");
    expect(typeof data.data.qualified).toBe("number");

    // Each lead has a fit score, reasons, and an owner.
    for (const lead of data.data.leads) {
      expect(typeof lead.fitScore).toBe("number");
      expect(lead.fitScore).toBeGreaterThanOrEqual(0);
      expect(lead.fitScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(lead.fitReasons)).toBe(true);
      expect(typeof lead.ownerId).toBe("string");
      expect(lead.outreachStatus).toBe("new");
    }

    // Sorted descending by fitScore.
    for (let i = 1; i < data.data.leads.length; i++) {
      expect(data.data.leads[i - 1].fitScore).toBeGreaterThanOrEqual(data.data.leads[i].fitScore);
    }
  });

  it("POST /leads/search — respects limit param", async () => {
    const token = await signupAndGetToken();
    const res = await POST(
      createRequest("/api/v1/leads/search", {
        method: "POST",
        body: { industry: "coffee shop", city: "Portland", limit: 3 },
        headers: authHeaders(token),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.leads.length).toBeLessThanOrEqual(3);
  });
});
