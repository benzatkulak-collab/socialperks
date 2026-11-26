/**
 * Who may use /api/v1/digest.
 *
 *   GET  ?businessId=  previews one business's weekly digest (its campaign
 *                       names, submission counts and estimated value): that
 *                       business's own owner, or the founder.
 *   POST               emails the digest of EVERY business with an active
 *                       campaign, to addresses the caller may supply: the
 *                       founder only. (The weekly cron does not use this
 *                       route; it calls sendWeeklyDigests directly.)
 *
 * All ids, names and addresses here are made up.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { signJWT } from "@/lib/auth";
import { campaignManager } from "@/lib/campaign-state-machine";
import { emailProvider } from "@/lib/email";

const BIZ_A = "biz_test_alpha";
const BIZ_B = "biz_test_beta";

let ipCounter = 0;

function token(sub: string, role: string, businessId: string | null): string {
  return signJWT({ sub, role, email: `${sub}@example.test`, businessId, type: "access" });
}

function req(method: "GET" | "POST", path: string, bearer?: string, body?: unknown): NextRequest {
  ipCounter += 1;
  const headers: Record<string, string> = { "x-nf-client-connection-ip": `10.3.0.${ipCounter}` };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

let send: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  campaignManager._reset();
  campaignManager.launch("camp_test_beta", BIZ_B, {
    name: "Spring tasting night",
    budgetAllocated: 10,
    budgetType: "pct",
    maxCompletions: null,
    expiresInDays: 30,
    actions: ["ig_st"],
  });
  send = vi.spyOn(emailProvider, "send").mockResolvedValue({ success: true, id: "test" } as never);
});

afterEach(() => {
  send.mockRestore();
});

describe("GET /api/v1/digest", () => {
  const path = `/api/v1/digest?businessId=${BIZ_B}`;

  it("refuses an anonymous caller (401)", async () => {
    const res = await GET(req("GET", path));
    expect(res.status).toBe(401);
  });

  it("refuses another business (403)", async () => {
    const res = await GET(req("GET", path, token("usr_test_owner_a", "business", BIZ_A)));
    expect(res.status).toBe(403);
  });

  it("refuses an account with no business (403)", async () => {
    const res = await GET(req("GET", path, token("usr_test_influencer", "influencer", null)));
    expect(res.status).toBe(403);
  });

  it("shows a business its own digest", async () => {
    const res = await GET(req("GET", path, token("usr_test_owner_b", "business", BIZ_B)));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("x-digest-subject")).toBeTruthy();
  });

  it("shows the founder any business's digest", async () => {
    const res = await GET(req("GET", path, token("usr_admin_root", "admin", null)));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/digest", () => {
  const body = { businesses: [{ id: BIZ_B, name: "Test Bistro", email: "outside@example.test" }] };

  it("refuses an anonymous caller and sends nothing", async () => {
    const res = await POST(req("POST", "/api/v1/digest", undefined, body));
    expect(res.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a business and sends nothing", async () => {
    const res = await POST(req("POST", "/api/v1/digest", token("usr_test_owner_a", "business", BIZ_A), body));
    expect(res.status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses an account with no business and sends nothing", async () => {
    const res = await POST(req("POST", "/api/v1/digest", token("usr_test_influencer", "influencer", null), body));
    expect(res.status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it("lets the founder send", async () => {
    const res = await POST(req("POST", "/api/v1/digest", token("usr_admin_root", "admin", null), body));
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
