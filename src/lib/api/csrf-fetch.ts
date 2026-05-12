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

/**
 * Authenticated, CSRF-aware fetch. Returns the raw Response — callers should
 * still check `res.ok`. For a throwing happy-path use `apiFetchJson`.
 */
export async function apiFetch(
  input: string,
  init: ApiFetchOptions = {}
): Promise<Response> {
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
