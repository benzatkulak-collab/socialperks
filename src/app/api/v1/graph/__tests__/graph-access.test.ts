/**
 * GET /api/v1/graph answers three questions about one business named in the
 * query (`similar_businesses`, `overlapping_audiences`, `cross_promotions`).
 * Only that business, or the founder (role "admin"), may ask them:
 *   - a business naming another business        → 403
 *   - a signed-in account with no business       → 403
 *   - a business naming itself, or the founder   → 200
 * The other two questions (`viral_campaigns`, `influencer_network`) name no
 * business and are unchanged.
 *
 * "b1" and "b2" are businesses in the demo seed data; b1's results are the
 * other three seed businesses in the same city (b2, b11, b13). All other ids
 * here are made up.
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { signJWT } from "@/lib/auth";

const BUSINESS_QUERIES = ["similar_businesses", "overlapping_audiences", "cross_promotions"] as const;

interface Caller {
  sub: string;
  role: string;
  businessId: string | null;
}

const ownerOfB1: Caller = { sub: "usr_test_owner_b1", role: "business", businessId: "b1" };
const influencer: Caller = { sub: "usr_test_influencer", role: "influencer", businessId: null };
const founder: Caller = { sub: "usr_test_founder", role: "admin", businessId: null };

let ipCounter = 0;

async function graph(query: string, who: Caller) {
  ipCounter += 1;
  const token = signJWT({
    sub: who.sub,
    role: who.role,
    email: `${who.sub}@example.test`,
    businessId: who.businessId,
    type: "access",
  });
  const res = await GET(
    new NextRequest(`http://localhost/api/v1/graph?${query}`, {
      headers: {
        authorization: `Bearer ${token}`,
        "x-nf-client-connection-ip": `10.8.0.${ipCounter}`,
      },
    }),
  );
  return { status: res.status, json: await res.json() };
}

describe("GET /api/v1/graph — a business", () => {
  it.each(BUSINESS_QUERIES)("is refused %s about another business", async (type) => {
    const { status, json } = await graph(`type=${type}&businessId=b2`, ownerOfB1);
    expect(status).toBe(403);
    expect(json.success).toBe(false);
  });

  it.each(BUSINESS_QUERIES)("is answered %s about its own business", async (type) => {
    const { status, json } = await graph(`type=${type}&businessId=b1`, ownerOfB1);
    expect(status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("gets its own business's results", async () => {
    const { json } = await graph("type=similar_businesses&businessId=b1", ownerOfB1);
    const ids = (json.data as { business: { id: string } }[]).map((r) => r.business.id).sort();
    expect(ids).toEqual(["b11", "b13", "b2"]);
  });
});

describe("GET /api/v1/graph — a signed-in account with no business", () => {
  it.each(BUSINESS_QUERIES)("is refused %s about any business", async (type) => {
    const { status, json } = await graph(`type=${type}&businessId=b1`, influencer);
    expect(status).toBe(403);
    expect(json.success).toBe(false);
  });

  it("is still answered viral_campaigns, which names no business", async () => {
    const { status } = await graph("type=viral_campaigns", influencer);
    expect(status).toBe(200);
  });
});

describe("GET /api/v1/graph — the founder", () => {
  it.each(BUSINESS_QUERIES)("is answered %s about any business", async (type) => {
    const { status, json } = await graph(`type=${type}&businessId=b1`, founder);
    expect(status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("gets the named business's results", async () => {
    const { json } = await graph("type=cross_promotions&businessId=b1", founder);
    const ids = (json.data as { business: { id: string } }[]).map((r) => r.business.id).sort();
    expect(ids).toEqual(["b11", "b13", "b2"]);
  });
});
