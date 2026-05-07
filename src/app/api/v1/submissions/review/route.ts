/**
 * POST /api/v1/submissions/review — Approve or reject a submission
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ok,
  err,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import { withTenant, checkResourceAccess } from "../../_tenant";
import { reviewSubmission, calculatePerkValue, getSubmissionById } from "@/lib/submissions";
import { awardPerk } from "@/lib/perk-wallet";
import { signReceipt, type SignedReceipt } from "@/lib/receipts";
import { findAction } from "@/lib/platforms";
import { campaignManager } from "@/lib/campaign-state-machine";
import { validateId, validateString, validateEnum } from "@/lib/security/validate";
import { emailProvider, submissionApprovedEmail, submissionRejectedEmail } from "@/lib/email";
import type { LaunchedCampaign } from "@/lib/types";
import { eventPublisher } from "@/lib/realtime/publisher";
import {
  checkCompletionLimit,
  recordCompletion,
  getBusinessPlan,
  buildPlanLimitError,
} from "@/lib/billing/enforcement";

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth + tenant isolation
  const tenantResult = withTenant(req);
  if (tenantResult instanceof NextResponse) return tenantResult;
  const { tenant } = tenantResult;

  // Rate limit — standard
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // Parse body
  const body = await parseBody<{
    submissionId?: string;
    reviewerId?: string;
    decision?: string;
    note?: string;
    campaign?: LaunchedCampaign;
    followerCount?: number;
    submitterEmail?: string;
    submitterName?: string;
  }>(req);
  if (body instanceof Response) return body;

  // Validate submissionId
  const sv = validateId(body.submissionId);
  if (!sv.success) return err("INVALID_SUBMISSION_ID", sv.error, 400);

  // Validate reviewerId
  const rv = validateId(body.reviewerId);
  if (!rv.success) return err("INVALID_REVIEWER_ID", rv.error, 400);

  // Validate decision
  const dv = validateEnum(body.decision, "decision", ["approve", "reject"] as const);
  if (!dv.success) return err("INVALID_DECISION", dv.error, 400);

  // Optional: validate note
  if (body.note !== undefined) {
    const nv = validateString(body.note, "note", { max: 1000 });
    if (!nv.success) return err("INVALID_NOTE", nv.error, 400);
  }

  // SECURITY: Server-side tenant resolution — never trust body.campaign.
  // Was a bypass: omitting body.campaign skipped the tenant check entirely,
  // letting any auth'd reviewer approve/reject any submission and award
  // themselves perks.
  // Look up the submission, derive its campaignId server-side, then check
  // that the campaign's owning business matches the caller's tenant.
  const existingSubmission = getSubmissionById(sv.data);
  if (!existingSubmission) {
    return err("NOT_FOUND", "Submission not found", 404);
  }
  const campaignLifecycle = campaignManager.getState(existingSubmission.campaignId);
  if (!campaignLifecycle) {
    return err("NOT_FOUND", "Campaign for this submission not found", 404);
  }
  const accessDenied = checkResourceAccess(tenant, campaignLifecycle.businessId);
  if (accessDenied) return accessDenied;

  // Perform the review
  const result = await reviewSubmission(
    sv.data,
    rv.data,
    dv.data as "approve" | "reject",
    body.note
  );

  if (!result.success) {
    const status = result.error!.code === "NOT_FOUND" ? 404 : 400;
    return err(result.error!.code, result.error!.message, status);
  }

  const submission = result.data!;

  // If approving and campaign data is provided, calculate and award perk
  let perk = null;
  let receipt: SignedReceipt | null = null;
  if (dv.data === "approve" && body.campaign) {
    const campaign = body.campaign;
    const followerCount = body.followerCount ?? 0;

    // ── Plan enforcement: completion limit ──────────────────────────────────
    const completionBusinessId = campaign.businessId;
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

    // Calculate perk value using submission engine
    const perkCalc = calculatePerkValue(submission, campaign, followerCount);

    // Record completion in campaign state machine (if tracked)
    const lifecycle = campaignManager.getState(submission.campaignId);
    if (lifecycle && lifecycle.state === "active") {
      try {
        campaignManager.recordCompletion(submission.campaignId);
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
      // Record usage against monthly completion limit
      recordCompletion(completionBusinessId);

      perk = {
        ...awardResult.data,
        calculation: perkCalc,
      };

      // Issue a signed attestation receipt — portable, tamper-evident
      // proof that this submission was approved. Agents on either
      // side can verify it independently via /api/v1/receipts/verify.
      try {
        const actionMeta = findAction(submission.actionId);
        receipt = signReceipt({
          submissionId: submission.id,
          campaignId: submission.campaignId,
          businessId: campaign.businessId,
          submitterUserId: submission.userId ?? null,
          actionId: submission.actionId,
          // Submission doesn't carry platformId; derive from the action
          // registry. Falls back to "unknown" if the action id was somehow
          // accepted but isn't registered (defensive — shouldn't happen).
          platformId: actionMeta?.platformId ?? "unknown",
          proofUrl: submission.proofUrl,
          perkValue: perkCalc.totalValue,
          perkType: perkCalc.baseType,
          approvedAt: submission.reviewedAt ?? new Date().toISOString(),
        });
      } catch (e) {
        // Never let receipt issuance break approval — log and continue.
        console.warn(
          "[Receipts] Failed to issue receipt:",
          e instanceof Error ? e.message : e
        );
      }
    }
  }

  // Fire-and-forget notification email to submitter (if email available)
  if (body.submitterEmail) {
    const recipientName = body.submitterName || "there";
    const campaignName = body.campaign?.name || "your campaign";

    if (dv.data === "approve") {
      const perkDisplay = perk?.calculation
        ? `$${perk.calculation.totalValue.toFixed(2)}`
        : "a perk";
      const template = submissionApprovedEmail(recipientName, campaignName, perkDisplay);
      emailProvider.send({ to: body.submitterEmail, ...template }).catch((e: unknown) => console.error("[Email] Submission notification failed:", e instanceof Error ? e.message : e));
    } else {
      const template = submissionRejectedEmail(recipientName, campaignName, body.note ?? undefined);
      emailProvider.send({ to: body.submitterEmail, ...template }).catch((e: unknown) => console.error("[Email] Submission notification failed:", e instanceof Error ? e.message : e));
    }
  }

  const eventType = dv.data === "approve" ? "submission.approved" : "submission.rejected";
  const reviewBusinessId = campaignManager.getState(submission.campaignId)?.businessId;
  eventPublisher.publish(eventType, { submissionId: sv.data, decision: dv.data }, reviewBusinessId);

  return ok({
    submission,
    perk,
    receipt,
  });
});
