/**
 * POST /api/v1/wallet/redeem   { perkId }
 *
 * Redeem one of the authenticated user's available perks. Ownership is enforced
 * (you can only redeem your own perk), redemption is single-use and race-safe
 * (per-perk lock in safeRedeemPerk), and the status change is persisted durably
 * so it survives a serverless cold start.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ok, err, rateLimit, requireAuth, requireCsrf, parseBody, withTiming } from "../../_shared";
import { safeRedeemPerk, hydrateWallets } from "@/lib/perk-wallet";
import { validateString } from "@/lib/security/validate";

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof NextResponse) return user;

  // CSRF — mutating, cookie-auth-capable route.
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

  const body = await parseBody<{ perkId?: string }>(req);
  if (body instanceof Response) return body;

  const pv = validateString(body.perkId, "perkId", { min: 1, max: 100 });
  if (!pv.success) return err("INVALID_PERK_ID", pv.error, 400);

  // Cold-start safety: the perk must be in the cache before we look it up.
  await hydrateWallets();

  const result = await safeRedeemPerk(pv.data, user.id);
  if (!result.success) {
    const code = result.error!.code;
    const status =
      code === "NOT_FOUND"
        ? 404
        : code === "UNAUTHORIZED"
          ? 403
          : code === "ALREADY_REDEEMED" || code === "PERK_EXPIRED"
            ? 409
            : 400;
    return err(code, result.error!.message, status);
  }

  return ok({
    perk: result.data!.perk,
    redemptionCode: result.data!.redemptionCode,
  });
});
