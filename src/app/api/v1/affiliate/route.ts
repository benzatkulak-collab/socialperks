/**
 * Affiliate API — /api/v1/affiliate
 *
 * GET   → return the current user's affiliate stats + referral history
 * POST  → { action: "create" } → create an affiliate code for the current user
 *
 * Distinct from /api/v1/referrals (business-to-business credits) — this is the
 * public 30%-recurring affiliate program.
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, requireCsrf, rateLimit, parseBody, withTiming } from "../_shared";
import {
  createAffiliate,
  getAffiliateByUser,
  getStats,
  getReferrals,
} from "@/lib/affiliate";

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const csrfError = requireCsrf(req, auth);
  if (csrfError) return csrfError;

  const aff = getAffiliateByUser(auth.id);
  if (!aff) {
    return ok({ enrolled: false }, 200);
  }

  const stats = getStats(aff.id);
  const referrals = getReferrals(aff.id);

  return ok({
    enrolled: true,
    affiliate: {
      id: aff.id,
      code: aff.code,
      commissionRate: aff.commissionRate,
      status: aff.status,
      createdAt: aff.createdAt,
    },
    stats,
    referrals,
  });
});

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const csrfError = requireCsrf(req, auth);
  if (csrfError) return csrfError;

  const body = await parseBody<{ action?: string }>(req);
  if (body instanceof Response) return body;

  const action = body.action ?? "create";

  switch (action) {
    case "create": {
      const aff = createAffiliate(auth.id);
      const stats = getStats(aff.id);
      return ok(
        {
          affiliate: {
            id: aff.id,
            code: aff.code,
            commissionRate: aff.commissionRate,
            status: aff.status,
            createdAt: aff.createdAt,
          },
          stats,
        },
        201
      );
    }

    default:
      return err("INVALID_ACTION", "action must be 'create'");
  }
});
