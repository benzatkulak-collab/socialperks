/**
 * GET/POST /api/v1/programs
 *
 * Perk program CRUD — list and create.
 */

import { NextRequest } from "next/server";
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
import { validateString, validateNumber, validateEnum } from "@/lib/security/validate";

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  // Auth required — program data is business-specific
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const params = getQuery(req);
  const businessId = params.get("businessId");

  if (!businessId) {
    return err("MISSING_BUSINESS_ID", "businessId query parameter is required", 400);
  }

  // Tenant isolation: users can only list their own business's programs
  if (user.businessId && user.businessId !== businessId) {
    return err("FORBIDDEN", "You can only view your own business's programs", 403);
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

  // Tenant isolation: users can only create programs for their own business
  if (user.businessId && user.businessId !== businessId) {
    return err("FORBIDDEN", "You can only create programs for your own business", 403);
  }

  const nameResult = validateString(name, "name", { min: 1, max: 200 });
  if (!nameResult.success) return err("INVALID_NAME", nameResult.error, 400);

  if (description !== undefined) {
    const descResult = validateString(description, "description", { max: 2000 });
    if (!descResult.success) return err("INVALID_DESCRIPTION", descResult.error, 400);
  }

  const validCycles = ["daily", "weekly", "monthly", "quarterly", "annual"] as const;
  if (cycle !== undefined) {
    const cycleResult = validateEnum(cycle, "cycle", validCycles);
    if (!cycleResult.success) return err("INVALID_CYCLE", cycleResult.error, 400);
  }

  if (cycleStartDay !== undefined) {
    const dayResult = validateNumber(cycleStartDay, "cycleStartDay", { min: 1, max: 31 });
    if (!dayResult.success) return err("INVALID_CYCLE_START_DAY", dayResult.error, 400);
  }

  // Validate rules array structure
  if (rules !== undefined) {
    if (!Array.isArray(rules)) return err("INVALID_RULES", "rules must be an array", 400);
    if (rules.length > 100) return err("INVALID_RULES", "rules must have at most 100 entries", 400);
    for (const rule of rules) {
      if (!rule || typeof rule !== "object") return err("INVALID_RULES", "Each rule must be an object", 400);
      if (!rule.actionId || !rule.platformId) return err("INVALID_RULES", "Each rule must have actionId and platformId", 400);
    }
  }

  // Validate tiers array structure
  if (tiers !== undefined) {
    if (!Array.isArray(tiers)) return err("INVALID_TIERS", "tiers must be an array", 400);
    if (tiers.length > 20) return err("INVALID_TIERS", "tiers must have at most 20 entries", 400);
    for (const tier of tiers) {
      if (!tier || typeof tier !== "object") return err("INVALID_TIERS", "Each tier must be an object", 400);
      if (!tier.name) return err("INVALID_TIERS", "Each tier must have a name", 400);
    }
  }

  const now = new Date().toISOString();
  const program: PerkProgram = {
    id: crypto.randomUUID(),
    businessId,
    name: nameResult.data,
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
