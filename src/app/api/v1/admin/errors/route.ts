/**
 * GET /api/v1/admin/errors — admin-only access to recent captured errors
 *
 * Returns the in-memory ring buffer (last 500 captures) so an operator
 * can triage incidents without depending on Sentry. Admin role only.
 *
 * Query params:
 *   ?route=/api/v1/auth      filter by exact route
 *   ?since=ISO-8601-string   only entries after the timestamp
 *   ?perPage=N               cap results (default 50, max 500)
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  getQuery,
  withTiming,
} from "../../_shared";
import { listRecentCaptures } from "@/lib/observability/error-tracker";
import { audit } from "@/lib/audit-log";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  if (user.role !== "admin") {
    audit({
      action: "tenant.access_denied",
      actor: `user:${user.id}`,
      businessId: user.businessId,
      resourceId: "error-log",
      ok: false,
      meta: { reason: "non-admin attempted to read error log", role: user.role },
    });
    return err("FORBIDDEN", "Admin role required", 403);
  }
  if (user.id.startsWith("api-key:")) {
    return err("FORBIDDEN", "API keys cannot read the error log", 403);
  }

  const params = getQuery(req);
  const route = params.get("route") ?? undefined;
  const since = params.get("since") ?? undefined;
  const perPage = Math.min(
    500,
    Math.max(1, parseInt(params.get("perPage") ?? "50", 10) || 50)
  );

  const captures = listRecentCaptures({ route, since });
  const truncated = captures.slice(0, perPage);

  // Self-audit so we can see who's poking at error data.
  audit({
    action: "admin.audit_read",
    actor: `user:${user.id}`,
    businessId: user.businessId,
    resourceId: "error-log",
    ok: true,
    meta: {
      filterRoute: route ?? "",
      filterSince: since ?? "",
      returned: truncated.length,
    },
  });

  return ok({
    captures: truncated,
    total: captures.length,
    truncated: captures.length > truncated.length,
  });
});
