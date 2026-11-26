/**
 * Client-side CSRF-aware fetch helper.
 *
 * Lazily fetches `/api/v1/csrf`, caches the token in-module, attaches the
 * `sp-access-token` cookie as a Bearer token + `X-CSRF-Token` on every
 * mutating request, and retries once on `CSRF_TOKEN_INVALID`/`CSRF_TOKEN_MISSING`.
 *
 * `apiFetch` returns the raw Response; `apiFetchJson` throws on non-2xx so
 * callers cannot silently swallow failures (this was the bug that hid every
 * 403 from the wizard's "Launch Campaign" flow).
 */
let cachedCsrfToken: string | null = null;
let inflightCsrfFetch: Promise<string> | null = null;

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

async function fetchCsrfToken(): Promise<string> {
  if (cachedCsrfToken) return cachedCsrfToken;
  if (inflightCsrfFetch) return inflightCsrfFetch;

  inflightCsrfFetch = (async () => {
    const res = await fetch("/api/v1/csrf", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch CSRF token: HTTP ${res.status}`);
    }
    const body = await res.json();
    const token: string | undefined = body?.data?.csrfToken ?? body?.csrfToken;
    if (!token) throw new Error("CSRF endpoint returned no token");
    cachedCsrfToken = token;
    return token;
  })();

  try {
    return await inflightCsrfFetch;
  } finally {
    inflightCsrfFetch = null;
  }
}

/** Invalidate the cached token. Call after a 403 CSRF_TOKEN_INVALID. */
export function invalidateCsrfToken(): void {
  cachedCsrfToken = null;
}

export interface ApiFetchOptions extends RequestInit {
  /** Skip Bearer-token attachment (for pre-login flows like login itself). */
  skipAuth?: boolean;
  /** Skip CSRF for non-mutating endpoints that still use POST (rare). */
  skipCsrf?: boolean;
}

// ─── Access-cookie renewal ──────────────────────────────────────────────────

const AUTH_ROUTE = "/api/v1/auth";

/**
 * Refreshes are at least this far apart. The refresh shares POST
 * /api/v1/auth, and so its rate limit, with sign-in: 5 a minute per address.
 */
const MIN_REFRESH_GAP_MS = 60_000;

let refreshInFlight: Promise<boolean> | null = null;
/** Refreshes that succeeded since this page loaded. */
let refreshesDone = 0;
let lastRefreshAt = -Infinity;

/**
 * A 401 from the auth route is its answer, not an expired cookie: a wrong
 * password, a refused refresh, or a session check finding none.
 */
function isAuthRoute(input: string): boolean {
  try {
    return new URL(input, "http://localhost").pathname === AUTH_ROUTE;
  } catch {
    return false;
  }
}

/**
 * Get a new access cookie for a request that got 401. Resolves true when the
 * request is worth repeating:
 * - a refresh succeeded after the request was sent, so it carried the old
 *   cookie: repeat it as it is;
 * - otherwise one refresh, shared by every caller that asks while it runs,
 *   and at most one a minute. A 401 within a minute of the last refresh is
 *   either a refusal that will not change (the refresh cookie has gone too)
 *   or not about the cookie at all, because the request carried a new one.
 */
function renewAccessCookie(refreshesBeforeRequest: number): Promise<boolean> {
  if (refreshesDone !== refreshesBeforeRequest) return Promise.resolve(true);
  if (refreshInFlight) return refreshInFlight;
  if (Date.now() - lastRefreshAt < MIN_REFRESH_GAP_MS) return Promise.resolve(false);

  refreshInFlight = fetch(AUTH_ROUTE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "refresh" }),
  })
    .then(
      (res) => res.ok,
      () => false // offline or blocked: the caller still gets its own 401
    )
    .then((renewed) => {
      lastRefreshAt = Date.now();
      if (renewed) refreshesDone++;
      return renewed;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/**
 * Authenticated, CSRF-aware fetch. Returns the raw Response — callers should
 * still check `res.ok`. For a throwing happy-path use `apiFetchJson`.
 *
 * On a 401 from anything but the auth route it renews the 15-minute access
 * cookie with the 7-day refresh cookie and sends the request once more. When
 * no renewal happens it returns the 401 as it came, for the caller to handle.
 */
export async function apiFetch(
  input: string,
  init: ApiFetchOptions = {}
): Promise<Response> {
  const refreshesBeforeRequest = refreshesDone;
  const res = await send(input, init);
  if (res.status !== 401 || isAuthRoute(input)) return res;
  if (!(await renewAccessCookie(refreshesBeforeRequest))) return res;
  return send(input, init);
}

/** One request: auth header, CSRF token for writes, and one CSRF retry. */
async function send(input: string, init: ApiFetchOptions): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const needsCsrf = !init.skipCsrf && MUTATING_METHODS.has(method);

  const headers = new Headers(init.headers ?? {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (!init.skipAuth) {
    const token = readCookie("sp-access-token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (needsCsrf && !headers.has("X-CSRF-Token")) {
    const csrf = await fetchCsrfToken();
    headers.set("X-CSRF-Token", csrf);
  }

  let res = await fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });

  // Retry once on CSRF expiry — token TTL is 1h
  if (needsCsrf && res.status === 403) {
    const cloned = res.clone();
    try {
      const body = await cloned.json();
      const code = body?.error?.code;
      if (code === "CSRF_TOKEN_INVALID" || code === "CSRF_TOKEN_MISSING") {
        invalidateCsrfToken();
        const fresh = await fetchCsrfToken();
        headers.set("X-CSRF-Token", fresh);
        res = await fetch(input, {
          ...init,
          headers,
          credentials: init.credentials ?? "include",
        });
      }
    } catch {
      // body not JSON — fall through and let caller handle
    }
  }

  return res;
}

/**
 * Convenience wrapper: throws on non-2xx and returns parsed JSON body.
 * Thrown error has `.status` and `.body` props for callers that need them.
 */
export async function apiFetchJson<T = unknown>(
  input: string,
  init: ApiFetchOptions = {}
): Promise<T> {
  const res = await apiFetch(input, init);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err = new Error(
      `${init.method ?? "GET"} ${input} failed: HTTP ${res.status}`
    ) as Error & { status: number; body: unknown };
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body as T;
}
