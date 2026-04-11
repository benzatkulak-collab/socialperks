/**
 * Test Utilities for API Route Integration Tests
 *
 * Provides helpers to construct NextRequest objects and parse responses,
 * so route handlers can be called directly without spinning up a server.
 */

import { NextRequest } from "next/server";

/**
 * Build a NextRequest suitable for passing to a route handler.
 */
export function createRequest(
  path: string,
  opts?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  }
): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  if (opts?.searchParams) {
    Object.entries(opts.searchParams).forEach(([k, v]) =>
      url.searchParams.set(k, v)
    );
  }
  const init: RequestInit = {
    method: opts?.method || "GET",
    headers: new Headers(opts?.headers || {}),
  };
  if (opts?.body) {
    init.body = JSON.stringify(opts.body);
    (init.headers as Headers).set("Content-Type", "application/json");
  }
  return new NextRequest(url, init);
}

/**
 * Convenience wrapper to build an Authorization header with a Bearer token.
 */
export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Parse a NextResponse into a flat object containing the HTTP status
 * alongside the JSON body fields.
 */
export async function parseResponse(res: Response) {
  const json = await res.json();
  return { status: res.status, ...json };
}
