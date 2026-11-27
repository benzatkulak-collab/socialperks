/**
 * POST /api/v1/submissions/review — Approve or reject a submission
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ok,
  err,
  getUser,
  rateLimit,
  requireCsrf,
  parseBody,
  withTiming,
  type AuthUser,
} from "../../_shared";
import { withTenant, checkResourceAccess } from "../../_tenant";
import type { TenantContext } from "@/lib/multi-tenant/isolation";
import { audit } from "@/lib/audit-log";
import { reviewSubmission, calculatePerkValue, getSubmissionById, hydrateSubmissions } from "@/lib/submissions";
import { awardPerk, persistPerk } from "@/lib/perk-wallet";
import { campaignManager } from "@/lib/campaign-state-machine";
import { ensureCampaignLoaded, persistLifecycle } from "@/lib/campaign-state-machine/persist";
import { validateId, validateString, validateEnum } from "@/lib/security/validate";
import { emailProvider, submissionApprovedEmail, submissionRejectedEmail } from "@/lib/email";
import { perkLinkUrl } from "@/lib/security/perk-link";
import type { LaunchedCampaign } from "@/lib/types";
import { eventPublisher } from "@/lib/realtime/publisher";
import {
  checkCompletionLimit,
  recordCompletion,
  getBusinessPlan,
  buildPlanLimitError,
} from "@/lib/billing/enforcement";
import { hydrateSubscriptions } from "@/lib/billing/store";

// ─── Who reviews ────────────────────────────────────────────────────────────

/**
 * The caller, and the business they review for.
 *
 * - The founder, an admin with no business of their own, may review any
 *   business's submission (Ben, 2026-11-26). GET /api/v1/submissions lists
 *   every submission to that account, and the founder console's Approve and
 *   Reject buttons act on that list. `tenant` is null for the founder.
 * - Anyone else needs a business (403 NO_TENANT without one) and reviews
 *   only submissions on its own business's campaigns. An admin with a
 *   business of its own counts as that business here, as in
 *   GET /api/v1/submissions.
 */
