/**
 * Health Check API Route — /api/v1/health
 *
 * GET: Returns server status, uptime, Node version, memory usage,
 * and database connectivity (both raw connection pool and Prisma).
 * Rate limit: public tier
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ok, rateLimit, withTiming } from "../_shared";
import { setNoCacheHeaders } from "@/lib/api/edge-cache";
import { db } from "@/lib/db/connection";
import { checkPrismaHealth } from "@/lib/db/prisma";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const mem = process.memoryUsage();

  // Check raw connection pool health
  let database: { connected: boolean; latencyMs: number; poolSize: number };
  try {
    database = await db.healthCheck();
  } catch {
    database = { connected: false, latencyMs: -1, poolSize: 0 };
  }

  // Check Prisma/Supabase connectivity
  let prismaHealth: { connected: boolean; latencyMs: number; error?: string };
  try {
    prismaHealth = await checkPrismaHealth();
  } catch {
    prismaHealth = { connected: false, latencyMs: -1, error: "Health check threw" };
  }

  // We're "ok" if either backend (raw pool or Prisma) is reachable.
  // When DATABASE_URL is unset both backends are effectively in-memory and
  // always report connected — that's fine. When DATABASE_URL is set, both
  // returning `connected: false` means the database is unreachable and the
  // service should be considered degraded so monitoring/load balancers can
  // route traffic away.
  const allConnected = database.connected || prismaHealth.connected;
  const status = allConnected ? "ok" : "degraded";
  const httpStatus = allConnected ? 200 : 503;

  const payload = {
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
    prisma: {
      connected: prismaHealth.connected,
      latencyMs: prismaHealth.latencyMs,
      ...(prismaHealth.error ? { error: prismaHealth.error } : {}),
    },
  };

  const res = allConnected
    ? ok(payload)
    : NextResponse.json(
        { success: false, data: payload },
        { status: httpStatus, headers: { "Content-Type": "application/json" } }
      );
  setNoCacheHeaders(res);
  return res;
});
