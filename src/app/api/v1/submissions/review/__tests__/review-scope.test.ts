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
import { createSubmission, getSubmissionById, clearStore as clearSubmissions } from "@/lib/submissions";
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

/**
 * The approval email carries the customer's perk link. So the decision email
 * goes only to the address the submission stored, and greets the customer by
 * the stored name; an address or name in the request body changes neither.
 */
describe("POST /api/v1/submissions/review — the decision email's recipient", () => {
  const BODY_EMAIL = "someone.else@example.test";
  const BODY_NAME = "Body Name";

  it("sends the approval email to the stored address, not one in the body", async () => {
    const { status } = await review({ submissionId, decision: "approve", submitterEmail: BODY_EMAIL });
    expect(status).toBe(200);
    expect(sent.map((m) => m.to)).toEqual([CUSTOMER_EMAIL]);
  });

  it("sends the rejection email to the stored address, not one in the body", async () => {
    const { status } = await review({ submissionId, decision: "reject", submitterEmail: BODY_EMAIL });
    expect(status).toBe(200);
    expect(sent.map((m) => m.to)).toEqual([CUSTOMER_EMAIL]);
  });

  it("greets the customer by the stored name, not one in the body", async () => {
    const { status } = await review({ submissionId, decision: "approve", submitterName: BODY_NAME });
    expect(status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].html).toContain("Sam Sample");
    expect(sent[0].html).not.toContain(BODY_NAME);
  });

  it("sends nothing when the submission stored no address, whatever the body says", async () => {
    const created = createSubmission(CAMPAIGN, "usr_test_no_email", "ig_st", "https://example.test/proof-2", "url");
    if (!created.success || !created.data) throw new Error(`fixture submission failed: ${created.error?.message}`);
    const { status } = await review({
      submissionId: created.data.id,
      decision: "approve",
      submitterEmail: BODY_EMAIL,
      submitterName: BODY_NAME,
    });
    expect(status).toBe(200);
    expect(sent).toHaveLength(0);
  });
});

/**
 * The published API (OpenAPI) and the MCP reviewSubmission tool call the
 * reviewer's explanation `reason`; the founder console sends it as `note`.
 * Either one is saved on the submission and shown in the rejection email.
 */
describe("POST /api/v1/submissions/review — the reviewer's reason", () => {
  const REASON = "The proof link is private";

  it("saves a `reason` and puts it in the rejection email", async () => {
    const { status, json } = await review({ submissionId, decision: "reject", reason: REASON });
    expect(status).toBe(200);
    expect(json.data.submission.reviewNote).toBe(REASON);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain(`Reason: ${REASON}`);
  });

  it("saves a `note`, as the founder console sends it", async () => {
    const { status, json } = await review({ submissionId, decision: "reject", note: REASON });
    expect(status).toBe(200);
    expect(json.data.submission.reviewNote).toBe(REASON);
    expect(sent[0].text).toContain(`Reason: ${REASON}`);
  });

  it("refuses a `reason` longer than a note may be", async () => {
    const { status, json } = await review({ submissionId, decision: "reject", reason: "x".repeat(1001) });
    expect(status).toBe(400);
    expect(json.error.code).toBe("INVALID_NOTE");
  });
});

/**
 * A business at its monthly completion limit is refused the approval (403).
 * The refusal must leave the submission as it was, pending and with no perk,
 * so the business can approve it once the limit allows (next month, or after
 * an upgrade). A rejection uses no completion and is never refused for it.
 */
describe("POST /api/v1/submissions/review — the monthly completion limit", () => {
  function fillOwnerLimit(): void {
    for (let i = 0; i < FREE_COMPLETIONS; i++) recordCompletion(OWNER_BIZ);
  }

  it("leaves the submission pending, with no perk and no email, when the limit refuses the approval", async () => {
    fillOwnerLimit();
    const { status, json } = await review({ submissionId, decision: "approve" });
    expect(status).toBe(403);
    expect(json.error.code).toBe("PLAN_LIMIT_EXCEEDED");
    expect(getSubmissionById(submissionId)).toMatchObject({ status: "pending", perkAwarded: false });
    expect(getWallet(CUSTOMER, OWNER_BIZ).perks).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("lets the business approve the same submission once the limit allows", async () => {
    fillOwnerLimit();
    expect((await review({ submissionId, decision: "approve" })).status).toBe(403);
    _resetUsage(); // a new month
    const { status, json } = await review({ submissionId, decision: "approve" });
    expect(status).toBe(200);
    expect(json.data.perk.calculation).toMatchObject({ totalValue: 10, baseType: "pct" });
    expect(getWallet(CUSTOMER, OWNER_BIZ).perks).toHaveLength(1);
  });

  it("answers ALREADY_REVIEWED, not the limit, for a submission already approved", async () => {
    expect((await review({ submissionId, decision: "approve" })).status).toBe(200);
    fillOwnerLimit();
    const { status, json } = await review({ submissionId, decision: "approve" });
    expect(status).toBe(400);
    expect(json.error.code).toBe("ALREADY_REVIEWED");
  });

  it("still rejects while the business is at its limit", async () => {
    fillOwnerLimit();
    const { status } = await review({ submissionId, decision: "reject" });
    expect(status).toBe(200);
    expect(getSubmissionById(submissionId)?.status).toBe("rejected");
  });
});
