/**
 * GET  /api/v1/submissions — List submissions (filterable, paginated)
 * POST /api/v1/submissions — Create a new submission with proof
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  getQuery,
  paginate,
  withTiming,
} from "../_shared";
import { withTenant } from "../_tenant";
import { recordUsage } from "@/lib/multi-tenant/isolation";
import { createSubmission, getSubmissions, getSubmissionById } from "@/lib/submissions";
import type { SubmissionFilters } from "@/lib/submissions";
import type { ProofType, SubmissionStatus } from "@/lib/types";
import { validateId, validateString, validateEnum } from "@/lib/security/validate";
import { checkProofUrl } from "@/lib/verification/url-checker";
import { findAction } from "@/lib/platforms";
import { campaignManager } from "@/lib/campaign-state-machine";
import { eventPublisher } from "@/lib/realtime/publisher";

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  // Rate limit — relaxed for read-only listing
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const params = getQuery(req);
  const { page, perPage } = paginate(params);

  // ── Tenant isolation: scope to authenticated tenant's campaigns ────────
  const tenantResult = withTenant(req);
  const tenantBusinessId = !(tenantResult instanceof NextResponse)
    ? tenantResult.tenant.tenantId
    : null;

  // Build filters from query params
  const filters: SubmissionFilters = {};

  const campaignId = params.get("campaignId");
  if (campaignId) {
    const v = validateId(campaignId);
    if (!v.success) return err("INVALID_CAMPAIGN_ID", v.error, 400);

    // If authenticated, verify the campaign belongs to the tenant
    if (tenantBusinessId) {
      const campaign = campaignManager.getState(v.data);
      if (campaign && campaign.businessId !== tenantBusinessId) {
        return err("TENANT_ACCESS_DENIED", "Cannot access submissions for another business's campaign", 403);
      }
    }

    filters.campaignId = v.data;
  }

  const businessId = params.get("businessId");
  if (businessId) {
    const v = validateId(businessId);
    if (!v.success) return err("INVALID_BUSINESS_ID", v.error, 400);

    // Enforce: authenticated tenants can only query their own business
    if (tenantBusinessId && tenantBusinessId !== v.data) {
      return err("TENANT_ACCESS_DENIED", "Cannot access submissions for another business", 403);
    }
  }

  // If tenant is authenticated and no campaign/business filter was given,
  // scope submissions to campaigns owned by this tenant by collecting
  // the tenant's campaign IDs and filtering post-query.
  let tenantCampaignIds: Set<string> | null = null;
  if (tenantBusinessId && !campaignId && !businessId) {
    const tenantCampaigns = campaignManager.listByBusiness(tenantBusinessId);
    tenantCampaignIds = new Set(tenantCampaigns.map((c) => c.id));
  }

  const userId = params.get("userId");
  if (userId) {
    const v = validateId(userId);
    if (!v.success) return err("INVALID_USER_ID", v.error, 400);
    filters.userId = v.data;
  }

  const status = params.get("status");
  if (status) {
    const v = validateEnum(status, "status", ["pending", "approved", "rejected", "expired"] as const);
    if (!v.success) return err("INVALID_STATUS", v.error, 400);
    filters.status = v.data as SubmissionStatus;
  }

  const actionId = params.get("actionId");
  if (actionId) {
    const v = validateId(actionId);
    if (!v.success) return err("INVALID_ACTION_ID", v.error, 400);
    filters.actionId = v.data;
  }

  let result = getSubmissions(filters, page, perPage);

  // Post-filter: scope to tenant's campaigns if needed
  if (tenantCampaignIds) {
    const filtered = result.submissions.filter((s) =>
      tenantCampaignIds!.has(s.campaignId)
    );
    result = {
      ...result,
      submissions: filtered,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / perPage),
    };
  }

  return ok({
    submissions: result.submissions,
    total: result.total,
    page: result.page,
    perPage: result.perPage,
    totalPages: result.totalPages,
  });
});

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Rate limit — standard for writes
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // Parse body
  const body = await parseBody<{
    campaignId?: string;
    userId?: string;
    actionId?: string;
    proofUrl?: string;
    proofType?: string;
    metadata?: Record<string, unknown>;
  }>(req);
  if (body instanceof Response) return body;

  // Validate campaignId
  const cv = validateId(body.campaignId);
  if (!cv.success) return err("INVALID_CAMPAIGN_ID", cv.error, 400);

  // SECURITY: Force userId from authenticated user — never trust body.userId.
  // Was an impersonation vector: any auth'd caller could submit on behalf
  // of any other user by forging the userId field.
  const uv = { success: true, data: user.id, error: undefined } as const;

  // Validate actionId
  const av = validateId(body.actionId);
  if (!av.success) return err("INVALID_ACTION_ID", av.error, 400);

  // Validate proofUrl
  const pv = validateString(body.proofUrl, "proofUrl", { min: 1, max: 2048 });
  if (!pv.success) return err("INVALID_PROOF_URL", pv.error, 400);

  // Validate proofType
  const pt = validateEnum(body.proofType, "proofType", ["screenshot", "url", "video", "api_verified"] as const);
  if (!pt.success) return err("INVALID_PROOF_TYPE", pt.error, 400);

  // Create submission via the submissions engine
  const result = createSubmission(
    cv.data,
    uv.data,
    av.data,
    pv.data,
    pt.data as ProofType,
    body.metadata ?? {}
  );

  if (!result.success) {
    return err(result.error!.code, result.error!.message, 400);
  }

  // Fire-and-forget: run URL verification in the background.
  // The response is returned immediately — the check result is stored
  // on the submission's metadata for later review.
  if (result.data && pt.data === "url") {
    const submissionId = result.data.id;
    const proofUrl = pv.data;
    const action = findAction(av.data);
    const platformId = action?.platformId ?? "";

    checkProofUrl(proofUrl, platformId)
      .then((urlCheck) => {
        const sub = getSubmissionById(submissionId);
        if (sub) {
          sub.metadata = {
            ...sub.metadata,
            urlVerification: urlCheck,
          };
        }
      })
      .catch(() => {
        // Silently swallow — URL check failure should never break submission flow
      });
  }

  const campaignBusinessId = campaignManager.getState(cv.data)?.businessId;
  eventPublisher.publish("submission.created", { submissionId: result.data!.id, campaignId: cv.data }, campaignBusinessId);

  // Record usage: submission received against the campaign owner's tenant
  if (campaignBusinessId) {
    recordUsage(campaignBusinessId, "submissions_received");
  }

  // First-submission notification: tell the business owner that their
  // campaign got its first real customer post. Strong activation signal —
  // the difference between "I set up Social Perks" and "Social Perks is
  // working." Fires once per campaign (subsequent submissions don't
  // trigger; we don't want to spam).
  if (campaignBusinessId) {
    void notifyFirstSubmission(cv.data, campaignBusinessId).catch((e) => {
      console.error("[submissions] first-submission notify failed:", e instanceof Error ? e.message : e);
    });
  }

  return ok({ submission: result.data }, 201);
});

// ─── First-submission notifier ──────────────────────────────────────────────

/**
 * Called once per campaign — when the FIRST submission lands. Sends a
 * "your campaign got its first scan!" notification via the business's
 * preferred channel. Idempotent via the in-memory firedFor set; once
 * the DATABASE_URL switch is flipped this should be backed by a column
 * on the campaign for cross-instance idempotency.
 */
