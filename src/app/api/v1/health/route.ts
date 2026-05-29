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
import { db, InMemoryConnection } from "@/lib/db/connection";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  // Whether the app is backed by durable Postgres or the volatile in-memory
  // fallback. The in-memory connection ALWAYS reports healthy, so without
  // this flag /health says "connected" even when every write evaporates on
  // the next cold start. `durable` is the signal ops/CI should trust.
  const durable = !(db instanceof InMemoryConnection);

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
    database: { connected, durable, mode: durable ? "postgres" : "in-memory" },
    // SECURITY: Node version, memory readings, uptime, pool size all
    // intentionally omitted from the public response. They were
    // information-disclosure vectors. Detailed metrics are in the
    // token-gated readiness probe.
  });
});
