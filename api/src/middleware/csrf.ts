import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import type { AppEnv } from "@api/env.js";
import { generateCsrfToken, validateCsrfToken } from "@lib/security/csrf.js";

/**
 * CSRF protection middleware.
 *
 * - GET/HEAD/OPTIONS: attaches a fresh CSRF token via `X-CSRF-Token` response header
 * - POST/PUT/DELETE/PATCH: validates the `X-CSRF-Token` request header against
 *   the session bound to the access-token cookie.
 *
 * Excluded paths (webhooks, OAuth callbacks) must be listed in EXEMPT_PATHS.
 */

const EXEMPT_PREFIXES = [
  "/v1/billing/webhook",       // Stripe webhook — authenticated by signature
  "/v1/verification/webhook",  // Platform webhooks — authenticated by signature
  "/v1/oauth/",                // OAuth callbacks — state-token authenticated
  "/v1/events",                // SSE stream — GET only
  "/v1/health",                // Health check
  "/v1/seed",                  // Dev-only seed
];

function isExempt(path: string): boolean {
  return EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// Test-only bypass: when CSRF_BYPASS=1 in non-production, the middleware is
// a no-op. Same pattern as RATE_LIMIT_BYPASS — physically impossible to
// enable in a production build because of the NODE_ENV gate.
const BYPASS_ENABLED =
  process.env.NODE_ENV !== "production" && process.env.CSRF_BYPASS === "1";

export const csrfProtection = createMiddleware<AppEnv>(async (c, next) => {
  if (BYPASS_ENABLED) {
    await next();
    return;
  }

  const method = c.req.method.toUpperCase();
  const path = c.req.path;

  // Skip CSRF for exempt paths
  if (isExempt(path)) {
    await next();
    return;
  }

  // Derive session ID from the access-token cookie (same binding used in token generation)
  const accessToken = getCookie(c as never, "sp-access-token");
  const sessionId = accessToken ? accessToken.slice(0, 32) : "anonymous";

  // Safe methods: attach a fresh token for the client to use on the next mutation
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    await next();
    const token = generateCsrfToken(sessionId);
    c.header("X-CSRF-Token", token);
    return;
  }

  // Mutating methods: validate the token
  const csrfToken = c.req.header("x-csrf-token");
  if (!csrfToken) {
    return c.json(
      { success: false, error: { code: "CSRF_MISSING", message: "X-CSRF-Token header is required for state-changing requests" } },
      403
    );
  }

  if (!validateCsrfToken(csrfToken, sessionId)) {
    return c.json(
      { success: false, error: { code: "CSRF_INVALID", message: "Invalid or expired CSRF token. Refresh and try again." } },
      403
    );
  }

  await next();
});
