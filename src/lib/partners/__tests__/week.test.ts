import { describe, it, expect, vi, beforeEach } from "vitest";

const dbQuery = vi.fn();
vi.mock("@/lib/db/connection", () => ({ db: { query: (...a: unknown[]) => dbQuery(...a) } }));

import { businessWeeks, grantedBusinesses } from "../week";
import { businessWeekSchema, partnerBusinessesResponse } from "../schemas";

const FROM = new Date("2026-11-19T05:00:00Z");
const TO = new Date("2026-11-26T05:00:00Z");

type Rows = Record<string, unknown[]>;
/** Route each query to the rows it would return, by what it reads. */
function feed(rows: Rows) {
  dbQuery.mockImplementation(async (sql: string) => {
    const key =
      /from launched_campaign_state c\b[\s\S]*group by/i.test(sql) && !/campaign_submissions_v2/i.test(sql) ? "campaigns"
      : /row_number\(\)/i.test(sql) ? "latest"
      : /from campaign_submissions_v2[\s\S]*group by/i.test(sql) && /status = 'pending'/i.test(sql) ? "waiting"
      : /from campaign_submissions_v2[\s\S]*group by/i.test(sql) ? "received"
      : /from perk_wallet_entries/i.test(sql) ? "perks"
      : "businesses";
    return { rows: rows[key] ?? [], rowCount: (rows[key] ?? []).length, duration: 0 };
  });
}
const sqls = () => dbQuery.mock.calls.map((c) => c[0] as string);

const biz = [{ business_id: "biz_1", name: "Test Cafe", plan: "starter", plan_status: "active", completions_this_month: 120 }];

beforeEach(() => dbQuery.mockReset());

