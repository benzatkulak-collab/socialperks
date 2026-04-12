/**
 * Edge Cache Headers — Utilities for setting CDN-aware cache headers.
 *
 * Provides helper functions to set proper cache control headers on API
 * responses for CDN (Vercel, Cloudflare, Fastly) and browser caching.
 *
 * Usage:
 *   import { setCacheHeaders, setStaleWhileRevalidate, setNoCacheHeaders, setETag } from "@/lib/api/edge-cache";
 *   setCacheHeaders(response, { maxAge: 300, sMaxAge: 600, staleWhileRevalidate: 3600 });
 */

import { NextResponse } from "next/server";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CacheOptions {
  /** Browser cache max-age in seconds */
  maxAge?: number;
  /** CDN/shared cache max-age in seconds (s-maxage) */
  sMaxAge?: number;
  /** Stale-while-revalidate window in seconds */
  staleWhileRevalidate?: number;
  /** Stale-if-error window in seconds */
  staleIfError?: number;
  /** Whether the response is public (default: true) */
  isPublic?: boolean;
  /** Whether to set CDN-Cache-Control and Surrogate-Control */
  cdnHeaders?: boolean;
}

// ─── setCacheHeaders ────────────────────────────────────────────────────────

/**
 * Set comprehensive cache headers on a response.
 *
 * Sets:
 * - Cache-Control: public/private, max-age, s-maxage, stale-while-revalidate, stale-if-error
 * - CDN-Cache-Control: mirrors Cache-Control for CDN-specific override
 * - Surrogate-Control: for Varnish/Fastly-style edge caches
 */
export function setCacheHeaders(
  response: NextResponse,
  options: CacheOptions
): NextResponse {
  const {
    maxAge = 0,
    sMaxAge,
    staleWhileRevalidate,
    staleIfError,
    isPublic = true,
    cdnHeaders = true,
  } = options;

  const directives: string[] = [];

  directives.push(isPublic ? "public" : "private");
  directives.push(`max-age=${maxAge}`);

  if (sMaxAge !== undefined) {
    directives.push(`s-maxage=${sMaxAge}`);
  }

  if (staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }

  if (staleIfError !== undefined) {
    directives.push(`stale-if-error=${staleIfError}`);
  }

  const cacheControl = directives.join(", ");
  response.headers.set("Cache-Control", cacheControl);

  // CDN-specific headers
  if (cdnHeaders && sMaxAge !== undefined) {
    // CDN-Cache-Control: Vercel and Cloudflare honor this
    const cdnDirectives: string[] = [`max-age=${sMaxAge}`];
    if (staleWhileRevalidate !== undefined) {
      cdnDirectives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
    }
    response.headers.set("CDN-Cache-Control", cdnDirectives.join(", "));

    // Surrogate-Control: Fastly/Varnish
    response.headers.set("Surrogate-Control", `max-age=${sMaxAge}`);
  }

  return response;
}

// ─── setStaleWhileRevalidate ────────────────────────────────────────────────

/**
 * Convenience helper for the stale-while-revalidate pattern.
 *
 * @param response  The response to modify
 * @param maxAge    Fresh cache duration in seconds
 * @param staleAge  Stale-while-revalidate window in seconds
 */
export function setStaleWhileRevalidate(
  response: NextResponse,
  maxAge: number,
  staleAge: number
): NextResponse {
  return setCacheHeaders(response, {
    maxAge: Math.min(maxAge, 60), // browser gets short TTL
    sMaxAge: maxAge,
    staleWhileRevalidate: staleAge,
    staleIfError: staleAge, // also serve stale on error for resilience
    isPublic: true,
    cdnHeaders: true,
  });
}

// ─── setNoCacheHeaders ──────────────────────────────────────────────────────

/**
 * Set no-cache headers for mutation responses.
 *
 * Sets Cache-Control: no-store, no-cache, must-revalidate
 * Ensures no CDN or browser caches the response.
 */
export function setNoCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Surrogate-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

// ─── setETag ────────────────────────────────────────────────────────────────

/**
 * Generate and set an ETag header based on a hash of the response data.
 *
 * Uses a simple FNV-1a hash of the JSON-serialized data for fast computation.
 * Suitable for in-memory data; not cryptographic.
 *
 * @param response The response to modify
 * @param data     The response data to hash
 */
export function setETag(response: NextResponse, data: unknown): NextResponse {
  const json = typeof data === "string" ? data : JSON.stringify(data);

  // FNV-1a 32-bit hash for fast non-cryptographic ETag generation
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }

  const etag = `"${hash.toString(16)}"`;
  response.headers.set("ETag", etag);

  return response;
}
