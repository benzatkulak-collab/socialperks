/**
 * API-level Caching Middleware
 *
 * Wraps Next.js route handlers to cache GET responses in Redis/memory.
 * Non-GET requests are passed through without caching.
 *
 * Usage:
 *   import { withCache } from "@/lib/cache/middleware";
 *   export const GET = withCache(handler, { ttl: 300 });
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cache } from "./index";

type Handler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>;

interface CacheOptions {
  /** Cache TTL in seconds */
  ttl: number;
  /** Optional key prefix (defaults to pathname) */
  prefix?: string;
}

/**
 * Wraps a GET handler with response caching.
 *
 * - Only caches GET requests
 * - Cache key = `api:${prefix || pathname}:${searchParams}`
 * - Adds X-Cache header (HIT or MISS) to every response
 */
export function withCache(handler: Handler, opts: CacheOptions): Handler {
  return async (req: NextRequest, ctx?: unknown): Promise<NextResponse> => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return handler(req, ctx);
    }

    const url = new URL(req.url);
    const prefix = opts.prefix || url.pathname;
    const params = url.searchParams.toString();
    const cacheKey = `api:${prefix}:${params}`;

    // Check cache
    const cached = await cache.get<{ body: unknown; status: number; headers: Record<string, string> }>(cacheKey);
    if (cached) {
      const res = NextResponse.json(cached.body, {
        status: cached.status,
        headers: {
          ...cached.headers,
          "X-Cache": "HIT",
        },
      });
      return res;
    }

    // Cache miss — call handler
    const res = await handler(req, ctx);

    // Only cache successful JSON responses
    if (res.status >= 200 && res.status < 400) {
      try {
        // Clone the response to read the body without consuming it
        const cloned = res.clone();
        const body = await cloned.json();

        // Collect relevant headers to cache
        const headersToCache: Record<string, string> = {};
        const headerNames = ["Content-Type", "Cache-Control", "X-Request-Id", "X-Response-Time"];
        for (const name of headerNames) {
          const val = res.headers.get(name);
          if (val) headersToCache[name] = val;
        }

        await cache.set(cacheKey, { body, status: res.status, headers: headersToCache }, opts.ttl);
      } catch {
        // If we can't serialize the response, skip caching
      }
    }

    // Add cache miss header
    res.headers.set("X-Cache", "MISS");
    return res;
  };
}
