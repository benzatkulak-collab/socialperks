/**
 * The browser side of GET /api/v1/events, shared by useRealtime and
 * useNotificationsSSE.
 *
 * Signing in: the stream takes its caller from the HttpOnly `sp-access-token`
 * cookie, which the browser sends by itself. Nothing else about the caller
 * goes in the URL; page scripts cannot read the cookie, and a token in a URL
 * ends up in logs.
 *
 * Before each connection, the first one included, it asks HEAD
 * /api/v1/events through apiFetch, because:
 * - EventSource never shows the status of a refused connection, so a client
 *   that only watched `error` could not tell "signed out" from "dropped";
 * - EventSource cannot renew the 15-minute access cookie, and apiFetch renews
 *   it on a 401 (PR #252) before it gives the answer.
 *
 * The answer decides:
 * - 200: open the stream;
 * - 204: this server streams nothing, or there is nothing for this account;
 *   401: signed out (and no renewal helped); 403: not allowed. These stop
 *   for good, until the page is loaded again;
 * - anything else, or no answer: try again later.
 *
 * A stream that drops, or never connects, closes and goes back to the check.
 * The server ends each stream when its access token expires (15 minutes at
 * most), so in a long-open tab that check is where the cookie gets renewed.
 * Waits between tries grow 1 s, 2 s, 4 s, 8 s, 16 s; after five failed tries
 * in a row it gives up. A stream that connects starts the count again.
 */
import { apiFetch } from "@/lib/api/csrf-fetch";

export type StreamStopReason =
  /** The check answered 401: not signed in, and renewing the cookie did not help. */
  | "signed-out"
  /** 403: the stream asked for another business's events. */
  | "forbidden"
  /** 204: this server streams nothing (REALTIME_EVENTS), or this account may receive no events. */
  | "off"
  /** Five tries in a row failed. */
  | "gave-up"
  /** This browser has no EventSource. */
  | "unsupported";

export interface EventStreamOptions {
  /**
   * The business whose events to receive. A business receives its own
   * whatever it names; only the founder may choose. Leave it out for "mine".
   */
  businessId?: string;
  /** The event names to listen for. The stream names every event it sends. */
  eventTypes: readonly string[];
  /** One event, with its data parsed from JSON. An event that is not JSON is dropped. */
  onEvent: (type: string, data: unknown) => void;
  /** True once the server's `connected` event arrives, false when that stream ends. */
  onConnectedChange?: (connected: boolean) => void;
  /** The stream stopped for good. Not called after close(). */
  onStop?: (reason: StreamStopReason) => void;
}

export interface EventStream {
  /** Close the stream, and cancel any check or reconnect on its way. */
  close(): void;
}

const EVENTS_URL = "/api/v1/events";
const MAX_FAILED_TRIES = 5;
const INITIAL_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

export function openEventStream(options: EventStreamOptions): EventStream {
  const url = options.businessId
    ? `${EVENTS_URL}?${new URLSearchParams({ businessId: options.businessId }).toString()}`
    : EVENTS_URL;

  let closed = false;
  let source: EventSource | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  /** Failed tries since a stream last connected. */
  let failedTries = 0;
  let connected = false;

  const setConnected = (value: boolean) => {
    if (connected === value) return;
    connected = value;
    options.onConnectedChange?.(value);
  };

  const stop = (reason: StreamStopReason) => {
    if (closed) return;
    closed = true;
    options.onStop?.(reason);
  };

  async function check(): Promise<void> {
    retryTimer = null;
    let status: number | null;
    try {
      status = (await apiFetch(url, { method: "HEAD" })).status;
    } catch {
      status = null; // offline, or the request was blocked
    }
    if (closed) return;
    if (status === 200) open();
    else if (status === 401) stop("signed-out");
    else if (status === 403) stop("forbidden");
    else if (status === 204) stop("off");
    else tryAgainLater();
  }

  function open(): void {
    const stream = new EventSource(url);
    source = stream;

    stream.addEventListener("connected", () => {
      failedTries = 0;
      setConnected(true);
    });

    for (const type of options.eventTypes) {
      stream.addEventListener(type, (event: MessageEvent) => {
        let data: unknown;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        options.onEvent(type, data);
      });
    }

    stream.onerror = () => {
      // Refused or dropped: EventSource cannot say which. Close it, rather
      // than let the browser retry blindly with the same cookie, and go
      // back to the check.
      stream.close();
      if (source === stream) source = null;
      setConnected(false);
      tryAgainLater();
    };
  }

  function tryAgainLater(): void {
    if (closed) return;
    if (failedTries >= MAX_FAILED_TRIES) {
      stop("gave-up");
      return;
    }
    const wait = Math.min(INITIAL_RETRY_MS * 2 ** failedTries, MAX_RETRY_MS);
    failedTries++;
    retryTimer = setTimeout(() => void check(), wait);
  }

  if (typeof EventSource === "undefined") stop("unsupported");
  else void check();

  return {
    close() {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      source?.close();
      source = null;
    },
  };
}
