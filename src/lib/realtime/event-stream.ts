/**
 * The browser side of GET /api/v1/events, shared by useRealtime and
 * useNotificationsSSE.
 *
 * Signing in: the stream takes its caller from the HttpOnly `sp-access-token`
 * cookie, which the browser sends by itself. Nothing else about the caller
 * goes in the URL; page scripts cannot read the cookie, and a token in a URL
 * ends up in logs.
 *
 * One connection per stream URL in a page. The business portal's live
 * updates and its bell ask for the same stream and share it: over HTTP/1.1
 * (`next dev`) a browser allows six connections to a host, so two per tab
 * would use them all up with three tabs open.
 *
 * Before each connection, the first one included, it asks HEAD
 * /api/v1/events through apiFetch, because:
 * - EventSource never shows the status of a refused connection, so a client
 *   that only watched `error` could not tell "signed out" from "dropped";
 * - EventSource cannot renew the 15-minute access cookie. apiFetch is where
 *   that happens: with PR #252 it renews the cookie on a 401 before it answers.
 *
 * The answer decides:
 * - 200: open the stream;
 * - 204 (this server streams nothing, or there is nothing for this account)
 *   and 403 (not allowed): stop until the page is loaded again;
 * - 401: ask once more a minute later, and stop as signed out if that is a
 *   401 too. apiFetch hands a 401 back as it came whenever it could not renew
 *   the cookie right then (one refresh a minute per tab, sign-in's limit of
 *   five a minute per address shared by every tab, a dropped connection);
 *   a minute later those have passed, or another tab has renewed the cookie;
 * - anything else, or no answer: try again later.
 *
 * A stream that drops, or never connects, closes and goes back to the check.
 * The server ends each stream when its token expires (15 minutes at most), so
 * in a long-open tab that check is where the cookie gets renewed. Waits
 * between tries grow 1 s, 2 s, 4 s, 8 s, 16 s; after five failed tries in a
 * row it gives up. A stream counts as having connected once it has stayed up
 * five seconds: one that drops sooner is another failed try, so a host that
 * cuts streams at once cannot keep it reconnecting forever.
 *
 * After a "signed-out" or "gave-up" stop it starts again when the tab is shown
 * again or the browser comes back online.
 */
import { apiFetch } from "@/lib/api/csrf-fetch";

export type StreamStopReason =
  /** The check answered 401 twice, a minute apart: not signed in, and renewing the cookie did not help. */
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
   * Subscribers that name the same business share one connection.
   */
  businessId?: string;
  /** The event names to listen for. The stream names every event it sends. */
  eventTypes: readonly string[];
  /** One event, with its data parsed from JSON. An event that is not JSON is dropped. */
  onEvent: (type: string, data: unknown) => void;
  /** True once the server's `connected` event arrives, false when that stream ends. */
  onConnectedChange?: (connected: boolean) => void;
  /** The stream stopped. It may start again (see above); then onConnectedChange(true) follows. Not called after close(). */
  onStop?: (reason: StreamStopReason) => void;
}

export interface EventStream {
  /** Stop listening. The connection closes once no subscriber is left. */
  close(): void;
}

const EVENTS_URL = "/api/v1/events";
const MAX_FAILED_TRIES = 5;
const INITIAL_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;
/** A stream that stays up this long counts as having connected; one that drops sooner is a failed try. */
const HEALTHY_AFTER_MS = 5_000;
/** After a 401, ask once more this much later (past #252's one-refresh-a-minute gap and sign-in's per-minute limit). */
const SIGNED_OUT_RECHECK_MS = 65_000;

type Subscriber = Pick<EventStreamOptions, "eventTypes" | "onEvent" | "onConnectedChange" | "onStop">;

/** The open connections of this page, by URL. */
const connections = new Map<string, Connection>();

export function openEventStream(options: EventStreamOptions): EventStream {
  if (typeof EventSource === "undefined") {
    options.onStop?.("unsupported");
    return { close() {} };
  }

  const url = options.businessId
    ? `${EVENTS_URL}?${new URLSearchParams({ businessId: options.businessId }).toString()}`
    : EVENTS_URL;

  let connection = connections.get(url);
  if (!connection) {
    connection = new Connection(url, () => connections.delete(url));
    connections.set(url, connection);
  }
  const subscriber: Subscriber = {
    eventTypes: options.eventTypes,
    onEvent: options.onEvent,
    onConnectedChange: options.onConnectedChange,
    onStop: options.onStop,
  };
  connection.add(subscriber);

  let closed = false;
  const joined = connection;
  return {
    close() {
      if (closed) return;
      closed = true;
      joined.remove(subscriber);
    },
  };
}

