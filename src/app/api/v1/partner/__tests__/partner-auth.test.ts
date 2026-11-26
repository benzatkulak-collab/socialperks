// The real authenticator (only the database is mocked): what a route does for
// no key, a business key, and a key that matches no row.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const dbQuery = vi.fn();
vi.mock("@/lib/db/connection", () => ({ db: { query: (...a: unknown[]) => dbQuery(...a) } }));

import { GET as listBusinesses } from "../businesses/route";
import { GET as overview } from "../overview/route";
import { GET as week } from "../businesses/[id]/week/route";
import { generatePartnerKey } from "@/lib/partners/keys";

const W = "from=2026-11-12T05:00:00Z&to=2026-11-19T05:00:00Z";
const call = (key: string | null): Array<() => Promise<Response>> => {
  const init = key ? { headers: { authorization: `Bearer ${key}`, "x-real-ip": `10.0.0.${Math.floor(Math.random() * 250)}` } } : {};
  const r = (p: string) => new NextRequest(`http://localhost/api/v1/partner${p}`, init);
  return [
    () => listBusinesses(r("/businesses")),
    () => overview(r(`/overview?${W}`)),
    () => week(r(`/businesses/biz_a/week?${W}`), { params: Promise.resolve({ id: "biz_a" }) }),
  ];
};

beforeEach(() => dbQuery.mockReset());

describe("partner routes with the real authenticator", () => {
  it("401s with no key, and runs no query", async () => {
    for (const run of call(null)) {
      const res = await run();
      expect(res.status).toBe(401);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it("401s a business sp_live_ key, and runs no query", async () => {
    for (const run of call("sp_live_0123abcd_" + "0".repeat(32))) expect((await run()).status).toBe(401);
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it("401s a well-formed key that matches no row, after the key lookup only", async () => {
    const { key } = generatePartnerKey();
    dbQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
    for (const run of call(key)) {
      dbQuery.mockClear();
      expect((await run()).status).toBe(401);
      expect(dbQuery).toHaveBeenCalledTimes(1);
      expect(dbQuery.mock.calls[0][0]).toMatch(/from partners where key_hash/i);
    }
  });
});
