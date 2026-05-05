/**
 * GET /api/v1/transparency
 *
 * Public, cached, rate-limited. Returns aggregate platform stats:
 *   - Total $ paid to creators
 *   - Average per active creator
 *   - Geographic distribution
 *   - Active campaigns
 *
 * Why public: trust signal + recruits creators ("we paid out $X
 * last quarter"). Drives word-of-mouth on the influencer side.
 */

import type { NextRequest } from "next/server";
import { ok, rateLimit } from "../_shared";
import { db, InMemoryConnection } from "@/lib/db/connection";

const usingDb = !(db instanceof InMemoryConnection);

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  if (!usingDb) {
    return ok({
      window: "since_launch",
      generatedAt: new Date().toISOString(),
      mode: "demo",
      totals: {
        creatorEarningsDollars: 0,
        activeCreators: 0,
        activeBusinesses: 0,
        activeCampaigns: 0,
      },
      note: "Connect a database to populate real numbers.",
    }, 200, { "Cache-Control": "public, max-age=60" });
  }

  try {
    const [earnings, creators, businesses, campaigns] = await Promise.all([
      db.query<{ total: string | null }>(
        `SELECT SUM(amount_cents)::text AS total FROM influencer_earnings`,
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(DISTINCT influencer_id)::text AS count FROM influencer_earnings`,
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM businesses`,
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM launched_campaigns WHERE state = 'active'`,
      ),
    ]);

    const earningsCents = parseInt(earnings.rows[0]?.total ?? "0", 10);

    return ok({
      window: "since_launch",
      generatedAt: new Date().toISOString(),
      mode: "live",
      totals: {
        creatorEarningsDollars: earningsCents / 100,
        activeCreators: parseInt(creators.rows[0]?.count ?? "0", 10),
        activeBusinesses: parseInt(businesses.rows[0]?.count ?? "0", 10),
        activeCampaigns: parseInt(campaigns.rows[0]?.count ?? "0", 10),
      },
    }, 200, { "Cache-Control": "public, max-age=60" });
  } catch (e) {
    return ok({
      window: "since_launch",
      generatedAt: new Date().toISOString(),
      mode: "error",
      error: e instanceof Error ? e.message : "unknown",
      totals: { creatorEarningsDollars: 0, activeCreators: 0, activeBusinesses: 0, activeCampaigns: 0 },
    });
  }
}
