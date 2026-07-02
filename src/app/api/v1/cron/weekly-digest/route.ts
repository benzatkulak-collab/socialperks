/**
 * GET /api/v1/cron/weekly-digest
 *
 * Scheduled by Vercel Cron (see vercel.json). Once a week, direct-sends the
 * weekly performance digest to every business with an active campaign — the
 * #1 missing retention mechanic (the digest was built but nothing ever sent
 * it, and the job-queue worker never runs in serverless).
 *
 * Auth: same pattern as the other crons — Vercel Cron sends
 * `Authorization: Bearer ${CRON_SECRET}`. Without CRON_SECRET set the route
 * refuses to run, so it can't be triggered anonymously and won't email anyone
 * until an operator explicitly configures it.
 */

import type { NextRequest } from "next/server";
import { ok, err } from "../../_shared";
import { constantTimeEqual } from "@/lib/security/order-by";
import { logger } from "@/lib/logging";
import { sendWeeklyDigests } from "@/lib/email/send-weekly-digests";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return err(
      "CRON_NOT_CONFIGURED",
      "CRON_SECRET is not set on this deployment.",
      503,
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  if (!constantTimeEqual(auth, `Bearer ${cronSecret}`)) {
    return err("UNAUTHORIZED", "Invalid cron token", 401);
  }

  try {
    const result = await sendWeeklyDigests();
    logger.info("weekly-digest cron complete", { ...result });
    return ok(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "weekly digest failed";
    logger.error("weekly-digest cron failed", { error: message });
    return err("DIGEST_FAILED", message, 500);
  }
}
