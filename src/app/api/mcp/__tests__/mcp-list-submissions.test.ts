/**
 * The MCP `listSubmissions` tool takes a `state` filter
 * (pending / approved / rejected). GET /api/v1/submissions reads that filter
 * as `status`, so the tool must send it under that name, or every state comes
 * back.
 *
 * The tool's outgoing request is answered by the real REST handler, so these
 * tests check what an agent actually gets back. All ids here are made up.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as mcp } from "../route";
import { GET as listSubmissionsRest } from "@/app/api/v1/submissions/route";
import { signJWT } from "@/lib/auth";
import { campaignManager } from "@/lib/campaign-state-machine";
import { createSubmission, reviewSubmission, clearStore } from "@/lib/submissions";

const BIZ = "biz_test_owner";
const CAMPAIGN = "camp_test_owner";
const OWNER = "usr_test_owner";

let ipCounter = 0;
let pendingId: string;
let approvedId: string;
let rejectedId: string;

function submit(userId: string): string {
  const r = createSubmission(CAMPAIGN, userId, "ig_st", "https://example.test/proof", "url");
  if (!r.success || !r.data) throw new Error(`fixture submission failed: ${r.error?.message}`);
  return r.data.id;
}

/** Call an MCP tool as the campaign's business; return the REST body it relayed. */
async function callTool(name: string, args: Record<string, unknown>) {
  const token = signJWT({
    sub: OWNER,
    role: "business",
    email: `${OWNER}@example.test`,
    businessId: BIZ,
    type: "access",
  });
  const res = await mcp(
    new NextRequest("http://localhost/api/mcp", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    }),
  );
  const rpc = await res.json();
  expect(rpc.result.isError).toBe(false);
  return JSON.parse(rpc.result.content[0].text);
}

function ids(body: { data: { submissions: { id: string }[] } }): string[] {
  return body.data.submissions.map((s) => s.id).sort();
}

beforeEach(async () => {
  campaignManager._reset();
  clearStore();
  campaignManager.launch(CAMPAIGN, BIZ, {
    name: "Owner test campaign",
    budgetAllocated: 10,
    budgetType: "pct",
    maxCompletions: null,
    expiresInDays: 30,
    actions: ["ig_st"],
  });
  pendingId = submit("usr_test_customer_a");
  approvedId = submit("usr_test_customer_b");
  rejectedId = submit("usr_test_customer_c");
  await reviewSubmission(approvedId, OWNER, "approve");
  await reviewSubmission(rejectedId, OWNER, "reject");

  // Answer the tool's REST call with the real handler.
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname !== "/api/v1/submissions") throw new Error(`unexpected request: ${url.pathname}`);
    ipCounter += 1;
    const headers = new Headers(init?.headers);
    headers.set("x-nf-client-connection-ip", `10.9.0.${ipCounter}`);
    return listSubmissionsRest(new NextRequest(url, { method: init?.method ?? "GET", headers }));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MCP listSubmissions — the state filter", () => {
  it("returns only approved submissions for state=approved", async () => {
    const body = await callTool("listSubmissions", { campaignId: CAMPAIGN, state: "approved" });
    expect(ids(body)).toEqual([approvedId]);
  });

  it("returns only pending submissions for state=pending", async () => {
    const body = await callTool("listSubmissions", { campaignId: CAMPAIGN, state: "pending" });
    expect(ids(body)).toEqual([pendingId]);
  });

  it("returns every state when no state is given", async () => {
    const body = await callTool("listSubmissions", { campaignId: CAMPAIGN });
    expect(ids(body)).toEqual([approvedId, pendingId, rejectedId].sort());
  });
});
