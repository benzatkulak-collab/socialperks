/**
 * Shared API route utilities.
 *
 * Every route handler should use these helpers for consistent
 * response format, auth, rate limiting, and request tracing.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders, type RateLimitTier } from "@/lib/security/rate-limiter";
import { validateCsrfToken } from "@/lib/security/csrf";
import { verifyJWT, sessionStore } from "@/lib/auth";
import {
  detectVersion,
  addVersionHeaders,
  getVersionConfig,
  type APIVersion,
} from "@/lib/api/versioning";

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

// ─── CSRF Protection ─────────────────────────────────────────────────────

/**
 * Validate the CSRF token from the request.
 * Checks X-CSRF-Token header first, then falls back to `_csrf` in the body.
 * Requires an authenticated user (sessionId used to bind the token).
 * Returns null if valid, or an error Response if invalid.
 */
export function requireCsrf(
  req: NextRequest,
  user: AuthUser,
  body?: Record<string, unknown> | null
): NextResponse | null {
  const token =
    req.headers.get("x-csrf-token") ??
    (body && typeof body === "object" ? (body as Record<string, unknown>)._csrf as string : null) ??
    null;

  if (!token || typeof token !== "string") {
    return err("CSRF_TOKEN_MISSING", "CSRF token is required. Include X-CSRF-Token header or _csrf in the request body.", 403);
  }

  if (!validateCsrfToken(token, user.id)) {
    return err("CSRF_TOKEN_INVALID", "CSRF token is invalid or expired", 403);
  }

  return null; // valid
}

// ─── API Key Permissions & Scoping ───────────────────────────────────────

export const API_PERMISSIONS = {
  "campaigns:read": "Read campaign data",
  "campaigns:write": "Create and modify campaigns",
  "submissions:read": "Read submission data",
  "submissions:write": "Create and review submissions",
  "analytics:read": "Read analytics data",
  "programs:read": "Read perk programs",
  "programs:write": "Create and modify perk programs",
  "billing:manage": "Manage billing and subscriptions",
  "webhooks:manage": "Manage webhooks",
  "exchange:read": "Read exchange data",
  "exchange:write": "Place and manage orders",
} as const;

export type ApiPermission = keyof typeof API_PERMISSIONS;

export const API_SCOPES: Record<string, ApiPermission[]> = {
  read: [
    "campaigns:read",
    "submissions:read",
    "analytics:read",
    "programs:read",
    "exchange:read",
  ],
  "read-write": [
    "campaigns:read",
    "campaigns:write",
    "submissions:read",
    "submissions:write",
    "analytics:read",
    "programs:read",
    "programs:write",
    "exchange:read",
    "exchange:write",
  ],
  admin: Object.keys(API_PERMISSIONS) as ApiPermission[],
};

// In-memory API key permission store (production: DB-backed)
const apiKeyPermissions = new Map<
  string,
  { permissions: ApiPermission[] }
>();

/**
 * Register permissions for an API key (by key hash or prefix).
 */
export function registerApiKeyPermissions(
  keyHash: string,
  permissions: ApiPermission[]
) {
  apiKeyPermissions.set(keyHash, { permissions });
}

/**
 * Check if the current request (authenticated via API key) has a specific permission.
 * Returns a 403 NextResponse if permission is denied, or null if allowed.
 *
 * If the request is NOT authenticated via API key (e.g. JWT user),
 * permission check passes — JWT users have full access.
 */
export function requirePermission(
  req: NextRequest,
  permission: ApiPermission
): NextResponse | null {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return null; // Not using API key auth — JWT users have full access

  const keyData = apiKeyPermissions.get(apiKey);
  if (!keyData) return null; // Unknown key — let the auth layer handle it

  if (!keyData.permissions.includes(permission)) {
    return err(
      "INSUFFICIENT_PERMISSIONS",
      `API key lacks required permission: ${permission}`,
      403
    );
  }
  return null; // Permission granted
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
    const res = await handler(req, ctx);
    const duration = (performance.now() - start).toFixed(1);
    res.headers.set("X-Response-Time", `${duration}ms`);
    if (!res.headers.has("X-Request-Id")) {
      res.headers.set("X-Request-Id", crypto.randomUUID());
    }
    return res;
  };
}

// ─── Content Negotiation ────────────────────────────────────────────────────

/**
 * Vendor media type pattern: `application/vnd.socialperks.v{N}+json`
 * Extracts the version number from the Accept header.
 */
const VENDOR_MEDIA_RE = /application\/vnd\.socialperks\.v(\d)\+json/;

/**
 * Detect API version from the Accept header using content negotiation.
 * Returns the version if found in vendor media type, otherwise null.
 */
export function detectVersionFromAccept(req: NextRequest): APIVersion | null {
  const accept = req.headers.get("accept");
  if (!accept) return null;

  const match = accept.match(VENDOR_MEDIA_RE);
  if (!match) return null;

  const version = `v${match[1]}`;
  if (version === "v1" || version === "v2") return version;
  return null;
}

// ─── Versioning Wrapper ─────────────────────────────────────────────────────

/**
 * Add API versioning to a route handler.
 *
 * 1. Detects the requested API version from Accept header (content negotiation),
 *    X-API-Version header, query param, or URL path.
 * 2. Adds version headers to the response (X-API-Version, Deprecation, Sunset).
 * 3. Adds deprecation warning header if using a deprecated version.
 *
 * Composable with `withTiming`: `withTiming(withVersioning(handler))`
 */
export function withVersioning(handler: Handler): Handler {
  return async (req, ctx) => {
    // Content negotiation takes priority over other detection methods
    const acceptVersion = detectVersionFromAccept(req);
    const version: APIVersion = acceptVersion ?? detectVersion(req);
    const config = getVersionConfig(version);

    // Extract endpoint from the URL path for Link header
    const url = new URL(req.url);
    const endpoint = url.pathname.replace(/^\/api\/v[12]\//, "");

    // Run the inner handler
    const res = await handler(req, ctx);

    // Add version headers
    addVersionHeaders(res, version, endpoint);

    // Set Content-Type for vendor media type if the client used it
    if (acceptVersion) {
      res.headers.set(
        "Content-Type",
        `application/vnd.socialperks.${version}+json`
      );
    }

    // Add deprecation warning as a structured header for easy parsing
    if (config.status === "deprecated" && config.deprecationMessage) {
      res.headers.set("Warning", `299 - "${config.deprecationMessage}"`);
    }

    return res;
  };
}
