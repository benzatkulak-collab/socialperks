/**
 * The realtime events a submission publishes name its campaign, as the server
 * stores it. The business's bell shows them: without the name it could only
 * say "New submission for a campaign".
 *
 * All ids, names and emails here are made up.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as submit } from "../route";
import { POST as review } from "../review/route";
import { signJWT } from "@/lib/auth";
import { generateCsrfToken } from "@/lib/security/csrf";
import { campaignManager } from "@/lib/campaign-state-machine";
import { createSubmission, clearStore as clearSubmissions } from "@/lib/submissions";
import { clearStore as clearWallets } from "@/lib/perk-wallet";
import { _resetUsage } from "@/lib/billing/enforcement";
import { emailProvider } from "@/lib/email";
import { eventPublisher, type PublishedEvent } from "@/lib/realtime/publisher";

const OWNER_BIZ = "biz_test_events";
const CAMPAIGN = "camp_test_events";
const CAMPAIGN_NAME = "Test Latte Week";
const OWNER = "usr_test_events_owner";
const CUSTOMER = "usr_test_events_customer";

let ip = 0;
function post(path: string, userId: string, role: string, businessId: string | null, body: unknown): NextRequest {
  ip += 1;
  const token = signJWT({ sub: userId, role, email: `${userId}@example.test`, businessId, type: "access" });
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "x-csrf-token": generateCsrfToken(userId),
      "content-type": "application/json",
      "x-nf-client-connection-ip": `10.8.0.${ip}`,
    },
    body: JSON.stringify(body),
  });
}

let published: PublishedEvent[];
let unsubscribe: () => void;

beforeEach(() => {
  campaignManager._reset();
  clearSubmissions();
  clearWallets();
  _resetUsage();
  campaignManager.launch(CAMPAIGN, OWNER_BIZ, {
    name: CAMPAIGN_NAME,
    budgetAllocated: 10,
    budgetType: "pct",
    maxCompletions: null,
    expiresInDays: 30,
    actions: ["ig_st"],
  });
  vi.spyOn(emailProvider, "send").mockResolvedValue({ success: true, messageId: "msg_test" });
  published = [];
  unsubscribe = eventPublisher.subscribe((event) => published.push(event));
});

afterEach(() => {
  unsubscribe();
  vi.restoreAllMocks();
});

describe("realtime events from submissions", () => {
  it("a new submission's event names its campaign, for the campaign's business", async () => {
    const res = await submit(
      post("/api/v1/submissions", CUSTOMER, "influencer", null, {
        campaignId: CAMPAIGN,
        actionId: "ig_st",
        proofUrl: "https://www.instagram.com/stories/example.test/0000000001/",
        proofType: "url",
      }),
    );
    expect(res.status).toBeLessThan(300);
    const event = published.find((e) => e.type === "submission.created");
    expect(event).toMatchObject({
      businessId: OWNER_BIZ,
      data: { campaignId: CAMPAIGN, campaignName: CAMPAIGN_NAME },
    });
  });

  it("an approval's event names the campaign", async () => {
    const created = createSubmission(CAMPAIGN, CUSTOMER, "ig_st", "https://example.test/proof", "url", {});
    if (!created.success || !created.data) throw new Error("fixture submission failed");
    const res = await review(
      post("/api/v1/submissions/review", OWNER, "business", OWNER_BIZ, { submissionId: created.data.id, decision: "approve" }),
    );
    expect(res.status).toBe(200);
    const event = published.find((e) => e.type === "submission.approved");
    expect(event).toMatchObject({
      businessId: OWNER_BIZ,
      data: { submissionId: created.data.id, decision: "approve", campaignName: CAMPAIGN_NAME },
    });
  });
});
