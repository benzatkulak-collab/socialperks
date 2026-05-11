/**
 * GET /api/v1/cron/status
 *
 * Public read-only endpoint that returns the last-run record for every
 * registered cron task. No auth required — operators use it to verify the
 * external scheduler is actually hitting the endpoint on schedule.
 *
 * `lastRun` is null for tasks that have not run since the server started.
 * State is in-memory; restarting the server resets it.
 */

import type { NextRequest } from "next/server";
import { ok, rateLimit, withTiming } from "../../_shared";
import { TASKS, getAllLastRuns } from "@/lib/cron/tasks";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const lastRuns = getAllLastRuns();
  const tasks = Object.keys(TASKS).map((name) => {
    const record = lastRuns[name as keyof typeof lastRuns];
    return {
      task: name,
      lastRun: record
        ? {
            ranAt: record.ranAt,
            durationMs: record.durationMs,
            success: record.success,
            processed: record.result.processed,
            succeeded: record.result.succeeded,
            failed: record.result.failed,
            errorCount: record.result.errors.length,
          }
        : null,
    };
  });

  return ok({
    serverTime: new Date().toISOString(),
    tasks,
  });
});
