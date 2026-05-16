/**
 * GET /api/v1/agent-activity
 *
 * Returns the calling business's agent activity rollups — one summary
 * per API key with totals + recent timeline.
 *
 * Query params:
 *   ?keyId=<api-key-id>    Return only the named agent's summary (404
 *                          if the id doesn't belong to the caller's
 *                          business).
 *
 * Auth: JWT/session only. API-key callers are rejected: a key can't
 * introspect its own activity log via itself, because doing so would
 * undermine the audit trail's purpose. Sign in as a human to view.
 *
 * Tenant isolation: results are always scoped to the caller's
 * businessId. There's no admin escape hatch from this endpoint.
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, getQuery, withTiming } from "../_shared";
import {
  getBusinessAgentActivity,
  getSingleAgentActivity,
} from "@/lib/agent-activity";

export const GET = withTiming(async (req: NextRequest) => {
  // Relaxed rate limit — read-only, but still tenant-scoped so a leaked
  // JWT can't be used to scrape activity across tenants.
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // API-key callers cannot read this endpoint. Two reasons:
  //   1. The activity is intended for the human who delegated to the
  //      agent — surfacing it back through the agent's own auth is the
  //      wrong audience.
  //   2. An agent that could read its own audit log could detect
  //      anomaly-detection in real time and adapt around it; we want
  //      that visibility to remain with the user.
  if (user.role === "agent") {
    return err("FORBIDDEN", "Agent activity must be viewed by a signed-in user, not an API key.", 403);
  }
  if (!user.businessId) {
    return err("NO_BUSINESS", "Your account is not associated with a business.", 400);
  }

  const params = getQuery(req);
  const keyId = params.get("keyId");

  if (keyId) {
    const summary = await getSingleAgentActivity(user.businessId, keyId);
    if (!summary) {
      // Return 404 even if the key exists under a different tenant —
      // never leak existence-info across the tenant boundary.
      return err("NOT_FOUND", "No agent with that id is associated with your business.", 404);
    }
    return ok({ agent: summary });
  }

  const result = await getBusinessAgentActivity(user.businessId);
  return ok(result);
});
