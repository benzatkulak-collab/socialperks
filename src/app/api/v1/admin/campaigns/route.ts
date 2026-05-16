/**
 * Admin campaign control — /api/v1/admin/campaigns
 *
 * GET    /:id  — campaign detail (any tenant)
 * POST          — force-pause / resume / end any campaign on any tenant.
 *                 Bypasses the ownership check the regular campaigns route
 *                 enforces. Every mutation is audited.
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, parseBody, getQuery, withTiming } from "../../_shared";
import { campaignManager } from "@/lib/campaign-state-machine";
import { audit } from "@/lib/audit-log";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin") return err("FORBIDDEN", "Admin role required", 403);

  const params = getQuery(req);
  const id = params.get("id");
  if (!id) return err("MISSING_FIELDS", "id query param required");

  const lifecycle = campaignManager.getState(id);
  if (!lifecycle) return err("CAMPAIGN_NOT_FOUND", "Campaign not found", 404);

  return ok({ campaign: lifecycle });
});

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin") return err("FORBIDDEN", "Admin role required", 403);
  if (user.id.startsWith("api-key:")) {
    return err("FORBIDDEN", "API keys cannot force-mutate campaigns", 403);
  }

  const body = await parseBody<{
    campaignId?: string;
    action?: "pause" | "resume" | "end";
    reason?: string;
  }>(req);
  if (body instanceof Response) return body;

  if (!body.campaignId) return err("MISSING_FIELDS", "campaignId is required");
  if (!body.action || !["pause", "resume", "end"].includes(body.action)) {
    return err("INVALID_ACTION", "action must be pause, resume, or end");
  }

  const lifecycle = campaignManager.getState(body.campaignId);
  if (!lifecycle) return err("CAMPAIGN_NOT_FOUND", "Campaign not found", 404);

  const reason = body.reason ?? "Admin override";

  try {
    let updated;
    switch (body.action) {
      case "pause":
        updated = campaignManager.pause(body.campaignId, user.id, reason);
        break;
      case "resume":
        updated = campaignManager.resume(body.campaignId, user.id);
        break;
      case "end":
        updated = campaignManager.end(body.campaignId, user.id, reason);
        break;
    }

    audit({
      action: "auth.role_changed", // closest existing enum — admin force action on resource
      actor: `user:${user.id}`,
      businessId: lifecycle.businessId,
      resourceId: `campaign:${body.campaignId}`,
      ok: true,
      meta: {
        kind: "admin-campaign-force",
        action: body.action,
        previousState: lifecycle.state,
        reason,
      },
    });

    return ok({ campaign: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "State transition failed";
    return err("STATE_TRANSITION_FAILED", message, 409);
  }
});
