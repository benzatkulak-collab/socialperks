/**
 * POST /api/v1/wallet/public/redeem   { token, perkId }
 *
 * Redeem one of a customer's perks via the magic-link token (no login). The
 * token authenticates the customer (it encodes their userId and is HMAC-signed),
 * so this route does NOT use cookie auth and therefore needs no CSRF token — a
 * forged cross-site request can't supply the secret token. Ownership, single-use,
 * and durability are all enforced inside safeRedeemPerk.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, parseBody, withTiming } from "../../../_shared";
import { safeRedeemPerk, hydrateWallets } from "@/lib/perk-wallet";
import { verifyPerkToken } from "@/lib/security/perk-link";
import { validateString } from "@/lib/security/validate";

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const body = await parseBody<{ token?: string; perkId?: string }>(req);
  if (body instanceof Response) return body;

  const userId = verifyPerkToken(body.token ?? "");
  if (!userId) {
    return err("INVALID_TOKEN", "This perk link is invalid or has expired.", 401);
  }

  const pv = validateString(body.perkId, "perkId", { min: 1, max: 100 });
  if (!pv.success) return err("INVALID_PERK_ID", pv.error, 400);

  // Cold-start safety: the perk must be in the cache before we look it up.
  await hydrateWallets();

  // safeRedeemPerk enforces ownership (the perk must belong to `userId`),
  // single-use redemption (per-perk lock), and persists the status change.
  const result = await safeRedeemPerk(pv.data, userId);
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
