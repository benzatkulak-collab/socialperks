import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import type { Context } from "hono";
import type { AppEnv } from "@api/env.js";
import { sessionStore, verifyJWT } from "@lib/auth/index.js";

/**
 * Auth middleware — sets userId, userRole on context if authenticated.
 * Uses async session lookup to support Postgres-backed sessions.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const result = await authenticate(c);
  if (!result.authorized) {
    return c.json(
      { success: false, error: { code: result.code!, message: result.message! } },
      result.status as 401
    );
  }
  c.set("userId", result.userId);
  c.set("userRole", result.userRole);
  await next();
});

export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const result = await authenticate(c);
  if (result.authorized) {
    c.set("userId", result.userId);
    c.set("userRole", result.userRole);
  }
  await next();
});

interface AuthResult {
  authorized: boolean;
  userId: string | null;
  userRole?: string;
  code?: string;
  message?: string;
  status?: number;
}

async function authenticate(c: Context<AppEnv>): Promise<AuthResult> {
  // 1. JWT from httpOnly cookie
  const jwtCookie = getCookie(c, "sp-access-token");
  if (jwtCookie) {
    const payload = verifyJWT(jwtCookie);
    if (payload && payload.type === "access") {
      return { authorized: true, userId: payload.sub, userRole: payload.role };
    }
  }

  // 2. Bearer token or API key from headers
  const authHeader = c.req.header("authorization");
  const apiKey = c.req.header("x-api-key");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : apiKey;

  if (!token) {
    return {
      authorized: false,
      userId: null,
      code: "UNAUTHORIZED",
      message: "Authentication required. Provide a Bearer token or X-API-Key header.",
      status: 401,
    };
  }

  // 3. Session store lookup (tries in-memory, then Postgres)
  const session = await sessionStore.getAsync(token);
  if (session) {
    return { authorized: true, userId: session.userId, userRole: session.userRole };
  }

  // 4. JWT verification on Bearer token
  const jwtPayload = verifyJWT(token);
  if (jwtPayload && jwtPayload.type === "access") {
    return { authorized: true, userId: jwtPayload.sub, userRole: jwtPayload.role };
  }

  // 5. Demo token (development only — requires explicit ALLOW_DEMO_TOKENS=true)
  if (
    token.startsWith("demo-token-") &&
    process.env.NODE_ENV === "development" &&
    process.env.ALLOW_DEMO_TOKENS === "true"
  ) {
    const demoUserId = token.replace("demo-token-", "").slice(0, 100);
    if (/^[a-zA-Z0-9@._-]+$/.test(demoUserId)) {
      return { authorized: true, userId: demoUserId };
    }
  }

  // 6. API key (sk_ prefix) — validate against stored keys
  if (token.startsWith("sk_") && token.length >= 32) {
    // API keys must be verified against a key store, not just by prefix
    const apiKeySession = await sessionStore.getAsync(token);
    if (apiKeySession) {
      return { authorized: true, userId: apiKeySession.userId, userRole: apiKeySession.userRole };
    }
    // Fall through to INVALID_TOKEN if not found in store
  }

  return {
    authorized: false,
    userId: null,
    code: "INVALID_TOKEN",
    message: "Invalid or expired authentication token.",
    status: 401,
  };
}
