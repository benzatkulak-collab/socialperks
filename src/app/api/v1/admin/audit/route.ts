/**
 * GET /api/v1/admin/audit — admin-only audit log query
 *
 * Backs the /admin/audit dashboard view. Returns paginated, filtered
 * audit entries. Hard-restricted to role=admin (NOT just authenticated;
 * this surfaces sensitive cross-tenant security signals).
 *
 * Self-audits: every successful read is itself audited so you can see
 * "who looked at the audit log."
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  withTiming,
  getQuery,
} from "../../_shared";
import { queryAuditLog, audit } from "@/lib/audit-log";

export const GET = withTiming(async (req: NextRequest) => {
  // Strict rate limit — admin endpoints aren't high-volume.
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Admin role is the only allowed caller. NOT api-key callers (the
  // audit log includes api-key lifecycle events; an api-key reading
  // its own creation event is a privilege escalation pattern).
  if (user.role !== "admin") {
    audit({
      action: "tenant.access_denied",
      actor: `user:${user.id}`,
      businessId: user.businessId,
      resourceId: "audit-log",
      ok: false,
      meta: { reason: "non-admin attempted to read audit log", role: user.role },
    });
    return err("FORBIDDEN", "Admin role required", 403);
  }
  if (user.id.startsWith("api-key:")) {
    return err("FORBIDDEN", "API keys cannot read the audit log", 403);
  }

  const params = getQuery(req);
  const result = await queryAuditLog({
    action: params.get("action") ?? undefined,
    actionPrefix: params.get("actionPrefix") ?? undefined,
    actor: params.get("actor") ?? undefined,
    businessId: params.get("businessId") ?? undefined,
    onlyFailures: params.get("onlyFailures") === "true",
    since: params.get("since") ?? undefined,
    limit: params.get("limit") ? parseInt(params.get("limit")!, 10) : undefined,
    offset: params.get("offset") ? parseInt(params.get("offset")!, 10) : undefined,
  });

  // Self-audit: log the read so we have a trail of who looked at the
  // audit log. The reader can see this entry too — that's the point.
  audit({
    action: "admin.audit_read",
    actor: `user:${user.id}`,
    businessId: user.businessId,
    resourceId: "audit-log",
    ok: true,
    meta: {
      filters: {
        action: params.get("action"),
        actionPrefix: params.get("actionPrefix"),
        actor: params.get("actor"),
        onlyFailures: params.get("onlyFailures") === "true",
      },
      returned: result.entries.length,
    },
  });

  return ok({
    entries: result.entries,
    total: result.total,
    fromDb: result.fromDb,
    pagination: {
      limit: parseInt(params.get("limit") ?? "50", 10),
      offset: parseInt(params.get("offset") ?? "0", 10),
    },
  });
});
