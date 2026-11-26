/**
 * Who may read GET /api/v1/submissions, and what they get back.
 *
 * A submission carries the proof URL, the submitter's id and, for the public
 * /c form, the customer's email and name in `metadata`. So the list is never
 * anonymous:
 *   - no credential          → 401
 *   - a business (or its key) → only submissions on its own campaigns
 *   - a signed-in account with no business (influencer, customer) → only its
 *     own submissions
 *   - the founder (role "admin") → every submission, narrowed by the filters
 *
 * All ids, names and emails here are made up.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { signJWT } from "@/lib/auth";
import { campaignManager } from "@/lib/campaign-state-machine";
import { createSubmission, clearStore, getStore } from "@/lib/submissions";
import { createApiKey } from "@/lib/auth/api-keys";

const BIZ_A = "biz_test_alpha";
const BIZ_B = "biz_test_beta";
const CAMP_A = "camp_test_alpha";
const CAMP_B = "camp_test_beta";
const INFLUENCER = "usr_test_influencer";
const OTHER_INFLUENCER = "usr_test_other_influencer";
const CUSTOMER_EMAIL = "pat.sample@example.test";

let ipCounter = 0;

function token(sub: string, role: string, businessId: string | null): string {
  return signJWT({ sub, role, email: `${sub}@example.test`, businessId, type: "access" });
}

async function get(path: string, bearer?: string) {
  ipCounter += 1;
  const headers: Record<string, string> = { "x-nf-client-connection-ip": `10.1.0.${ipCounter}` };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  const res = await GET(new NextRequest(`http://localhost${path}`, { headers }));
  return { status: res.status, json: await res.json() };
}

function launch(id: string, businessId: string): void {
  campaignManager.launch(id, businessId, {
    name: `Test campaign ${id}`,
    budgetAllocated: 10,
    budgetType: "pct",
    maxCompletions: null,
    expiresInDays: 30,
    actions: ["ig_st"],
  });
}

/** Create a submission and pin its submittedAt so ordering is deterministic. */
function submit(campaignId: string, userId: string, actionId: string, at: string, metadata = {}): string {
  const r = createSubmission(campaignId, userId, actionId, "https://example.test/proof", "url", metadata);
  if (!r.success || !r.data) throw new Error(`fixture submission failed: ${r.error?.message}`);
  getStore().get(r.data.id)!.submittedAt = at;
  return r.data.id;
}

let subA: string;
let subB: string;
let subBNewer: string;

beforeEach(() => {
  campaignManager._reset();
  clearStore();
  launch(CAMP_A, BIZ_A);
  launch(CAMP_B, BIZ_B);
  // A's only submission is the OLDEST, so a list that paginates before it
  // scopes to the caller's campaigns loses it off page 1.
  subA = submit(CAMP_A, INFLUENCER, "ig_st", "2026-11-01T10:00:00.000Z");
  subB = submit(CAMP_B, OTHER_INFLUENCER, "ig_st", "2026-11-02T10:00:00.000Z", {
    anonymous: true,
    email: CUSTOMER_EMAIL,
    name: "Pat Sample",
  });
  subBNewer = submit(CAMP_B, INFLUENCER, "ig_sl", "2026-11-03T10:00:00.000Z");
});

function ids(json: { data: { submissions: { id: string }[] } }): string[] {
  return json.data.submissions.map((s) => s.id).sort();
}

describe("GET /api/v1/submissions — no credential", () => {
  it("refuses an anonymous caller (401) and returns no submissions", async () => {
    const { status, json } = await get("/api/v1/submissions");
    expect(status).toBe(401);
    expect(JSON.stringify(json)).not.toContain(CUSTOMER_EMAIL);
  });

  it("refuses an anonymous caller filtering by business", async () => {
    const { status } = await get(`/api/v1/submissions?businessId=${BIZ_B}`);
    expect(status).toBe(401);
  });

  it("refuses an anonymous caller filtering by user", async () => {
    const { status } = await get(`/api/v1/submissions?userId=${INFLUENCER}`);
    expect(status).toBe(401);
  });
});

