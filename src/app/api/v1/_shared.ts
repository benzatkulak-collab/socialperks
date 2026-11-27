/**
 * Shared API route utilities.
 *
 * Every route handler should use these helpers for consistent
 * response format, auth, rate limiting, and request tracing.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders, type RateLimitTier } from "@/lib/security/rate-limiter";
import { verifyJWT, sessionStore } from "@/lib/auth";
import { verifyApiKey } from "@/lib/auth/api-keys";
import { validateCsrfToken } from "@/lib/security/csrf";
import { metrics, METRIC } from "@/lib/reliability/metrics";
import { getClientIp } from "./_client-ip";

export { getClientIp };

// ─── Response Helpers ────────────────────────────────────────────────────────

/**
 * Build a Headers object that allows multiple Set-Cookie entries.
 *
 * If `extra` includes a "Set-Cookie" value, we split on the special
 * separator "\u0000" (null byte) so callers can pass multiple cookies
 * by joining with that sentinel. Each cookie ends up as its own
 * Set-Cookie header line, which is how HTTP requires multiple cookies.
 */
function buildResponseHeaders(extra?: Record<string, string>): Headers {
  const headers = new Headers({
    "X-Request-Id": crypto.randomUUID(),
    "Content-Type": "application/json",
  });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (k.toLowerCase() === "set-cookie" && v.includes("\u0000")) {
        for (const cookie of v.split("\u0000")) {
          if (cookie) headers.append("Set-Cookie", cookie);
        }
      } else {
        headers.set(k, v);
      }
    }
  }
  return headers;
}

export function ok(data: unknown, status = 200, extra?: Record<string, string>) {
  return NextResponse.json({ success: true, data }, { status, headers: buildResponseHeaders(extra) });
}

export function err(
  code: string,
  message: string,
  status = 400,
  extra?: Record<string, string>
) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status, headers: buildResponseHeaders(extra) }
  );
}

// ─── Auth Helper ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  businessId: string | null;
}

/**
 * Extract authenticated user from request.
 * Checks: Bearer token (JWT or session), cookie, API key.
 * Returns null if unauthenticated.
 *
 * API-key auth path:
 *   • `x-api-key: sp_live_xxxx_yyyy` (preferred — explicit semantics)
 *   • `Authorization: Bearer sp_live_xxxx_yyyy` (fallback — works
 *     with naive HTTP clients that only understand Bearer)
 * Both verify the key against the api-keys store and synthesize an
 * AuthUser representing the agent. The `id` is the api-key record id
 * (so it shows up correctly in audit logs as `agent:<id>`), role is
 * `"agent"` (callers needing the business-owner role check should
 * inspect businessId instead).
 */
export function getUser(req: NextRequest): AuthUser | null {
  // 1. Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    // API-key tokens carry the sp_ prefix. Try those first so we don't
    // pay the JWT-verify CPU cost on every agent call.
    if (token.startsWith("sp_")) {
      const apiKeyUser = tryApiKey(token, req.method);
      if (apiKeyUser) return apiKeyUser;
    }

    // Try JWT next. Access tokens only: the 7-day refresh token is read only
    // by the auth route's refresh action and its session checks, which renew
    // from it; it is never a credential itself.
    const jwt = verifyJWT(token, "access");
    if (jwt) {
      return {
        id: jwt.sub,
        email: jwt.email,
        role: jwt.role,
        businessId: jwt.businessId,
      };
    }

    // Try session token
    const session = sessionStore.get(token);
    if (session) {
      return {
        id: session.userId,
        email: session.email,
        role: session.userRole,
        businessId: session.businessId,
      };
    }
  }

  // 2. Check x-api-key header explicitly. Agents authenticating via
  //    MCP / OpenAPI clients typically use this header.
  const apiKeyHeader = req.headers.get("x-api-key");
  if (apiKeyHeader) {
    const apiKeyUser = tryApiKey(apiKeyHeader, req.method);
    if (apiKeyUser) return apiKeyUser;
  }

  // 3. Check cookie
  const cookie = req.cookies.get("sp-access-token")?.value;
  if (cookie) {
    const jwt = verifyJWT(cookie, "access");
    if (jwt) {
      return {
        id: jwt.sub,
        email: jwt.email,
        role: jwt.role,
        businessId: jwt.businessId,
      };
    }
  }

  return null;
}