/** Test-only: close every connection, so one test's stream cannot reach the next. */
export function _closeAllEventStreams(): void {
  for (const connection of [...connections.values()]) connection.shutDown();
}

class Connection {
  private readonly subscribers = new Set<Subscriber>();
  private source: EventSource | null = null;
  /** Event types the current source has a listener for. */
  private listening = new Set<string>();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  /** Failed tries since a stream last stayed connected. */
  private failedTries = 0;
  private connectedAt: number | null = null;
  private stoppedFor: StreamStopReason | null = null;
  /** Whether the check has already been asked again after a 401. */
  private recheckingAfter401 = false;
  private shut = false;

  constructor(
    private readonly url: string,
    private readonly onShutDown: () => void,
  ) {
    if (typeof window !== "undefined") window.addEventListener("online", this.wake);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", this.wake);
    void this.check();
  }

  add(subscriber: Subscriber): void {
    this.subscribers.add(subscriber);
    for (const type of subscriber.eventTypes) this.listen(type);
    if (this.connectedAt !== null) subscriber.onConnectedChange?.(true);
    if (this.stoppedFor) subscriber.onStop?.(this.stoppedFor);
  }

  remove(subscriber: Subscriber): void {
    this.subscribers.delete(subscriber);
    if (this.subscribers.size === 0) this.shutDown();
  }

  shutDown(): void {
    if (this.shut) return;
    this.shut = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.source?.close();
    this.source = null;
    if (typeof window !== "undefined") window.removeEventListener("online", this.wake);
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.wake);
    this.onShutDown();
  }

  /** Start again after a stop that a new check may undo, when the tab is shown or the browser is back online. */
  private wake = (event: Event): void => {
    if (this.shut || (this.stoppedFor !== "signed-out" && this.stoppedFor !== "gave-up")) return;
    if (event.type === "visibilitychange" && document.visibilityState !== "visible") return;
    this.stoppedFor = null;
    this.failedTries = 0;
    this.recheckingAfter401 = false;
    void this.check();
  };

  private async check(): Promise<void> {
    this.retryTimer = null;
    let status: number | null;
    try {
      status = (await apiFetch(this.url, { method: "HEAD" })).status;
    } catch {
      status = null; // offline, or the request was blocked
    }
    if (this.shut || this.stoppedFor) return;

    if (status === 200) {
      this.recheckingAfter401 = false;
      this.open();
    } else if (status === 401) {
      if (this.recheckingAfter401) {
        this.stop("signed-out");
      } else {
        this.recheckingAfter401 = true;
        this.retryTimer = setTimeout(() => void this.check(), SIGNED_OUT_RECHECK_MS);
      }
    } else if (status === 403) {
      this.stop("forbidden");
    } else if (status === 204) {
      this.stop("off");
    } else {
      this.tryAgainLater();
    }
  }

  private open(): void {
    const stream = new EventSource(this.url);
    this.source = stream;
    this.listening = new Set();
    for (const subscriber of this.subscribers) {
      for (const type of subscriber.eventTypes) this.listen(type);
    }

    stream.addEventListener("connected", () => {
      if (this.source !== stream) return;
      this.connectedAt = Date.now();
      for (const subscriber of this.subscribers) subscriber.onConnectedChange?.(true);
    });

    stream.onerror = () => {
      // Refused or dropped: EventSource cannot say which. Close it, rather
      // than let the browser retry blindly with the same cookie, and go
      // back to the check.
      stream.close();
      if (this.source !== stream) return;
      this.source = null;
      const wasConnected = this.connectedAt !== null;
      if (wasConnected && Date.now() - this.connectedAt! >= HEALTHY_AFTER_MS) this.failedTries = 0;
      this.connectedAt = null;
      if (wasConnected) {
        for (const subscriber of this.subscribers) subscriber.onConnectedChange?.(false);
      }
      this.tryAgainLater();
    };
  }

  private listen(type: string): void {
    const stream = this.source;
    if (!stream || this.listening.has(type)) return;
    this.listening.add(type);
    stream.addEventListener(type, (event: MessageEvent) => {
      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      for (const subscriber of this.subscribers) {
        if (subscriber.eventTypes.includes(type)) subscriber.onEvent(type, data);
      }
    });
  }

  private tryAgainLater(): void {
    if (this.shut) return;
    if (this.failedTries >= MAX_FAILED_TRIES) {
      this.stop("gave-up");
      return;
    }
    const wait = Math.min(INITIAL_RETRY_MS * 2 ** this.failedTries, MAX_RETRY_MS);
    this.failedTries++;
    this.retryTimer = setTimeout(() => void this.check(), wait);
  }

  private stop(reason: StreamStopReason): void {
    if (this.shut) return;
    this.stoppedFor = reason;
    for (const subscriber of this.subscribers) subscriber.onStop?.(reason);
  }
}
