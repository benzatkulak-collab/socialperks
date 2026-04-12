/**
 * GET /api/v1/csrf — Generate a CSRF token
 *
 * Returns a fresh CSRF token bound to the current session.
 * Also sets it as a cookie for convenience (double-submit pattern).
 * No auth required for the endpoint itself, but the token is bound
 * to a session ID derived from the request (or a random fallback
 * for anonymous pre-auth flows like login forms).
 */

import type { NextRequest } from "next/server";
import { ok, rateLimit, getUser, withTiming } from "../_shared";
import { generateCsrfToken } from "@/lib/security/csrf";

export const GET = withTiming(async (req: NextRequest) => {
  // Rate limit — standard to prevent token-generation abuse
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // Use the authenticated user's ID if available, otherwise generate
  // a session-scoped identifier from the request IP + user-agent.
  const user = getUser(req);
  const sessionId = user?.id ?? deriveAnonymousSessionId(req);

  const token = generateCsrfToken(sessionId);

  // Set the token as a cookie for the double-submit cookie pattern
  const secure = process.env.NODE_ENV !== "development";
  const cookieParts = [
    `sp-csrf-token=${token}`,
    "Path=/",
    "Max-Age=3600",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  const res = ok({ csrfToken: token }, 200, { "Set-Cookie": cookieParts });
  return res;
});

/**
 * Derive a stable-ish anonymous session ID from request metadata.
 * This is used for pre-auth CSRF tokens (e.g., login forms).
 */
function deriveAnonymousSessionId(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";
  // Simple hash-like combination; the real security comes from HMAC in the token itself
  return `anon:${ip}:${ua.slice(0, 32)}`;
}
