/**
 * Admin system metrics — /api/v1/admin/system
 *
 * Detailed runtime metrics for the /admin/system page. Public /health
 * intentionally omits these to avoid info-disclosure; this endpoint is
 * admin-gated so it's safe to surface them.
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, withTiming } from "../../_shared";
import { db } from "@/lib/db/connection";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin") return err("FORBIDDEN", "Admin role required", 403);

  let dbConnected = false;
  try {
    const h = await db.healthCheck();
    dbConnected = h.connected;
  } catch {
    dbConnected = false;
  }

  const mem = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return ok({
    status: dbConnected ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    uptimeSeconds: process.uptime(),
    pid: process.pid,
    database: { connected: dbConnected },
    memory: {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      externalMB: Math.round(mem.external / 1024 / 1024),
    },
    cpu: {
      userMicros: cpuUsage.user,
      systemMicros: cpuUsage.system,
    },
    env: {
      mode: process.env.NODE_ENV ?? "development",
      // Boolean-ize secrets so the response shows config presence
      // without leaking values.
      hasAuthSecret: Boolean(process.env.AUTH_SECRET),
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasStripeKey: Boolean(process.env.STRIPE_SECRET_KEY),
      hasResendKey: Boolean(process.env.RESEND_API_KEY),
      hasCronSecret: Boolean(process.env.CRON_SECRET),
      hasAdminPassword: Boolean(process.env.ADMIN_PASSWORD),
    },
  });
});
