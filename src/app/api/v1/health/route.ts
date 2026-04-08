/**
 * Health Check API Route — /api/v1/health
 *
 * GET: Returns server status, uptime, Node version, memory usage,
 * and database connectivity.
 * Rate limit: public tier
 */

import type { NextRequest } from "next/server";
import { ok, rateLimit, withTiming } from "../_shared";
import { db } from "@/lib/db/connection";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const mem = process.memoryUsage();

  let database: { connected: boolean; latencyMs: number; poolSize: number };
  try {
    database = await db.healthCheck();
  } catch {
    database = { connected: false, latencyMs: -1, poolSize: 0 };
  }

  const status = database.connected ? "ok" : "degraded";

  return ok({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    node: process.version,
    memory: {
      heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
    },
    database: {
      connected: database.connected,
      latencyMs: database.latencyMs,
      poolSize: database.poolSize,
    },
  });
});