/**
 * Resolve an API key into an AuthUser, or null if the key is invalid /
 * expired / revoked.
 *
 * The key store is imported statically. It used to be a lazy
 * `require("@/lib/auth/api-keys")`, which had two costs: the `@/` alias does
 * not resolve for a runtime require under vitest, so no route test could
 * authenticate with a key; and the store's database hydration only started
 * on the first key request, so that request always missed the cache and got
 * a 401 on a cold instance. This file already imports `@/lib/auth`, which
 * hydrates sessions from the database at module load, so the key store now
 * warms at the same moment. No route runs on the edge runtime.
 */
function tryApiKey(plaintext: string, method: string): AuthUser | null {
  const record = verifyApiKey(plaintext);
  if (!record) return null;
  // A key that may not write authenticates nothing that writes.
  if (!keyAllowsMethod(record.permissions, method)) return null;
  return {
    // Use the api-key record id rather than businessId so audit logs
    // can distinguish between two agents acting on the same business.
    id: `agent:${record.id}`,
    email: `${record.agentName}@agent.local`,
    role: "agent",
    businessId: record.businessId,
  };
}

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * API-key permissions: "read", "write", "admin". The dashboard mints "read"
 * and, only if the owner ticks it, "write"; agent OAuth maps read.* scopes to
 * "read" and the rest to "write". Any key may read (as it always could); only
 * "write" or "admin" may send a request that can change data. A POST that
 * only reads (e.g. billing get_usage) therefore needs a write key too.
 */
function keyAllowsMethod(permissions: readonly string[], method: string): boolean {
  if (READ_METHODS.has(method.toUpperCase())) return true;
  return permissions.includes("write") || permissions.includes("admin");
}

/**
 * True when the request carries a valid API key that may only read, on a
 * request that writes. getUser treats such a request as unauthenticated;
 * this lets requireAuth / withTenant say why.
 */
function isReadOnlyKeyOnWrite(req: NextRequest): boolean {
  if (READ_METHODS.has(req.method.toUpperCase())) return false;
  const authHeader = req.headers.get("authorization");
  const candidates = [
    authHeader?.startsWith("Bearer sp_") ? authHeader.slice(7) : null,
    req.headers.get("x-api-key"),
  ];
  return candidates.some((c) => {
    const record = c ? verifyApiKey(c) : null;
    return !!record && !keyAllowsMethod(record.permissions, req.method);
  });
}

/**
 * The response for a request getUser could not authenticate: 403 when it
 * carried a read-only API key on a write, else 401.
 */
export function unauthenticated(req: NextRequest): NextResponse {
  if (isReadOnlyKeyOnWrite(req)) {
    return err(
      "API_KEY_READ_ONLY",
      "This API key can only read. Use a key with write permission to change data.",
      403,
    );
  }
  return err("NO_TOKEN", "Authentication required", 401);
}

/**
 * Is this request authenticated via an API key (vs. a browser session)?
 * Used to skip CSRF: API keys are out-of-band credentials carried in
 * request headers, not browser cookies, so the CSRF threat model
 * (cookie-bound session abuse from a malicious site) doesn't apply.
 */
export function isApiKeyAuth(req: NextRequest): boolean {
  if (req.headers.get("x-api-key")) return true;
  const auth = req.headers.get("authorization");
  return !!(auth?.startsWith("Bearer sp_"));
}

/**
 * Require authentication — returns AuthUser or error Response.
 */
export function requireAuth(req: NextRequest): AuthUser | NextResponse {
  const user = getUser(req);
  if (!user) return unauthenticated(req);
  return user;
}

/**
 * Require a valid CSRF token. Returns an error NextResponse on failure,
 * or null when the request is allowed to proceed. Pull `sessionId` from
 * the authenticated user when available; for pre-login flows we mirror
 * the anon-session derivation used by /api/v1/csrf so the issued token
 * validates here.
 *
 * Discovery: CSRF was previously "decorative" — generateCsrfToken /
 * validateCsrfToken existed, the endpoint issued tokens, and the
 * client-side fetch helper attached `X-CSRF-Token` — but no API route
 * actually called validateCsrfToken. Live verification confirmed
 * PUT /api/v1/campaigns with a junk token returned 200 OK. This helper
 * closes that hole.
 */
