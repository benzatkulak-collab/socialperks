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
  requireCsrf,
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
import { persistLifecycle, ensureBusinessCampaignsLoaded, ensureCampaignLoaded } from "@/lib/campaign-state-machine/persist";
import { validateId, validateString, validateNumber, validateEnum } from "@/lib/security/validate";
import { requireOwnership } from "@/lib/security/owner";
import { eventPublisher } from "@/lib/realtime/publisher";
import { findAction, findPlatform } from "@/lib/platforms";
import { pluginManager } from "@/lib/plugin-system";
import {
  checkCampaignLimit,
  getBusinessPlan,
  buildPlanLimitError,
} from "@/lib/billing/enforcement";
import { hydrateSubscriptions } from "@/lib/billing/store";

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

    // Cold-start: load this business's durable campaigns into the manager so a
    // returning owner doesn't see an empty dashboard after a redeploy.
    await ensureBusinessCampaignsLoaded(v.data);
    campaigns = campaignManager.listByBusiness(v.data);

    // Further narrow by state if provided
    if (stateParam) {
      const sv = validateEnum(stateParam, "state", ["draft", "active", "paused", "ended", "expired"] as const);
      if (!sv.success) return err("INVALID_STATE", sv.error, 400);
      campaigns = campaigns.filter((c) => c.state === sv.data);
    }
  } else if (tenantBusinessId) {
    // Authenticated user with no explicit businessId filter: scope to own tenant
    await ensureBusinessCampaignsLoaded(tenantBusinessId);
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

  // CSRF — previously decorative. Enforce now.
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

  // Parse body
  const body = await parseBody<{
    businessId?: string;
    name?: string;
    description?: string;
    guidelines?: string;
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

  // Validate name (moved up — input validation should run BEFORE plan-limit
  // check, otherwise a user whose input is invalid AND who's hit the plan
  // limit gets a confusing "upgrade your plan" instead of "name required").
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

  // Compliance gate: reject any action whose platform's ToS prohibits
  // incentivization (Google reviews, Yelp reviews, Tripadvisor reviews,
  // etc.). Even if the UI lets the user select these, the API must refuse.
  // Single source of truth: action.incentivizable === false.
  const prohibited: string[] = [];
  for (const actionId of body.actions) {
    const action = findAction(actionId);
    if (!action) continue; // unknown IDs handled by state machine
    if (action.incentivizable === false) {
      const platform = action.platformId ? findPlatform(action.platformId) : null;
      prohibited.push(`${platform?.name ?? action.platformId ?? "platform"} ${action.label}`);
    }
  }
  if (prohibited.length > 0) {
    return err(
      "PROHIBITED_ACTION",
      `Cannot launch campaign: ${prohibited.join(", ")}. These platforms prohibit incentivized reviews under their Terms of Service.`,
      422,
    );
  }

  // Validate discountValue
  const dv = validateNumber(body.discountValue, "discountValue", { min: 0.01 });
  if (!dv.success) return err("INVALID_DISCOUNT_VALUE", dv.error, 400);

  // Validate discountType
  const dt = validateEnum(body.discountType, "discountType", ["pct", "dol"] as const);
  if (!dt.success) return err("INVALID_DISCOUNT_TYPE", dt.error, 400);

  // Upper-bound cap on discountValue. Without this, live testing
  // accepted 999% discounts (the "9_999_999% coupon" class of bug).
  // pct caps at 100% (a free item is 100%). dol caps at $10000 — well
  // beyond any plausible single-redemption perk.
  const maxDiscount = dt.data === "pct" ? 100 : 10000;
  if (dv.data > maxDiscount) {
    return err(
      "INVALID_DISCOUNT_VALUE",
      `discountValue must be at most ${maxDiscount} for ${dt.data === "pct" ? "percentage" : "dollar"} discounts`,
      400,
    );
  }

  // Optional: maxCompletions
  let maxCompletions: number | null = null;
  if (body.maxCompletions !== undefined && body.maxCompletions !== null) {
    const mc = validateNumber(body.maxCompletions, "maxCompletions", { min: 1 });
    if (!mc.success) return err("INVALID_MAX_COMPLETIONS", mc.error, 400);
    maxCompletions = mc.data;
  }

  // Optional: expiresInDays — default 60 (low-traffic shops need
  // more than a month to accumulate meaningful completion volume)
  let expiresInDays = 60;
  if (body.expiresInDays !== undefined) {
    const ed = validateNumber(body.expiresInDays, "expiresInDays", { min: 1, max: 365 });
    if (!ed.success) return err("INVALID_EXPIRES_IN_DAYS", ed.error, 400);
    expiresInDays = ed.data;
  }

  // ── Plan enforcement: campaign limit (moved AFTER input validation) ──────
  // Running this AFTER all validation means malformed requests get a clear
  // 400 with the bad field, rather than the misleading "upgrade your plan".
  // Cold-start: hydrate durable campaigns first so the limit counts the
  // business's real active campaigns (else a fresh lambda counts 0 and lets a
  // capped business over-create — or hides their real campaigns).
  await ensureBusinessCampaignsLoaded(bv.data);
  // Cold-start: warm the subscription cache so a paying customer isn't read as
  // "free" (and rejected at the free-tier campaign limit) right after a deploy.
  await hydrateSubscriptions();
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

  // Generate a campaign ID
  const campaignId = `camp_${crypto.randomUUID()}`;

  try {
    // Run the campaign.beforeLaunch hook chain. The FTC compliance plugin
    // (src/lib/plugin-system.ts) is registered here and injects the
    // mandatory disclosures (#ad, #sponsored, "free product received", etc.)
    // per platform. This used to be dead code — registered but never
    // invoked. The launch modal explicitly promises these disclosures are
    // auto-injected, so we have to actually run them.
    // Forward the optional `description` and `guidelines` fields to the
    // compliance plugin so its presence-checks (`Campaign must have a
    // description before launch`) actually see what the wizard sends.
    // Without this, the LAUNCH_BLOCKED 422 fires even when the client
    // includes a non-empty description.
    const descRaw = typeof body.description === "string" ? body.description : "";
    const guidelinesRaw = typeof body.guidelines === "string" ? body.guidelines : "";
    const hookResult = await pluginManager.executeHook(
      "campaign.beforeLaunch",
      {
        campaignId,
        businessId: bv.data,
        name: nv.data,
        description: descRaw,
        guidelines: guidelinesRaw,
        actions: body.actions,
        discountValue: dv.data,
        discountType: dt.data,
      },
      { actorId: tenant.tenantId, actorType: "business" },
    );
    if (hookResult.aborted) {
      return err(
        "LAUNCH_BLOCKED",
        hookResult.abortReason ?? "Campaign blocked by a compliance check",
        422,
      );
    }
    const ftcDisclosures = hookResult.data.ftcDisclosures;
    const guidelines = hookResult.data.guidelines;

    const lifecycle = campaignManager.launch(campaignId, bv.data, {
      name: nv.data,
      budgetAllocated: dv.data,
      budgetType: dt.data,
      maxCompletions,
      expiresInDays,
      actions: body.actions,
    });

    // Phase 11: durable write-through. Without this, every redeploy
    // wipes campaign state. Best-effort — manager has the canonical
    // in-memory record either way.
    void persistLifecycle(lifecycle, { name: nv.data, actions: body.actions });

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
          // Surface the FTC disclosures and guidelines that were merged in
          // by the compliance plugin so clients can render them.
          ftcDisclosures,
          guidelines,
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

  // CSRF — previously decorative. Live testing confirmed PUT with
  // X-CSRF-Token: "wrongtoken" returned 200 OK and paused the campaign.
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

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

  // Look up the campaign (cold-start: load from durable storage if the
  // manager's in-memory Map was wiped by a redeploy).
  const lifecycle = await ensureCampaignLoaded(cv.data);
  if (!lifecycle) {
    return err("CAMPAIGN_NOT_FOUND", `Campaign ${cv.data} not found`, 404);
  }

  // Verify ownership: campaign must belong to the authenticated user's business.
  // requireOwnership treats null user.businessId as no-access (was the IDOR).
  const ownership = requireOwnership(user, lifecycle.businessId);
  if (ownership) return ownership;

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

      // Persist the transition so pause/resume/end survives a cold start.
      void persistLifecycle(updated!);

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
    lifecycle.name = nv.data; // keep the warm lifecycle + durable row in sync
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
    // Cap matches POST: 100% for pct, $10000 for dol. Use the new
    // discountType if it's also in the body, otherwise the existing
    // lifecycle.budget.type.
    const effectiveType =
      typeof body.discountType === "string" ? body.discountType : lifecycle.budget.type;
    const maxDiscount = effectiveType === "pct" ? 100 : 10000;
    if (dv.data > maxDiscount) {
      return err(
        "INVALID_DISCOUNT_VALUE",
        `discountValue must be at most ${maxDiscount} for ${effectiveType === "pct" ? "percentage" : "dollar"} discounts`,
        400,
      );
    }
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

  // Persist the in-place lifecycle edits (budget/discount/maxCompletions/expiry
  // were mutated above) plus the editable display fields, so a cold start
  // doesn't revert them.
  void persistLifecycle(lifecycle, {
    name: typeof updates.name === "string" ? updates.name : undefined,
    description: typeof updates.description === "string" ? updates.description : undefined,
    guidelines: typeof updates.guidelines === "string" ? updates.guidelines : undefined,
    discountValue: typeof updates.discountValue === "number" ? updates.discountValue : undefined,
    discountType: typeof updates.discountType === "string" ? updates.discountType : undefined,
  });

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
