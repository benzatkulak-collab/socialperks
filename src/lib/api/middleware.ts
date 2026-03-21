import { NextRequest, NextResponse } from "next/server";
import { sessionStore, verifyJWT } from "@/lib/auth";

export function apiResponse<T>(data: T, status = 200, headers?: Record<string, string>) {
  return NextResponse.json({ success: true, data }, { status, headers });
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export function corsHeaders(requestOrigin?: string | null) {
  const allowedRaw = process.env.ALLOWED_ORIGINS ?? "";
  const allowed = allowedRaw ? allowedRaw.split(",").map((o) => o.trim()) : [];
  // In development, allow localhost origins
  if (process.env.NODE_ENV !== "production") {
    allowed.push("http://localhost:3000", "http://localhost:3001");
  }
  const origin = requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : "";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Vary": "Origin",
  };
}

export function rateLimitHeaders(limit: number, remaining: number) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 3600),
  };
}

export function parsePagination(searchParams: URLSearchParams) {
  const rawPage = parseInt(searchParams.get("page") ?? "1");
  const rawPerPage = parseInt(searchParams.get("perPage") ?? "20");
  const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
  const perPage = Math.min(100, Math.max(1, Number.isFinite(rawPerPage) ? rawPerPage : 20));
  return { page, perPage, offset: (page - 1) * perPage };
}

export function paginationMeta(total: number, page: number, perPage: number) {
  const totalPages = Math.ceil(total / perPage);
  return { page, perPage, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

export function requireAuth(request: NextRequest): { authorized: boolean; userId: string | null; userRole?: string; response?: NextResponse } {
  // 1. Try JWT from httpOnly cookie
  const jwtCookie = request.cookies.get("sp-access-token")?.value;
  if (jwtCookie) {
    const payload = verifyJWT(jwtCookie);
    if (payload && payload.type === "access") {
      return { authorized: true, userId: payload.sub, userRole: payload.role };
    }
  }

  const authHeader = request.headers.get("authorization");
  const apiKey = request.headers.get("x-api-key");

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : apiKey;

  if (!token) {
    return {
      authorized: false,
      userId: null,
      response: NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required. Provide a Bearer token or X-API-Key header." } },
        { status: 401 }
      ),
    };
  }

  // Real session token — check the session store
  const session = sessionStore.get(token);
  if (session) {
    return { authorized: true, userId: session.userId, userRole: session.userRole };
  }

  // Try JWT verification on Bearer token
  const jwtPayload = verifyJWT(token);
  if (jwtPayload && jwtPayload.type === "access") {
    return { authorized: true, userId: jwtPayload.sub, userRole: jwtPayload.role };
  }

  // Demo token format: "demo-token-{businessId}" — only allowed in non-production
  if (token.startsWith("demo-token-") && process.env.NODE_ENV !== "production") {
    return { authorized: true, userId: token.replace("demo-token-", "") };
  }

  // API key access (sk_ prefix) — require minimum length for basic validity
  if (token.startsWith("sk_") && token.length >= 8) {
    return { authorized: true, userId: null }; // API key access, no specific user
  }

  return {
    authorized: false,
    userId: null,
    response: NextResponse.json(
      { success: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired authentication token." } },
      { status: 401 }
    ),
  };
}
