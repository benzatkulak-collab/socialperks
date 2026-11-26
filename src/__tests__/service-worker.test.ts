/**
 * public/sw.js, the service worker every visitor gets, and the realtime
 * stream.
 *
 * The worker answers every same-origin /api/v1/* GET itself, network first,
 * and before it hands a good response to the page it reads the whole body to
 * keep a copy (`await responseToCache.blob()`). The realtime stream
 * (GET /api/v1/events) never ends, so that read never finishes and the page's
 * EventSource never hears a byte: no `open`, no `error`, nothing. Seen in
 * Chrome against `next dev` on 2026-11-26, where curl got the stream at once.
 *
 * So the worker leaves the stream to the browser, and HEAD /api/v1/events
 * too: the client's check must come from the server, and the Cache API
 * cannot store a HEAD. Any request that asks for an event stream is left
 * alone as well. Other API reads keep the worker's network-first handling.
 *
 * The test runs sw.js in a sandbox with a stand-in `self` and fires fetch
 * events at it.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const ORIGIN = "http://localhost:3000";

type FetchListener = (event: { request: Request; respondWith: (r: Promise<Response> | Response) => void }) => void;

function loadWorker(): FetchListener {
  const listeners = new Map<string, FetchListener>();
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, listener: FetchListener) => listeners.set(type, listener),
    skipWaiting: () => {},
    clients: { claim: () => {}, matchAll: async () => [] },
  };
  const code = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");
  const caches = {
    open: async () => ({ put: async () => {} }),
    match: async () => undefined,
  };
  const fetch = async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  vm.runInNewContext(code, { self, URL, Request, Response, Headers, console, fetch, caches, indexedDB: {} });
  const onFetch = listeners.get("fetch");
  if (!onFetch) throw new Error("sw.js registered no fetch listener");
  return onFetch;
}

/** Whether the worker answers this request itself (true) or leaves it to the browser (false). */
function workerAnswers(url: string, init: RequestInit = {}): boolean {
  const onFetch = loadWorker();
  // Settle whatever the worker answers with, so nothing is left unhandled.
  const respondWith = vi.fn((answer: Promise<Response> | Response) => {
    void Promise.resolve(answer).catch(() => {});
  });
  onFetch({ request: new Request(`${ORIGIN}${url}`, init), respondWith });
  return respondWith.mock.calls.length > 0;
}

describe("public/sw.js — the realtime stream", () => {
  it("leaves the stream to the browser", () => {
    expect(workerAnswers("/api/v1/events?businessId=biz_test_alpha", { headers: { accept: "text/event-stream" } })).toBe(false);
    expect(workerAnswers("/api/v1/events")).toBe(false);
  });

  it("leaves the client's HEAD check to the server", () => {
    expect(workerAnswers("/api/v1/events?businessId=biz_test_alpha", { method: "HEAD" })).toBe(false);
  });

  it("leaves any request for an event stream alone", () => {
    expect(workerAnswers("/api/v1/some-future-stream", { headers: { accept: "text/event-stream" } })).toBe(false);
  });

  it("still answers other API reads itself", () => {
    expect(workerAnswers("/api/v1/campaigns?businessId=biz_test_alpha")).toBe(true);
    expect(workerAnswers("/api/v1/eventsfeed")).toBe(true);
  });
});
