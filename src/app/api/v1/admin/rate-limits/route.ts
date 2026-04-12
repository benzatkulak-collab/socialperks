/**
 * GET  /api/v1/admin/rate-limits — Rate limit statistics dashboard
 * POST /api/v1/admin/rate-limits — Admin actions (reset IP)
 *
 * Auth required: admin role only.
 * Rate limited: strict tier.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import { getStats, resetForIp } from "@/lib/security/rate-limit-stats";

// ─── GET — Return rate limit statistics ─────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  // Auth required — admin only
  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin" && user.role !== "enterprise") {
    return err("FORBIDDEN", "Admin access required", 403);
  }

  // Rate limit — strict tier for admin endpoints
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const stats = getStats();

  return ok({ stats });
});

// ─── POST — Admin actions (reset IP) ────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth required — admin only
  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin" && user.role !== "enterprise") {
    return err("FORBIDDEN", "Admin access required", 403);
  }

  // Rate limit — strict tier
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  // Parse body
  const body = await parseBody<{ action?: string; ip?: string }>(req);
  if (body instanceof Response) return body;

  if (!body.action) {
    return err("MISSING_ACTION", "Request body must include an 'action' field", 400);
  }

  if (body.action === "reset") {
    if (!body.ip || typeof body.ip !== "string") {
      return err("MISSING_IP", "'ip' field is required for reset action", 400);
    }

    // Validate IP format (basic check)
    const ipPattern = /^[\d.:a-fA-F]+$/;
    if (!ipPattern.test(body.ip)) {
      return err("INVALID_IP", "Invalid IP address format", 400);
    }

    const found = resetForIp(body.ip);

    return ok({
      action: "reset",
      ip: body.ip,
      found,
      message: found
        ? `Rate limit stats reset for IP ${body.ip}`
        : `No rate limit data found for IP ${body.ip}`,
    });
  }

  return err(
    "UNKNOWN_ACTION",
    `Unknown action "${body.action}". Supported actions: reset`,
    400
  );
});
