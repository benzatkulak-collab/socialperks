/**
 * GET /api/v1/cron/campaign-sweeps
 *
 * Daily housekeeping pass (Phases 37-38, 153-154):
 *   - Auto-archive ended/expired campaigns older than 30 days
 *   - Auto-prompt-extend campaigns near expiry with budget remaining
 *   - Auto-pause campaigns over the new plan limit when a business
 *     downgrades
 *
 * Auth: Vercel Cron `Authorization: Bearer ${CRON_SECRET}`.
 * Skipped without DATABASE_URL.
 */

import type { NextRequest } from "next/server";
import { ok, err } from "../../_shared";
import { db, InMemoryConnection } from "@/lib/db/connection";
import { logger } from "@/lib/logging";

const usingDb = !(db instanceof InMemoryConnection);

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return err("CRON_NOT_CONFIGURED", "CRON_SECRET unset", 503);
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return err("UNAUTHORIZED", "Invalid cron token", 401);
  }
  if (!usingDb) {
    return ok({ ran: false, reason: "DATABASE_URL not set" });
  }

  let archived = 0;
  let promptedExtensions = 0;
  let pausedOverLimit = 0;

  // 1. Archive: campaigns that ended >30 days ago → state="archived"
  try {
    const result = await db.query<{ id: string }>(
      `UPDATE launched_campaigns
       SET state = 'archived', updated_at = NOW()
       WHERE state IN ('ended', 'expired')
         AND updated_at < NOW() - INTERVAL '30 days'
       RETURNING id`,
    );
    archived = result.rowCount;
  } catch (e) {
    logger.error("campaign-sweeps archive failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // 2. Auto-prompt extend: campaign at >85% of cap and >50% of expiry — flag a notification.
  // We only INSERT a notifications row; downstream notify channel handles delivery.
  try {
    const result = await db.query<{ id: string; business_id: string }>(
      `WITH near_full AS (
         SELECT id, business_id
         FROM launched_campaigns
         WHERE state = 'active'
           AND max_completions IS NOT NULL
           AND completions::float / NULLIF(max_completions, 0) >= 0.85
           AND expires_at < NOW() + INTERVAL '14 days'
       )
       INSERT INTO notifications (id, user_id, type, channel, subject, body, status, created_at)
       SELECT
         CONCAT('extend-prompt:', id, ':', to_char(NOW(), 'YYYY-MM-DD')),
         business_id,
         'extend-prompt',
         'in-app',
         'Your campaign is filling up — extend?',
         CONCAT('Campaign ', id, ' is at 85%+ capacity. Extend to keep collecting.'),
         'pending',
         NOW()
       FROM near_full
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
    );
    promptedExtensions = result.rowCount;
  } catch (e) {
    logger.error("campaign-sweeps extend-prompt failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // 3. Auto-pause over-limit: businesses on Free plan should only have 1 active campaign.
  // If they have more (e.g. downgraded), pause the oldest.
  try {
    const result = await db.query<{ id: string }>(
      `WITH ranked AS (
         SELECT lc.id, lc.business_id,
                ROW_NUMBER() OVER (PARTITION BY lc.business_id ORDER BY lc.launched_at DESC) AS rn
         FROM launched_campaigns lc
         JOIN businesses b ON b.id = lc.business_id
         WHERE lc.state = 'active'
           AND b.plan = 'free'
       )
       UPDATE launched_campaigns
       SET state = 'paused', updated_at = NOW()
       WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
       RETURNING id`,
    );
    pausedOverLimit = result.rowCount;
  } catch (e) {
    logger.error("campaign-sweeps over-limit pause failed", { error: e instanceof Error ? e.message : String(e) });
  }

  return ok({ ran: true, archived, promptedExtensions, pausedOverLimit });
}
