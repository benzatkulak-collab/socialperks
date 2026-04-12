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
  requireCsrf,
  rateLimit,
  parseBody,
  getQuery,
  paginate,
  withTiming,
} from "../_shared";
import { withIdempotency } from "@/lib/api/idempotency";
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
import { logError } from "@/lib/logging";

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

  let result;

  if (tenantCampaignIds) {
    // When tenant-scoping is needed, fetch ALL matching submissions first
    // (without pagination), filter by tenant's campaigns, then paginate.
    const allResults = getSubmissions(filters, 1, 50_000);
    const filtered = allResults.submissions.filter((s) =>
      tenantCampaignIds!.has(s.campaignId)
    );

    const total = filtered.length;
    const safePage = Math.max(1, page);
    const safePerPage = Math.min(100, Math.max(1, perPage));
    const offset = (safePage - 1) * safePerPage;
    const paginated = filtered.slice(offset, offset + safePerPage);

    result = {
      submissions: paginated,
      total,
      page: safePage,
      perPage: safePerPage,
      totalPages: Math.ceil(total / safePerPage),
    };
  } else {
    result = getSubmissions(filters, page, perPage);
  }

  return ok({
    submissions: result.submissions,
    pagination: {
      total: result.total,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
    },
  });
});

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(withIdempotency(async (req: NextRequest) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // CSRF protection
  const csrfError = requireCsrf(req, user);
  if (csrfError) return csrfError;

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

  // Validate userId
  const uv = validateId(body.userId);
  if (!uv.success) return err("INVALID_USER_ID", uv.error, 400);

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
      .catch((urlError) => {
        logError(urlError, { method: "POST", path: "/api/v1/submissions", userId: user.id, submissionId, context: "url_verification" });
      });
  }

  const campaignBusinessId = campaignManager.getState(cv.data)?.businessId;
  eventPublisher.publish("submission.created", { submissionId: result.data!.id, campaignId: cv.data }, campaignBusinessId);

  // Record usage: submission received against the campaign owner's tenant
  if (campaignBusinessId) {
    recordUsage(campaignBusinessId, "submissions_received");
  }

  return ok({ submission: result.data }, 201);
}));
