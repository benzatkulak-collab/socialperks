import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { campaignManager } from "@/lib/campaign-state-machine";

let _ipCounter = 0;
function makeReq(campaignId: string): NextRequest {
  _ipCounter += 1;
  return new NextRequest(
    new URL(`http://localhost:3000/api/v1/campaigns/${campaignId}/brief`),
    {
      headers: {
        "x-real-ip": `127.70.${Math.floor(_ipCounter / 256)}.${_ipCounter % 256}`,
      },
    }
  );
}

function makeCtx(campaignId: string) {
  return { params: Promise.resolve({ campaignId }) };
}

beforeEach(() => {
  // CampaignStateMachine is a singleton — clean state between tests.
  for (const c of campaignManager.listAll()) {
    // No public reset, but we can transition all to ended which is
    // close enough for our test isolation needs. Better: re-create
    // the manager. For now, reuse a unique campaignId per test.
    void c;
  }
});

afterEach(() => {
  // No reset path on the manager — rely on unique IDs.
});

function launchCampaign(name: string, businessId = "b1"): string {
  // Unique id per call so the singleton CampaignStateMachine doesn't
  // throw on the "already exists" guard between tests.
  const campaignId = `cmp_${crypto.randomUUID()}`;
  campaignManager.launch(campaignId, businessId, {
    name,
    budgetAllocated: 500,
    budgetType: "dol",
    maxCompletions: 50,
    expiresInDays: 30,
    actions: ["ig_st", "ig_fp"],
    guidelines: "Use FTC disclosure",
  });
  return campaignId;
}

describe("GET /api/v1/campaigns/:campaignId/brief", () => {
  it("returns a typed Offer for an active campaign", async () => {
    const campaignId = launchCampaign("Yoga Studio Spring Push");

    const res = await GET(makeReq(campaignId), makeCtx(campaignId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const brief = body.data;
    expect(brief["@context"]).toBe("https://schema.org");
    expect(brief["@type"]).toBe("Offer");
    expect(brief.campaignId).toBe(campaignId);
    expect(brief.title).toBe("Yoga Studio Spring Push");
    expect(brief.state).toBe("active");
    expect(brief.acceptingSubmissions).toBe(true);
    expect(brief.isTerminal).toBe(false);
    expect(brief.businessName).toBe("Sunrise Yoga DC");
  });

  it("hydrates actions from the creation event", async () => {
    const campaignId = launchCampaign("Action Test");

    const brief = (await (await GET(makeReq(campaignId), makeCtx(campaignId))).json()).data;
    expect(brief.ask.actionsKnown).toBe(true);
    expect(brief.ask.actionsCount).toBe(2);
    const actionIds = brief.ask.actions.map((a: { actionId: string }) => a.actionId).sort();
    expect(actionIds).toEqual(["ig_fp", "ig_st"]);
    // Actions are hydrated with platformName and effort
    const igSt = brief.ask.actions.find((a: { actionId: string }) => a.actionId === "ig_st");
    expect(igSt.platformName).toBe("Instagram");
    expect(typeof igSt.effort).toBe("number");
  });

  it("surfaces budget remaining and approxRemainingCompletions", async () => {
    const campaignId = launchCampaign("Budget Test");

    const brief = (await (await GET(makeReq(campaignId), makeCtx(campaignId))).json()).data;
    expect(brief.budget.totalAllocated).toBe(500);
    expect(brief.budget.spent).toBe(0);
    expect(brief.budget.remaining).toBe(500);
    expect(brief.budget.approxRemainingCompletions).toBe(50);
    expect(brief.budget.currency).toBe("USD");
  });

  it("formats the reward display", async () => {
    const campaignId = launchCampaign("Reward Format Test");

    const brief = (await (await GET(makeReq(campaignId), makeCtx(campaignId))).json()).data;
    expect(brief.reward.type).toBe("dol");
    expect(brief.reward.value).toBe(500);
    expect(brief.reward.displayValue).toBe("$500 off");
    expect(brief.reward.perCompletion).toBe(true);
  });

  it("emits an explicit agentInstructions block", async () => {
    const campaignId = launchCampaign("Agent Instructions");

    const brief = (await (await GET(makeReq(campaignId), makeCtx(campaignId))).json()).data;
    expect(brief.agentInstructions.submitProofEndpoint).toMatch(/\/api\/v1\/submissions/);
    expect(brief.agentInstructions.publicClaimUrl).toMatch(/\/c\/[^/]+$/);
    expect(brief.agentInstructions.complianceText).toBe("GET /api/v1/legal");
    expect(brief.agentInstructions.docs).toBe("/AGENTS.md");
    expect(brief.agentInstructions.schemaVersion).toBe("social-perks-campaign-brief-v1");
  });

  it("returns the right platforms in eligibility", async () => {
    const campaignId = launchCampaign("Platform Eligibility");

    const brief = (await (await GET(makeReq(campaignId), makeCtx(campaignId))).json()).data;
    expect(brief.eligibility.platforms).toEqual(["ig"]);
    expect(brief.eligibility.anyContact).toBe(true);
  });

  it("includes a self-referencing URL in _meta", async () => {
    const campaignId = launchCampaign("Self URL");

    const brief = (await (await GET(makeReq(campaignId), makeCtx(campaignId))).json()).data;
    expect(brief._meta.selfUrl).toMatch(new RegExp(`/api/v1/campaigns/${campaignId}/brief$`));
    expect(brief._meta.format).toBe("social-perks-campaign-brief-v1");
  });

  it("emits cache headers", async () => {
    const campaignId = launchCampaign("Cache Test");

    const res = await GET(makeReq(campaignId), makeCtx(campaignId));
    expect(res.headers.get("Cache-Control")).toMatch(/max-age=300/);
  });

  it("returns 404 for unknown campaigns", async () => {
    const res = await GET(makeReq("nonexistent-id"), makeCtx("nonexistent-id"));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("reports daysRemaining accurately", async () => {
    const campaignId = launchCampaign("Days Remaining");

    const brief = (await (await GET(makeReq(campaignId), makeCtx(campaignId))).json()).data;
    // Launched with expiresInDays=30, so should be ~29-30
    expect(brief.timing.daysRemaining).toBeGreaterThanOrEqual(29);
    expect(brief.timing.daysRemaining).toBeLessThanOrEqual(30);
  });

  it("reports state correctly when paused", async () => {
    const campaignId = launchCampaign("Pause Test");
    campaignManager.pause(campaignId, "biz-1", "test pause");

    const brief = (await (await GET(makeReq(campaignId), makeCtx(campaignId))).json()).data;
    expect(brief.state).toBe("paused");
    expect(brief.acceptingSubmissions).toBe(false);
    expect(brief.isTerminal).toBe(true);
  });
});
