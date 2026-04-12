/**
 * Status API Route — /api/v1/status
 *
 * GET: Returns system status including service health derived from
 * circuit breaker states. Public, no-cache.
 */

import type { NextRequest } from "next/server";
import { ok, rateLimit, withTiming } from "../_shared";
import { setNoCacheHeaders } from "@/lib/api/edge-cache";
import { getCircuitHealth } from "@/lib/resilience";
import { db } from "@/lib/db/connection";

type ServiceStatus = "operational" | "degraded" | "down";

/**
 * Map a circuit breaker state to a service status.
 *   closed     → operational (all requests flowing)
 *   half_open  → degraded    (testing recovery)
 *   open       → down        (requests being rejected)
 */
function circuitStateToStatus(state: string): ServiceStatus {
  switch (state) {
    case "closed":
      return "operational";
    case "half_open":
      return "degraded";
    case "open":
      return "down";
    default:
      return "degraded";
  }
}

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  // ── Gather service health from circuit breakers ─────────────────────────

  const circuitHealth = getCircuitHealth();

  // API is operational if we can respond at all
  const apiStatus: ServiceStatus = "operational";

  // Database health check
  let databaseStatus: ServiceStatus;
  try {
    const dbHealth = await db.healthCheck();
    databaseStatus = dbHealth.connected ? "operational" : "down";
  } catch {
    databaseStatus = "down";
  }

  // Cache — no dedicated cache circuit, infer from API responsiveness
  // For now, report as operational (in-memory caching is always available)
  const cacheStatus: ServiceStatus = "operational";

  // Email status from circuit breaker
  const emailCircuit = circuitHealth.email;
  const emailStatus: ServiceStatus = emailCircuit
    ? circuitStateToStatus(emailCircuit.state)
    : "operational";

  // ── Derive overall status ──────────────────────────────────────────────

  const services = {
    api: apiStatus,
    database: databaseStatus,
    cache: cacheStatus,
    email: emailStatus,
    stripe: circuitHealth.stripe
      ? circuitStateToStatus(circuitHealth.stripe.state)
      : "operational",
    verification: circuitHealth.verification
      ? circuitStateToStatus(circuitHealth.verification.state)
      : "operational",
  };

  const allStatuses = Object.values(services);
  const hasDown = allStatuses.includes("down");
  const hasDegraded = allStatuses.includes("degraded");

  let overallStatus: ServiceStatus;
  if (hasDown) {
    overallStatus = "degraded";
  } else if (hasDegraded) {
    overallStatus = "degraded";
  } else {
    overallStatus = "operational";
  }

  const res = ok({
    status: overallStatus,
    services,
    version: "1.0.0",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });

  setNoCacheHeaders(res);
  return res;
});
