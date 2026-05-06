/**
 * Production error tracker — Sentry-equivalent.
 *
 * Captures unhandled exceptions from API routes, stores a recent ring
 * buffer in memory for the admin dashboard, increments error metrics
 * the alert engine watches, and optionally ships events to Sentry
 * (via the Store API directly — no SDK dep) or a generic webhook.
 *
 * Why not the actual Sentry SDK: this codebase is allergic to npm
 * packages (the existing Twilio/Postgres/etc. integrations all hit
 * HTTP APIs directly). Same pattern here — `fetch` to Sentry's
 * `/api/<project_id>/store/` endpoint with a JSON envelope. Dependency
 * surface stays small and the code is portable to any compatible sink
 * (GlitchTip, Highlight, etc.).
 *
 * Storage:
 *   - Ring buffer of last 500 captured errors in memory (admin endpoint
 *     can read this for triage without a third-party).
 *   - Metric `system.api.error.captured` for the alert engine.
 *   - Optional fire-and-forget POST to Sentry when SENTRY_DSN is set,
 *     and/or to a webhook when ERROR_WEBHOOK_URL is set.
 */

import { metrics } from "@/lib/reliability/metrics";
import { logger } from "@/lib/logging";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ErrorContext {
  /** Request URL path (e.g. "/api/v1/auth"). */
  route?: string;
  /** HTTP method. */
  method?: string;
  /** Status code returned to the client (or 500 if uncaught). */
  status?: number;
  /** Generated request id from the timing wrapper. */
  requestId?: string;
  /** Client IP (already-resolved, not headers). */
  ip?: string;
  /** User id if the request was authenticated. */
  userId?: string;
  /** Business id (tenant). */
  businessId?: string;
  /** Free-form labels — kept compact, never PII. */
  tags?: Record<string, string>;
  /** Free-form structured data. Stripped of PII before send. */
  extra?: Record<string, unknown>;
}

export interface CapturedError {
  id: string;
  capturedAt: string;
  level: "error" | "fatal";
  name: string;
  message: string;
  stack: string | null;
  context: ErrorContext;
}

// ─── Ring Buffer ────────────────────────────────────────────────────────────

const RING_CAPACITY = 500;

class ErrorRingBuffer {
  private buffer: CapturedError[] = [];

  push(entry: CapturedError): void {
    this.buffer.push(entry);
    if (this.buffer.length > RING_CAPACITY) {
      this.buffer.shift();
    }
  }

  list(filter?: { route?: string; since?: string }): CapturedError[] {
    let out = this.buffer;
    if (filter?.route) {
      out = out.filter((e) => e.context.route === filter.route);
    }
    if (filter?.since) {
      const cutoff = new Date(filter.since).getTime();
      out = out.filter((e) => new Date(e.capturedAt).getTime() >= cutoff);
    }
    // Newest first.
    return [...out].reverse();
  }

  clear(): void {
    this.buffer = [];
  }

  size(): number {
    return this.buffer.length;
  }
}

const ring = new ErrorRingBuffer();

// ─── Sentry / Webhook Sinks ─────────────────────────────────────────────────

interface SentryDSN {
  publicKey: string;
  projectId: string;
  storeUrl: string;
}

/**
 * Parse a Sentry DSN into the pieces needed to call the Store API.
 * DSN format: https://<public_key>@<host>/<project_id>
 */
function parseSentryDsn(dsn: string): SentryDSN | null {
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, "").split("/").pop();
    if (!publicKey || !projectId) return null;
    const storeUrl = `${u.protocol}//${u.host}/api/${projectId}/store/`;
    return { publicKey, projectId, storeUrl };
  } catch {
    return null;
  }
}

let _cachedDsn: SentryDSN | null | undefined;
function getDsn(): SentryDSN | null {
  if (_cachedDsn !== undefined) return _cachedDsn;
  const raw = process.env.SENTRY_DSN;
  _cachedDsn = raw ? parseSentryDsn(raw) : null;
  return _cachedDsn;
}

/**
 * Fire-and-forget: POST a capture payload to Sentry's Store API. Errors
 * are swallowed and logged — failure to ship a captured error must
 * never cascade into the request handler.
 */
