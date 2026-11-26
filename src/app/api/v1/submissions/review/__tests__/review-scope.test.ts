/**
 * POST /api/v1/submissions/review prices and books an approval from the
 * submission's own campaign, as the server holds it. A request body may still
 * carry a `campaign` object (an old client field), but nothing in it may
 * change:
 *   - the perk's value or type,
 *   - the business whose wallet the perk lands in,
 *   - the business whose monthly completion limit is checked and counted,
 *   - the campaign name in the customer's email.
 *
 * All ids, names and emails here are made up.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { signJWT } from "@/lib/auth";
import { generateCsrfToken } from "@/lib/security/csrf";
import { campaignManager } from "@/lib/campaign-state-machine";
import { createSubmission, clearStore as clearSubmissions } from "@/lib/submissions";
import { getWallet, clearStore as clearWallets } from "@/lib/perk-wallet";
import { getUsageSummary, recordCompletion, _resetUsage } from "@/lib/billing/enforcement";
import { emailProvider, type EmailMessage } from "@/lib/email";

const OWNER_BIZ = "biz_test_owner";
const OTHER_BIZ = "biz_test_other";
const CAMPAIGN = "camp_test_owner";
const CAMPAIGN_NAME = "Owner test campaign";
const OWNER = "usr_test_owner";
const CUSTOMER = "usr_test_customer";
const CUSTOMER_EMAIL = "sam.sample@example.test";

/** The free plan's monthly completion limit (PLAN_LIMITS.free). */
const FREE_COMPLETIONS = 50;

let ipCounter = 0;

async function review(body: Record<string, unknown>) {
  ipCounter += 1;
  const token = signJWT({
    sub: OWNER,
    role: "business",
    email: `${OWNER}@example.test`,
    businessId: OWNER_BIZ,
    type: "access",
  });
  const res = await POST(
    new NextRequest("http://localhost/api/v1/submissions/review", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "x-csrf-token": generateCsrfToken(OWNER),
        "content-type": "application/json",
        "x-nf-client-connection-ip": `10.7.0.${ipCounter}`,
      },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, json: await res.json() };
}

/** A campaign object naming a richer perk and another business. */
const bodyCampaign = {
  id: CAMPAIGN,
  businessId: OTHER_BIZ,
  name: "Body campaign name",
  description: "",
  actions: ["ig_st"],
  discountValue: 100,
  discountType: "dol",
  expiresInDays: 30,
  useTiers: true,
  status: "active",
  createdAt: "2026-11-01T00:00:00.000Z",
};

let submissionId: string;
let sent: EmailMessage[];

beforeEach(() => {
  campaignManager._reset();
  clearSubmissions();
  clearWallets();
  _resetUsage();
  // 10% off, on the free plan.
  campaignManager.launch(CAMPAIGN, OWNER_BIZ, {
    name: CAMPAIGN_NAME,
    budgetAllocated: 10,
    budgetType: "pct",
    maxCompletions: null,
    expiresInDays: 30,
    actions: ["ig_st"],
  });
  const created = createSubmission(CAMPAIGN, CUSTOMER, "ig_st", "https://example.test/proof", "url", {
    email: CUSTOMER_EMAIL,
    name: "Sam Sample",
  });
  if (!created.success || !created.data) throw new Error(`fixture submission failed: ${created.error?.message}`);
  submissionId = created.data.id;

  sent = [];
  vi.spyOn(emailProvider, "send").mockImplementation(async (message) => {
    sent.push(message);
    return { success: true, messageId: "msg_test" };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/v1/submissions/review — the client's own body", () => {
  it("approves with only submissionId and decision, as the business portal sends", async () => {
    const { status, json } = await review({ submissionId, decision: "approve" });
    expect(status).toBe(200);
    expect(json.data.perk.calculation).toMatchObject({ baseValue: 10, baseType: "pct", totalValue: 10 });
    expect(getWallet(CUSTOMER, OWNER_BIZ).perks).toHaveLength(1);
    expect(getUsageSummary(OWNER_BIZ).completions.used).toBe(1);
  });
});

describe("POST /api/v1/submissions/review — a campaign in the body is not trusted", () => {
  it("prices the perk from the campaign the server holds", async () => {
    const { status, json } = await review({
      submissionId,
      decision: "approve",
      campaign: bodyCampaign,
      followerCount: 1_000_000,
    });
    expect(status).toBe(200);
    expect(json.data.perk.calculation).toMatchObject({
      baseValue: 10,
      baseType: "pct",
      followerBonus: 0,
      totalValue: 10,
    });
  });

  it("puts the perk in the wallet of the campaign's own business", async () => {
    const { status } = await review({ submissionId, decision: "approve", campaign: bodyCampaign });
    expect(status).toBe(200);
    const own = getWallet(CUSTOMER, OWNER_BIZ).perks;
    expect(own).toHaveLength(1);
    expect(own[0]).toMatchObject({ value: 10, type: "pct", campaignId: CAMPAIGN });
    expect(getWallet(CUSTOMER, OTHER_BIZ).perks).toHaveLength(0);
  });

  it("counts the completion against the campaign's own business", async () => {
    const { status } = await review({ submissionId, decision: "approve", campaign: bodyCampaign });
    expect(status).toBe(200);
    expect(getUsageSummary(OWNER_BIZ).completions.used).toBe(1);
    expect(getUsageSummary(OTHER_BIZ).completions.used).toBe(0);
  });

  it("checks the monthly limit of the campaign's own business", async () => {
    for (let i = 0; i < FREE_COMPLETIONS; i++) recordCompletion(OWNER_BIZ);
    const { status, json } = await review({ submissionId, decision: "approve", campaign: bodyCampaign });
    expect(status).toBe(403);
    expect(json.error.code).toBe("PLAN_LIMIT_EXCEEDED");
    expect(getWallet(CUSTOMER, OTHER_BIZ).perks).toHaveLength(0);
    expect(getUsageSummary(OTHER_BIZ).completions.used).toBe(0);
  });

  it("names the server's campaign in the approval email", async () => {
    const { status } = await review({ submissionId, decision: "approve", campaign: bodyCampaign });
    expect(status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain(CAMPAIGN_NAME);
    expect(sent[0].text).not.toContain(bodyCampaign.name);
  });

  it("names the server's campaign in the rejection email", async () => {
    const { status } = await review({ submissionId, decision: "reject", campaign: bodyCampaign });
    expect(status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain(CAMPAIGN_NAME);
    expect(sent[0].text).not.toContain(bodyCampaign.name);
  });
});
