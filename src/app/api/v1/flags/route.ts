/**
 * Feature Flags API Route — /api/v1/flags
 *
 * GET:  Evaluate all flags for the current user context.
 *       Returns Record<string, boolean | unknown>.
 *       Authenticated users get personalized evaluation;
 *       anonymous gets default evaluation.
 *
 * POST: Admin only. Create, update, or delete flags.
 *       Actions: "create", "update", "delete"
 *
 * Rate limit: standard tier (authenticated), relaxed tier (GET)
 */

import type { NextRequest } from "next/server";
import { ok, err, getUser, rateLimit, parseBody, withTiming } from "../_shared";
import {
  evaluateAll,
  createFlag,
  updateFlag,
  deleteFlag,
  listFlags,
  getFlag,
  type FlagContext,
} from "@/lib/feature-flags";

// ─── GET: Evaluate all flags for current user ──────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const user = getUser(req);
  const context: FlagContext = user
    ? {
        userId: user.id,
        businessId: user.businessId ?? undefined,
        role: user.role,
      }
    : {};

  const evaluated = evaluateAll(context);
  return ok(evaluated);
});

// ─── POST: Admin flag management ────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const user = getUser(req);
  if (!user) return err("NO_TOKEN", "Authentication required", 401);
  if (user.role !== "admin" && user.role !== "enterprise") {
    return err("FORBIDDEN", "Only admins can manage feature flags", 403);
  }

  const body = await parseBody<{
    action: "create" | "update" | "delete" | "list" | "get";
    flagId?: string;
    flag?: Record<string, unknown>;
  }>(req);

  if (body instanceof Response) return body;

  switch (body.action) {
    case "create": {
      if (!body.flag || !body.flag.id) {
        return err("INVALID_INPUT", "Flag id is required for creation", 400);
      }
      const existing = getFlag(body.flag.id as string);
      if (existing) {
        return err("DUPLICATE", `Flag "${body.flag.id}" already exists`, 409);
      }
      const created = createFlag(body.flag as Parameters<typeof createFlag>[0]);
      return ok(created, 201);
    }

    case "update": {
      if (!body.flagId) {
        return err("INVALID_INPUT", "flagId is required for update", 400);
      }
      try {
        const updated = updateFlag(body.flagId, body.flag ?? {});
        return ok(updated);
      } catch {
        return err("NOT_FOUND", `Flag "${body.flagId}" not found`, 404);
      }
    }

    case "delete": {
      if (!body.flagId) {
        return err("INVALID_INPUT", "flagId is required for delete", 400);
      }
      const deleted = deleteFlag(body.flagId);
      if (!deleted) {
        return err("NOT_FOUND", `Flag "${body.flagId}" not found`, 404);
      }
      return ok({ deleted: body.flagId });
    }

    case "list": {
      return ok(listFlags());
    }

    case "get": {
      if (!body.flagId) {
        return err("INVALID_INPUT", "flagId is required", 400);
      }
      const flag = getFlag(body.flagId);
      if (!flag) {
        return err("NOT_FOUND", `Flag "${body.flagId}" not found`, 404);
      }
      return ok(flag);
    }

    default:
      return err(
        "INVALID_ACTION",
        'Action must be one of: create, update, delete, list, get',
        400
      );
  }
});
