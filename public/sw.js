// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Service Worker
//
// Strategies:
//   Public API reads:           Network-first, cache fallback (PUBLIC_API_READS)
//   Other API reads:            Network only, 503 when offline
//   Static assets:              Cache-first, network fallback
//   Pages:                      Stale-while-revalidate
//   API writes:                 Network only, 503 when offline
// ══════════════════════════════════════════════════════════════════════════════

// v2 (Nov 2026): v1 answered the realtime stream itself and could keep a
// finished stream (with the caller's email) in its API cache. New names make
// the activate step below delete every v1 cache.
// v3 (Nov 2026): v1 and v2 kept a copy of every API read, signed-in ones
// included, and answered from it offline to whoever used the browser next.
// This one keeps public reads only, and no unsent writes. New names make the
// activate step below delete every cache an earlier worker kept.
const CACHE_VERSION = "sp-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

// The API reads this worker keeps a copy of, to answer while offline: reads
// that answer the same for everyone and whose address says nothing about who
// is asking. Every other API read goes to the network only, so no signed-in
// answer stays in the browser. A route added here must never look at the
// caller; src/__tests__/service-worker-api-cache.test.ts checks.
const PUBLIC_API_READS = new Set(["/api/v1/stats/public", "/api/v1/search"]);

// The routes whose writes can change who is signed in on this browser:
// sign-in, sign-up, renewal and sign-out, and the start and end of an
// impersonation. The worker empties its API copies when one goes by.
const SIGN_IN_ROUTES = new Set(["/api/v1/auth", "/api/v1/admin/impersonate"]);

// App shell resources to pre-cache on install
const APP_SHELL = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/favicon.svg",
];

// ─── The old worker's write queue ──────────────────────────────────────────

// Earlier workers kept each write they could not send in this IndexedDB
// database: its address and headers, the CSRF token among them. The failed
// fetch had already used the body, so that was saved as null. They answered
// 202 "will sync" and never sent it: nothing in the app asked them to. This
// worker keeps no writes, and activating it deletes the database with
// whatever it still holds.
const OLD_WRITE_QUEUE_DB = "social-perks-sw";

function deleteOldWriteQueue() {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve();
    try {
      const request = indexedDB.deleteDatabase(OLD_WRITE_QUEUE_DB);
      // "blocked" means a connection is still open; the delete still happens
      // once it closes, so activation does not wait for it.
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
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

// ─── Activate: Clean up old caches and the old write queue ────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key.startsWith("sp-") && !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        );
      }),
      deleteOldWriteQueue(),
    ])
  );
  // Claim all open tabs so the new SW takes effect immediately
  self.clients.claim();
});

// ─── Fetch Strategies ──────────────────────────────────────────────────────

function isApiRoute(url) {
  return url.pathname.startsWith("/api/v1/");
}

// The realtime stream and its HEAD check, or any request for an event stream
function isEventStream(url, request) {
  if (url.pathname === "/api/v1/events") return true;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/event-stream");
}

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico|json)$/i.test(
    url.pathname
  );
}

function isPublicApiRead(url, request) {
  return request.method === "GET" && PUBLIC_API_READS.has(url.pathname);
}

// A write to a sign-in route, however its path is spelled ("/api/v1/auth/")
function changesWhoIsSignedIn(url, request) {
  if (request.method === "GET" || request.method === "HEAD") return false;
  return SIGN_IN_ROUTES.has(url.pathname.replace(/\/+$/, ""));
}

function offlineApiResponse(request) {
  const isWrite = request.method !== "GET" && request.method !== "HEAD";
  const error = isWrite
    ? "You are offline. This change was not saved."
    : "You are offline and no cached data is available.";
  return new Response(JSON.stringify({ error }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

// API requests go to the network. Only public reads keep a copy, for when it
// fails; every other request answers 503 while offline.
async function handleApiRequest(request) {
  // A write, any other read, and every HEAD: the network only. The answer
  // goes to the page as it arrives, and nothing is kept.
  if (!isPublicApiRead(new URL(request.url), request)) {
    try {
      return await fetch(request);
    } catch {
      return offlineApiResponse(request);
    }
  }

  // A public read: network first, keeping a copy for when the network fails
  try {
    const response = await fetch(request);
    if (response.ok) {
      const copy = response.clone();
      caches
        .open(API_CACHE)
        .then((cache) => cache.put(request, copy))
        .catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request, { cacheName: API_CACHE });
    return cached || offlineApiResponse(request);
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

  // Leave the realtime stream to the browser. The worker of v1 and v2 read a
  // GET's whole body to keep a copy before it answered, and GET
  // /api/v1/events never ends, so the page never heard a byte of it. This
  // worker would pass it through, but has nothing to add to a stream. Its HEAD
  // check goes straight to the server too: the client must hear the server's
  // answer.
  if (isEventStream(url, event.request)) {
    return;
  }

  if (isApiRoute(url)) {
    // A sign-in, sign-out or impersonation empties the API copies, whatever
    // the server answers, so the next person to use this browser finds none
    // of the last one's reads. The worker keeps public reads only, so this is
    // a second line of defence.
    if (changesWhoIsSignedIn(url, event.request)) {
      event.waitUntil(caches.delete(API_CACHE));
    }
    event.respondWith(handleApiRequest(event.request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(event.request));
  } else {
    event.respondWith(handlePageRequest(event.request));
  }
});

// ─── Messages from the page ────────────────────────────────────────────────

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
