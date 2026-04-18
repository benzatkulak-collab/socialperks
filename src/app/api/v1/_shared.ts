/**
 * Shared API route utilities.
 *
 * Every route handler should use these helpers for consistent
 * response format, auth, rate limiting, and request tracing.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders, type RateLimitTier } from "@/lib/security/rate-limiter";
import { verifyJWT, sessionStore } from "@/lib/auth";
import { metrics, METRIC } from "@/lib/reliability/metrics";

// ─── Response Helpers ────────────────────────────────────────────────────────

export function ok(data: unknown, status = 200, extra?: Record<string, string>) {
  const headers: Record<string, string> = {
    "X-Request-Id": crypto.randomUUID(),
    "Content-Type": "application/json",
    ...extra,
  };
  return NextResponse.json({ success: true, data }, { status, headers });
}

export function err(
  code: string,
  message: string,
  status = 400,
  extra?: Record<string, string>
) {
  const headers: Record<string, string> = {
    "X-Request-Id": crypto.randomUUID(),
    "Content-Type": "application/json",
    ...extra,
  };
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status, headers }
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

  return null;
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

export function rateLimit(
  req: NextRequest,
  tier: RateLimitTier = "standard"
): NextResponse | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
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
