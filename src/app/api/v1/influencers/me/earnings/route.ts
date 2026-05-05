/**
 * GET /api/v1/influencers/me/earnings
 *
 * Authenticated creator's earnings widget.
 * Powers the influencer dashboard "shareable wins" surface (Phase 18)
 * and is the source of truth that replaces the placeholder estimate
 * on the public /i/[slug] page (Phase 17).
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit } from "../../../_shared";
import { totalEarnedCents, recentEarnings } from "@/lib/earnings";

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // The auth user.id maps to the influencer record id when role=influencer.
  // For password-auth signups before influencer-profile linking, this just
  // returns 0 — no false positives.
  const influencerId = user.id;

  const [last90, lifetime, recent] = await Promise.all([
    totalEarnedCents(influencerId, 90),
    totalEarnedCents(influencerId),
    recentEarnings(influencerId, 5),
  ]);

  if (!influencerId) {
    return err("NO_PROFILE", "No creator profile linked to this account yet", 404);
  }

  return ok({
    last90Days: { cents: last90, dollars: last90 / 100 },
    lifetime: { cents: lifetime, dollars: lifetime / 100 },
    recent: recent.map((e) => ({
      submissionId: e.submissionId,
      amountDollars: e.amountCents / 100,
      currency: e.currency,
      campaignId: e.campaignId,
      businessId: e.businessId,
      awardedAt: e.awardedAt,
      paidOut: !!e.payoutAt,
    })),
  });
}
