import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

const dbQuery = vi.fn();
const requireAuth = vi.fn();
const rateLimit = vi.fn();
vi.mock("@/lib/db/connection", async (orig) => {
  const real = await orig<typeof import("@/lib/db/connection")>();
  return { ...real, db: { query: (...a: unknown[]) => dbQuery(...a) } };
});
vi.mock("../../../_shared", async (orig) => {
  const real = await orig<typeof import("../../../_shared")>();
  return {
    ...real,
    requireAuth: (...a: unknown[]) => requireAuth(...a),
    rateLimit: (...a: unknown[]) => rateLimit(...a),
  };
});

import { GET } from "../route";

const req = (qs: string) => new NextRequest(`http://localhost/api/v1/admin/submissions${qs}`);
const ROW = {
  id: "sub_1", campaign_id: "camp_1", user_id: "cust_1", action_id: "ig_st", status: "pending",
  proof_url: "https://example.com/p", submitted_at: new Date("2026-11-20T10:00:00Z"), reviewed_at: null,
};

beforeEach(() => {
  dbQuery.mockReset(); requireAuth.mockReset(); rateLimit.mockReset();
  dbQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
  rateLimit.mockReturnValue(null);
  requireAuth.mockReturnValue({ id: "u1", email: "a@example.com", role: "admin" });
});

describe("GET /api/v1/admin/submissions?id=", () => {
  it("rate-limits on the strict tier first", async () => {
    await GET(req("?id=sub_1"), { params: Promise.resolve({}) } as never);
    expect(rateLimit.mock.calls[0][1]).toBe("strict");
  });

  it("403s a non-admin before any query", async () => {
    requireAuth.mockReturnValue({ id: "u2", email: "b@example.com", role: "business", businessId: "biz_1" });
    const res = await GET(req("?id=sub_1"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(403);
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it("answers an unauthenticated caller with the auth response", async () => {
    requireAuth.mockReturnValue(new Response("no", { status: 401 }));
    const res = await GET(req("?id=sub_1"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(401);
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it("400s a missing or malformed id", async () => {
    expect((await GET(req(""), { params: Promise.resolve({}) } as never)).status).toBe(400);
    expect((await GET(req("?id=a%20b;drop"), { params: Promise.resolve({}) } as never)).status).toBe(400);
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it("404s an unknown id", async () => {
    dbQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
    const res = await GET(req("?id=nope"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(404);
  });

  it("answers the drawer's fields with one query by id, and nothing more", async () => {
    dbQuery.mockResolvedValue({ rows: [{ ...ROW, review_note: "secret", metadata: { email: "x" } }], rowCount: 1, duration: 0 });
    const res = await GET(req("?id=sub_1"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.submission).toEqual({
      id: "sub_1", campaignId: "camp_1", userId: "cust_1", actionId: "ig_st", status: "pending",
      proofUrl: "https://example.com/p", submittedAt: "2026-11-20T10:00:00.000Z", reviewedAt: null,
    });
    expect(dbQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = dbQuery.mock.calls[0];
    expect(sql).toMatch(/from campaign_submissions_v2/i);
    expect(sql).not.toMatch(/review_note|metadata/i);
    expect(params).toEqual(["sub_1"]);
  });

  it("does not import the submissions stores", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../route.ts"), "utf8");
    expect(src).not.toMatch(/@\/lib\/submissions/);
  });
});
