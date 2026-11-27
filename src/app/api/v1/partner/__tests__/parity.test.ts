// http.ts keeps its own copy of the envelope helpers (partner modules may not
// import _shared.ts, which reaches the session store). This pins the copy to the
// original: same status, body, headers, limiter call and metric. Tests may
// import _shared.ts; only partner modules may not.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const checkRateLimit = vi.fn();
const increment = vi.fn();
const auth = vi.fn();
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimit(...a),
  rateLimitHeaders: (r: { limit: number; remaining: number; resetAt: number }) => ({
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(Math.ceil(r.resetAt / 1000)),
  }),
}));
vi.mock("@/lib/reliability/metrics", async (orig) => {
  const real = await orig<typeof import("@/lib/reliability/metrics")>();
  return { ...real, metrics: { ...real.metrics, increment: (...a: unknown[]) => increment(...a) } };
});
vi.mock("@/lib/partners/auth", () => ({ authenticatePartner: (...a: unknown[]) => auth(...a) }));

import { ok, err, rateLimit, getClientIp } from "../../_shared";
import { getClientIp as sharedIp } from "../../_client-ip";
import { partnerOk, partnerErr, partnerGate } from "@/lib/partners/http";

const UUID = /^[0-9a-f-]{36}$/;
async function snap(res: Response) {
  const h: Record<string, string> = {};
  res.headers.forEach((v, k) => { if (k !== "x-request-id" && k !== "cache-control") h[k] = v; });
  return { status: res.status, body: await res.json(), headers: h, requestId: res.headers.get("x-request-id") };
}

beforeEach(() => {
  checkRateLimit.mockReset(); increment.mockReset(); auth.mockReset();
  auth.mockResolvedValue({ ok: true, partner: { id: "p1", name: "P" } });
});

describe("partner helpers match _shared.ts", () => {
  it("ok(): same status, body, content type; a fresh request id; no-store is the only addition", async () => {
    const a = ok({ x: 1 });
    const b = partnerOk({ x: 1 });
    const [sa, sb] = [await snap(a), await snap(b)];
    expect(sb).toMatchObject({ status: sa.status, body: sa.body, headers: sa.headers });
    expect(sa.requestId).toMatch(UUID);
    expect(sb.requestId).toMatch(UUID);
    expect(b.headers.get("cache-control")).toBe("no-store");
  });

  it("err(): same status, body, headers and request id handling", async () => {
    const [sa, sb] = [await snap(err("NOT_FOUND", "Gone", 404, { "X-A": "1" })), await snap(partnerErr("NOT_FOUND", "Gone", 404, { "X-A": "1" }))];
    expect(sb).toMatchObject({ status: sa.status, body: sa.body, headers: sa.headers });
    expect(sb.requestId).toMatch(UUID);
  });

  it("a 429 has the same code, message, status and X-RateLimit-* headers, the same tier, IP and metric", async () => {
    const denied = { allowed: false, remaining: 0, resetAt: 1_800_000_000_000, limit: 30 };
    const hdr = { "x-nf-client-connection-ip": "198.51.100.7", authorization: "Bearer x" };

    checkRateLimit.mockReturnValue(denied);
    const orig = rateLimit(new NextRequest("http://localhost/api/v1/usage", { headers: hdr }), "standard")!;
    const origCall = checkRateLimit.mock.calls[0];
    const origMetric = increment.mock.calls[0];

    checkRateLimit.mockClear(); increment.mockClear();
    const gate = await partnerGate(new NextRequest("http://localhost/api/v1/partner/overview", { headers: hdr }), "partner-overview");
    const mine = "response" in gate ? gate.response : null;
    expect(mine).not.toBeNull();

    const [so, sm] = [await snap(orig), await snap(mine!)];
    expect(sm).toMatchObject({ status: 429, body: so.body, headers: so.headers });
    expect(so.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(so.headers["x-ratelimit-limit"]).toBe("30");
    expect(checkRateLimit.mock.calls[0][0]).toBe(origCall[0]);   // same IP
    expect(checkRateLimit.mock.calls[0][2]).toBe(origCall[2]);   // same tier
    expect(increment.mock.calls[0][0]).toBe(origMetric[0]);      // same metric name
    expect(increment.mock.calls[0][1]).toBe(origMetric[1]);
    expect(increment.mock.calls[0][2]).toMatchObject({ tier: "standard", endpoint: "partner-overview" });
    expect(auth).not.toHaveBeenCalled();
  });

  it("an allowed request passes both limiters", async () => {
    checkRateLimit.mockReturnValue({ allowed: true, remaining: 5, resetAt: 0, limit: 10 });
    expect(rateLimit(new NextRequest("http://localhost/api/v1/usage"), "standard")).toBeNull();
    const gate = await partnerGate(new NextRequest("http://localhost/api/v1/partner/overview"), "partner-overview");
    expect(gate).toEqual({ partnerId: "p1" });
  });

  it("one client-IP resolver is shared, with the vercel branch intact", () => {
    expect(getClientIp).toBe(sharedIp);
    const r = new NextRequest("http://localhost/x", { headers: { "x-vercel-forwarded-for": "192.0.2.4, 10.0.0.1", "x-forwarded-for": "6.6.6.6" } });
    expect(getClientIp(r)).toBe("192.0.2.4");
  });

  it("a caller's extra Cache-Control cannot replace no-store", () => {
    const res = partnerErr("X", "y", 400, { "Cache-Control": "public, max-age=999" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
