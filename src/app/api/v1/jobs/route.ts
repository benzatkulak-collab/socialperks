/**
 * GET  /api/v1/jobs — Queue stats (filterable by queue name and job status)
 * POST /api/v1/jobs — Admin actions: retry, purge, pause, resume
 *
 * Dev/admin only — returns 404 in production unless the caller is
 * authenticated with an admin role.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  rateLimit,
  getQuery,
  parseBody,
  requireAuth,
  withTiming,
} from "../_shared";
import { allQueues, getQueueByName } from "@/lib/jobs/registry";
import type { JobStatus } from "@/lib/jobs/queue";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ─── GET — Queue Stats ─────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  // In production, require admin auth
  if (IS_PRODUCTION) {
    const user = requireAuth(req);
    if (user instanceof Response) return user;
    if (user.role !== "enterprise") {
      return err("FORBIDDEN", "Admin access required", 403);
    }
  }

  const params = getQuery(req);
  const queueFilter = params.get("queue");
  const statusFilter = params.get("status") as JobStatus | null;

  // Validate status filter if provided
  const validStatuses: JobStatus[] = ["pending", "active", "completed", "failed", "dead"];
  if (statusFilter && !validStatuses.includes(statusFilter)) {
    return err(
      "INVALID_STATUS",
      `status must be one of: ${validStatuses.join(", ")}`,
      400
    );
  }

  // Build response
  const queues = queueFilter
    ? allQueues.filter((q) => q.name === queueFilter)
    : [...allQueues];

  if (queueFilter && queues.length === 0) {
    return err("QUEUE_NOT_FOUND", `No queue named "${queueFilter}"`, 404);
  }

  const result = queues.map((q) => {
    const stats = q.getStats();
    const jobs = statusFilter ? q.getJobs(statusFilter, 50) : undefined;

    return {
      name: q.name,
      running: q.isRunning(),
      paused: q.isPaused(),
      stats,
      ...(jobs ? { jobs: jobs.map(summarizeJob) } : {}),
    };
  });

  return ok({ queues: result });
});

// ─── POST — Admin Actions ───────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // In production, require admin auth
  if (IS_PRODUCTION) {
    const user = requireAuth(req);
    if (user instanceof Response) return user;
    if (user.role !== "enterprise") {
      return err("FORBIDDEN", "Admin access required", 403);
    }
  }

  const body = await parseBody<{
    action?: string;
    queue?: string;
    jobId?: string;
    olderThanMs?: number;
  }>(req);
  if (body instanceof Response) return body;

  const { action } = body;

  if (!action || typeof action !== "string") {
    return err("MISSING_ACTION", "action is required (retry, purge, pause, resume)", 400);
  }

  switch (action) {
    // ── Retry a single failed/dead job ────────────────────────────────────
    case "retry": {
      if (!body.queue || !body.jobId) {
        return err("MISSING_FIELDS", "queue and jobId are required for retry", 400);
      }

      const queue = getQueueByName(body.queue);
      if (!queue) {
        return err("QUEUE_NOT_FOUND", `No queue named "${body.queue}"`, 404);
      }

      // Try failed first, then dead letter
      let job = queue.retryJob(body.jobId);
      if (!job) {
        job = queue.retryDeadLetterJob(body.jobId);
      }

      if (!job) {
        return err("JOB_NOT_FOUND", `Job "${body.jobId}" not found or not in a retryable state`, 404);
      }

      return ok({ retried: true, job: summarizeJob(job) });
    }

    // ── Purge completed jobs ──────────────────────────────────────────────
    case "purge": {
      if (!body.queue) {
        return err("MISSING_FIELDS", "queue is required for purge", 400);
      }

      const queue = getQueueByName(body.queue);
      if (!queue) {
        return err("QUEUE_NOT_FOUND", `No queue named "${body.queue}"`, 404);
      }

      const count = queue.purgeCompleted(body.olderThanMs);
      return ok({ purged: count, queue: body.queue });
    }

    // ── Pause queue ───────────────────────────────────────────────────────
    case "pause": {
      if (!body.queue) {
        return err("MISSING_FIELDS", "queue is required for pause", 400);
      }

      const queue = getQueueByName(body.queue);
      if (!queue) {
        return err("QUEUE_NOT_FOUND", `No queue named "${body.queue}"`, 404);
      }

      queue.pause();
      return ok({ paused: true, queue: body.queue });
    }

    // ── Resume queue ──────────────────────────────────────────────────────
    case "resume": {
      if (!body.queue) {
        return err("MISSING_FIELDS", "queue is required for resume", 400);
      }

      const queue = getQueueByName(body.queue);
      if (!queue) {
        return err("QUEUE_NOT_FOUND", `No queue named "${body.queue}"`, 404);
      }

      queue.resume();
      return ok({ resumed: true, queue: body.queue });
    }

    default:
      return err("INVALID_ACTION", "action must be retry, purge, pause, or resume", 400);
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function summarizeJob(job: { id: string; queue: string; status: string; priority: number; attempts: number; maxAttempts: number; createdAt: number; startedAt: number | null; completedAt: number | null; failedAt: number | null; lastError: string | null }) {
  return {
    id: job.id,
    queue: job.queue,
    status: job.status,
    priority: job.priority,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    createdAt: new Date(job.createdAt).toISOString(),
    startedAt: job.startedAt ? new Date(job.startedAt).toISOString() : null,
    completedAt: job.completedAt ? new Date(job.completedAt).toISOString() : null,
    failedAt: job.failedAt ? new Date(job.failedAt).toISOString() : null,
    lastError: job.lastError,
  };
}