export function requireCsrf(req: NextRequest): NextResponse | null {
  // API-key authenticated requests bypass CSRF. Rationale: the CSRF
  // threat model is cookie-bound session abuse from a malicious origin
  // (the user's browser carries the cookie automatically). API keys
  // are out-of-band credentials — there's no cookie auto-attachment,
  // and an agent has no business presenting a CSRF token (it would
  // require a separate dance to fetch one on every call). Skipping
  // CSRF for API-key callers is the standard pattern.
  if (isApiKeyAuth(req)) return null;

  const token = req.headers.get("x-csrf-token") ?? req.headers.get("X-CSRF-Token");
  if (!token) {
    return err("CSRF_TOKEN_MISSING", "CSRF token is required. Include X-CSRF-Token header.", 403);
  }
  const user = getUser(req);
  const sessionId = user?.id ?? deriveAnonSessionId(req);
  if (!validateCsrfToken(token, sessionId)) {
    return err("CSRF_TOKEN_INVALID", "CSRF token is invalid or expired. Refresh and retry.", 403);
  }
  return null;
}

/**
 * Mirror of the anon-session derivation used by /api/v1/csrf/route.ts.
 * Anon users get a session keyed on IP + truncated UA so the token
 * issued by GET /csrf still validates on the subsequent POST/PUT.
 */
function deriveAnonSessionId(req: NextRequest): string {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";
  return `anon:${ip}:${ua.slice(0, 32)}`;
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────

/**
 * Count this request against the caller's address and the route's path.
 * With `bucket`, the request has a counter of its own (path + "#bucket"),
 * so a different kind of request on the same path cannot use it up.
 */
export function rateLimit(
  req: NextRequest,
  tier: RateLimitTier = "standard",
  bucket?: string
): NextResponse | null {
  const ip = getClientIp(req);
  const path = new URL(req.url).pathname;
  const endpoint = bucket ? `${path}#${bucket}` : path;
  const result = checkRateLimit(ip, endpoint, tier);

  if (!result.allowed) {
    metrics.increment(METRIC.RATE_LIMIT_HIT, 1, { endpoint, tier });
    return err("RATE_LIMIT_EXCEEDED", "Too many requests", 429, rateLimitHeaders(result));
  }
  return null; // allowed
}

// ─── Body Parsing ────────────────────────────────────────────────────────────

export async function parseBody<T = Record<string, unknown>>(
  req: NextRequest
): Promise<T | NextResponse> {
  try {
    return (await req.json()) as T;
  } catch {
    return err("INVALID_BODY", "Request body is not valid JSON", 400);
  }
}

// ─── Query Params ────────────────────────────────────────────────────────────

export function getQuery(req: NextRequest): URLSearchParams {
  return new URL(req.url).searchParams;
}

export function paginate(params: URLSearchParams): { page: number; perPage: number } {
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") ?? "20", 10) || 20));
  return { page, perPage };
}

// ─── Timing Wrapper ──────────────────────────────────────────────────────────

type Handler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>;

export function withTiming(handler: Handler): Handler {
  return async (req, ctx) => {
    const start = performance.now();
    const path = new URL(req.url).pathname;

    metrics.increment(METRIC.API_REQUEST, 1, { path, method: req.method });

    const res = await handler(req, ctx);
    const durationMs = performance.now() - start;
    res.headers.set("X-Response-Time", `${durationMs.toFixed(1)}ms`);
    if (!res.headers.has("X-Request-Id")) {
      res.headers.set("X-Request-Id", crypto.randomUUID());
    }

    // Record latency and errors
    metrics.observe(METRIC.API_LATENCY, durationMs, { path });
    if (res.status >= 400) {
      metrics.increment(METRIC.API_ERROR, 1, { path, status: String(res.status) });
    }

    return res;
  };
}
