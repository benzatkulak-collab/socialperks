/**
 * GET/PUT/DELETE /api/v1/programs/:programId
 *
 * Individual perk program operations.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  requireCsrf,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import { programs, type PerkProgram, type ProgramRule, type ProgramTier } from "@/lib/programs/store";
import { requireOwnership } from "@/lib/security/owner";

// ─── Route Context Type ─────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ programId: string }>;
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required — program details are business-specific
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const { programId } = await (ctx as RouteContext).params;
  const program = programs.get(programId);

  if (!program) {
    return err("NOT_FOUND", `Program '${programId}' not found`, 404);
  }

  // Ownership: explicit (treats null user.businessId as no-access).
  const ownership = requireOwnership(user, program.businessId);
  if (ownership) return ownership;

  return ok({ program });
});

// ─── PUT ────────────────────────────────────────────────────────────────────

export const PUT = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Standard rate limit
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // CSRF — enforce on mutating routes (PR: live audit found bypass)
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

  const { programId } = await (ctx as RouteContext).params;
  const program = programs.get(programId);

  if (!program) {
    return err("NOT_FOUND", `Program '${programId}' not found`, 404);
  }

  // Ownership check — was previously missing entirely (IDOR vector).
  const ownership = requireOwnership(user, program.businessId);
  if (ownership) return ownership;

  const body = await parseBody<{
    name?: string;
    description?: string;
    status?: PerkProgram["status"];
    rules?: ProgramRule[];
    tiers?: ProgramTier[];
    cycle?: PerkProgram["cycle"];
    cycleStartDay?: number;
  }>(req);
  if (body instanceof Response) return body;

  // Apply partial updates
  const updated: PerkProgram = {
    ...program,
    ...(body.name !== undefined && { name: body.name.trim() }),
    ...(body.description !== undefined && { description: body.description.trim() }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.rules !== undefined && { rules: body.rules }),
    ...(body.tiers !== undefined && { tiers: body.tiers }),
    ...(body.cycle !== undefined && { cycle: body.cycle }),
    ...(body.cycleStartDay !== undefined && { cycleStartDay: body.cycleStartDay }),
    updatedAt: new Date().toISOString(),
  };

  programs.set(programId, updated);

  return ok({ program: updated });
});

// ─── DELETE ─────────────────────────────────────────────────────────────────

export const DELETE = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Standard rate limit
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // CSRF — enforce on mutating routes (PR: live audit found bypass)
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

  const { programId } = await (ctx as RouteContext).params;
  const program = programs.get(programId);

  if (!program) {
    return err("NOT_FOUND", `Program '${programId}' not found`, 404);
  }

  // Ownership check — was previously missing entirely (IDOR vector).
  const ownership = requireOwnership(user, program.businessId);
  if (ownership) return ownership;

  // Soft delete — set status to "ended"
  const ended: PerkProgram = {
    ...program,
    status: "ended",
    updatedAt: new Date().toISOString(),
  };
  programs.set(programId, ended);

  return ok({ program: ended });
});
