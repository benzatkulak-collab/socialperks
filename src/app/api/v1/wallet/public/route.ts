/**
 * GET /api/v1/wallet/public?token=...
 *
 * The anonymous-customer view of a perk wallet, gated by an HMAC-signed
 * magic-link token (see lib/security/perk-link). No login required — the token
 * encodes the customer's `cust_<hash>` id and is unforgeable without the server
 * secret. Powers the /perk/[token] page so a customer who claimed a perk via the
 * public /c flow can see and redeem it without creating an account.
 *
 * Durable: warms the perk-wallet cache from Postgres on cold start before read.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, withTiming } from "../../_shared";
import { getWallet, hydrateWallets } from "@/lib/perk-wallet";
import { verifyPerkToken } from "@/lib/security/perk-link";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const token = new URL(req.url).searchParams.get("token") ?? "";
  const userId = verifyPerkToken(token);
  if (!userId) {
    return err("INVALID_TOKEN", "This perk link is invalid or has expired.", 401);
  }

  await hydrateWallets();
  const wallets = getWallet(userId);
  const totalAvailable = wallets.reduce((sum, w) => sum + w.totalAvailable, 0);
  const activeCount = wallets.reduce((sum, w) => sum + w.activeCount, 0);

  return ok({
    wallets,
    totalAvailable: Math.round(totalAvailable * 100) / 100,
    activeCount,
  });
});
