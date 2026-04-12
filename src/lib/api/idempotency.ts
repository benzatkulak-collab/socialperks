/**
 * Social Perks -- Idempotency Key Middleware
 *
 * Tracks idempotency keys for POST/PUT/DELETE requests so agents and
 * clients can safely retry operations without causing side effects.
 *
 * How it works:
 * 1. Client sends an `Idempotency-Key` header with a unique string (e.g. a UUID).
 * 2. If the key has been seen before (within 24h), the cached response is returned.
 * 3. Otherwise, the handler executes normally and the response is cached.
 * 4. The response includes an `Idempotency-Key-Status: cached|new` header.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CachedResponse {
  status: number;
  body: string;
  createdAt: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 10_000;
const EVICTION_BATCH = 500;

// ── Store ──────────────────────────────────────────────────────────────────

const idempotencyCache = new Map<string, CachedResponse>();

// ── Eviction ───────────────────────────────────────────────────────────────

function evictStale(): void {
  if (idempotencyCache.size < MAX_CACHE_SIZE) return;

  const now = Date.now();
  let evicted = 0;

  for (const [key, entry] of idempotencyCache.entries()) {
    if (now - entry.createdAt > CACHE_TTL_MS || evicted < EVICTION_BATCH) {
      idempotencyCache.delete(key);
      evicted++;
    }
    if (evicted >= EVICTION_BATCH) break;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Check if an idempotency key has a cached response.
 * Returns the cached response if found and not expired, null otherwise.
 */
export function checkIdempotency(key: string): CachedResponse | null {
  const entry = idempotencyCache.get(key);
  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    idempotencyCache.delete(key);
    return null;
  }

  return entry;
}

/**
 * Cache a response for an idempotency key.
 */
export function cacheResponse(key: string, status: number, body: string): void {
  evictStale();
  idempotencyCache.set(key, {
    status,
    body,
    createdAt: Date.now(),
  });
}

/**
 * Higher-order function that wraps a route handler with idempotency support.
 *
 * Usage:
 * ```ts
 * export const POST = withTiming(withIdempotency(async (req) => { ... }));
 * ```
 *
 * If the request includes an `Idempotency-Key` header:
 * - Cached: returns the previously stored response with `Idempotency-Key-Status: cached`
 * - New:    executes the handler, caches the response, returns with `Idempotency-Key-Status: new`
 *
 * If no `Idempotency-Key` header is present, the handler executes normally (no caching).
 */
export function withIdempotency(
  handler: (req: NextRequest, ctx?: unknown) => Promise<NextResponse>
): (req: NextRequest, ctx?: unknown) => Promise<NextResponse> {
  return async (req: NextRequest, ctx?: unknown): Promise<NextResponse> => {
    const idempotencyKey = req.headers.get("idempotency-key");

    // No key: pass through without caching
    if (!idempotencyKey) {
      return handler(req, ctx);
    }

    // Validate key format (max 256 chars, printable ASCII)
    if (idempotencyKey.length > 256 || !/^[\x20-\x7E]+$/.test(idempotencyKey)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_IDEMPOTENCY_KEY", message: "Idempotency key must be 1-256 printable ASCII characters" } },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check cache
    const cached = checkIdempotency(idempotencyKey);
    if (cached) {
      const response = new NextResponse(cached.body, {
        status: cached.status,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key-Status": "cached",
          "Idempotency-Key": idempotencyKey,
        },
      });
      return response;
    }

    // Execute the handler
    const response = await handler(req, ctx);

    // Cache the response body and status
    const body = await response.text();
    cacheResponse(idempotencyKey, response.status, body);

    // Rebuild the response (we consumed the body with .text())
    const newResponse = new NextResponse(body, {
      status: response.status,
      headers: response.headers,
    });
    newResponse.headers.set("Idempotency-Key-Status", "new");
    newResponse.headers.set("Idempotency-Key", idempotencyKey);

    return newResponse;
  };
}
