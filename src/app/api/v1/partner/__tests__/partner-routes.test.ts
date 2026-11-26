import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.fn();
const grantedBusinesses = vi.fn();
const businessWeeks = vi.fn();
const checkRateLimit = vi.fn();
vi.mock("@/lib/partners/auth", () => ({ authenticatePartner: (...a: unknown[]) => auth(...a) }));
vi.mock("@/lib/partners/week", () => ({
  grantedBusinesses: (...a: unknown[]) => grantedBusinesses(...a),
  businessWeeks: (...a: unknown[]) => businessWeeks(...a),
}));
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimit(...a),
  rateLimitHeaders: () => ({ "X-RateLimit-Limit": "100" }),
}));

import { GET as listBusinesses } from "../businesses/route";
import { GET as overview } from "../overview/route";
import { GET as week } from "../businesses/[id]/week/route";

const W = "from=2026-11-12T05:00:00Z&to=2026-11-19T05:00:00Z";
const KEY = "spp_live_0123abcd_" + "0".repeat(32);

const perk = { pct: 0, dol: 0, dolTotal: 0 };
function bw(id: string, latest = 0) {
  return {
    businessId: id, businessName: "Test Cafe",
    plan: { name: "free", status: null, completionsThisMonth: 3, completionsLimit: 25 },
    campaigns: { byState: { active: 2 }, live: 2, nearCap: 0, pastExpiry: 0 },
    submissions: {
      receivedByStatus: { pending: 1, approved: 2, rejected: 0, expired: 0 },
      byPlatform: { Instagram: 3 }, waitingNow: 1, oldestWaitingSince: "2026-11-10T00:00:00.000Z",
    },
    perks: { awarded: perk, redeemed: perk, lapsed: 0 },
    latest: Array.from({ length: latest }, (_, i) => ({
      id: `sub_${i}`, submittedAt: "2026-11-15T00:00:00.000Z", status: "pending", platform: "Instagram",
      actionLabel: "Post", campaignName: "C", links: { console: "https://x/c", portal: "https://x/p" },
    })),
  };
}

function get(path: string, key: string | null = KEY): NextRequest {
  return new NextRequest(`http://localhost/api/v1/partner${path}`, key ? { headers: { authorization: `Bearer ${key}` } } : {});
}
const weekCtx = (id: string) => ({ params: Promise.resolve({ id }) });
async function bodyOf(res: Response) { return res.json(); }
const noStore = (r: Response) => expect(r.headers.get("cache-control")).toBe("no-store");

beforeEach(() => {
  for (const m of [auth, grantedBusinesses, businessWeeks, checkRateLimit]) m.mockReset();
  checkRateLimit.mockReturnValue({ allowed: true, remaining: 9, resetAt: Date.now() + 1000, limit: 10 });
  auth.mockResolvedValue({ ok: true, partner: { id: "p1", name: "Partner" } });
  grantedBusinesses.mockResolvedValue([]);
  businessWeeks.mockResolvedValue([]);
});

const calls: Array<[string, () => Promise<Response>]> = [
  ["businesses", () => listBusinesses(get("/businesses"))],
  ["overview", () => overview(get(`/overview?${W}`))],
  ["week", () => week(get(`/businesses/biz_a/week?${W}`), weekCtx("biz_a"))],
];

describe("authentication", () => {
  for (const [name, call] of calls) {
    it(`${name}: 401s when the key is refused, and runs no read`, async () => {
      auth.mockResolvedValue({ ok: false });
      const res = await call();
      expect(res.status).toBe(401);
      expect((await bodyOf(res)).success).toBe(false);
      noStore(res);
      expect(grantedBusinesses).not.toHaveBeenCalled();
      expect(businessWeeks).not.toHaveBeenCalled();
    });
  }
});

describe("rate limit comes first", () => {
  for (const [name, call] of calls) {
    it(`${name}: 429s before any authentication or database call`, async () => {
      checkRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000, limit: 10 });
      const res = await call();
      expect(res.status).toBe(429);
      noStore(res);
      expect(auth).not.toHaveBeenCalled();
      expect(grantedBusinesses).not.toHaveBeenCalled();
      expect(businessWeeks).not.toHaveBeenCalled();
    });
  }
  it("uses the standard tier", async () => {
    await listBusinesses(get("/businesses"));
    expect(checkRateLimit.mock.calls[0][2]).toBe("standard");
  });
  it("buckets by a fixed route name, so varying the id from one IP shares one limit", async () => {
    const headers = { authorization: `Bearer ${KEY}`, "x-nf-client-connection-ip": "203.0.113.9" };
    for (const id of ["biz_a", "biz_b", "biz_c"]) {
      await week(new NextRequest(`http://localhost/api/v1/partner/businesses/${id}/week?${W}`, { headers }), weekCtx(id));
    }
    const keys = checkRateLimit.mock.calls.map((c) => c.slice(0, 3));
    expect(keys).toEqual(Array(3).fill(["203.0.113.9", "partner-week", "standard"]));
    await listBusinesses(get("/businesses"));
    await overview(get(`/overview?${W}`));
    expect(checkRateLimit.mock.calls.slice(3).map((c) => c[1])).toEqual(["partner-businesses", "partner-overview"]);
  });
  it("rate-limits an unauthenticated request before auth runs", async () => {
    const order: string[] = [];
    checkRateLimit.mockImplementation(() => { order.push("limit"); return { allowed: true, remaining: 1, resetAt: 0, limit: 1 }; });
    auth.mockImplementation(async () => { order.push("auth"); return { ok: false }; });
    await listBusinesses(get("/businesses", null));
    expect(order).toEqual(["limit", "auth"]);
  });
});

