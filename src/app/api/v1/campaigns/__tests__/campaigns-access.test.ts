/**
 * Who may list campaigns with GET /api/v1/campaigns, and in what shape.
 *
 *   - no credential → 401
 *   - a business → its own campaigns in every state, full record
 *   - the founder (role "admin", no business) → every campaign, full record
 *   - any other signed-in account (an influencer, or an agent acting for
 *     one) → active campaigns only, the way the public /c page shows them:
 *     no state history (who changed it and why) and no spend
 *
 * All ids and names here are made up.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { signJWT } from "@/lib/auth";
import { campaignManager } from "@/lib/campaign-state-machine";

const BIZ_A = "biz_test_alpha";
const BIZ_B = "biz_test_beta";
const B_ACTIVE = "camp_test_beta_active";
const B_PAUSED = "camp_test_beta_paused";
const A_ACTIVE = "camp_test_alpha_active";
const PAUSE_REASON = "Paused while the owner rewrites the offer";

let ipCounter = 0;

function token(sub: string, role: string, businessId: string | null): string {
  return signJWT({ sub, role, email: `${sub}@example.test`, businessId, type: "access" });
}

async function get(path: string, bearer?: string) {
  ipCounter += 1;
  const headers: Record<string, string> = { "x-nf-client-connection-ip": `10.2.0.${ipCounter}` };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  const res = await GET(new NextRequest(`http://localhost${path}`, { headers }));
  return { status: res.status, json: await res.json() };
}

function launch(id: string, businessId: string): void {
  campaignManager.launch(id, businessId, {
    name: `Test campaign ${id}`,
    budgetAllocated: 15,
    budgetType: "pct",
    maxCompletions: 50,
    expiresInDays: 30,
    actions: ["ig_st"],
  });
}

beforeEach(() => {
  campaignManager._reset();
  launch(A_ACTIVE, BIZ_A);
  launch(B_ACTIVE, BIZ_B);
  launch(B_PAUSED, BIZ_B);
  campaignManager.pause(B_PAUSED, "usr_test_owner_b", PAUSE_REASON);
});

type Listed = { id: string; state: string; transitions?: unknown; budget: Record<string, unknown> };

function ids(json: { data: { campaigns: Listed[] } }): string[] {
  return json.data.campaigns.map((c) => c.id).sort();
}

describe("GET /api/v1/campaigns — no credential", () => {
  it("refuses a business's list (401)", async () => {
    const { status, json } = await get(`/api/v1/campaigns?businessId=${BIZ_B}`);
    expect(status).toBe(401);
    expect(JSON.stringify(json)).not.toContain(PAUSE_REASON);
  });

  it("refuses the whole list (401)", async () => {
    const { status } = await get("/api/v1/campaigns");
    expect(status).toBe(401);
  });

  it("refuses a list by state (401)", async () => {
    const { status } = await get("/api/v1/campaigns?state=active");
    expect(status).toBe(401);
  });
});

describe("GET /api/v1/campaigns — an account with no business", () => {
  const influencer = () => token("usr_test_influencer", "influencer", null);

  it("lists only active campaigns", async () => {
    const { status, json } = await get("/api/v1/campaigns", influencer());
    expect(status).toBe(200);
    expect(ids(json)).toEqual([A_ACTIVE, B_ACTIVE].sort());
  });

  it("gets a business's active campaigns only", async () => {
    const { status, json } = await get(`/api/v1/campaigns?businessId=${BIZ_B}`, influencer());
    expect(status).toBe(200);
    expect(ids(json)).toEqual([B_ACTIVE]);
  });

  it("can ask for active campaigns by state (the agents page does)", async () => {
    const { status, json } = await get("/api/v1/campaigns?status=active", influencer());
    expect(status).toBe(200);
    expect(ids(json)).toEqual([A_ACTIVE, B_ACTIVE].sort());
  });

  it("is refused campaigns in any other state", async () => {
    const { status, json } = await get("/api/v1/campaigns?state=paused", influencer());
    expect(status).toBe(403);
    expect(JSON.stringify(json)).not.toContain(B_PAUSED);
  });

  it("sees what the public page shows, without history or spend", async () => {
    const { json } = await get("/api/v1/campaigns", influencer());
    for (const c of json.data.campaigns as Listed[]) {
      expect(c.transitions).toBeUndefined();
      expect(c.budget.spent).toBeUndefined();
      expect(c.budget.allocated).toBe(15);
      expect(c.budget.type).toBe("pct");
    }
  });
});

describe("GET /api/v1/campaigns — a business", () => {
  const ownerB = () => token("usr_test_owner_b", "business", BIZ_B);

  it("lists its own campaigns in every state, with history", async () => {
    const { status, json } = await get("/api/v1/campaigns", ownerB());
    expect(status).toBe(200);
    expect(ids(json)).toEqual([B_ACTIVE, B_PAUSED].sort());
    expect(JSON.stringify(json)).toContain(PAUSE_REASON);
  });

  it("gets its own list when it names itself (the portal does)", async () => {
    const { status, json } = await get(`/api/v1/campaigns?businessId=${BIZ_B}&perPage=100`, ownerB());
    expect(status).toBe(200);
    expect(ids(json)).toEqual([B_ACTIVE, B_PAUSED].sort());
  });

  it("is refused another business's list", async () => {
    const { status } = await get(`/api/v1/campaigns?businessId=${BIZ_A}`, ownerB());
    expect(status).toBe(403);
  });
});

describe("GET /api/v1/campaigns — the founder", () => {
  const admin = () => token("usr_admin_root", "admin", null);

  it("lists every campaign with its history", async () => {
    const { status, json } = await get("/api/v1/campaigns", admin());
    expect(status).toBe(200);
    expect(ids(json)).toEqual([A_ACTIVE, B_ACTIVE, B_PAUSED].sort());
    expect(JSON.stringify(json)).toContain(PAUSE_REASON);
  });

  it("lists one business's campaigns in every state", async () => {
    const { status, json } = await get(`/api/v1/campaigns?businessId=${BIZ_B}`, admin());
    expect(status).toBe(200);
    expect(ids(json)).toEqual([B_ACTIVE, B_PAUSED].sort());
  });
});
