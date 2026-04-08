// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Service Worker
//
// Strategies:
//   API routes (/api/v1/*):     Network-first, cache fallback (GET only cached)
//   Static assets:              Cache-first, network fallback
//   Pages:                      Stale-while-revalidate
//   Offline mutations:          Queued in IndexedDB, replayed on reconnect
// ══════════════════════════════════════════════════════════════════════════════

const CACHE_VERSION = "sp-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

const API_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

// App shell resources to pre-cache on install
const APP_SHELL = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/favicon.svg",
];

// ─── IndexedDB Helpers (for offline mutation queue) ─────────────────────────

const IDB_NAME = "social-perks-sw";
const IDB_VERSION = 1;
const MUTATION_STORE = "pendingMutations";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(MUTATION_STORE)) {
        db.createObjectStore(MUTATION_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueMutation(method, url, body, headers) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MUTATION_STORE, "readwrite");
    const store = tx.objectStore(MUTATION_STORE);
    store.add({
      method,
      url,
      body,
      headers: Object.fromEntries(
        [...headers].filter(([k]) => !k.startsWith("content-length"))
      ),
      timestamp: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function drainMutationQueue() {
  const db = await openDB();

  const getAllMutations = () =>
    new Promise((resolve, reject) => {
      const tx = db.transaction(MUTATION_STORE, "readonly");
      const store = tx.objectStore(MUTATION_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  const deleteMutation = (id) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction(MUTATION_STORE, "readwrite");
      const store = tx.objectStore(MUTATION_STORE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

  const mutations = await getAllMutations();

  // Sort by timestamp to replay in order
  mutations.sort((a, b) => a.timestamp - b.timestamp);

  for (const mutation of mutations) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.headers,
        body: mutation.body ? JSON.stringify(mutation.body) : undefined,
      });

      if (response.ok || response.status < 500) {
        // Success or client error (don't retry client errors)
        await deleteMutation(mutation.id);
      }
      // 5xx errors left in queue for next attempt
    } catch {
      // Network still down — stop draining
      break;
    }
  }
}

// ─── Install: Pre-cache app shell ──────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        // Non-fatal: some shell resources may not exist yet in dev
        console.warn("[SW] Pre-cache partial failure:", err);
      });
    })
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ─── Activate: Clean up old caches ────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith("sp-") && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      );
    })
  );
  // Claim all open tabs so the new SW takes effect immediately
  self.clients.claim();
});

// ─── Fetch Strategies ──────────────────────────────────────────────────────

function isApiRoute(url) {
  return url.pathname.startsWith("/api/v1/");
}

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico|json)$/i.test(
    url.pathname
  );
}

// Network-first for API GETs; queue mutations when offline
async function handleApiRequest(request) {
  const isReadOnly = request.method === "GET" || request.method === "HEAD";

  if (!isReadOnly) {
    // Mutation: try network, queue if offline
    try {
      return await fetch(request);
    } catch {
      // Offline — queue mutation for later replay
      let body = null;
      try {
        body = await request.clone().json();
      } catch {
        // No body or non-JSON
      }
      await queueMutation(request.method, request.url, body, request.headers);
      return new Response(
        JSON.stringify({
          queued: true,
          message: "You are offline. This change will sync when you reconnect.",
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // GET/HEAD: network-first with cache fallback
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      const responseToCache = response.clone();
      // Store with a timestamp header for TTL checking
      const headers = new Headers(responseToCache.headers);
      headers.set("sw-cache-time", String(Date.now()));
      const timedResponse = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers,
      });
      cache.put(request, timedResponse);
    }
    return response;
  } catch {
    // Network failed — check cache
    const cached = await caches.match(request);
    if (cached) {
      const cacheTime = Number(cached.headers.get("sw-cache-time") || 0);
      if (Date.now() - cacheTime < API_CACHE_MAX_AGE) {
        return cached;
      }
      // Expired but better than nothing when offline
      return cached;
    }
    return new Response(
      JSON.stringify({ error: "You are offline and no cached data is available." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Cache-first for static assets
async function handleStaticAsset(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 503, statusText: "Offline" });
  }
}

// Stale-while-revalidate for pages
async function handlePageRequest(request) {
  const cached = await caches.match(request);

  const networkFetch = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(PAGE_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Return stale immediately, revalidate in background
    networkFetch; // fire-and-forget
    return cached;
  }

  // No cache — must wait for network
  const response = await networkFetch;
  if (response) {
    return response;
  }

  return new Response(
    "<html><body style='background:#0C0F1A;color:#22D3EE;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0'><div style='text-align:center'><h1>You are offline</h1><p>Please reconnect to continue.</p></div></body></html>",
    { status: 503, headers: { "Content-Type": "text/html" } }
  );
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  if (isApiRoute(url)) {
    event.respondWith(handleApiRequest(event.request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(event.request));
  } else {
    event.respondWith(handlePageRequest(event.request));
  }
});

// ─── Background Sync: Replay queued mutations ─────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === "replay-mutations") {
    event.waitUntil(drainMutationQueue());
  }
});

// Also drain on message from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "DRAIN_MUTATIONS") {
    event.waitUntil(
      drainMutationQueue().then(() => {
        // Notify all clients that sync is complete
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: "MUTATIONS_DRAINED" });
          });
        });
      })
    );
  }

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
