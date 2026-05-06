/**
 * GET /api/v1/admin/funnel — admin-only recent-events view
 *
 * Lists the last 200 funnel events captured (from `lib/analytics`'s
 * recent ring buffer) so an operator can validate instrumentation
 * without needing PostHog access. Admin role only.
 *
 * Optional query: ?event=program.created to filter to one event name.
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
import { recentEvents } from "@/lib/analytics";
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
      resourceId: "funnel-events",
      ok: false,
      meta: { reason: "non-admin attempted to read funnel events", role: user.role },
    });
    return err("FORBIDDEN", "Admin role required", 403);
  }
  if (user.id.startsWith("api-key:")) {
    return err("FORBIDDEN", "API keys cannot read the funnel log", 403);
  }

  const params = getQuery(req);
  const event = params.get("event");

  let events = recentEvents();
  if (event) {
    events = events.filter((e) => e.event === event);
  }

  return ok({
    events: events.slice(0, 200),
    total: events.length,
  });
});