const _firstNotifyFiredFor = new Set<string>();

async function notifyFirstSubmission(campaignId: string, businessId: string): Promise<void> {
  if (_firstNotifyFiredFor.has(campaignId)) return;
  _firstNotifyFiredFor.add(campaignId);

  // Best-effort: only fire if this really was the first submission.
  // Race condition is acceptable (worst case: extra notification on
  // simultaneous first submissions).
  const lifecycle = campaignManager.getState(campaignId);
  const completionsField = lifecycle?.completions;
  const completionCount =
    typeof completionsField === "number"
      ? completionsField
      : (completionsField as { total?: number } | undefined)?.total ?? 0;
  if (completionCount > 1) return;

  // Look up business contact info. If we have a phone number registered
  // for SMS, use that; otherwise fall back to email via the queue.
  try {
    const { businessRepo } = await import("@/lib/db/repositories");
    const business = await businessRepo.findById(businessId);
    if (!business) return;
    const campaignName = "your campaign";
    const message = `🎉 Your Social Perks campaign "${campaignName}" just got its first customer post! Check the dashboard: https://${process.env.NEXT_PUBLIC_SITE_URL ?? "socialperks.io"}/dashboard`;
    if (business.email) {
      const { emailQueue } = await import("@/lib/jobs/registry");
      emailQueue.add({
        type: "transactional",
        to: business.email,
        subject: "🎉 Your campaign just got its first customer post",
        html: `<p>${message.replace(/\n/g, "<br>")}</p>`,
        text: message,
      });
    }
  } catch (e) {
    // Notification path is non-critical — never let it fail the submission.
    console.error("[submissions] first-notify lookup failed:", e instanceof Error ? e.message : e);
  }
}