describe("GET /api/v1/submissions — a business", () => {
  const bizA = () => token("usr_test_owner_a", "business", BIZ_A);

  it("sees only submissions on its own campaigns", async () => {
    const { status, json } = await get("/api/v1/submissions", bizA());
    expect(status).toBe(200);
    expect(ids(json)).toEqual([subA]);
    expect(json.data.total).toBe(1);
  });

  it("keeps its scope when it names its own business", async () => {
    const { status, json } = await get(`/api/v1/submissions?businessId=${BIZ_A}`, bizA());
    expect(status).toBe(200);
    expect(ids(json)).toEqual([subA]);
    expect(JSON.stringify(json)).not.toContain(CUSTOMER_EMAIL);
  });

  it("is refused another business", async () => {
    const { status } = await get(`/api/v1/submissions?businessId=${BIZ_B}`, bizA());
    expect(status).toBe(403);
  });

  it("is refused another business's campaign", async () => {
    const { status } = await get(`/api/v1/submissions?campaignId=${CAMP_B}`, bizA());
    expect(status).toBe(403);
  });

  it("scopes before it paginates, so page 1 holds its own submission", async () => {
    // Two of B's submissions are newer than A's only one.
    const { json } = await get("/api/v1/submissions?perPage=1&page=1", bizA());
    expect(ids(json)).toEqual([subA]);
    expect(json.data.total).toBe(1);
    expect(json.data.totalPages).toBe(1);
  });

  it("filters by user inside its own campaigns only", async () => {
    const { json } = await get(`/api/v1/submissions?userId=${INFLUENCER}`, bizA());
    expect(ids(json)).toEqual([subA]);
  });

  it("reads only its own submissions with its API key", async () => {
    const key = createApiKey({ businessId: BIZ_A, agentName: "test agent", permissions: ["read"] });
    const { status, json } = await get("/api/v1/submissions", key.plaintext);
    expect(status).toBe(200);
    expect(ids(json)).toEqual([subA]);
  });
});

describe("GET /api/v1/submissions — an account with no business", () => {
  const influencer = () => token(INFLUENCER, "influencer", null);

  it("sees only its own submissions", async () => {
    const { status, json } = await get("/api/v1/submissions", influencer());
    expect(status).toBe(200);
    expect(ids(json)).toEqual([subA, subBNewer].sort());
    expect(JSON.stringify(json)).not.toContain(CUSTOMER_EMAIL);
  });

  it("can name itself as the user (the influencer portal does)", async () => {
    const { status, json } = await get(`/api/v1/submissions?userId=${INFLUENCER}`, influencer());
    expect(status).toBe(200);
    expect(ids(json)).toEqual([subA, subBNewer].sort());
  });

  it("is refused another user's submissions", async () => {
    const { status } = await get(`/api/v1/submissions?userId=${OTHER_INFLUENCER}`, influencer());
    expect(status).toBe(403);
  });

  it("gets only its own rows when it filters by a business", async () => {
    const { status, json } = await get(`/api/v1/submissions?businessId=${BIZ_B}`, influencer());
    expect(status).toBe(200);
    expect(ids(json)).toEqual([subBNewer]);
  });
});

describe("GET /api/v1/submissions — the founder", () => {
  const admin = () => token("usr_admin_root", "admin", null);

  it("sees every submission", async () => {
    const { status, json } = await get("/api/v1/submissions", admin());
    expect(status).toBe(200);
    expect(ids(json)).toEqual([subA, subB, subBNewer].sort());
  });

  it("narrows to one business when it names one", async () => {
    const { status, json } = await get(`/api/v1/submissions?businessId=${BIZ_B}`, admin());
    expect(status).toBe(200);
    expect(ids(json)).toEqual([subB, subBNewer].sort());
  });
});
