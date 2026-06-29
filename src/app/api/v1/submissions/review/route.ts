/**
 * POST /api/v1/submissions/review — Approve or reject a submission
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ok,
  err,
  rateLimit,
  requireCsrf,
  parseBody,
  withTiming,
} from "../../_shared";
import { withTenant, checkResourceAccess } from "../../_tenant";
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

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth + tenant isolation
  const tenantResult = withTenant(req);
  if (tenantResult instanceof NextResponse) return tenantResult;
  const { tenant } = tenantResult;

  // Rate limit — standard
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // CSRF — enforce on mutating routes (PR: live audit found bypass)
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

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

  // SECURITY: reviewerId is always the authenticated user. Previously
  // the route trusted body.reviewerId — any caller could review a
  // submission as another business by forging that field. Also a UX
  // bug: clients had to know + send their own id, which led to the
  // dashboard's Approve button 400ing with INVALID_REVIEWER_ID when
  // it wasn't included.
  const rv = { success: true as const, data: tenantResult.user.id, error: undefined };

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
  const accessDenied = checkResourceAccess(tenant, campaignLifecycle.businessId);
  if (accessDenied) return accessDenied;

  // Resolve the campaign server-side from the durable lifecycle so the perk
  // award + notification email fire regardless of whether the caller sent
  // body.campaign. The admin console (and any minimal client) only sends
  // { submissionId, decision, note }; the old code gated awardPerk on
  // body.campaign, so Approve silently awarded nothing and sent no email —
  // the core loop dead-ended after approval. calculatePerkValue only reads
  // discountValue/discountType/useTiers; the remaining fields are filled from
  // the lifecycle (or safe defaults) so the LaunchedCampaign shape is honest.
  const resolvedCampaign: LaunchedCampaign = body.campaign ?? {
    id: campaignLifecycle.id,
    businessId: campaignLifecycle.businessId,
    name: campaignLifecycle.name ?? "your campaign",
    description: "",
    actions: campaignLifecycle.actions ?? [],
    discountValue: campaignLifecycle.budget.allocated,
    discountType: campaignLifecycle.budget.type,
    expiresInDays: 0,
    // Lifecycle doesn't carry the follower-tier flag; default off so the base
    // perk is awarded. A client that wants tier bonuses can still pass
    // body.campaign with useTiers + body.followerCount.
    useTiers: false,
    status: "active",
    createdAt: campaignLifecycle.expiry.launchedAt,
  };

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

  // If approving, calculate and award the perk using the server-resolved
  // campaign (above). Fires for every approval, not just ones where the
  // caller happened to send body.campaign.
  let perk = null;
  if (dv.data === "approve") {
    const campaign = resolvedCampaign;
    const followerCount = body.followerCount ?? 0;

    // ── Plan enforcement: completion limit ──────────────────────────────────
    const completionBusinessId = campaign.businessId;
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

    // Calculate perk value using submission engine
    const perkCalc = calculatePerkValue(submission, campaign, followerCount);

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

  // Fire-and-forget notification email to submitter. The recipient is resolved
  // from the request OR the submission's stored metadata — the public /c submit
  // persists { email, name } there (submissions/public/route.ts), so the
  // "your perk is ready" email fires regardless of what the reviewing client
  // sends. Previously gating on body.submitterEmail meant the customer was
  // never told their perk was approved.
  const submitterEmail =
    body.submitterEmail ??
    (typeof submission.metadata.email === "string" ? submission.metadata.email : undefined);
  const submitterName =
    body.submitterName ??
    (typeof submission.metadata.name === "string" ? submission.metadata.name : undefined);
  if (submitterEmail) {
    const recipientName = submitterName || "there";
    const campaignName = body.campaign?.name || resolvedCampaign.name || "your campaign";

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
      const template = submissionRejectedEmail(recipientName, campaignName, body.note ?? undefined);
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
