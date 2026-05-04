/**
 * GET /api/v1/referrals/code
 *   - Gets-or-creates the referral code for the authenticated owner.
 *   - Returns share URL + uses + conversions for dashboard display.
 *
 * POST /api/v1/referrals/code/click
 *   - Public; bumps the click counter when someone visits a /?ref= link.
 */

import type { NextRequest } from "next/server";
import { ok, requireAuth, rateLimit } from "../../_shared";
import { getOrCreateCode, buildShareUrl } from "@/lib/referrals/codes";

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // The auth user has a role string ("business" | "influencer" | other).
  // We map "business" → business, anything else (creator, influencer) → influencer.
  const ownerType: "business" | "influencer" =
    user.role === "business" ? "business" : "influencer";

  // user.id is the seed-business or seed-influencer id (b1, i1, etc.)
  // or the email for password-auth signups.
  const code = await getOrCreateCode(ownerType, user.id);
  return ok({
    code: code.code,
    shareUrl: buildShareUrl(code.code),
    usesCount: code.usesCount,
    conversionsCount: code.conversionsCount,
    rewardUnlocked: code.rewardUnlocked,
    createdAt: code.createdAt,
  });
}