describe("businessWeeks", () => {
  it("counts a submission at exactly `from` and not one at exactly `to`", async () => {
    feed({ businesses: biz });
    await businessWeeks("p1", "all", { from: FROM, to: TO }, 10);
    const rec = sqls().find((s) => /submitted_at >= \$3 and [a-z.]*submitted_at < \$4/i.test(s) && /group by/i.test(s));
    expect(rec).toBeDefined();
    const call = dbQuery.mock.calls.find((c) => c[0] === rec)!;
    expect(call[1][2]).toBe(FROM);
    expect(call[1][3]).toBe(TO);
    const perksCall = dbQuery.mock.calls.find((c) => /from perk_wallet_entries/i.test(c[0]))!;
    expect(perksCall[1][2]).toBe(FROM);
    expect(perksCall[1][3]).toBe(TO);
    const perks = perksCall[0] as string;
    expect(perks).toMatch(/earned_at >= \$3 and p\.earned_at < \$4/i);
    expect(perks).toMatch(/redeemed_at >= \$3 and p\.redeemed_at < \$4/i);
    expect(perks).toMatch(/expires_at >= \$3 and p\.expires_at < least\(\$4::timestamptz, now\(\)\)/i); // lapsed is clamped to now
  });

  it("never adds a pct perk's value to dolTotal", async () => {
    feed({
      businesses: biz,
      perks: [
        { business_id: "biz_1", type: "dol", awarded: 2, awarded_value: "15.00", redeemed: 0, redeemed_value: "0", lapsed: 0 },
        { business_id: "biz_1", type: "pct", awarded: 1, awarded_value: "15", redeemed: 1, redeemed_value: "15", lapsed: 2 },
      ],
    });
    const [week] = await businessWeeks("p1", "all", { from: FROM, to: TO }, 10);
    expect(week.perks.awarded).toEqual({ pct: 1, dol: 2, dolTotal: 15 });
    expect(week.perks.redeemed).toEqual({ pct: 1, dol: 0, dolTotal: 0 });
    expect(week.perks.lapsed).toBe(2);
  });

  it("puts an active campaign past expires_at in pastExpiry, not live or nearCap", async () => {
    feed({
      businesses: biz,
      campaigns: [
        { business_id: "biz_1", state: "active", n: 3, live: 2, near_cap: 1, past_expiry: 1 },
        { business_id: "biz_1", state: "paused", n: 1, live: 0, near_cap: 0, past_expiry: 0 },
      ],
    });
    const [week] = await businessWeeks("p1", "all", { from: FROM, to: TO }, 10);
    expect(week.campaigns).toEqual({ byState: { active: 3, paused: 1 }, live: 2, nearCap: 1, pastExpiry: 1 });
    const sql = sqls().find((s) => /from launched_campaign_state c\b/i.test(s) && /group by/i.test(s) && !/campaign_submissions_v2/i.test(s))!;
    expect(sql).toMatch(/c\.state = 'active' and c\.expires_at > now\(\)/i);
    expect(sql).toMatch(/c\.state = 'active' and c\.expires_at <= now\(\)/i);
    expect(sql).toContain(
      "count(*) filter (where c.state = 'active' and c.expires_at > now() and c.max_completions is not null and c.completions >= 0.8 * c.max_completions)",
    );
  });

  it("counts lapsed as available perks whose expires_at is in the window and already past (a future `to` does not count perks yet to lapse)", async () => {
    feed({ businesses: biz });
    await businessWeeks("p1", "all", { from: FROM, to: TO }, 10);
    const perks = sqls().find((s) => /from perk_wallet_entries/i.test(s))!;
    expect(perks).toMatch(/p\.status = 'available' and p\.expires_at >= \$3 and p\.expires_at < least\(\$4::timestamptz, now\(\)\)/i);
  });

  it("maps submissions, waiting, plan and latest", async () => {
    feed({
      businesses: biz,
      received: [
        { business_id: "biz_1", status: "pending", action_id: "ig_st", n: 2 },
        { business_id: "biz_1", status: "approved", action_id: "ig_sl", n: 3 },
        { business_id: "biz_1", status: "rejected", action_id: "nope_zz", n: 1 },
      ],
      waiting: [{ business_id: "biz_1", n: 4, oldest: new Date("2026-11-01T10:00:00Z") }],
      latest: [
        { id: "sub_9", business_id: "biz_1", submitted_at: new Date("2026-11-25T10:00:00Z"), status: "pending", action_id: "ig_st", campaign_name: "Summer" },
      ],
    });
    const [week] = await businessWeeks("p1", ["biz_1"], { from: FROM, to: TO }, 10);
    expect(week.businessName).toBe("Test Cafe");
    expect(week.plan).toEqual({ name: "starter", status: "active", completionsThisMonth: 120, completionsLimit: 500 });
    expect(week.submissions.receivedByStatus).toEqual({ pending: 2, approved: 3, rejected: 1, expired: 0 });
    expect(week.submissions.byPlatform.Instagram).toBe(5);
    expect(week.submissions.byPlatform.Other).toBe(1);
    expect(week.submissions.waitingNow).toBe(4);
    expect(week.submissions.oldestWaitingSince).toBe("2026-11-01T10:00:00.000Z");
    expect(businessWeekSchema.parse(week)).toEqual(week); // real output satisfies the response schema
    expect(week.latest).toEqual([
      {
        id: "sub_9", submittedAt: "2026-11-25T10:00:00.000Z", status: "pending",
        platform: "Instagram", actionLabel: "Story Tag", campaignName: "Summer",
        links: {
          console: "https://socialperks.app/admin/submissions?submission=sub_9",
          portal: "https://socialperks.app/dashboard?tab=submissions&submission=sub_9",
        },
      },
    ]);
  });

  it("an empty week (no rows at all) still satisfies the response schema", async () => {
    feed({ businesses: biz });
    const [week] = await businessWeeks("p1", "all", { from: FROM, to: TO }, 10);
    expect(businessWeekSchema.parse(week)).toEqual(week);
  });

  it("falls back to free, and enterprise has a null limit", async () => {
    feed({
      businesses: [
        { business_id: "biz_1", name: "A", plan: null, plan_status: null, completions_this_month: null },
        { business_id: "biz_2", name: "B", plan: "enterprise", plan_status: "trialing", completions_this_month: 9 },
      ],
    });
    const weeks = await businessWeeks("p1", "all", { from: FROM, to: TO }, 10);
    expect(weeks[0].plan).toEqual({ name: "free", status: null, completionsThisMonth: 0, completionsLimit: 50 });
    expect(weeks[1].plan.completionsLimit).toBeNull();
  });

  it("returns no customer field anywhere", async () => {
    feed({
      businesses: biz,
      latest: [{ id: "sub_9", business_id: "biz_1", submitted_at: new Date("2026-11-25T10:00:00Z"), status: "pending", action_id: "ig_st", campaign_name: "Summer" }],
    });
    const weeks = await businessWeeks("p1", "all", { from: FROM, to: TO }, 10);
    expect(JSON.stringify(weeks)).not.toMatch(/cust_|@|metadata|proof|reviewNote|email/i);
    for (const s of sqls()) expect(s).not.toMatch(/proof_url|review_note|metadata|\.user_id|email|handle/i);
  });

  it("reads only granted, unrevoked businesses, in every query", async () => {
    feed({ businesses: biz });
    await businessWeeks("p1", "all", { from: FROM, to: TO }, 10);
    expect(dbQuery).toHaveBeenCalledTimes(6);
    for (const s of sqls()) {
      expect(s).toMatch(/join partner_businesses pb on pb.business_id = .* and pb.partner_id = \$1 and pb.revoked_at is null/i);
    }
    for (const c of dbQuery.mock.calls) expect(c[1][0]).toBe("p1");
  });

  it("never touches the businesses table", async () => {
    feed({ businesses: biz });
    await businessWeeks("p1", "all", { from: FROM, to: TO }, 10);
    for (const s of sqls()) expect(s).not.toMatch(/(from|join)\s+businesses\b/i);
  });

  it("filters to the requested ids in SQL, and passes null for all", async () => {
    feed({ businesses: biz });
    await businessWeeks("p1", "all", { from: FROM, to: TO }, 10);
    expect(dbQuery.mock.calls[0][1][1]).toBeNull();
    dbQuery.mockClear();
    await businessWeeks("p1", ["biz_1"], { from: FROM, to: TO }, 10);
    expect(dbQuery.mock.calls[0][1][1]).toEqual(["biz_1"]);
    expect(sqls()[0]).toMatch(/pb\.business_id = any\(\$2/i);
  });

  it("makes no query for an empty id list or when no business is granted", async () => {
    expect(await businessWeeks("p1", [], { from: FROM, to: TO }, 10)).toEqual([]);
    expect(dbQuery).not.toHaveBeenCalled();
    feed({ businesses: [] });
    expect(await businessWeeks("p1", "all", { from: FROM, to: TO }, 10)).toEqual([]);
    expect(dbQuery).toHaveBeenCalledTimes(1);
  });

  it("passes latestLimit and caps per business in SQL", async () => {
    feed({ businesses: biz });
    await businessWeeks("p1", "all", { from: FROM, to: TO }, 50);
    const call = dbQuery.mock.calls.find((c) => /row_number\(\)/i.test(c[0]))!;
    expect(call[0]).toMatch(/partition by c\.business_id/i);
    expect(call[1]).toEqual(["p1", null, 50]);
  });

  it("latest has no submitted_at bound and receives no window dates", async () => {
    feed({ businesses: biz });
    await businessWeeks("p1", "all", { from: FROM, to: TO }, 10);
    const call = dbQuery.mock.calls.find((c) => /row_number\(\)/i.test(c[0]))!;
    expect(call[0]).not.toMatch(/submitted_at\s*(>=|<|>|<=)/i);
    expect(call[0]).toMatch(/t\.rn <= \$3/);
    expect(call[1].some((v: unknown) => v instanceof Date)).toBe(false);
  });

  it("a revoked grant stops yielding the business on the very next call", async () => {
    feed({ businesses: biz });
    expect(await businessWeeks("p1", "all", { from: FROM, to: TO }, 10)).toHaveLength(1);
    feed({ businesses: [] }); // the database now filters the revoked row out
    expect(await businessWeeks("p1", "all", { from: FROM, to: TO }, 10)).toHaveLength(0);
  });
});

describe("grantedBusinesses", () => {
  it("lists the partner's unrevoked grants with plan and grant time", async () => {
    feed({
      businesses: [
        { business_id: "biz_1", name: "Test Cafe", plan: "starter", plan_status: "active", granted_at: new Date("2026-11-20T00:00:00Z") },
        { business_id: "biz_2", name: "Other", plan: null, plan_status: null, granted_at: new Date("2026-11-21T00:00:00Z") },
      ],
    });
    const list = await grantedBusinesses("p1");
    expect(list).toEqual([
      { id: "biz_1", name: "Test Cafe", plan: "starter", planStatus: "active", grantedAt: "2026-11-20T00:00:00.000Z" },
      { id: "biz_2", name: "Other", plan: "free", planStatus: null, grantedAt: "2026-11-21T00:00:00.000Z" },
    ]);
    expect(partnerBusinessesResponse.parse({ businesses: list })).toEqual({ businesses: list });
    expect(sqls()[0]).toMatch(/join partner_businesses pb on pb.business_id = .* and pb.partner_id = \$1 and pb.revoked_at is null/i);
    expect(dbQuery.mock.calls[0][1][0]).toBe("p1");
  });
});
