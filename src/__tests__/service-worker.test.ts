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
type ActivateListener = (event: { waitUntil: (p: Promise<unknown>) => void }) => void;

/** The worker's event listeners, run against a stand-in `self` and Cache Storage holding these cache names. */
function loadWorkerListeners(cacheNames: string[] = []) {
  const listeners = new Map<string, unknown>();
  const deleted: string[] = [];
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, listener: unknown) => listeners.set(type, listener),
    skipWaiting: () => {},
    clients: { claim: () => {}, matchAll: async () => [] },
  };
  const code = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");
  const caches = {
    open: async () => ({ put: async () => {} }),
    match: async () => undefined,
    keys: async () => cacheNames,
    delete: async (name: string) => {
      deleted.push(name);
      return true;
    },
  };
  const fetch = async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  vm.runInNewContext(code, { self, URL, Request, Response, Headers, console, fetch, caches, indexedDB: {} });
  return { listeners, deleted };
}

function loadWorker(): FetchListener {
  const onFetch = loadWorkerListeners().listeners.get("fetch") as FetchListener | undefined;
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

/**
 * The worker before this change answered the stream itself and, once a stream
 * ended, kept the finished body in its API cache (`sp-v1-api`), including the
 * `connected` event with the caller's email. The new worker uses new cache
 * names, so activating it deletes every cache the old one kept.
 */
describe("public/sw.js — the caches the old worker kept", () => {
  it("deletes the old worker's caches when it activates", async () => {
    const { listeners, deleted } = loadWorkerListeners(["sp-v1-api", "sp-v1-static", "sp-v1-pages", "another-app-cache"]);
    const onActivate = listeners.get("activate") as ActivateListener;
    let done: Promise<unknown> = Promise.resolve();
    onActivate({ waitUntil: (p) => (done = p) });
    await done;
    expect(deleted.sort()).toEqual(["sp-v1-api", "sp-v1-pages", "sp-v1-static"]);
  });
});
