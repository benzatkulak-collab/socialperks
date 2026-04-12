/**
 * Audit Log API Route -- /api/v1/audit
 *
 * GET: Query the immutable audit log. Admin or business_owner only.
 *      Query params: userId (actorId), action, resourceType, resourceId,
 *                    from (startDate), to (endDate), page, perPage
 * Rate limit: standard tier
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, getQuery, withTiming } from "../_shared";
import { auditLog, AUDIT_ACTIONS } from "@/lib/audit";
import type { AuthUser } from "../_shared";
import { NextResponse } from "next/server";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // Auth required: admin or business_owner
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult as AuthUser;

  if (user.role !== "admin" && user.role !== "business_owner" && user.role !== "business") {
    return err("FORBIDDEN", "Audit log access requires admin or business owner role", 403);
  }

  const params = getQuery(req);

  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") ?? "50", 10) || 50));

  // Support both "userId" and "actorId" param names
  const actorId = params.get("userId") ?? params.get("actorId") ?? undefined;

  // Validate action filter against known actions if provided
  const actionParam = params.get("action") ?? undefined;
  if (actionParam && !(AUDIT_ACTIONS as readonly string[]).includes(actionParam)) {
    // Allow unknown actions too -- the audit log can record custom actions
    // but return a hint about known types
  }

  // Support both "from"/"to" and "startDate"/"endDate" param names
  const startDate = params.get("from") ?? params.get("startDate") ?? undefined;
  const endDate = params.get("to") ?? params.get("endDate") ?? undefined;

  const { entries, total } = auditLog.query({
    actorId,
    action: actionParam,
    resourceType: params.get("resourceType") ?? undefined,
    resourceId: params.get("resourceId") ?? undefined,
    startDate,
    endDate,
    page,
    perPage,
  });

  return ok({
    entries,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
    knownActions: AUDIT_ACTIONS,
  });
});
