/**
 * Error capture / observability seam.
 *
 * One entry point — `captureError` / `captureMessage` — to use wherever we'd
 * otherwise swallow an error in a catch. It ALWAYS emits a structured log (so a
 * Vercel log drain / alert can key off `level=error` today), and ADDITIONALLY
 * ships the event to Sentry when a DSN is configured — no SDK dependency, just
 * the documented Sentry envelope over `fetch`. Best-effort and non-throwing: a
 * monitoring failure must never break the request it's reporting on.
 *
 * Turn Sentry on by setting `SENTRY_DSN` (server) and/or `NEXT_PUBLIC_SENTRY_DSN`
 * (browser). With neither set, capture degrades to structured logging only — so
 * this is safe to wire in everywhere now and "light up" later via env alone.
 *
 * Isomorphic: safe to import from both server modules and client components
 * (error boundaries). Sentry DSNs are designed to be publishable, so exposing
 * NEXT_PUBLIC_SENTRY_DSN to the browser is expected.
 */

import { logger } from "@/lib/logging";

export type CaptureLevel = "error" | "fatal" | "warning" | "info";

export interface CaptureContext {
  /** Dotted origin, e.g. "billing.persistSubscription" — becomes a Sentry tag. */
  source?: string;
  /** Extra structured context. Do NOT include secrets or PII. */
  [key: string]: unknown;
}

function getDsn(): string | undefined {
  return process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? undefined;
}

function randomId(): string {
  try {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c?.randomUUID) return c.randomUUID().replace(/-/g, "");
  } catch {
    /* fall through */
  }
  let s = "";
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

/** Parse a Sentry DSN into its envelope ingest URL. Returns null if malformed. */
export function parseDsn(dsn: string): { url: string } | null {
  // https://<publicKey>@<host>/<optional/path>/<projectId>
  const m = /^(https?):\/\/([^@/]+)@([^/]+)\/(.+)$/.exec(dsn.trim());
  if (!m) return null;
  const [, protocol, publicKey, host, rest] = m;
  const projectId = rest.split("/").filter(Boolean).pop();
  if (!projectId) return null;
  return {
    url: `${protocol}://${host}/api/${projectId}/envelope/?sentry_key=${publicKey}&sentry_version=7`,
  };
}

/** Build a Sentry envelope body for an event. Exported for testing. */
export function buildEnvelope(
  err: Error,
  level: CaptureLevel,
  context: CaptureContext,
): { eventId: string; body: string } {
  const eventId = randomId();
  const sentAt = new Date().toISOString();
  const { source, ...extra } = context;
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "javascript",
    level: level === "warning" ? "warning" : level,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    logger: "social-perks",
    tags: source ? { source: String(source) } : undefined,
    exception: {
      values: [{ type: err.name || "Error", value: err.message }],
    },
    extra: { ...extra, stack: err.stack },
  };
  const body =
    JSON.stringify({ event_id: eventId, sent_at: sentAt }) +
    "\n" +
    JSON.stringify({ type: "event" }) +
    "\n" +
    JSON.stringify(event);
  return { eventId, body };
}

async function shipToSentry(err: Error, level: CaptureLevel, context: CaptureContext): Promise<void> {
  const dsn = getDsn();
  if (!dsn) return;
  const parsed = parseDsn(dsn);
  if (!parsed) return;
  try {
    const { body } = buildEnvelope(err, level, context);
    await fetch(parsed.url, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body,
      keepalive: true, // let it finish even if the page is unloading (client)
    });
  } catch {
    /* best-effort; never throw */
  }
}

/**
 * Report an error. Structured-logs always; ships to Sentry when configured.
 * Use this instead of a bare `console.error` in catch blocks that would
 * otherwise swallow a failure (e.g. best-effort DB writes).
 */
export function captureError(error: unknown, context: CaptureContext = {}): void {
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : safeStringify(error));
  const msg = context.source ? `[${context.source}] ${err.message}` : err.message;
  try {
    logger.error(msg, err, context);
  } catch {
    // eslint-disable-next-line no-console
    console.error(msg, err);
  }
  void shipToSentry(err, "error", context);
}

/** Report a noteworthy event (non-exception). Warnings/errors ship to Sentry. */
export function captureMessage(
  message: string,
  level: CaptureLevel = "info",
  context: CaptureContext = {},
): void {
  try {
    if (level === "fatal") logger.fatal(message, undefined, context);
    else if (level === "error") logger.error(message, undefined, context);
    else if (level === "warning") logger.warn(message, context);
    else logger.info(message, context);
  } catch {
    /* ignore */
  }
  if (level === "error" || level === "fatal" || level === "warning") {
    void shipToSentry(new Error(message), level, context);
  }
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
