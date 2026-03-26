import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { sessionStore, verifyJWT } from "@lib/auth/index.js";

/**
 * Auth middleware — sets userId, userRole on context if authenticated.
 * Use `requireAuth` for routes that must be authenticated.
 * Use `optionalAuth` for routes where auth is optional.
 */
export const requireAuth = createMiddleware(async (c, next) => {
  const result = authenticate(c);
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

export const optionalAuth = createMiddleware(async (c, next) => {
  const result = authenticate(c);
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

function authenticate(c: { req: { header: (name: string) => string | undefined }; [key: string]: unknown }): AuthResult {
  // 1. JWT from httpOnly cookie
  const jwtCookie = typeof (c as Record<string, unknown>).req === "object"
    ? getCookie(c as never, "sp-access-token")
    : undefined;
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

  // 3. Session store lookup
  const session = sessionStore.get(token);
  if (session) {
    return { authorized: true, userId: session.userId, userRole: session.userRole };
  }

  // 4. JWT verification on Bearer token
  const jwtPayload = verifyJWT(token);
  if (jwtPayload && jwtPayload.type === "access") {
    return { authorized: true, userId: jwtPayload.sub, userRole: jwtPayload.role };
  }

  // 5. Demo token (non-production only)
  if (token.startsWith("demo-token-") && process.env.NODE_ENV !== "production") {
    return { authorized: true, userId: token.replace("demo-token-", "") };
  }

  // 6. API key (sk_ prefix)
  if (token.startsWith("sk_") && token.length >= 8) {
    return { authorized: true, userId: null };
  }

  return {
    authorized: false,
    userId: null,
    code: "INVALID_TOKEN",
    message: "Invalid or expired authentication token.",
    status: 401,
  };
}
