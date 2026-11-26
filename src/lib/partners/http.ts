/**
 * Response and gate helpers for the partner routes.
 *
 * These mirror `ok()`, `err()` and `rateLimit()` in `src/app/api/v1/_shared.ts`
 * (same envelope, same limiter and tier) but live here because `_shared.ts`
 * imports the session store (`@/lib/auth`), which loads whole tables at module
 * load and which no partner module may reach. Every response, whatever its
 * status, carries `Cache-Control: no-store`.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/security/rate-limiter";
import { metrics, METRIC } from "@/lib/reliability/metrics";
import { getClientIp } from "@/app/api/v1/_client-ip";
import { authenticatePartner } from "./auth";

function headers(extra?: Record<string, string>): Headers {
  const h = new Headers({
    "X-Request-Id": crypto.randomUUID(),
    "Content-Type": "application/json",
  });
  if (extra) for (const [k, v] of Object.entries(extra)) h.set(k, v);
  h.set("Cache-Control", "no-store"); // last, so no caller can replace it
  return h;
}

export function partnerOk(data: unknown): NextResponse {
  return NextResponse.json({ success: true, data }, { status: 200, headers: headers() });
}

export function partnerErr(code: string, message: string, status: number, extra?: Record<string, string>): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: headers(extra) });
}

/**
 * The order is fixed: the in-memory rate limit first (so an unauthenticated
 * flood never reaches the database), then the key lookup. `bucket` is
 * "partner-businesses", "partner-overview" or "partner-week". Returns a response
 * to send, or the authenticated partner's id.
 */
export async function partnerGate(
  req: NextRequest,
  bucket: string,
): Promise<{ response: NextResponse } | { partnerId: string }> {
  // `bucket` is a fixed name per route, never the request path: a path with an
  // id in it would hand every id its own bucket and defeat the limit.
  const result = checkRateLimit(getClientIp(req), bucket, "standard");
  if (!result.allowed) {
    metrics.increment(METRIC.RATE_LIMIT_HIT, 1, { endpoint: bucket, tier: "standard" });
    return { response: partnerErr("RATE_LIMIT_EXCEEDED", "Too many requests", 429, rateLimitHeaders(result)) };
  }
  const auth = await authenticatePartner(req);
  if (!auth.ok) return { response: partnerErr("UNAUTHORIZED", "A valid partner key is required", 401) };
  return { partnerId: auth.partner.id };
}

export function internalError(): NextResponse {
  return partnerErr("INTERNAL_ERROR", "The request could not be completed", 500);
}
