/**
 * Health Check API Route — /api/v1/health
 *
 * GET: Returns minimal server status. Response is intentionally
 * coarse-grained because /health is anonymous-public — exposing the
 * exact Node version, uptime, and memory readings to attackers helps
 * them target known CVEs and stage DoS / OOM attacks.
 *
 * Detailed health metrics live behind the token-gated readiness probe
 * at /api/v1/reliability or wherever they're already token-gated.
 */

import type { NextRequest } from "next/server";
import { ok, rateLimit, withTiming } from "../_shared";
import { db } from "@/lib/db/connection";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  let connected = false;
  try {
    const h = await db.healthCheck();
    connected = h.connected;
  } catch {
    connected = false;
  }

  return ok({
    status: connected ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    database: { connected },
    // SECURITY: Node version, memory readings, uptime, pool size all
    // intentionally omitted from the public response. They were
    // information-disclosure vectors. Detailed metrics are in the
    // token-gated readiness probe.
  });
});