async function shipToSentry(captured: CapturedError): Promise<void> {
  const dsn = getDsn();
  if (!dsn) return;
  const auth =
    `Sentry sentry_version=7,sentry_client=social-perks/1.0,` +
    `sentry_key=${dsn.publicKey}`;
  try {
    await fetch(dsn.storeUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sentry-auth": auth,
      },
      body: JSON.stringify({
        event_id: captured.id.replace(/-/g, ""),
        timestamp: captured.capturedAt,
        platform: "node",
        level: captured.level,
        environment: process.env.NODE_ENV ?? "development",
        release: process.env.GIT_SHA ?? undefined,
        tags: captured.context.tags ?? {},
        extra: captured.context.extra ?? {},
        request: captured.context.route
          ? {
              url: captured.context.route,
              method: captured.context.method,
            }
          : undefined,
        user: captured.context.userId
          ? {
              id: captured.context.userId,
              ip_address: captured.context.ip,
            }
          : undefined,
        exception: {
          values: [
            {
              type: captured.name,
              value: captured.message,
              stacktrace: captured.stack
                ? {
                    frames: parseStackFrames(captured.stack),
                  }
                : undefined,
            },
          ],
        },
      }),
    });
  } catch (e) {
    logger.warn("error-tracker: failed to ship to Sentry", {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Best-effort: POST to a generic webhook (Slack incoming webhook, etc.). */
async function shipToWebhook(captured: CapturedError): Promise<void> {
  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text:
          `[${captured.level.toUpperCase()}] ${captured.name}: ${captured.message}` +
          (captured.context.route ? `\nroute: ${captured.context.method ?? "?"} ${captured.context.route}` : "") +
          (captured.context.requestId ? `\nrequestId: ${captured.context.requestId}` : ""),
        captured,
      }),
    });
  } catch (e) {
    logger.warn("error-tracker: failed to ship to webhook", {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Convert a Node-style stack string into Sentry's frame array. Best-
 * effort regex; unparseable lines are kept as raw frames.
 */
function parseStackFrames(stack: string): Array<{
  filename?: string;
  function?: string;
  lineno?: number;
  colno?: number;
  raw?: string;
}> {
  const frames: ReturnType<typeof parseStackFrames> = [];
  const lines = stack.split("\n").slice(1, 31); // skip header, cap depth
  for (const line of lines) {
    const m = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (m) {
      frames.push({
        function: m[1],
        filename: m[2],
        lineno: parseInt(m[3], 10),
        colno: parseInt(m[4], 10),
      });
      continue;
    }
    const m2 = line.match(/at\s+(.+?):(\d+):(\d+)/);
    if (m2) {
      frames.push({
        filename: m2[1],
        lineno: parseInt(m2[2], 10),
        colno: parseInt(m2[3], 10),
      });
      continue;
    }
    frames.push({ raw: line.trim() });
  }
  // Sentry expects oldest-first.
  return frames.reverse();
}

// ─── Public API ─────────────────────────────────────────────────────────────

const errorMetricByRoute = new Map<string, number>();

/**
 * Capture an error. Always succeeds — never throws, never blocks the
 * caller's hot path. Returns the captured id so the caller can include
 * it in the user-facing error response (so a customer can quote it to
 * support).
 */
export function captureException(
  err: unknown,
  context: ErrorContext = {}
): CapturedError {
  const error =
    err instanceof Error
      ? err
      : new Error(typeof err === "string" ? err : JSON.stringify(err));

  const captured: CapturedError = {
    id: crypto.randomUUID(),
    capturedAt: new Date().toISOString(),
    level: "error",
    name: error.name || "Error",
    message: error.message || "Unknown error",
    stack: error.stack ?? null,
    context: { ...context },
  };

  ring.push(captured);

  // Metrics — both a global counter and a per-route counter so the
  // alert engine can fire on a single bad endpoint without needing
  // every route enrolled.
  metrics.increment("system.api.error.captured", 1, {
    route: context.route ?? "unknown",
    method: context.method ?? "unknown",
  });
  if (context.route) {
    errorMetricByRoute.set(
      context.route,
      (errorMetricByRoute.get(context.route) ?? 0) + 1
    );
  }

  // Structured log for downstream collectors that consume stdout.
  logger.error(`captured: ${captured.name}: ${captured.message}`, {
    capturedId: captured.id,
    route: context.route,
    method: context.method,
    requestId: context.requestId,
    status: context.status,
    userId: context.userId,
    businessId: context.businessId,
    stack: captured.stack,
  });

  // Fire-and-forget remote sinks. Do not await — we don't want a slow
  // Sentry to block returning the response.
  void shipToSentry(captured);
  void shipToWebhook(captured);

  return captured;
}

/** List recent captures, newest first. For the admin dashboard. */
export function listRecentCaptures(filter?: {
  route?: string;
  since?: string;
}): CapturedError[] {
  return ring.list(filter);
}

/** Total count over all routes since process start. */
export function getCaptureCount(): number {
  return ring.size();
}

/** Per-route running count — used by alert evaluators. */
export function getRouteErrorCount(route: string): number {
  return errorMetricByRoute.get(route) ?? 0;
}

// ─── Test Helpers ───────────────────────────────────────────────────────────

export function _resetErrorTracker(): void {
  ring.clear();
  errorMetricByRoute.clear();
  _cachedDsn = undefined;
}
