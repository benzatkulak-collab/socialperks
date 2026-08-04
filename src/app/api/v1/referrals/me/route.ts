/**
 * GET /api/v1/referrals/me
 *
 * Authenticated owner's referral dashboard data:
 *   - Their code + share URL
 *   - Click count, conversion count
 *   - Recent attributions (anonymized — only timestamp + type)
 *   - Estimated commission (10% MRR for 12 months on referred businesses)
 */

import type { NextRequest } from "next/server";
import { ok, requireAuth, rateLimit } from "../../_shared";
import { getOrCreateCode, buildShareUrl } from "@/lib/referrals/codes";
import { db, InMemoryConnection } from "@/lib/db/connection";
import { PLANS } from "@/lib/billing/store";

const usingDb = !(db instanceof InMemoryConnection);

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const ownerType: "business" | "influencer" =
    user.role === "business" ? "business" : "influencer";
  const code = await getOrCreateCode(ownerType, user.id);

  let recentAttributions: Array<{ type: string; at: string }> = [];
  if (usingDb) {
    try {
      const result = await db.query<{ type: string; attributed_at: string }>(
        `SELECT
           CASE
             WHEN attributed_business_id IS NOT NULL THEN 'business'
             WHEN attributed_influencer_id IS NOT NULL THEN 'influencer'
             ELSE 'visitor'
           END AS type,
           created_at AS attributed_at
         FROM referral_attributions
         WHERE code = $1
         ORDER BY created_at DESC
         LIMIT 25`,
        [code.code],
      );
      recentAttributions = result.rows.map((r) => ({ type: r.type, at: r.attributed_at }));
    } catch { /* ignore */ }
  }

  // Conservative commission preview: 10% of estimated MRR for 12 months
  // per attributed business. Until real subscription→commission joins are
  // wired, we surface conversions count × 10% of the Pro monthly price.
  // Derived from PLANS rather than hardcoded so a repricing cannot silently
  // leave the referrer dashboard quoting a stale commission.
  const COMMISSION_RATE = 0.1;
  const businessConversions = recentAttributions.filter((a) => a.type === "business").length;
  const estimatedCommissionDollars =
    Math.round(businessConversions * PLANS.professional.monthlyPrice * COMMISSION_RATE * 100) / 100;

  return ok({
    code: code.code,
    shareUrl: buildShareUrl(code.code),
    metrics: {
      clicks: code.usesCount,
      conversions: code.conversionsCount,
      businessConversions,
      estimatedCommissionDollars,
    },
    recentAttributions,
  });
}