function reviewerOf(req: NextRequest): { user: AuthUser; tenant: TenantContext | null } | NextResponse {
  const user = getUser(req);
  if (user && user.role === "admin" && !user.businessId) return { user, tenant: null };
  return withTenant(req);
}

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth + tenant isolation: the founder, or a business (see reviewerOf).
  const reviewer = reviewerOf(req);
  if (reviewer instanceof NextResponse) return reviewer;
  const { tenant } = reviewer;

  // Rate limit — standard
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // CSRF — enforce on mutating routes (PR: live audit found bypass)
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

  // Parse body. Besides the submission id, only the decision and the
  // reviewer's note come from the caller. The campaign is never read from the
  // body (an approval is priced, booked and counted from the submission's own
  // stored campaign, see resolvedCampaign below), and neither is the email
  // recipient (see submitterEmail below). A `campaign`, `followerCount`,
  // `submitterEmail` or `submitterName` field a client still sends is ignored.
  const body = await parseBody<{
    submissionId?: string;
    reviewerId?: string;
    decision?: string;
    note?: string;
    /** The published name (OpenAPI, the MCP reviewSubmission tool) for `note`. */
    reason?: string;
  }>(req);
  if (body instanceof Response) return body;

  // Validate submissionId
  const sv = validateId(body.submissionId);
  if (!sv.success) return err("INVALID_SUBMISSION_ID", sv.error, 400);

  // SECURITY: reviewerId is always the authenticated user. Previously
  // the route trusted body.reviewerId — any caller could review a
  // submission as another business by forging that field. Also a UX
  // bug: clients had to know + send their own id, which led to the
  // dashboard's Approve button 400ing with INVALID_REVIEWER_ID when
  // it wasn't included.
  const rv = { success: true as const, data: reviewer.user.id, error: undefined };

  // Validate decision
  const dv = validateEnum(body.decision, "decision", ["approve", "reject"] as const);
  if (!dv.success) return err("INVALID_DECISION", dv.error, 400);

  // Optional: validate note. The founder console sends it as `note`; the
  // OpenAPI spec and the MCP tool call it `reason`.
  const note = body.note ?? body.reason;
  if (note !== undefined) {
    const nv = validateString(note, "note", { max: 1000 });
    if (!nv.success) return err("INVALID_NOTE", nv.error, 400);
  }

  // SECURITY: Server-side tenant resolution — never trust body.campaign.
  // Was a bypass: omitting body.campaign skipped the tenant check entirely,
  // letting any auth'd reviewer approve/reject any submission and award
  // themselves perks.
  // Look up the submission, derive its campaignId server-side, then check
  // that the campaign's owning business matches the caller's tenant.
  // Cold-start: rehydrate so a pre-deploy submission isn't a phantom 404.
  await hydrateSubmissions();
  const existingSubmission = getSubmissionById(sv.data);
  if (!existingSubmission) {
    return err("NOT_FOUND", "Submission not found", 404);
  }
  // Cold-start: load the campaign from durable storage if the manager was wiped.
  const campaignLifecycle = await ensureCampaignLoaded(existingSubmission.campaignId);
  if (!campaignLifecycle) {
    return err("NOT_FOUND", "Campaign for this submission not found", 404);
  }
  // A business reviews only its own campaigns' submissions; the founder
  // (no tenant) any business's.
  if (tenant) {
    const accessDenied = checkResourceAccess(tenant, campaignLifecycle.businessId);
    if (accessDenied) return accessDenied;
  }

  // Resolve the campaign server-side from the durable lifecycle, and ONLY from
  // there: it is the submission's own campaign, the one a business's tenant
  // check above just passed. It decides
  // the perk's value and type, the business whose wallet the perk lands in,
  // the business whose monthly completion limit is checked and counted, and
  // the campaign name in the customer's email. Nothing in the request body
  // changes any of them. calculatePerkValue only reads
  // discountValue/discountType/useTiers; the remaining fields are filled from
  // the lifecycle (or safe defaults) so the LaunchedCampaign shape is honest.
  const resolvedCampaign: LaunchedCampaign = {
    id: campaignLifecycle.id,
    businessId: campaignLifecycle.businessId,
    name: campaignLifecycle.name ?? "your campaign",
    description: "",
    actions: campaignLifecycle.actions ?? [],
    discountValue: campaignLifecycle.budget.allocated,
    discountType: campaignLifecycle.budget.type,
    expiresInDays: 0,
    // The lifecycle doesn't carry a follower-tier flag, so every approval
    // earns the base perk. A tier bonus would need the flag (and a follower
    // count the server trusts) stored with the campaign.
    useTiers: false,
    status: "active",
    createdAt: campaignLifecycle.expiry.launchedAt,
  };

  // ── Plan enforcement: completion limit ────────────────────────────────────
  // Checked BEFORE the review is recorded, so an approval the plan refuses
  // leaves the submission pending (no perk, no email) and the business can
  // approve it once the limit allows: next month, or after an upgrade. A
  // submission that is no longer pending skips the check, so reviewing it
  // again still answers ALREADY_REVIEWED. A rejection uses no completion.
  const completionBusinessId = resolvedCampaign.businessId;
  if (dv.data === "approve" && existingSubmission.status === "pending") {
    await hydrateSubscriptions(); // cold-start: read the real plan, not "free"
    const completionPlan = getBusinessPlan(completionBusinessId);
    const completionCheck = checkCompletionLimit(completionBusinessId, completionPlan);
    if (!completionCheck.allowed) {
      const planLabel = completionPlan.charAt(0).toUpperCase() + completionPlan.slice(1);
      const body403 = buildPlanLimitError(
        `${planLabel} plan allows ${completionCheck.limit} completion${completionCheck.limit === 1 ? "" : "s"} per month. Upgrade for more.`,
        completionCheck.limit,
        completionCheck.current,
        completionPlan
      );
      return NextResponse.json(body403, { status: 403 });
    }
  }

  // Perform the review
  const result = await reviewSubmission(
    sv.data,
    rv.data,
    dv.data as "approve" | "reject",
    note
  );

  if (!result.success) {
    const status = result.error!.code === "NOT_FOUND" ? 404 : 400;
    return err(result.error!.code, result.error!.message, status);
  }

  const submission = result.data!;

  // A founder review goes to the audit log, naming the business it was for.
  // (A business's own review is recorded by the submission's reviewedBy.)
  if (!tenant) {
    audit({
      action: "admin.submission.reviewed",
      actor: `user:${reviewer.user.id}`,
      businessId: campaignLifecycle.businessId,
      resourceId: `submission:${submission.id}`,
      ok: true,
      meta: { decision: dv.data, campaignId: submission.campaignId },
    });
  }

  // If approving, calculate and award the perk using the server-resolved
  // campaign (above).
  let perk = null;
  if (dv.data === "approve") {
    const campaign = resolvedCampaign;

    // Calculate perk value using submission engine (base perk: no tier flag
    // is stored with the campaign, so no follower count is needed).
    const perkCalc = calculatePerkValue(submission, campaign);

    // Record completion in campaign state machine (if tracked)
    const lifecycle = campaignManager.getState(submission.campaignId);
    if (lifecycle && lifecycle.state === "active") {
      try {
        const after = campaignManager.recordCompletion(submission.campaignId);
        // Persist the incremented completion count (and any auto-end) durably.
        void persistLifecycle(after.lifecycle);
      } catch (e) {
        console.warn(`[Campaign] Failed to record completion for campaign ${submission.campaignId}:`, e instanceof Error ? e.message : e);
      }
    }

    // Award the perk to the user's wallet
    const awardResult = awardPerk(
      submission.userId,
      campaign.businessId,
      submission.campaignId,
      submission.id,
      perkCalc.totalValue,
      perkCalc.baseType,
    );

    if (awardResult.success) {
      // Persist the earned perk durably so it survives serverless cold starts
      // (the in-memory cache write inside awardPerk already succeeded).
      if (awardResult.data) {
        await persistPerk(awardResult.data, submission.userId, campaign.businessId);
      }

      // Record usage against monthly completion limit
      recordCompletion(completionBusinessId);

      perk = {
        ...awardResult.data,
        calculation: perkCalc,
      };
    }
  }

  // Fire-and-forget notification email to submitter. The recipient and the
  // greeting come ONLY from the submission's stored metadata: the public /c
  // submit persists { email, name } there (submissions/public/route.ts), so the
  // "your perk is ready" email fires without the reviewing client sending
  // anything. The approval email carries the customer's perk link, so it goes
  // only to the address the customer gave, never to one in the request.
  const submitterEmail =
    typeof submission.metadata.email === "string" ? submission.metadata.email : undefined;
  const submitterName =
    typeof submission.metadata.name === "string" ? submission.metadata.name : undefined;
  if (submitterEmail) {
    const recipientName = submitterName || "there";
    const campaignName = resolvedCampaign.name || "your campaign";

    if (dv.data === "approve") {
      const perkDisplay = perk?.calculation
        ? `$${perk.calculation.totalValue.toFixed(2)}`
        : "a perk";
      // Magic link to the customer's perk page — they have no account, so this
      // signed token is the only way they can see and redeem their reward.
      const template = submissionApprovedEmail(
        recipientName,
        campaignName,
        perkDisplay,
        perkLinkUrl(submission.userId)
      );
      emailProvider.send({ to: submitterEmail, ...template }).catch((e: unknown) => console.error("[Email] Submission notification failed:", e instanceof Error ? e.message : e));
    } else {
      const template = submissionRejectedEmail(recipientName, campaignName, note);
      emailProvider.send({ to: submitterEmail, ...template }).catch((e: unknown) => console.error("[Email] Submission notification failed:", e instanceof Error ? e.message : e));
    }
  }

  const eventType = dv.data === "approve" ? "submission.approved" : "submission.rejected";
  const reviewBusinessId = campaignManager.getState(submission.campaignId)?.businessId;
  eventPublisher.publish(eventType, { submissionId: sv.data, decision: dv.data }, reviewBusinessId);

  return ok({
    submission,
    perk,
  });
});
