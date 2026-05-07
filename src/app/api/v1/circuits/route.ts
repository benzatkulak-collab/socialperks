/**
 * GET  /api/v1/circuits — Health status of all circuit breakers
 * POST /api/v1/circuits — Force reset a specific circuit breaker
 *
 * Dev/admin only. Requires authentication.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  requireScope,
  rateLimit,
  parseBody,
  withTiming,
} from "../_shared";
import { NextResponse } from "next/server";
import { getCircuitHealth, getCircuit } from "@/lib/resilience";

// ── GET — Circuit Health Dashboard ──────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof NextResponse) return user;

  // Rate limit — relaxed (admin/monitoring endpoint)
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const health = getCircuitHealth();

  return ok({ circuits: health });
});

// ── POST — Force Reset a Circuit ────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof NextResponse) return user;

  // Circuit reset is a destructive admin operation.
  const scopeErr = requireScope(user, "admin");
  if (scopeErr) return scopeErr;

  // Rate limit — strict (destructive admin action)
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  // Parse body
  const body = await parseBody<{ circuit?: string }>(req);
  if (body instanceof Response) return body;

  const { circuit: circuitName } = body;

  if (!circuitName || typeof circuitName !== "string") {
    return err(
      "MISSING_CIRCUIT",
      "circuit is required. Valid values: stripe, email, verification",
      400
    );
  }

  const circuit = getCircuit(circuitName);
  if (!circuit) {
    return err(
      "UNKNOWN_CIRCUIT",
      `Unknown circuit: "${circuitName}". Valid values: stripe, email, verification`,
      404
    );
  }

  const prevState = circuit.getState();
  circuit.reset();

  return ok({
    circuit: circuitName,
    previousState: prevState,
    currentState: circuit.getState(),
    message: `Circuit "${circuitName}" has been reset to closed`,
  });
});
