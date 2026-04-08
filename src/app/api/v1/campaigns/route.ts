/**
 * GET  /api/v1/campaigns — List campaigns (filterable, paginated)
 * POST /api/v1/campaigns — Create & launch a new campaign
 * PUT  /api/v1/campaigns — Update campaign fields or lifecycle (pause/resume/end)
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
import { withTenant, checkResourceAccess } from "../_tenant";
import { recordUsage } from "@/lib/multi-tenant/isolation";
import { campaignManager } from "@/lib/campaign-state-machine";
import type { CampaignState, CampaignLifecycle } from "@/lib/campaign-state-machine";
import { validateId, validateString, validateNumber, validateEnum } from "@/lib/security/validate";
import { eventPublisher } from "@/lib/realtime/publisher";
import {
  checkCampaignLimit,
  getBusinessPlan,
  buildPlanLimitError,
} from "@/lib/billing/enforcement";

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  // Rate limit — relaxed for read-only listing
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const params = getQuery(req);
  const { page, perPage } = paginate(params);

  const businessId = params.get("businessId");
  const stateParam = params.get("state") ?? params.get("status");

  // ── Tenant isolation: scope results to the authenticated tenant ───────
  const tenantResult = withTenant(req);
  const tenantBusinessId = !(tenantResult instanceof NextResponse)
    ? tenantResult.tenant.tenantId
    : null;

  // Resolve the campaign list based on filters
  let campaigns: CampaignLifecycle[];

  if (businessId) {
    const v = validateId(businessId);
    if (!v.success) return err("INVALID_BUSINESS_ID", v.error, 400);

    // Enforce: authenticated tenants can only query their own campaigns
    if (tenantBusinessId && tenantBusinessId !== v.data) {
      return err("TENANT_ACCESS_DENIED", "Cannot access campaigns for another business", 403);
    }

    campaigns = campaignManager.listByBusiness(v.data);

    // Further narrow by state if provided
    if (stateParam) {
      const sv = validateEnum(stateParam, "state", ["draft", "active", "paused", "ended", "expired"] as const);
      if (!sv.success) return err("INVALID_STATE", sv.error, 400);
      campaigns = campaigns.filter((c) => c.state === sv.data);
    }
  } else if (tenantBusinessId) {
    // Authenticated user with no explicit businessId filter: scope to own tenant
    campaigns = campaignManager.listByBusiness(tenantBusinessId);

    if (stateParam) {
      const sv = validateEnum(stateParam, "state", ["draft", "active", "paused", "ended", "expired"] as const);
      if (!sv.success) return err("INVALID_STATE", sv.error, 400);
      campaigns = campaigns.filter((c) => c.state === sv.data);
    }
  } else if (stateParam) {
    const sv = validateEnum(stateParam, "state", ["draft", "active", "paused", "ended", "expired"] as const);
    if (!sv.success) return err("INVALID_STATE", sv.error, 400);
    campaigns = campaignManager.listByState(sv.data as CampaignState);
  } else {
    campaigns = campaignManager.listAll();
  }

  // Paginate
  const total = campaigns.length;
  const totalPages = Math.ceil(total / perPage);
  const offset = (page - 1) * perPage;
  const items = campaigns.slice(offset, offset + perPage);

  return ok({
    campaigns: items,
    total,
    page,
    perPage,
    totalPages,
  });
});

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth + tenant isolation
  const tenantResult = withTenant(req);
  if (tenantResult instanceof NextResponse) return tenantResult;
  const { tenant } = tenantResult;

  // Rate limit — standard for writes
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // Parse body
  const body = await parseBody<{
    businessId?: string;
    name?: string;
    actions?: string[];
    discountValue?: number;
    discountType?: string;
    maxCompletions?: number | null;
    expiresInDays?: number;
  }>(req);
  if (body instanceof Response) return body;

  // Validate businessId
  const bv = validateId(body.businessId);
  if (!bv.success) return err("INVALID_BUSINESS_ID", bv.error, 400);

  // Tenant isolation: ensure campaign is being created for the authenticated tenant's business
  const accessDenied = checkResourceAccess(tenant, bv.data);
  if (accessDenied) return accessDenied;

  // ── Plan enforcement: campaign limit ──────────────────────────────────────
  const plan = getBusinessPlan(bv.data);
  const campaignCheck = checkCampaignLimit(bv.data, plan);
  if (!campaignCheck.allowed) {
    const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
    const body403 = buildPlanLimitError(
      `${planLabel} plan allows ${campaignCheck.limit} active campaign${campaignCheck.limit === 1 ? "" : "s"}. Upgrade to create more.`,
      campaignCheck.limit,
      campaignCheck.current,
      plan
    );
    return NextResponse.json(body403, { status: 403 });
  }

  // Validate name
  const nv = validateString(body.name, "name", { min: 1, max: 200 });
  if (!nv.success) return err("INVALID_NAME", nv.error, 400);

  // Validate actions
  if (!Array.isArray(body.actions) || body.actions.length === 0) {
    return err("INVALID_ACTIONS", "actions must be a non-empty array of action IDs", 400);
  }
  for (const actionId of body.actions) {
    const av = validateId(actionId);
    if (!av.success) return err("INVALID_ACTION_ID", `Invalid action ID: ${av.error}`, 400);
  }

  // Validate discountValue
  const dv = validateNumber(body.discountValue, "discountValue", { min: 0.01 });
  if (!dv.success) return err("INVALID_DISCOUNT_VALUE", dv.error, 400);

  // Validate discountType
  const dt = validateEnum(body.discountType, "discountType", ["pct", "dol"] as const);
  if (!dt.success) return err("INVALID_DISCOUNT_TYPE", dt.error, 400);

  // Optional: maxCompletions
  let maxCompletions: number | null = null;
  if (body.maxCompletions !== undefined && body.maxCompletions !== null) {
    const mc = validateNumber(body.maxCompletions, "maxCompletions", { min: 1 });
    if (!mc.success) return err("INVALID_MAX_COMPLETIONS", mc.error, 400);
    maxCompletions = mc.data;
  }

  // Optional: expiresInDays (default 30)
  let expiresInDays = 30;
  if (body.expiresInDays !== undefined) {
    const ed = validateNumber(body.expiresInDays, "expiresInDays", { min: 1, max: 365 });
    if (!ed.success) return err("INVALID_EXPIRES_IN_DAYS", ed.error, 400);
    expiresInDays = ed.data;
  }

  // Generate a campaign ID
  const campaignId = `camp_${crypto.randomUUID()}`;

  try {
    const lifecycle = campaignManager.launch(campaignId, bv.data, {
      name: nv.data,
      budgetAllocated: dv.data,
      budgetType: dt.data,
      maxCompletions,
      expiresInDays,
    });

    eventPublisher.publish("campaign.created", { campaignId, name: nv.data }, bv.data);
    recordUsage(tenant.tenantId, "campaigns_created");

    return ok(
      {
        campaign: {
          ...lifecycle,
          name: nv.data,
          actions: body.actions,
          discountValue: dv.data,
          discountType: dt.data,
        },
      },
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to launch campaign";
    return err("LAUNCH_FAILED", message, 500);
  }
});

// ─── PUT ────────────────────────────────────────────────────────────────────

export const PUT = withTiming(async (req: NextRequest) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Rate limit — standard for writes
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // Parse body
  const body = await parseBody<{
    campaignId?: string;
    action?: string;
    reason?: string;
    name?: string;
    description?: string;
    guidelines?: string;
    discountValue?: number;
    discountType?: string;
    maxCompletions?: number | null;
    expiresInDays?: number;
    tags?: string[];
  }>(req);
  if (body instanceof Response) return body;

  // Validate campaignId (required)
  const cv = validateId(body.campaignId);
  if (!cv.success) return err("INVALID_CAMPAIGN_ID", cv.error, 400);

  // Look up the campaign
  const lifecycle = campaignManager.getState(cv.data);
  if (!lifecycle) {
    return err("CAMPAIGN_NOT_FOUND", `Campaign ${cv.data} not found`, 404);
  }

  // Verify ownership: campaign must belong to the authenticated user's business
  if (user.businessId && lifecycle.businessId !== user.businessId) {
    return err("FORBIDDEN", "You do not have permission to modify this campaign", 403);
  }

  // ── Lifecycle actions: pause / resume / end ───────────────────────────────

  if (body.action) {
    const actionV = validateEnum(body.action, "action", ["pause", "resume", "end"] as const);
    if (!actionV.success) return err("INVALID_ACTION", actionV.error, 400);

    try {
      let updated: typeof lifecycle;
      const reason = body.reason ?? undefined;

      switch (actionV.data) {
        case "pause":
          updated = campaignManager.pause(cv.data, user.id, reason);
          eventPublisher.publish("campaign.paused", { campaignId: cv.data, reason }, lifecycle.businessId);
          break;
        case "resume":
          updated = campaignManager.resume(cv.data, user.id);
          eventPublisher.publish("campaign.resumed", { campaignId: cv.data }, lifecycle.businessId);
          break;
        case "end":
          updated = campaignManager.end(cv.data, user.id, reason);
          eventPublisher.publish("campaign.ended", { campaignId: cv.data, reason }, lifecycle.businessId);
          break;
      }

      return ok({ campaign: updated! });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update campaign state";
      return err("STATE_TRANSITION_FAILED", message, 409);
    }
  }

  // ── Field updates ─────────────────────────────────────────────────────────

  // Only active or paused campaigns can be edited
  if (lifecycle.state !== "active" && lifecycle.state !== "paused") {
    return err(
      "CAMPAIGN_NOT_EDITABLE",
      `Campaign is "${lifecycle.state}" and cannot be edited. Only active or paused campaigns can be updated.`,
      409
    );
  }

  // Build update payload — validate each optional field if provided
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const nv = validateString(body.name, "name", { min: 1, max: 200 });
    if (!nv.success) return err("INVALID_NAME", nv.error, 400);
    updates.name = nv.data;
  }

  if (body.description !== undefined) {
    const dv = validateString(body.description, "description", { min: 0, max: 2000 });
    if (!dv.success) return err("INVALID_DESCRIPTION", dv.error, 400);
    updates.description = dv.data;
  }

  if (body.guidelines !== undefined) {
    const gv = validateString(body.guidelines, "guidelines", { min: 0, max: 5000 });
    if (!gv.success) return err("INVALID_GUIDELINES", gv.error, 400);
    updates.guidelines = gv.data;
  }

  if (body.discountValue !== undefined) {
    const dv = validateNumber(body.discountValue, "discountValue", { min: 0.01 });
    if (!dv.success) return err("INVALID_DISCOUNT_VALUE", dv.error, 400);
    lifecycle.budget.allocated = dv.data;
    updates.discountValue = dv.data;
  }

  if (body.discountType !== undefined) {
    const dt = validateEnum(body.discountType, "discountType", ["pct", "dol"] as const);
    if (!dt.success) return err("INVALID_DISCOUNT_TYPE", dt.error, 400);
    lifecycle.budget.type = dt.data;
    updates.discountType = dt.data;
  }

  if (body.maxCompletions !== undefined) {
    if (body.maxCompletions === null) {
      lifecycle.completions.max = null;
      updates.maxCompletions = null;
    } else {
      const mc = validateNumber(body.maxCompletions, "maxCompletions", { min: 1 });
      if (!mc.success) return err("INVALID_MAX_COMPLETIONS", mc.error, 400);
      lifecycle.completions.max = mc.data;
      updates.maxCompletions = mc.data;
    }
  }

  if (body.expiresInDays !== undefined) {
    const ed = validateNumber(body.expiresInDays, "expiresInDays", { min: 1, max: 365 });
    if (!ed.success) return err("INVALID_EXPIRES_IN_DAYS", ed.error, 400);
    // Recalculate expiry from original launch date
    const launchedAt = new Date(lifecycle.expiry.launchedAt);
    const newExpiry = new Date(launchedAt);
    newExpiry.setDate(newExpiry.getDate() + ed.data);
    lifecycle.expiry = { ...lifecycle.expiry, expiresAt: newExpiry.toISOString() };
    updates.expiresInDays = ed.data;
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      return err("INVALID_TAGS", "tags must be an array of strings", 400);
    }
    for (const tag of body.tags) {
      if (typeof tag !== "string" || tag.length > 50) {
        return err("INVALID_TAG", "Each tag must be a string of 50 characters or fewer", 400);
      }
    }
    updates.tags = body.tags;
  }

  if (Object.keys(updates).length === 0) {
    return err("NO_UPDATES", "No valid fields provided to update", 400);
  }

  eventPublisher.publish(
    "campaign.updated",
    { campaignId: cv.data, updates },
    lifecycle.businessId
  );

  return ok({
    campaign: {
      ...lifecycle,
      ...updates,
    },
  });
});
