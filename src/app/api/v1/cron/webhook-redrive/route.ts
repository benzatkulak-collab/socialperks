/**
 * GET /api/v1/cron/webhook-redrive
 *
 * Scheduled by Vercel Cron every 5 minutes (see vercel.json). Walks
 * the webhook_deliveries table for rows with status='failed' and
 * next_retry <= NOW(), and re-attempts each via the existing
 * webhookStore.attemptDelivery — which handles signing, HTTP, and
 * the post-attempt status transition.
 *
 * Why a 5-minute cadence:
 *   - The first retry is +1 minute after a failure
 *   - Subsequent retries are +5m, +30m, +2h, +12h, +72h
 *   - 5-minute granularity catches all of those without spamming
 *   - 5 minutes also matches the typical attention span of a shop
 *     owner who just rotated a webhook secret and is wondering why
 *     events stopped flowing
 *
 * Auth: Bearer CRON_SECRET. Without this env var the route 503s
 * (we don't want anonymous internet traffic triggering retries).
 */

import type { NextRequest } from "next/server";
import { ok, err } from "../../_shared";
import { db, InMemoryConnection } from "@/lib/db/connection";
import { webhookStore } from "@/lib/webhooks";
import { loadDueDeliveries } from "@/lib/webhooks/persistence";
import { logger } from "@/lib/logging";

const MAX_BATCH = 100;

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
    // No DB → in-memory deliveries are already retried in-process.
    // Nothing to drain across function instances.
    return ok({
      ran: false,
      reason: "DATABASE_URL not configured — redrive skipped (in-memory only)",
      attempted: 0,
      delivered: 0,
      stillFailed: 0,
      dead: 0,
    });
  }

  try {
    // Load due rows from Postgres. The webhookStore in-memory state
    // may not have these (we may have just cold-started on a fresh
    // function instance), so load + hydrate both at once.
    const due = await loadDueDeliveries(MAX_BATCH);
    let delivered = 0;
    let stillFailed = 0;
    let dead = 0;

    for (const d of due) {
      // Re-insert into the in-memory map so attemptDelivery can find
      // it. The store's persistence layer writes through on every
      // attempt so we don't drift.
      webhookStore.upsertDelivery(d);

      const result = await webhookStore.attemptDelivery(d.id);
      if (!result) continue;
      if (result.status === "delivered") delivered += 1;
      else if (result.status === "dead") dead += 1;
      else stillFailed += 1;
    }

    if (due.length > 0) {
      logger.info("webhook redrive tick", {
        attempted: due.length,
        delivered,
        stillFailed,
        dead,
      });
    }
    return ok({ ran: true, attempted: due.length, delivered, stillFailed, dead });
  } catch (e) {
    logger.error("webhook redrive failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    return err("REDRIVE_FAILED", "Webhook redrive failed", 500);
  }
}
