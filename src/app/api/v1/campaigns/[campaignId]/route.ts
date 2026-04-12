/**
 * GET    /api/v1/campaigns/:campaignId — Get single campaign by ID
 * PUT    /api/v1/campaigns/:campaignId — Update campaign (require auth, validate fields)
 * DELETE /api/v1/campaigns/:campaignId — Soft-delete campaign (set status to 'ended')
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import { campaignManager } from "@/lib/campaign-state-machine";
import {
  validateId,
  validateString,
  validateNumber,
  validateEnum,
} from "@/lib/security/validate";
import { eventPublisher } from "@/lib/realtime/publisher";

// ─── Params helper ───────────────────────────────────────────────────────────

async function getCampaignId(
  ctx: unknown
): Promise<string | null> {
  try {
    const { campaignId } = await (
      ctx as { params: Promise<{ campaignId: string }> }
    ).params;
    return campaignId ?? null;
  } catch {
    return null;
  }
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Rate limit — relaxed for read-only
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const rawId = await getCampaignId(ctx);
  const v = validateId(rawId);
  if (!v.success) return err("INVALID_CAMPAIGN_ID", v.error, 400);

  const lifecycle = campaignManager.getState(v.data);
  if (!lifecycle) {
    return err("CAMPAIGN_NOT_FOUND", `Campaign ${v.data} not found`, 404);
  }

  return ok({ campaign: lifecycle });
});

// ─── PUT ────────────────────────────────────────────────────────────────────

export const PUT = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof NextResponse) return user;

  // Rate limit — standard for writes
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const rawId = await getCampaignId(ctx);
  const cv = validateId(rawId);
  if (!cv.success) return err("INVALID_CAMPAIGN_ID", cv.error, 400);

  // Look up the campaign
  const lifecycle = campaignManager.getState(cv.data);
  if (!lifecycle) {
    return err("CAMPAIGN_NOT_FOUND", `Campaign ${cv.data} not found`, 404);
  }

  // Verify ownership
  if (user.businessId && lifecycle.businessId !== user.businessId) {
    return err(
      "FORBIDDEN",
      "You do not have permission to modify this campaign",
      403
    );
  }

  // Parse body
  const body = await parseBody<{
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
  if (body instanceof NextResponse) return body;

  // ── Lifecycle actions: pause / resume / end ───────────────────────────────

  if (body.action) {
    const actionV = validateEnum(body.action, "action", [
      "pause",
      "resume",
      "end",
    ] as const);
    if (!actionV.success) return err("INVALID_ACTION", actionV.error, 400);

    try {
      let updated: typeof lifecycle;
      const reason = body.reason ?? undefined;

      switch (actionV.data) {
        case "pause":
          updated = campaignManager.pause(cv.data, user.id, reason);
          eventPublisher.publish(
            "campaign.paused",
            { campaignId: cv.data, reason },
            lifecycle.businessId
          );
          break;
        case "resume":
          updated = campaignManager.resume(cv.data, user.id);
          eventPublisher.publish(
            "campaign.resumed",
            { campaignId: cv.data },
            lifecycle.businessId
          );
          break;
        case "end":
          updated = campaignManager.end(cv.data, user.id, reason);
          eventPublisher.publish(
            "campaign.ended",
            { campaignId: cv.data, reason },
            lifecycle.businessId
          );
          break;
      }

      return ok({ campaign: updated! });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update campaign state";
      return err("STATE_TRANSITION_FAILED", message, 409);
    }
  }

  // ── Field updates ─────────────────────────────────────────────────────────

  if (lifecycle.state !== "active" && lifecycle.state !== "paused") {
    return err(
      "CAMPAIGN_NOT_EDITABLE",
      `Campaign is "${lifecycle.state}" and cannot be edited. Only active or paused campaigns can be updated.`,
      409
    );
  }

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const nv = validateString(body.name, "name", { min: 1, max: 200 });
    if (!nv.success) return err("INVALID_NAME", nv.error, 400);
    updates.name = nv.data;
  }

  if (body.description !== undefined) {
    const dv = validateString(body.description, "description", {
      min: 0,
      max: 2000,
    });
    if (!dv.success) return err("INVALID_DESCRIPTION", dv.error, 400);
    updates.description = dv.data;
  }

  if (body.guidelines !== undefined) {
    const gv = validateString(body.guidelines, "guidelines", {
      min: 0,
      max: 5000,
    });
    if (!gv.success) return err("INVALID_GUIDELINES", gv.error, 400);
    updates.guidelines = gv.data;
  }

  if (body.discountValue !== undefined) {
    const dv = validateNumber(body.discountValue, "discountValue", {
      min: 0.01,
    });
    if (!dv.success) return err("INVALID_DISCOUNT_VALUE", dv.error, 400);
    lifecycle.budget.allocated = dv.data;
    updates.discountValue = dv.data;
  }

  if (body.discountType !== undefined) {
    const dt = validateEnum(body.discountType, "discountType", [
      "pct",
      "dol",
    ] as const);
    if (!dt.success) return err("INVALID_DISCOUNT_TYPE", dt.error, 400);
    lifecycle.budget.type = dt.data;
    updates.discountType = dt.data;
  }

  if (body.maxCompletions !== undefined) {
    if (body.maxCompletions === null) {
      lifecycle.completions.max = null;
      updates.maxCompletions = null;
    } else {
      const mc = validateNumber(body.maxCompletions, "maxCompletions", {
        min: 1,
      });
      if (!mc.success) return err("INVALID_MAX_COMPLETIONS", mc.error, 400);
      lifecycle.completions.max = mc.data;
      updates.maxCompletions = mc.data;
    }
  }

  if (body.expiresInDays !== undefined) {
    const ed = validateNumber(body.expiresInDays, "expiresInDays", {
      min: 1,
      max: 365,
    });
    if (!ed.success) return err("INVALID_EXPIRES_IN_DAYS", ed.error, 400);
    const launchedAt = new Date(lifecycle.expiry.launchedAt);
    const newExpiry = new Date(launchedAt);
    newExpiry.setDate(newExpiry.getDate() + ed.data);
    lifecycle.expiry = {
      ...lifecycle.expiry,
      expiresAt: newExpiry.toISOString(),
    };
    updates.expiresInDays = ed.data;
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      return err("INVALID_TAGS", "tags must be an array of strings", 400);
    }
    for (const tag of body.tags) {
      if (typeof tag !== "string" || tag.length > 50) {
        return err(
          "INVALID_TAG",
          "Each tag must be a string of 50 characters or fewer",
          400
        );
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

// ─── DELETE ─────────────────────────────────────────────────────────────────

export const DELETE = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof NextResponse) return user;

  // Rate limit — standard for writes
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const rawId = await getCampaignId(ctx);
  const cv = validateId(rawId);
  if (!cv.success) return err("INVALID_CAMPAIGN_ID", cv.error, 400);

  // Look up the campaign
  const lifecycle = campaignManager.getState(cv.data);
  if (!lifecycle) {
    return err("CAMPAIGN_NOT_FOUND", `Campaign ${cv.data} not found`, 404);
  }

  // Verify ownership
  if (user.businessId && lifecycle.businessId !== user.businessId) {
    return err(
      "FORBIDDEN",
      "You do not have permission to delete this campaign",
      403
    );
  }

  // Already in a terminal state
  if (lifecycle.state === "ended" || lifecycle.state === "expired") {
    return ok({
      campaign: lifecycle,
      message: "Campaign is already ended",
    });
  }

  // Soft-delete: transition to 'ended'
  try {
    const updated = campaignManager.end(cv.data, user.id, "Deleted via API");

    eventPublisher.publish(
      "campaign.ended",
      { campaignId: cv.data, reason: "Deleted via API" },
      lifecycle.businessId
    );

    return ok({
      campaign: updated,
      message: "Campaign soft-deleted (status set to ended)",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete campaign";
    return err("DELETE_FAILED", message, 500);
  }
});
