/**
 * GET /api/v1/cron?task={name}&key={secret}
 *
 * HTTP-triggered cron runner. Authenticated via the `key` query param matched
 * against `process.env.CRON_SECRET`. Designed to be hit by GitHub Actions
 * (see .github/workflows/cron-*.yml) since Render's free tier doesn't support
 * native cron.
 *
 * Response shape:
 *   {
 *     success: true,
 *     data: {
 *       task: "trial-expiring",
 *       ranAt: "2026-05-11T10:00:00.000Z",
 *       durationMs: 412,
 *       success: true,
 *       result: { processed, succeeded, failed, errors, notes }
 *     }
 *   }
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, getQuery, withTiming } from "../_shared";
import {
  TASKS,
  isTaskName,
  recordLastRun,
  type TaskResult,
} from "@/lib/cron/tasks";
import { timingSafeEqual } from "crypto";
import { logger, logError } from "@/lib/logging";

function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const GET = withTiming(async (req: NextRequest) => {
  // Light rate-limit so a leaked key can't fully DoS the server.
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const params = getQuery(req);
  const task = params.get("task");
  const key = params.get("key");

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return err(
      "CRON_NOT_CONFIGURED",
      "CRON_SECRET is not set on this server. Configure it before invoking cron tasks.",
      503
    );
  }
  if (!key || !constantTimeEquals(key, secret)) {
    return err("UNAUTHORIZED", "Invalid cron key", 401);
  }

  // KILL SWITCH: set CRON_TASKS_DISABLED=1 (or CRON_DRY_RUN=1) to halt task
  // execution without taking the endpoint offline. Useful if a credential leak
  // triggers email blasts or if downstream APIs are misbehaving.
  if (process.env.CRON_TASKS_DISABLED === "1") {
    return ok({
      task: "(disabled)",
      ranAt: new Date().toISOString(),
      success: true,
      message: "CRON_TASKS_DISABLED=1 — task execution halted",
    });
  }

  if (!task) {
    return err(
      "MISSING_TASK",
      `task query param is required. Known tasks: ${Object.keys(TASKS).join(", ")}`,
      400
    );
  }
  if (!isTaskName(task)) {
    return err(
      "UNKNOWN_TASK",
      `Unknown task "${task}". Known tasks: ${Object.keys(TASKS).join(", ")}`,
      400
    );
  }

  const start = Date.now();
  const startedAt = new Date(start).toISOString();
  let result: TaskResult;
  let success = true;

  logger.info("cron task started", {
    task,
    startedAt,
  });

  try {
    result = await TASKS[task]();
    if (result.failed > 0 && result.succeeded === 0) {
      // All operations failed — flag the run as a failure but still return 200
      // so the GitHub Actions step doesn't retry on a non-recoverable error.
      success = false;
    }
  } catch (e) {
    success = false;
    const message = e instanceof Error ? e.message : String(e);
    result = {
      processed: 0,
      succeeded: 0,
      failed: 1,
      errors: [`task threw: ${message}`],
    };
    logError(e, {
      method: "GET",
      path: "/api/v1/cron",
      task,
      message: `cron task ${task} threw`,
    });
  }

  const ranAt = startedAt;
  const durationMs = Date.now() - start;
  recordLastRun(task, { ranAt, durationMs, success, result });

  // Per-record errors: log each one explicitly so they're never silently dropped.
  if (result.errors && result.errors.length > 0) {
    for (const recordError of result.errors) {
      logger.warn("cron task record error", {
        task,
        ranAt,
        error: recordError,
      });
    }
  }

  logger[success ? "info" : "error"]("cron task finished", {
    task,
    ranAt,
    endedAt: new Date().toISOString(),
    durationMs,
    success,
    processed: result.processed,
    succeeded: result.succeeded,
    failed: result.failed,
    errorCount: result.errors?.length ?? 0,
  });

  return ok({
    task,
    ranAt,
    durationMs,
    success,
    result,
  });
});
