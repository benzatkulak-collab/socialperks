/**
 * GET /api/v1/cron/sms-drain
 *
 * Scheduled by Vercel Cron every 2 minutes (see vercel.json). Drains
 * pending rows from the `sms_queue` table whose `scheduled_for` has
 * passed and delivers them via Twilio.
 *
 * The post-purchase flywheel uses a ~2-hour delay between purchase
 * and the perk SMS, so 2-minute granularity is plenty. Without this
 * cron, sends scheduled across a Vercel function boundary would be
 * lost — Vercel functions exit too quickly to honor a setTimeout 2
 * hours out.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.
 * We require it to be set; without it the route 503s rather than
 * accepting unauthenticated requests from the public internet.
 */

import type { NextRequest } from "next/server";
import { ok, err } from "../../_shared";
import { db, InMemoryConnection } from "@/lib/db/connection";
import { drainPending } from "@/lib/sms/post-purchase";
import { logger } from "@/lib/logging";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return err(
      "CRON_NOT_CONFIGURED",
      "CRON_SECRET is not set on this deployment.",
      503,
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return err("UNAUTHORIZED", "Invalid cron token", 401);
  }

  if (db instanceof InMemoryConnection) {
    return ok({
      ran: false,
      reason: "DATABASE_URL not configured — drain skipped",
      drained: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    });
  }

  try {
    const result = await drainPending();
    if (result.drained > 0) {
      logger.info("sms drain tick", {
        drained: result.drained,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
      });
    }
    return ok({ ran: true, ...result });
  } catch (e) {
    logger.error("sms drain failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err("DRAIN_FAILED", "SMS drain failed", 500);
  }
}
