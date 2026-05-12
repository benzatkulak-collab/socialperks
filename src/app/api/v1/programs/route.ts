/**
 * GET/POST /api/v1/programs
 *
 * Perk program CRUD — list and create.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  getQuery,
  paginate,
  withTiming,
} from "../_shared";
import {
  programs,
  type PerkProgram,
  type ProgramRule,
  type ProgramTier,
} from "@/lib/programs/store";

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  // Relaxed rate limit
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const params = getQuery(req);
  const businessId = params.get("businessId");

  if (!businessId) {
    return err("MISSING_BUSINESS_ID", "businessId query parameter is required", 400);
  }

  const { page, perPage } = paginate(params);

  // Collect programs for business
  const businessPrograms: PerkProgram[] = [];
  for (const program of programs.values()) {
    if (program.businessId === businessId) {
      businessPrograms.push(program);
    }
  }

  // Sort by createdAt descending
  businessPrograms.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Paginate
  const total = businessPrograms.length;
  const start = (page - 1) * perPage;
  const items = businessPrograms.slice(start, start + perPage);

  return ok({
    programs: items,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
});

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Standard rate limit
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const body = await parseBody<{
    businessId: string;
    name: string;
    description?: string;
    rules?: ProgramRule[];
    tiers?: ProgramTier[];
    cycle?: PerkProgram["cycle"];
    cycleStartDay?: number;
  }>(req);
  if (body instanceof Response) return body;

  const { businessId, name, description, rules, tiers, cycle, cycleStartDay } = body;

  if (!businessId) {
    return err("MISSING_BUSINESS_ID", "businessId is required", 400);
  }
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return err("MISSING_NAME", "Program name is required", 400);
  }

  // SECURITY: businessId in the body must match the authenticated user's
  // business (or the caller must be an admin). Otherwise a business user could
  // create programs under another business's account.
  if (user.role !== "admin" && user.businessId && user.businessId !== businessId) {
    return err(
      "FORBIDDEN",
      "Cannot create a program for a different business",
      403
    );
  }

  const now = new Date().toISOString();
  const program: PerkProgram = {
    id: crypto.randomUUID(),
    businessId,
    name: name.trim(),
    description: description?.trim() ?? "",
    status: "active",
    rules: rules ?? [],
    tiers: tiers ?? [],
    cycle: cycle ?? "monthly",
    cycleStartDay: cycleStartDay ?? 1,
    createdAt: now,
    updatedAt: now,
  };

  programs.set(program.id, program);

  return ok({ program }, 201);
});
