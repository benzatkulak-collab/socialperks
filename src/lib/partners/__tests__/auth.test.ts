import { describe, it, expect, vi, beforeEach } from "vitest";

const dbQuery = vi.fn();
vi.mock("@/lib/db/connection", () => ({ db: { query: (...a: unknown[]) => dbQuery(...a) } }));
const captureError = vi.fn();
vi.mock("@/lib/monitoring", () => ({ captureError: (...a: unknown[]) => captureError(...a) }));
// Errors stringify to {}, so read the message and the context separately.
const logged = () => JSON.stringify(captureError.mock.calls.map(([e, c]) => [(e as Error).message, c]));

import { authenticatePartner } from "../auth";
import { generatePartnerKey, hashPartnerKey } from "../keys";

function reqWithHeader(name: string, value: string): Request {
  return new Request("http://localhost/api/partner/v1/x", { headers: { [name]: value } });
}
const reqWith = (key: string) => reqWithHeader("authorization", `Bearer ${key}`);

describe("authenticatePartner", () => {
  beforeEach(() => { dbQuery.mockReset(); captureError.mockReset(); });

  it("looks the hash up on every request, with no module cache", async () => {
    const { key } = generatePartnerKey();
    dbQuery
      .mockResolvedValueOnce({ rows: [{ id: "p1", name: "Test partner" }], rowCount: 1, duration: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0, duration: 0 });
    expect(await authenticatePartner(reqWith(key))).toEqual({ ok: true, partner: { id: "p1", name: "Test partner" } });
    expect(await authenticatePartner(reqWith(key))).toEqual({ ok: false, reason: "invalid" });
    expect(dbQuery).toHaveBeenCalledTimes(2);
    expect(dbQuery.mock.calls[0][0]).toMatch(/where key_hash = \$1 and revoked_at is null/i);
    expect(dbQuery.mock.calls[0][1]).toEqual([hashPartnerKey(key)]);
  });

  it("reads the key from Authorization: Bearer only", async () => {
    const { key } = generatePartnerKey();
    expect(await authenticatePartner(reqWithHeader("x-api-key", key))).toEqual({ ok: false, reason: "invalid" });
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it("refuses a malformed or business key without touching the database", async () => {
    expect(await authenticatePartner(reqWith("sp_live_0123abcd_" + "0".repeat(32)))).toEqual({ ok: false, reason: "invalid" });
    expect(await authenticatePartner(reqWithHeader("authorization", "Basic abc"))).toEqual({ ok: false, reason: "invalid" });
    expect(await authenticatePartner(new Request("http://localhost/x"))).toEqual({ ok: false, reason: "invalid" });
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it("says unavailable, not invalid, when the key lookup fails, and logs the message without the key", async () => {
    const { key } = generatePartnerKey();
    dbQuery.mockRejectedValueOnce(new Error("connection terminated"));
    expect(await authenticatePartner(reqWith(key))).toEqual({ ok: false, reason: "unavailable" });
    expect(captureError).toHaveBeenCalledTimes(1);
    expect(logged()).toContain("connection terminated");
    expect(logged()).not.toContain(key);
    expect(logged()).not.toContain(hashPartnerKey(key));
  });
});
