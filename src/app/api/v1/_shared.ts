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
import { metrics, METRIC } from "@/lib/reliability/metrics";

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
  /**
   * Capability scopes — only populated when the caller authenticated via
   * an x-api-key header. JWT/session callers have all scopes implicitly
   * (their role gates access at the route level).
   *
   * Allowed values today: "read" | "write" | "admin". Use {@link requireScope}
   * inside a mutation handler to gate access.
   */
  permissions?: string[];
}

/**
 * Extract authenticated user from request.
 * Checks: Bearer token (JWT or session), cookie, API key.
 * Returns null if unauthenticated.
 */
export function getUser(req: NextRequest): AuthUser | null {
  // 1. Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    // Try JWT first
    const jwt = verifyJWT(token);
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

  // 2. Check cookie
  const cookie = req.cookies.get("sp-access-token")?.value;
  if (cookie) {
    const jwt = verifyJWT(cookie);
    if (jwt) {
      return {
        id: jwt.sub,
        email: jwt.email,
        role: jwt.role,
        businessId: jwt.businessId,
      };
    }
  }

  // 3. Check x-api-key header — agent / partner integrations.
  // Agents authenticate as `role: "agent"` with the scopes baked into
  // their key. Mutation routes should gate via {@link requireScope}.
  const apiKeyHeader = req.headers.get("x-api-key");
  if (apiKeyHeader) {
    const record = verifyApiKey(apiKeyHeader);
    if (record) {
      return {
        id: `api-key:${record.id}`,
        email: "",
        role: "agent",
        businessId: record.businessId,
        permissions: record.permissions,
      };
    }
  }

  return null;
}

/**
 * Reject a request if the authenticated caller is missing a required
 * scope. Returns null when access is allowed, or an err() Response that
 * the route should return immediately.
 *
 * For non-agent callers (JWT/session/cookie) this is a pass-through —
 * scope checks only apply to api-key-authenticated agents. Human users
 * are gated by `role` at the route level.
 */
export function requireScope(
  user: AuthUser,
  scope: "read" | "write" | "admin"
): NextResponse | null {
  // Non-agent auth implicitly has every scope. Route-level role checks
  // take care of admin/business/agent separation for those flows.
  if (user.role !== "agent") return null;
  const perms = user.permissions ?? [];
  if (perms.includes("admin")) return null;
  if (perms.includes(scope)) return null;
  // "write" is also implied by "admin"; "read" is implied by "write".
  if (scope === "read" && perms.includes("write")) return null;
  return err(
    "INSUFFICIENT_SCOPE",
    `This API key does not have '${scope}' scope. Request scope upgrade or use an authenticated dashboard session.`,
    403
  );
}

/**
 * Require authentication — returns AuthUser or error Response.
 */
export function requireAuth(req: NextRequest): AuthUser | NextResponse {
  const user = getUser(req);
  if (!user) return err("NO_TOKEN", "Authentication required", 401);
  return user;
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────

/**
 * Resolve the client's IP from request headers.
 *
 * SECURITY: Previously trusted the leftmost X-Forwarded-For value, which
 * is attacker-spoofable. On Vercel the trusted client IP lives in
 * `x-real-ip` (set by the edge); we prefer that, then fall back to
 * `x-vercel-forwarded-for` (set by Vercel and not attacker-controlled),
 * and only finally to XFF (which is spoofable but better than 'unknown'
 * for non-Vercel deployments).
 */
function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const vercelXff = req.headers.get("x-vercel-forwarded-for");
  if (vercelXff) return vercelXff.split(",")[0]?.trim() ?? "unknown";
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown";
  return "unknown";
}

export function rateLimit(
  req: NextRequest,
  tier: RateLimitTier = "standard"
): NextResponse | null {
  const ip = getClientIp(req);
  const endpoint = new URL(req.url).pathname;
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
