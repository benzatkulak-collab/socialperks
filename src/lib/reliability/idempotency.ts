/**
 * Idempotency Key Middleware
 * ==========================
 *
 * Ensures critical operations (payments, job creation, submissions) are
 * safe to retry. Clients send an `Idempotency-Key` header; the server
 * caches the response and returns it on duplicate requests.
 *
 * Storage: in-memory with TTL (swappable to Redis for multi-instance).
 */

import type { NextRequest } from "next/server";

// ── Types ──────────────────────────────────────────────────────────────────

interface CachedResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
  createdAt: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 50_000;
const PRUNE_BATCH = 5_000;

// ── Cache ──────────────────────────────────────────────────────────────────

const cache = new Map<string, CachedResponse>();
const inFlight = new Set<string>();

/**
 * Prune expired entries when cache gets too large.
 */
function pruneCache(ttlMs: number): void {
  if (cache.size < MAX_CACHE_SIZE) return;

  const cutoff = Date.now() - ttlMs;
  let removed = 0;

  for (const [key, entry] of cache) {
    if (entry.createdAt < cutoff || removed < PRUNE_BATCH) {
      cache.delete(key);
      removed++;
    }
    if (removed >= PRUNE_BATCH) break;
  }
}

// ── Middleware ──────────────────────────────────────────────────────────────

/**
 * Extract the idempotency key from a request.
 * Returns null if no key is provided (non-idempotent request).
 */
export function getIdempotencyKey(req: NextRequest): string | null {
  return req.headers.get("idempotency-key") ?? req.headers.get("x-idempotency-key") ?? null;
}

/**
 * Check if a cached response exists for this idempotency key.
 * Returns the cached Response if found, null otherwise.
 */
export function getCachedResponse(key: string): Response | null {
  const cached = cache.get(key);
  if (!cached) return null;

  // Check TTL
  if (Date.now() - cached.createdAt > DEFAULT_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return new Response(cached.body, {
    status: cached.status,
    headers: {
      ...cached.headers,
      "X-Idempotent-Replay": "true",
    },
  });
}

/**
 * Check if a request with this key is currently being processed.
 */
export function isInFlight(key: string): boolean {
  return inFlight.has(key);
}

/**
 * Mark a key as in-flight (being processed).
 */
export function markInFlight(key: string): void {
  inFlight.add(key);
}

/**
 * Store a response for future replay and clear in-flight status.
 */
export function cacheResponse(key: string, response: Response, body: string): void {
  inFlight.delete(key);

  const headers: Record<string, string> = {};
  response.headers.forEach((value, name) => {
    headers[name] = value;
  });

  cache.set(key, {
    status: response.status,
    body,
    headers,
    createdAt: Date.now(),
  });

  pruneCache(DEFAULT_TTL_MS);
}

/**
 * Clear in-flight status on failure (allows retry).
 */
export function clearInFlight(key: string): void {
  inFlight.delete(key);
}

/**
 * Higher-order handler that wraps a route with idempotency support.
 *
 * Usage:
 *   export const POST = withIdempotency(async (req) => {
 *     // ... your handler
 *     return ok({ data });
 *   });
 */
export function withIdempotency(
  handler: (req: NextRequest, ctx?: unknown) => Promise<Response>
): (req: NextRequest, ctx?: unknown) => Promise<Response> {
  return async (req: NextRequest, ctx?: unknown) => {
    const key = getIdempotencyKey(req);

    // No idempotency key — pass through
    if (!key) {
      return handler(req, ctx);
    }

    // Check cache
    const cached = getCachedResponse(key);
    if (cached) return cached;

    // Check if another request with this key is in-flight
    if (isInFlight(key)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "CONFLICT", message: "A request with this idempotency key is already being processed" },
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Process the request
    markInFlight(key);
    try {
      const response = await handler(req, ctx);

      // Clone and cache the response body
      const cloned = response.clone();
      const body = await cloned.text();
      cacheResponse(key, response, body);

      // Return a fresh response from the cached body (original may be consumed)
      const headers: Record<string, string> = {};
      response.headers.forEach((value, name) => {
        headers[name] = value;
      });

      return new Response(body, {
        status: response.status,
        headers,
      });
    } catch (e) {
      clearInFlight(key);
      throw e;
    }
  };
}

// ── Fingerprinting ─────────────────────────────────────────────────────────

/**
 * Generate a request fingerprint from method + path + body hash.
 * Useful when clients don't send an explicit idempotency key.
 */
export async function generateFingerprint(req: NextRequest): Promise<string> {
  const method = req.method;
  const path = new URL(req.url).pathname;

  try {
    const body = await req.clone().text();
    const encoder = new TextEncoder();
    const data = encoder.encode(`${method}:${path}:${body}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return `fp_${hash.slice(0, 32)}`;
  } catch {
    return `fp_${method}_${path}_${Date.now()}`;
  }
}
