/**
 * GET /api/v1/cron/campaign-sweeps
 *
 * Daily housekeeping pass:
 *   - Auto-archive ended/expired campaigns untouched for >30 days
 *   - Detect campaigns near capacity + expiry (extension candidates)
 *   - Auto-pause campaigns over the business's plan limit (e.g. after a
 *     downgrade)
 *
 * Operates on the durable `launched_campaign_state` table (flat, TEXT-keyed),
 * which is the source of truth the campaign state machine writes through to.
 * The previous implementation ran against the dead v1 `launched_campaigns`
 * table using columns that don't exist there and JOINed `businesses` on a TEXT
 * id that never matched, so all three steps were silent no-ops.
 *
 * Auth: scheduler sends `Authorization: Bearer ${CRON_SECRET}` (.github/workflows/cron.yml).
 * Skipped without DATABASE_URL.
 */

import type { NextRequest } from "next/server";
import { ok, err } from "../../_shared";
import { db, InMemoryConnection } from "@/lib/db/connection";
import { logger } from "@/lib/logging";
import { constantTimeEqual } from "@/lib/security/order-by";
import { hydrateSubscriptions } from "@/lib/billing/store";
import { getBusinessPlan, getPlanLimits } from "@/lib/billing/enforcement";

const usingDb = !(db instanceof InMemoryConnection);

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return err("CRON_NOT_CONFIGURED", "CRON_SECRET unset", 503);
  // SECURITY: constant-time compare to avoid timing oracle on the secret.
  const auth = req.headers.get("authorization") ?? "";
  if (!constantTimeEqual(auth, `Bearer ${secret}`)) {
    return err("UNAUTHORIZED", "Invalid cron token", 401);
  }
  if (!usingDb) {
    return ok({ ran: false, reason: "DATABASE_URL not set" });
  }

  let archived = 0;
  let nearCapacity = 0;
  let pausedOverLimit = 0;

  // 1. Archive: terminal campaigns untouched for >30 days → state="archived".
  //    "archived" is a cron-only terminal marker beyond the CampaignState enum
  //    (draft|active|paused|ended|expired); it's safe because the state
  //    machine's expiry sweep only ticks active/paused campaigns, so archived
  //    rows are inert. updated_at is bumped on every write-through, so for a
  //    terminal campaign it tracks "time since it ended".
  try {
    const result = await db.query<{ id: string }>(
      `UPDATE launched_campaign_state
       SET state = 'archived', updated_at = NOW()
       WHERE state IN ('ended', 'expired')
         AND updated_at < NOW() - INTERVAL '30 days'
       RETURNING id`,
    );
    archived = result.rowCount;
  } catch (e) {
    logger.error("campaign-sweeps archive failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // 2. Near-capacity detection: active campaigns at >=85% of cap and within 14
  //    days of expiry are extension candidates. We only COUNT them here — the
  //    v1 code tried to INSERT into `notifications`, but that table is uuid-keyed
  //    with a uuid user_id FK to `users` and uuid entity_id, so it can't address
  //    a TEXT business id or reference a TEXT campaign id; the INSERT also named
  //    columns (channel/subject/status) that don't exist. It always failed
  //    silently. Surfacing the count keeps the signal without a broken write; an
  //    out-of-band notify channel can consume it later.
  try {
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*)::int AS count
       FROM launched_campaign_state
       WHERE state = 'active'
         AND max_completions IS NOT NULL
         AND completions::float / NULLIF(max_completions, 0) >= 0.85
         AND expires_at < NOW() + INTERVAL '14 days'`,
    );
    nearCapacity = Number(result.rows[0]?.count ?? 0);
  } catch (e) {
    logger.error("campaign-sweeps near-capacity scan failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // 3. Auto-pause over plan limit: a business should have no more ACTIVE
  //    campaigns than its plan allows (free=1, starter=10, professional=50,
  //    enterprise=unlimited). After a downgrade the excess stays active until
  //    this sweep pauses the oldest ones back down to the cap. Plans are
  //    resolved via the billing/subscription store (warmed from
  //    business_subscriptions), NOT a `businesses` JOIN — the seeded businesses
  //    table is keyed by uuid while real businesses/campaigns use TEXT ids.
  try {
    // Warm the in-memory subscription cache from Postgres; getBusinessPlan reads
    // it synchronously and would otherwise report "free" for everyone on a cold
    // cron lambda, wrongly pausing paid customers' campaigns.
    await hydrateSubscriptions();

    const actives = await db.query<{ id: string; business_id: string }>(
      `SELECT id, business_id
       FROM launched_campaign_state
       WHERE state = 'active'
       ORDER BY business_id, launched_at DESC`,
    );

    // Group campaign ids per business, newest-first (matches ORDER BY above).
    const byBusiness = new Map<string, string[]>();
    for (const row of actives.rows) {
      const ids = byBusiness.get(row.business_id);
      if (ids) ids.push(row.id);
      else byBusiness.set(row.business_id, [row.id]);
    }

    // Keep the newest `maxCampaigns`; everything older is over the cap.
    const toPause: string[] = [];
    for (const [businessId, ids] of byBusiness) {
      const max = getPlanLimits(getBusinessPlan(businessId)).maxCampaigns;
      if (Number.isFinite(max) && ids.length > max) {
        toPause.push(...ids.slice(max));
      }
    }

    if (toPause.length > 0) {
      const result = await db.query<{ id: string }>(
        `UPDATE launched_campaign_state
         SET state = 'paused', updated_at = NOW()
         WHERE id = ANY($1::text[])
           AND state = 'active'
         RETURNING id`,
        [toPause],
      );
      pausedOverLimit = result.rowCount;
    }
  } catch (e) {
    logger.error("campaign-sweeps over-limit pause failed", { error: e instanceof Error ? e.message : String(e) });
  }

  return ok({ ran: true, archived, nearCapacity, pausedOverLimit });
}
