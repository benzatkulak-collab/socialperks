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

// ─── Route Context Type ─────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ programId: string }>;
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Relaxed rate limit
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const { programId } = await (ctx as RouteContext).params;
  const program = programs.get(programId);

  if (!program) {
    return err("NOT_FOUND", `Program '${programId}' not found`, 404);
  }

  return ok({ program });
});

// ─── PUT ────────────────────────────────────────────────────────────────────

export const PUT = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const csrfError = requireCsrf(req, user);
  if (csrfError) return csrfError;

  // Standard rate limit
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const { programId } = await (ctx as RouteContext).params;
  const program = programs.get(programId);

  if (!program) {
    return err("NOT_FOUND", `Program '${programId}' not found`, 404);
  }

  // SECURITY: Verify ownership — only the program's business (or an admin)
  // may modify the program. Without this any authenticated user could
  // tamper with another business's perk programs by passing the programId.
  if (user.role !== "admin" && user.businessId !== program.businessId) {
    return err(
      "FORBIDDEN",
      "You do not have permission to modify this program",
      403
    );
  }

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

  const csrfError = requireCsrf(req, user);
  if (csrfError) return csrfError;

  // Standard rate limit
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const { programId } = await (ctx as RouteContext).params;
  const program = programs.get(programId);

  if (!program) {
    return err("NOT_FOUND", `Program '${programId}' not found`, 404);
  }

  // SECURITY: Verify ownership — only the program's business (or an admin)
  // may end the program.
  if (user.role !== "admin" && user.businessId !== program.businessId) {
    return err(
      "FORBIDDEN",
      "You do not have permission to end this program",
      403
    );
  }

  // Soft delete — set status to "ended"
  const ended: PerkProgram = {
    ...program,
    status: "ended",
    updatedAt: new Date().toISOString(),
  };
  programs.set(programId, ended);

  return ok({ program: ended });
});
