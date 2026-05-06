/**
 * Funnel analytics — PostHog-equivalent event capture.
 *
 * Server-side: `track(event, props)` enqueues onto an in-memory batch
 * that flushes every 5 seconds (or when the batch hits 50 events) to
 * PostHog's `/capture/` HTTPS endpoint. Same direct-fetch pattern as
 * the rest of the codebase — no SDK dep.
 *
 * Client-side: there's a thin shim at `lib/analytics/client.ts` that
 * mirrors this API and POSTs to `/api/v1/analytics/track` so the
 * server-side batcher does the actual outbound call.
 *
 * If POSTHOG_API_KEY is unset (dev/CI), we still buffer events and
 * expose them via `recentEvents()` for tests + the admin dashboard.
 *
 * Identify: `identify(distinctId, props)` writes a $set call so PostHog
 * can attach the most recent user properties to all of that distinctId's
 * events. Implemented via the same /capture/ endpoint with a special
 * event name `$identify`, exactly like the JS SDK does it.
 */

import { logger } from "@/lib/logging";
import { FUNNEL_EVENT, type FunnelEventProps } from "./events";

export { FUNNEL_EVENT, type FunnelEvent, type FunnelEventProps } from "./events";

// ─── Constants ──────────────────────────────────────────────────────────────

const POSTHOG_HOST = process.env.POSTHOG_HOST ?? "https://us.posthog.com";
const BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 5000;
const BUFFER_CAPACITY = 1000;

// ─── Types ──────────────────────────────────────────────────────────────────

interface BufferedEvent {
  event: string;
  distinctId: string;
  properties: Record<string, string | number | boolean | null | undefined>;
  timestamp: string;
}

// ─── Internal state ─────────────────────────────────────────────────────────

const eventBuffer: BufferedEvent[] = [];
const recent: BufferedEvent[] = []; // ring of last 200 for inspection
const RECENT_CAPACITY = 200;
let flushTimer: NodeJS.Timeout | null = null;

function getApiKey(): string | null {
  return process.env.POSTHOG_API_KEY ?? null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Record a funnel event. Always synchronous, always non-throwing —
 * tracking failures must never break the request handler.
 */
export function track(event: string, props: FunnelEventProps): void {
  const { distinctId, timestamp, ...rest } = props;
  if (!distinctId) {
    logger.warn("analytics.track called without distinctId — skipping", {
      event,
    });
    return;
  }

  const buffered: BufferedEvent = {
    event,
    distinctId,
    properties: rest,
    timestamp: timestamp ?? new Date().toISOString(),
  };

  eventBuffer.push(buffered);
  pushRecent(buffered);

  if (eventBuffer.length >= BATCH_SIZE) {
    void flush();
  } else {
    scheduleFlush();
  }
}

/**
 * Attach (or update) properties on a distinctId. Sent as PostHog's
 * `$identify` event so subsequent events resolve the right user.
 */
export function identify(
  distinctId: string,
  props: Record<string, string | number | boolean | null> = {}
): void {
  if (!distinctId) return;
  const buffered: BufferedEvent = {
    event: "$identify",
    distinctId,
    properties: { $set: JSON.stringify(props) as unknown as string },
    timestamp: new Date().toISOString(),
  };
  eventBuffer.push(buffered);
  pushRecent(buffered);
  scheduleFlush();
}

/**
 * Force flush — useful in tests and on graceful shutdown. Returns the
 * number of events that were attempted.
 */
export async function flush(): Promise<number> {
  if (eventBuffer.length === 0) return 0;
  const batch = eventBuffer.splice(0, eventBuffer.length);
  cancelFlushTimer();

  const apiKey = getApiKey();
  if (!apiKey) {
    // No remote sink configured — events still live in `recent` for
    // dev-mode inspection and tests.
    return batch.length;
  }

  try {
    const url = `${POSTHOG_HOST}/capture/`;
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        batch: batch.map((b) => {
          // PostHog's batch API expects properties.$set inline (not
          // stringified) for $identify events — un-stringify if present.
          let properties = b.properties;
          if (b.event === "$identify" && typeof properties.$set === "string") {
            try {
              properties = { ...properties, $set: JSON.parse(properties.$set as string) };
            } catch {
              // Leave as-is.
            }
          }
          return {
            event: b.event,
            distinct_id: b.distinctId,
            properties,
            timestamp: b.timestamp,
          };
        }),
      }),
    });
  } catch (e) {
    logger.warn("analytics.flush failed — events dropped", {
      error: e instanceof Error ? e.message : String(e),
      droppedCount: batch.length,
    });
  }
  return batch.length;
}

/**
 * Recent events — last 200, newest first. For the admin dashboard and
 * tests. Not part of the public-API contract for application code.
 */
export function recentEvents(): readonly BufferedEvent[] {
  return [...recent].reverse();
}

/** Test helper. Clears both the buffer and the recent ring. */
export function _resetAnalytics(): void {
  eventBuffer.length = 0;
  recent.length = 0;
  cancelFlushTimer();
}

// ─── Internals ──────────────────────────────────────────────────────────────

function pushRecent(e: BufferedEvent): void {
  recent.push(e);
  if (recent.length > RECENT_CAPACITY) {
    recent.shift();
  }
  // Cap absolute buffer growth too, so a misconfigured prod with no
  // POSTHOG_API_KEY doesn't OOM the worker over time.
  if (eventBuffer.length > BUFFER_CAPACITY) {
    eventBuffer.splice(0, eventBuffer.length - BUFFER_CAPACITY);
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  if (typeof globalThis.setTimeout !== "function") return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
  // Don't keep the Node process alive just for the analytics flush.
  if (
    typeof flushTimer === "object" &&
    flushTimer &&
    "unref" in flushTimer
  ) {
    (flushTimer as { unref: () => void }).unref();
  }
}

function cancelFlushTimer(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

// ─── Convenience wrappers around well-known funnel events ──────────────────

/**
 * Mark a step in the activation funnel. Wraps `track` with a stable
 * event name so a typo doesn't silently fork the funnel into two
 * parallel events.
 */
export const funnel = {
  signupCompleted(distinctId: string, props: { businessId?: string; role?: string } = {}) {
    track(FUNNEL_EVENT.AUTH_SIGNUP_COMPLETED, { distinctId, ...props });
  },
  loginCompleted(distinctId: string, props: { businessId?: string; role?: string } = {}) {
    track(FUNNEL_EVENT.AUTH_LOGIN_COMPLETED, { distinctId, ...props });
  },
  programCreated(distinctId: string, props: { businessId: string; programId: string; isFirst: boolean }) {
    track(FUNNEL_EVENT.PROGRAM_CREATED, { distinctId, ...props });
  },
  claimLandingViewed(distinctId: string, props: { businessId: string; programId: string; claimCode: string }) {
    track(FUNNEL_EVENT.CLAIM_LANDING_VIEWED, { distinctId, ...props });
  },
};
