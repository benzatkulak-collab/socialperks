/**
 * Next.js Edge Middleware
 *
 * Runs on all /api/* routes. Handles:
 * - CORS headers (including OPTIONS preflight)
 * - Security headers
 * - Structured JSON request logging
 */

import { NextRequest, NextResponse } from "next/server";

// ─── CORS Configuration ─────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-CSRF-Token, X-API-Version, X-Request-Id, X-Api-Key",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
};

// ─── Security Headers ────────────────────────────────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// ─── Middleware ──────────────────────────────────────────────────────────────

export function middleware(req: NextRequest) {
  const { method, url } = req;
  const { pathname } = new URL(url);

  // Structured JSON request log
  console.log(
    JSON.stringify({
      level: "info",
      event: "api_request",
      method,
      path: pathname,
      timestamp: new Date().toISOString(),
    })
  );

  // Handle CORS preflight (OPTIONS)
  if (method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        ...CORS_HEADERS,
        ...SECURITY_HEADERS,
      },
    });
  }

  // Continue to the route handler, then add headers to the response
  const response = NextResponse.next();

  // Add CORS headers
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }

  // Add security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

// ─── Matcher: only run on API routes ─────────────────────────────────────────

export const config = {
  matcher: "/api/:path*",
};
