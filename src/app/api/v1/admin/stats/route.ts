/**
 * GET /api/v1/admin/stats — admin dashboard aggregate stats
 *
 * Returns counts and recent activity that back the top-of-funnel
 * tiles on /admin. Admin role only (api keys excluded).
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, withTiming } from "../../_shared";
import { createSeedData } from "@social-perks/shared/seed";
import { queryAuditLog } from "@/lib/audit-log";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  if (user.role !== "admin") {
    return err("FORBIDDEN", "Admin role required", 403);
  }
  if (user.id.startsWith("api-key:")) {
    return err("FORBIDDEN", "API keys cannot read admin stats", 403);
  }

  // User counts are derived from seed data. When real users live in
  // Postgres, swap this for a SELECT COUNT(*) GROUP BY role.
  const seed = createSeedData();
  const businesses = seed.businesses.length;
  const enterprises = seed.businesses.filter((b) => b.size === "enterprise").length;
  const influencers = seed.influencers.length;

  // Recent security-sensitive audit events (last 50, ordered desc).
  let recentAudit: Awaited<ReturnType<typeof queryAuditLog>>["entries"] = [];
  let auditFailures24h = 0;
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [recent, failures] = await Promise.all([
      queryAuditLog({ limit: 10 }),
      queryAuditLog({ onlyFailures: true, since: since24h, limit: 200 }),
    ]);
    recentAudit = recent.entries;
    auditFailures24h = failures.total;
  } catch {
    // Audit log being unavailable should never break the dashboard.
  }

  return ok({
    users: {
      total: businesses + influencers + 1, // +1 for admin
      businesses: businesses - enterprises,
      enterprises,
      influencers,
      admins: 1,
    },
    security: {
      auditFailures24h,
      recentAudit: recentAudit.slice(0, 10),
    },
  });
});