describe("window validation", () => {
  const bad = [
    ["a missing from", "to=2026-11-19T05:00:00Z"],
    ["to <= from", "from=2026-11-19T05:00:00Z&to=2026-11-19T05:00:00Z"],
    ["a 32-day window", "from=2026-10-01T00:00:00Z&to=2026-11-02T00:00:00Z"],
  ];
  for (const [label, q] of bad) {
    it(`overview 400s ${label} before any query`, async () => {
      const res = await overview(get(`/overview?${q}`));
      expect(res.status).toBe(400);
      expect((await bodyOf(res)).error.code).toBe("INVALID_WINDOW");
      noStore(res);
      expect(businessWeeks).not.toHaveBeenCalled();
    });
    it(`week 400s ${label} before any query`, async () => {
      const res = await week(get(`/businesses/biz_a/week?${q}`), weekCtx("biz_a"));
      expect(res.status).toBe(400);
      noStore(res);
      expect(businessWeeks).not.toHaveBeenCalled();
    });
  }
});

describe("GET /businesses", () => {
  it("answers { businesses } in the envelope", async () => {
    const rows = [{ id: "biz_a", name: "Test Cafe", plan: "free", planStatus: null, grantedAt: "2026-11-01T00:00:00.000Z" }];
    grantedBusinesses.mockResolvedValue(rows);
    const res = await listBusinesses(get("/businesses"));
    expect(res.status).toBe(200);
    noStore(res);
    expect(await bodyOf(res)).toEqual({ success: true, data: { businesses: rows } });
    expect(grantedBusinesses).toHaveBeenCalledWith("p1");
  });
  it("fails loudly (500, no data) when a mapping bug breaks the schema", async () => {
    grantedBusinesses.mockResolvedValue([{ id: "biz_a" }]);
    const res = await listBusinesses(get("/businesses"));
    expect(res.status).toBe(500);
    noStore(res);
    expect(JSON.stringify(await bodyOf(res))).not.toContain("biz_a");
  });
});

describe("GET /overview", () => {
  it("reads every granted business with latest capped at 10", async () => {
    businessWeeks.mockResolvedValue([bw("biz_a", 2), bw("biz_b")]);
    const res = await overview(get(`/overview?${W}`));
    expect(res.status).toBe(200);
    noStore(res);
    const [partnerId, ids, window, limit] = businessWeeks.mock.calls[0];
    expect(partnerId).toBe("p1");
    expect(ids).toBe("all");
    expect(window.from.toISOString()).toBe("2026-11-12T05:00:00.000Z");
    expect(window.to.toISOString()).toBe("2026-11-19T05:00:00.000Z");
    expect(limit).toBe(10);
    const body = await bodyOf(res);
    expect(body.data.window).toEqual({ from: "2026-11-12T05:00:00.000Z", to: "2026-11-19T05:00:00.000Z" });
    expect(body.data.businesses).toHaveLength(2);
  });
});

describe("GET /businesses/{id}/week", () => {
  it("answers { window, business } with latest capped at 50", async () => {
    businessWeeks.mockResolvedValue([bw("biz_a", 1)]);
    const res = await week(get(`/businesses/biz_a/week?${W}`), weekCtx("biz_a"));
    expect(res.status).toBe(200);
    noStore(res);
    expect(businessWeeks.mock.calls[0][0]).toBe("p1");
    expect(businessWeeks.mock.calls[0][1]).toEqual(["biz_a"]);
    expect(businessWeeks.mock.calls[0][3]).toBe(50);
    const body = await bodyOf(res);
    expect(body.data.business.businessId).toBe("biz_a");
    expect(body.data.window.from).toBe("2026-11-12T05:00:00.000Z");
  });

  it("404s a business not granted with the same body as an unknown id", async () => {
    businessWeeks.mockResolvedValue([]); // an ungranted and a nonexistent business both return no row
    const other = await week(get(`/businesses/biz_other/week?${W}`), weekCtx("biz_other"));
    const nope = await week(get(`/businesses/biz_nope/week?${W}`), weekCtx("biz_nope"));
    expect(other.status).toBe(404);
    expect(nope.status).toBe(404);
    noStore(other);
    noStore(nope);
    const a = await bodyOf(other);
    expect(a).toEqual(await bodyOf(nope));
    expect(JSON.stringify(a)).not.toContain("biz_");
  });

  it("fails loudly when the read model returns a malformed week", async () => {
    businessWeeks.mockResolvedValue([{ businessId: "biz_a" }]);
    const res = await week(get(`/businesses/biz_a/week?${W}`), weekCtx("biz_a"));
    expect(res.status).toBe(500);
  });
});

describe("Cache-Control on every status", () => {
  it("is no-store on 200, 400, 401, 404 and 429", async () => {
    businessWeeks.mockResolvedValue([bw("biz_a")]);
    const r200 = await week(get(`/businesses/biz_a/week?${W}`), weekCtx("biz_a"));
    const r400 = await week(get(`/businesses/biz_a/week?from=x&to=y`), weekCtx("biz_a"));
    auth.mockResolvedValueOnce({ ok: false });
    const r401 = await week(get(`/businesses/biz_a/week?${W}`), weekCtx("biz_a"));
    businessWeeks.mockResolvedValue([]);
    const r404 = await week(get(`/businesses/biz_x/week?${W}`), weekCtx("biz_x"));
    checkRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: 0, limit: 1 });
    const r429 = await week(get(`/businesses/biz_a/week?${W}`), weekCtx("biz_a"));
    expect([r200.status, r400.status, r401.status, r404.status, r429.status]).toEqual([200, 400, 401, 404, 429]);
    for (const r of [r200, r400, r401, r404, r429]) noStore(r);
  });
});
