/**
 * Client-side CSRF-aware fetch helper.
 *
 * Lazily fetches `/api/v1/csrf`, caches the token in-module, attaches the
 * `sp-access-token` cookie as a Bearer token + `X-CSRF-Token` on every
 * mutating request, and retries once on `CSRF_TOKEN_INVALID`/`CSRF_TOKEN_MISSING`.
 *
 * It also renews the 15-minute access cookie: a 401 from anything but the
 * auth route asks `POST /api/v1/auth {action: "refresh"}` for a new one and
 * sends the request once more (see `renewAccessCookie`). Session checks
 * (`GET /api/v1/auth`, which renews on the server) go through `checkSession`,
 * and sign-outs through `signOutWith`. Sign-outs wait for any refresh or
 * session check already on its way, and session checks wait for any sign-out
 * on its way, so neither can undo a sign-out.
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
 * Sign-outs on their way, each until it has its answer. No refresh starts
 * while there is one, and a session check waits for them before it goes out.
 */
const signOutsInFlight = new Set<Promise<unknown>>();
/** The session check on its way; callers that ask while it runs share it. */
let sessionCheckInFlight: Promise<Response> | null = null;

/**
 * The auth route never triggers a renewal. Its sign-in 401 means a wrong
 * password, and the refresh's own 401 must not ask for another refresh.
 * Its session checks need no renewal here: they renew on the server, because
 * the refresh cookie reaches them, so a 401 from the auth route is final for
 * the browser.
 */
function isAuthRoute(input: string): boolean {
  let path: string;
  try {
    path = new URL(input, "http://localhost").pathname.replace(/\/+$/, "");
  } catch {
    return false;
  }
  return path === AUTH_ROUTE || path.startsWith(`${AUTH_ROUTE}/`);
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
  if (signOutsInFlight.size > 0) return Promise.resolve(false);
  if (refreshesDone !== refreshesBeforeRequest) return Promise.resolve(true);
  if (refreshInFlight) return refreshInFlight;
  // A clock set back since the last refresh gives a negative gap: ask again.
  const sinceLastRefresh = Date.now() - lastRefreshAt;
  if (sinceLastRefresh >= 0 && sinceLastRefresh < MIN_REFRESH_GAP_MS) return Promise.resolve(false);

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
 * Send a sign-out (or anything else that clears the auth cookies) with no
 * refresh or session check running. Either one answered after the sign-out
 * would set again the cookies it has just cleared: a session check renews
 * from the refresh cookie on the server. This waits for any already on its
 * way. Until the sign-out has its answer no refresh starts, and every session
 * check asked meanwhile waits; after that they find no refresh cookie.
 */
export async function signOutWith<T>(request: () => Promise<T>): Promise<T> {
  const checkOnItsWay = sessionCheckInFlight;
  // A check asked from now on goes out after this sign-out: it does not
  // share the answer of one sent before it.
  sessionCheckInFlight = null;
  const signOut = Promise.allSettled([refreshInFlight, checkOnItsWay]).then(() => request());
  signOutsInFlight.add(signOut);
  try {
    return await signOut;
  } finally {
    signOutsInFlight.delete(signOut);
  }
}

// ─── Session checks ─────────────────────────────────────────────────────────

/**
 * Ask the server who is signed in: GET /api/v1/auth, with the cookies. Every
 * session check in the browser goes through here.
 *
 * A check with no good access cookie renews from the refresh cookie on the
 * server and sets the auth cookies again, so checks and sign-outs never
 * cross: a check asked while a sign-out is on its way goes out once the
 * sign-out has its answer, and finds no refresh cookie; a sign-out waits for
 * a check already on its way (signOutWith).
 *
 * Callers that ask while a check is on its way share its one request, and
 * each reads its own copy of the answer. `signal` ends only this caller's
 * wait: it rejects with the signal's reason, and the request goes on for the
 * other callers.
 */
export function checkSession(signal?: AbortSignal): Promise<Response> {
  if (signal?.aborted) return Promise.reject(signal.reason);
  const answer = (sessionCheckInFlight ?? startSessionCheck()).then((res) => res.clone());
  if (!signal) return answer;
  return new Promise<Response>((resolve, reject) => {
    const giveUp = () => reject(signal.reason);
    signal.addEventListener("abort", giveUp, { once: true });
    answer.then(resolve, reject).finally(() => signal.removeEventListener("abort", giveUp));
  });
}

/** One session check, sent once every sign-out on its way has its answer. */
function startSessionCheck(): Promise<Response> {
  const check = Promise.allSettled([...signOutsInFlight]).then(() =>
    fetch(AUTH_ROUTE, { method: "GET", credentials: "include" })
  );
  sessionCheckInFlight = check;
  const forget = () => {
    // A sign-out may already have moved later callers to a check of their own.
    if (sessionCheckInFlight === check) sessionCheckInFlight = null;
  };
  check.then(forget, forget);
  return check;
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
