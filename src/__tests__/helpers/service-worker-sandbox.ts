/**
 * public/sw.js in a sandbox, for the service worker tests: a stand-in `self`,
 * network, Cache Storage and IndexedDB, and helpers that fire install,
 * activate and fetch events at the worker. Moved here from
 * service-worker-api-cache.test.ts so the page tests can use it too.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

export const ORIGIN = "http://localhost:3000";
export const WORKER_SOURCE = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");

export type Listener = (event: Record<string, unknown>) => void;
/** Cache name -> {path: kept answer}. A JSON body, or a ready-made Response (an HTML page). */
export type Seed = Record<string, Record<string, unknown>>;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export function settled(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Cache Storage in memory, keyed by URL, with the calls sw.js makes. `seed` maps cache names to {path: body}.
 * `addAll` fetches through `fetchForAddAll`; without it, it keeps nothing.
 */
export function createCacheStorage(seed: Seed, fetchForAddAll?: (request: Request) => Promise<Response>) {
  let writesRefused = false;
  const stores = new Map<string, Map<string, Response>>();
  for (const [name, entries] of Object.entries(seed)) {
    stores.set(
      name,
      new Map(
        Object.entries(entries).map(([url, body]) => [`${ORIGIN}${url}`, body instanceof Response ? body : json(body)])
      )
    );
  }
  const keyOf = (request: Request | string) => (typeof request === "string" ? new URL(request, ORIGIN).href : request.url);
  const cacheFor = (store: Map<string, Response>) => {
    // Like the real Cache API: GETs only, and the body is read to the end.
    const put = async (request: Request, response: Response) => {
      if (request.method !== "GET") throw new TypeError(`Request method '${request.method}' is unsupported`);
      const body = await response.arrayBuffer();
      store.set(keyOf(request), new Response(body, { status: response.status, headers: response.headers }));
    };
    return {
      put,
      match: async (request: Request) => store.get(keyOf(request))?.clone(),
      // Like the real Cache API: fetches every address and keeps them all, or
      // none if one fails or answers outside 200-299.
      addAll: async (requests: (Request | string)[]) => {
        if (!fetchForAddAll) return;
        const fetched = await Promise.all(
          requests.map(async (input) => {
            const request = typeof input === "string" ? new Request(new URL(input, ORIGIN)) : input;
            const response = await fetchForAddAll(request);
            if (!response.ok) throw new TypeError(`addAll: ${request.url} answered ${response.status}`);
            return { request, response };
          })
        );
        for (const { request, response } of fetched) await put(request, response);
      },
    };
  };
  const api = {
    open: async (name: string) => {
      // A full disk or a locked-down browser: Cache Storage will not open a cache to write in.
      if (writesRefused) throw new Error("Cache Storage refused to open a cache");
      if (!stores.has(name)) stores.set(name, new Map());
      return cacheFor(stores.get(name)!);
    },
    match: async (request: Request, options?: { cacheName?: string }) => {
      const names = options?.cacheName ? [options.cacheName] : [...stores.keys()];
      for (const name of names) {
        const hit = stores.get(name)?.get(keyOf(request));
        if (hit) return hit.clone();
      }
      return undefined;
    },
    has: async (name: string) => stores.has(name),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
  return {
    api,
    /** Cache names, in the order they were made. */
    names: () => [...stores.keys()],
    /** Every URL kept, in any cache. */
    urls: () => [...stores.values()].flatMap((store) => [...store.keys()]),
    /** From now on, opening a cache fails: nothing more can be kept. What is kept can still be read. */
    refuseWrites: () => {
      writesRefused = true;
    },
  };
}

/** sw.js, started in a sandbox. The network answers 200 with made-up JSON until told otherwise. */
export function startWorker(seed: Seed = {}) {
  const listeners = new Map<string, Listener>();
  const network = {
    online: true,
    /** Every request the worker sent, as method and path. */
    requests: [] as string[],
    answer: (request: Request): Response => json({ success: true, data: { path: new URL(request.url).pathname } }),
  };
  // IndexedDB that records what the worker asks of it. An open never answers,
  // so a worker that waits on a database hangs, and the tests see it.
  // With `blockDelete`, a delete reports "blocked" (a connection still open)
  // and never finishes.
  const idb = { opened: [] as string[], deleted: [] as string[], blockDelete: false };
  const indexedDB = {
    open: (name: string) => {
      idb.opened.push(name);
      return {};
    },
    deleteDatabase: (name: string) => {
      idb.deleted.push(name);
      const request: { onsuccess?: () => void; onblocked?: () => void } = {};
      setTimeout(() => (idb.blockDelete ? request.onblocked?.() : request.onsuccess?.()), 0);
      return request;
    },
  };
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    skipWaiting: () => {},
    clients: { claim: async () => {}, matchAll: async () => [] },
  };
  const fetch = async (input: Request | string, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(new URL(input, ORIGIN), init);
    network.requests.push(`${request.method} ${new URL(request.url).pathname}`);
    if (!network.online) throw new TypeError("Failed to fetch");
    return network.answer(request);
  };
  // Install's `cache.addAll` fetches through the same network.
  const storage = createCacheStorage(seed, fetch);
  vm.runInNewContext(WORKER_SOURCE, { self, URL, Request, Response, Headers, console, fetch, caches: storage.api, indexedDB });

  const fire = (type: string, event: Record<string, unknown>) => {
    const listener = listeners.get(type);
    if (!listener) throw new Error(`sw.js registered no ${type} listener`);
    listener(event);
  };

  /** Fires an event the worker may not listen for at all. */
  const fireIfListening = (type: string, event: Record<string, unknown>) => {
    listeners.get(type)?.(event);
  };

  /** Fires a lifecycle event and waits for what it asked to finish. */
  const lifecycle = async (type: "install" | "activate") => {
    const kept: Promise<unknown>[] = [];
    fire(type, { waitUntil: (work: Promise<unknown>) => kept.push(work) });
    await Promise.all(kept);
    await settled();
  };

  /** Fires a fetch event. `answer` stays null when the worker leaves the request to the browser. */
  const dispatch = (url: string, init?: RequestInit) => {
    const state: { answer: Promise<Response> | null; kept: Promise<unknown>[] } = { answer: null, kept: [] };
    fire("fetch", {
      request: new Request(`${ORIGIN}${url}`, init),
      respondWith: (answer: Promise<Response> | Response) => {
        state.answer = Promise.resolve(answer);
      },
      waitUntil: (work: Promise<unknown>) => state.kept.push(work),
    });
    return state;
  };

  return {
    storage,
    network,
    idb,
    dispatch,
    fireIfListening,
    install: () => lifecycle("install"),
    activate: () => lifecycle("activate"),
    /** The worker's answer, or "still waiting" if it has none within a second. */
    answerWithin: async (url: string, init?: RequestInit): Promise<Response | string> => {
      const { answer } = dispatch(url, init);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const stillWaiting = new Promise<string>((resolve) => {
        timer = setTimeout(() => resolve("still waiting"), 1000);
      });
      const first = await Promise.race([answer ?? Promise.resolve("left to the browser"), stillWaiting]);
      clearTimeout(timer);
      return first;
    },
    /** The worker's answer, once the work it kept running has finished as well. */
    send: async (url: string, init?: RequestInit): Promise<Response | null> => {
      const { answer, kept } = dispatch(url, init);
      const response = answer ? await answer : null;
      await Promise.all(kept);
      await settled();
      return response;
    },
  };
}
