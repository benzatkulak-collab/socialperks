/**
 * GET /api/v1/csrf — Generate a CSRF token
 *
 * Returns a fresh CSRF token bound to the current session (authenticated
 * user ID, or an IP+UA-derived anon ID for pre-login flows). The token is
 * also set as a cookie for the double-submit pattern. Backed by the HMAC
 * generator in src/lib/security/csrf.ts.
 */

import type { NextRequest } from "next/server";
import { ok, rateLimit, getUser, withTiming } from "../_shared";
import { generateCsrfToken } from "@/lib/security/csrf";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const user = getUser(req);
  const sessionId = user?.id ?? deriveAnonymousSessionId(req);

  const token = generateCsrfToken(sessionId);

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

  return ok({ csrfToken: token }, 200, { "Set-Cookie": cookieParts });
});

function deriveAnonymousSessionId(req: NextRequest): string {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";
  return `anon:${ip}:${ua.slice(0, 32)}`;
}
