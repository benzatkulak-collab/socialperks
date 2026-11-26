import { describe, it, expect, vi, beforeEach } from "vitest";

const dbQuery = vi.fn();
vi.mock("@/lib/db/connection", () => ({ db: { query: (...a: unknown[]) => dbQuery(...a) } }));

import { authenticatePartner } from "../auth";
import { generatePartnerKey, hashPartnerKey } from "../keys";

function reqWithHeader(name: string, value: string): Request {
  return new Request("http://localhost/api/partner/v1/x", { headers: { [name]: value } });
}
const reqWith = (key: string) => reqWithHeader("authorization", `Bearer ${key}`);

describe("authenticatePartner", () => {
  beforeEach(() => dbQuery.mockReset());

  it("looks the hash up on every request, with no module cache", async () => {
    const { key } = generatePartnerKey();
    dbQuery
      .mockResolvedValueOnce({ rows: [{ id: "p1", name: "Test partner" }], rowCount: 1, duration: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0, duration: 0 });
    expect(await authenticatePartner(reqWith(key))).toEqual({ ok: true, partner: { id: "p1", name: "Test partner" } });
    expect(await authenticatePartner(reqWith(key))).toEqual({ ok: false });
    expect(dbQuery).toHaveBeenCalledTimes(2);
    expect(dbQuery.mock.calls[0][0]).toMatch(/where key_hash = \$1 and revoked_at is null/i);
    expect(dbQuery.mock.calls[0][1]).toEqual([hashPartnerKey(key)]);
  });

  it("reads the key from Authorization: Bearer only", async () => {
    const { key } = generatePartnerKey();
    expect(await authenticatePartner(reqWithHeader("x-api-key", key))).toEqual({ ok: false });
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it("refuses a malformed or business key without touching the database", async () => {
    expect(await authenticatePartner(reqWith("sp_live_0123abcd_" + "0".repeat(32)))).toEqual({ ok: false });
    expect(await authenticatePartner(reqWithHeader("authorization", "Basic abc"))).toEqual({ ok: false });
    expect(await authenticatePartner(new Request("http://localhost/x"))).toEqual({ ok: false });
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it("refuses when the database errors", async () => {
    dbQuery.mockRejectedValueOnce(new Error("down"));
    expect(await authenticatePartner(reqWith(generatePartnerKey().key))).toEqual({ ok: false });
  });
});
