/**
 * Audit Log API Route -- /api/v1/audit
 *
 * GET: Query the immutable audit log. Admin only.
 *      Query params: actorId, action, resourceType, resourceId,
 *                    startDate, endDate, page, perPage
 * Rate limit: strict tier
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, getQuery, withTiming } from "../_shared";
import { auditLog } from "@/lib/audit";
import type { AuthUser } from "../_shared";
import { NextResponse } from "next/server";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  // Admin-only access
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult as AuthUser;

  if (user.role !== "admin" && user.role !== "enterprise") {
    return err("FORBIDDEN", "Audit log access requires admin or enterprise role", 403);
  }

  const params = getQuery(req);

  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") ?? "50", 10) || 50));

  const { entries, total } = auditLog.query({
    actorId: params.get("actorId") ?? undefined,
    action: params.get("action") ?? undefined,
    resourceType: params.get("resourceType") ?? undefined,
    resourceId: params.get("resourceId") ?? undefined,
    startDate: params.get("startDate") ?? undefined,
    endDate: params.get("endDate") ?? undefined,
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
  });
});
