import { describe, it, expect, vi, beforeEach } from "vitest";

const query = vi.fn();
vi.mock("@/lib/db/connection", () => ({ db: { query: (...a: unknown[]) => query(...a) } }));

import { run, parseArgs } from "../partner";

const P = "11111111-1111-4111-8111-111111111111";
const calls = () => query.mock.calls as [string, unknown[]][];
const lastSql = () => calls().at(-1)![0];

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue({ rows: [{ id: P }], rowCount: 1, duration: 0 });
});

describe("partner script", () => {
  it("create prints the key once and stores only its hash", async () => {
    const out = await run(["create", "--name", "Test partner"]);
    const key = out.stdout.match(/spp_live_[0-9a-f]{8}_[0-9a-f]{32}/)![0];
    expect(key).toBeTruthy();
    const params = calls().flatMap(([, p]) => p);
    expect(params).not.toContain(key);
    expect(params).toContain("Test partner");
    expect(params.some((p) => typeof p === "string" && /^[0-9a-f]{64}$/.test(p))).toBe(true);
    expect(out.stdout.split(key).length - 1).toBe(1);
  });

  it("businesses lists auth_users rows with a business_id, never the businesses table", async () => {
    query.mockResolvedValue({ rows: [{ business_id: "biz_1", name: "Shop" }], rowCount: 1, duration: 0 });
    const out = await run(["businesses"]);
    expect(lastSql()).toMatch(/from auth_users/i);
    expect(lastSql()).toMatch(/business_id is not null/i);
    expect(lastSql()).not.toMatch(/from businesses\b/i);
    expect(out.stdout).toContain("biz_1");
  });

  it("grant refuses a business id that is not biz_…", async () => {
    await expect(
      run(["grant", "--partner", P, "--business", "cust_abc", "--by", "f@x.test"]),
    ).rejects.toThrow(/biz_/);
    expect(query).not.toHaveBeenCalled();
  });

  it("grant upserts and clears revoked_at on a re-grant", async () => {
    await run(["grant", "--partner", P, "--business", "biz_1", "--by", "f@x.test"]);
    expect(lastSql()).toMatch(/insert into partner_businesses/i);
    expect(lastSql()).toMatch(/on conflict \(partner_id, business_id\) do update set .*revoked_at = null/is);
    expect(calls().at(-1)![1]).toEqual([P, "biz_1", "f@x.test"]);
  });

  it("grant refuses a business that is not in auth_users", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0, duration: 0 });
    await expect(
      run(["grant", "--partner", P, "--business", "biz_nope", "--by", "f@x.test"]),
    ).rejects.toThrow(/not found/i);
    expect(calls().every(([s]) => !/insert/i.test(s))).toBe(true);
  });

  it("revoke sets revoked_at rather than deleting", async () => {
    await run(["revoke", "--partner", P, "--business", "biz_1"]);
    expect(lastSql()).toMatch(/update partner_businesses set revoked_at = now\(\)/i);
    expect(lastSql()).not.toMatch(/delete/i);
  });

  it("revoke says Revoked when a grant was revoked", async () => {
    const out = await run(["revoke", "--partner", P, "--business", "biz_1"]);
    expect(out.stdout).toMatch(/Revoked biz_1/);
  });

  it("revoke fails loudly when no active grant was found", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0, duration: 0 });
    await expect(run(["revoke", "--partner", P, "--business", "biz_1"])).rejects.toThrow(
      `No active grant found for partner ${P} and business biz_1`,
    );
  });

  it("parseArgs rejects unknown commands and missing flags", () => {
    expect(() => parseArgs(["nope"])).toThrow(/usage/i);
    expect(() => parseArgs(["create"])).toThrow(/--name/);
    expect(parseArgs(["create", "--name", "A B"])).toEqual({ command: "create", name: "A B" });
  });
});
