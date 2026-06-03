/**
 * GET /api/v1/wallet
 *
 * The authenticated user's perk wallet — every earned perk across all
 * businesses, or one business via `?businessId=`.
 *
 * Durable: reads are served from the in-memory write-through cache, which is
 * rehydrated from Postgres (`perk_wallet_entries`, migration 006) on each
 * serverless cold start. We await `hydrateWallets()` first so a request landing
 * on a fresh instance doesn't briefly see an empty wallet.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ok, rateLimit, requireAuth, withTiming } from "../_shared";
import { getWallet, hydrateWallets } from "@/lib/perk-wallet";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof NextResponse) return user;

  // Warm the cache from durable storage before reading (cold-start safety).
  await hydrateWallets();

  const businessId = new URL(req.url).searchParams.get("businessId");
  if (businessId) {
    return ok({ wallet: getWallet(user.id, businessId) });
  }

  const wallets = getWallet(user.id);
  const totalAvailable = wallets.reduce((sum, w) => sum + w.totalAvailable, 0);
  const activeCount = wallets.reduce((sum, w) => sum + w.activeCount, 0);

  return ok({
    wallets,
    totalAvailable: Math.round(totalAvailable * 100) / 100,
    activeCount,
  });
});
