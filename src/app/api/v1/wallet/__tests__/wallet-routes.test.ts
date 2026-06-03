/**
 * Wallet API route tests — GET /api/v1/wallet and POST /api/v1/wallet/redeem.
 *
 * Exercises the real route handlers (auth, CSRF, hydration, error mapping)
 * against signed JWTs. Uses the dev JWT fallback (no AUTH_SECRET needed in
 * test) and the durable in-memory perk store.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { POST } from "../redeem/route";
import { awardPerk, persistPerk, clearStore } from "@/lib/perk-wallet";
import { signJWT } from "@/lib/auth";
import { generateCsrfToken } from "@/lib/security/csrf";

const USER = "user_wallet_routetest";

function bearer(sub = USER): string {
  return signJWT({ sub, role: "influencer", email: `${sub}@example.com`, businessId: null, type: "access" });
}

describe("GET /api/v1/wallet", () => {
  beforeEach(() => clearStore());

  it("returns 401 without authentication", async () => {
    const res = await GET(new NextRequest("http://localhost/api/v1/wallet"));
    expect(res.status).toBe(401);
  });

  it("returns the authenticated user's earned perks", async () => {
    const a = awardPerk(USER, "biz_1", "camp_1", "sub_1", 25, "dol");
    await persistPerk(a.data!, USER, "biz_1");

    const res = await GET(
      new NextRequest("http://localhost/api/v1/wallet", {
        headers: { authorization: `Bearer ${bearer()}` },
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totalAvailable).toBe(25);
    expect(json.data.activeCount).toBe(1);
    expect(json.data.wallets).toHaveLength(1);
    expect(json.data.wallets[0].perks[0].id).toBe(a.data!.id);
  });

  it("filters to a single business via ?businessId=", async () => {
    const a = awardPerk(USER, "cafe", "c1", "s1", 15, "dol");
    const b = awardPerk(USER, "gym", "c2", "s2", 40, "dol");
    await persistPerk(a.data!, USER, "cafe");
    await persistPerk(b.data!, USER, "gym");

    const res = await GET(
      new NextRequest("http://localhost/api/v1/wallet?businessId=gym", {
        headers: { authorization: `Bearer ${bearer()}` },
      }),
    );
    const json = await res.json();
    expect(json.data.wallet.businessId).toBe("gym");
    expect(json.data.wallet.totalAvailable).toBe(40);
  });
});

describe("POST /api/v1/wallet/redeem", () => {
  beforeEach(() => clearStore());

  function redeemReq(perkId: unknown, sub = USER): NextRequest {
    return new NextRequest("http://localhost/api/v1/wallet/redeem", {
      method: "POST",
      headers: {
        authorization: `Bearer ${bearer(sub)}`,
        "x-csrf-token": generateCsrfToken(sub),
        "content-type": "application/json",
      },
      body: JSON.stringify({ perkId }),
    });
  }

  it("redeems an owned, available perk and returns the code", async () => {
    const a = awardPerk(USER, "biz_1", "camp_1", "sub_1", 10, "dol");
    await persistPerk(a.data!, USER, "biz_1");

    const res = await POST(redeemReq(a.data!.id));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.redemptionCode).toBe(a.data!.redemptionCode);
    expect(json.data.perk.status).toBe("redeemed");
  });

  it("refuses to redeem another user's perk (403)", async () => {
    const a = awardPerk("someone_else", "biz_1", "camp_1", "sub_2", 10, "dol");
    await persistPerk(a.data!, "someone_else", "biz_1");

    const res = await POST(redeemReq(a.data!.id, USER)); // authed as USER
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 for an unknown perk", async () => {
    const res = await POST(redeemReq("perk_does_not_exist"));
    expect(res.status).toBe(404);
  });

  it("rejects a missing perkId (400)", async () => {
    const res = await POST(redeemReq(undefined));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_PERK_ID");
  });

  it("returns 401 without authentication", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/v1/wallet/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ perkId: "perk_x" }),
      }),
    );
    expect(res.status).toBe(401);
  });
});
