/**
 * The founder may review any business's submission (Ben, 2026-11-26).
 *
 * The founder is an admin with no business of their own: the same account
 * GET /api/v1/submissions lists every submission to, which is the list the
 * founder console's Approve and Reject buttons sit on. Until now the review
 * route refused that account with 403 NO_TENANT, because it needed the
 * caller's business before anything else.
 *
 * A founder review is booked exactly like the business's own: the perk, the
 * wallet, the monthly completion limit and the email all come from the
 * submission's stored campaign. It is also written to the audit log as
 * `admin.submission.reviewed`. Everyone else is unchanged: a business, or an
 * admin with a business of its own, reviews only its own campaigns'
 * submissions, and an account with no business that is not an admin is
 * refused.
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
import { _peekRecentAuditEntries, _resetAuditLog } from "@/lib/audit-log";

const OWNER_BIZ = "biz_test_owner";
const OTHER_BIZ = "biz_test_other";
const CAMPAIGN = "camp_test_owner";
const CUSTOMER = "usr_test_customer";
const CUSTOMER_EMAIL = "sam.sample@example.test";

/** The free plan's monthly completion limit (PLAN_LIMITS.free). */
const FREE_COMPLETIONS = 50;

interface Caller {
  sub: string;
  role: string;
  email: string;
  businessId: string | null;
}

/** The founder: an admin with no business of their own. */
const FOUNDER: Caller = { sub: "usr_test_founder", role: "admin", email: "founder@example.test", businessId: null };
/** The business that owns the campaign. */
const OWNER: Caller = { sub: "usr_test_owner", role: "business", email: "owner@example.test", businessId: OWNER_BIZ };
/** An admin who has a business of their own: another one. */
const ADMIN_WITH_BUSINESS: Caller = {
  sub: "usr_test_other_admin",
  role: "admin",
  email: "other.admin@example.test",
  businessId: OTHER_BIZ,
};
/** A signed-in account with no business that is not an admin. */
const INFLUENCER: Caller = { sub: "usr_test_influencer", role: "influencer", email: "creator@example.test", businessId: null };

let ipCounter = 0;

async function review(caller: Caller, body: Record<string, unknown>, { csrf = true } = {}) {
  ipCounter += 1;
  const token = signJWT({ ...caller, type: "access" });
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "x-nf-client-connection-ip": `10.8.0.${ipCounter}`,
  };
  if (csrf) headers["x-csrf-token"] = generateCsrfToken(caller.sub);
  const res = await POST(
    new NextRequest("http://localhost/api/v1/submissions/review", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, json: await res.json() };
}

const adminReviews = () => _peekRecentAuditEntries().filter((e) => e.action === "admin.submission.reviewed");

let submissionId: string;
let sent: EmailMessage[];

beforeEach(() => {
  campaignManager._reset();
  clearSubmissions();
  clearWallets();
  _resetUsage();
  _resetAuditLog();
  // 10% off, on the free plan.
  campaignManager.launch(CAMPAIGN, OWNER_BIZ, {
    name: "Owner test campaign",
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

describe("POST /api/v1/submissions/review — the founder", () => {
  it("approves a business's submission, booked to that business as if it had approved it", async () => {
    const { status, json } = await review(FOUNDER, { submissionId, decision: "approve" });

    expect(status).toBe(200);
    expect(json.data.submission).toMatchObject({ status: "approved", reviewedBy: "usr_test_founder" });
    expect(json.data.perk.calculation).toMatchObject({ baseValue: 10, baseType: "pct", totalValue: 10 });
    expect(getWallet(CUSTOMER, OWNER_BIZ).perks).toHaveLength(1);
    expect(getUsageSummary(OWNER_BIZ).completions.used).toBe(1);
    expect(sent.map((m) => m.to)).toEqual([CUSTOMER_EMAIL]);
  });

  it("rejects one and saves the reason", async () => {
    const { status } = await review(FOUNDER, {
      submissionId,
      decision: "reject",
      reason: "The proof link shows no tag",
    });

    expect(status).toBe(200);
    expect(getSubmissionById(submissionId)).toMatchObject({
      status: "rejected",
      reviewedBy: "usr_test_founder",
      reviewNote: "The proof link shows no tag",
    });
    expect(getWallet(CUSTOMER, OWNER_BIZ).perks).toHaveLength(0);
    expect(getUsageSummary(OWNER_BIZ).completions.used).toBe(0);
  });

  it("is held to the business's monthly completion limit, as the business is", async () => {
    for (let i = 0; i < FREE_COMPLETIONS; i++) recordCompletion(OWNER_BIZ);

    const { status, json } = await review(FOUNDER, { submissionId, decision: "approve" });

    expect(status).toBe(403);
    expect(json.error.code).toBe("PLAN_LIMIT_EXCEEDED");
    expect(getSubmissionById(submissionId)?.status).toBe("pending");
  });

  it("writes the review to the audit log, naming the founder, the business and the decision", async () => {
    await review(FOUNDER, { submissionId, decision: "approve" });

    expect(adminReviews()).toEqual([
      expect.objectContaining({
        actor: "user:usr_test_founder",
        businessId: OWNER_BIZ,
        resourceId: `submission:${submissionId}`,
        ok: true,
        meta: { decision: "approve", campaignId: CAMPAIGN },
      }),
    ]);
  });

  it("still needs the CSRF token", async () => {
    const { status, json } = await review(FOUNDER, { submissionId, decision: "approve" }, { csrf: false });

    expect(status).toBe(403);
    expect(json.error.code).toBe("CSRF_TOKEN_MISSING");
    expect(getSubmissionById(submissionId)?.status).toBe("pending");
  });
});

describe("POST /api/v1/submissions/review — everyone else is unchanged", () => {
  it("the business approves its own submission, and that is not an admin review", async () => {
    const { status } = await review(OWNER, { submissionId, decision: "approve" });

    expect(status).toBe(200);
    expect(getSubmissionById(submissionId)?.reviewedBy).toBe("usr_test_owner");
    expect(adminReviews()).toEqual([]);
  });

  it("an admin with a business of its own reviews only that business's submissions", async () => {
    const { status, json } = await review(ADMIN_WITH_BUSINESS, { submissionId, decision: "approve" });

    expect(status).toBe(403);
    expect(json.error.code).toBe("TENANT_ACCESS_DENIED");
    expect(getSubmissionById(submissionId)?.status).toBe("pending");
  });

  it("an account with no business that is not an admin is refused", async () => {
    const { status, json } = await review(INFLUENCER, { submissionId, decision: "approve" });

    expect(status).toBe(403);
    expect(json.error.code).toBe("NO_TENANT");
    expect(getSubmissionById(submissionId)?.status).toBe("pending");
  });
});
