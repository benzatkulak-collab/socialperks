/**
 * Response and gate helpers for the partner routes.
 *
 * These mirror `ok()`, `err()` and `rateLimit()` in `src/app/api/v1/_shared.ts`
 * (same envelope, same limiter and tier) but live here because `_shared.ts`
 * imports the session store (`@/lib/auth`), which loads whole tables at module
 * load and which no partner module may reach. Every response, whatever its
 * status, carries `Cache-Control: no-store`.
 */
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/security/rate-limiter";
import { authenticatePartner } from "./auth";

function headers(extra?: Record<string, string>): Headers {
  const h = new Headers({
    "X-Request-Id": crypto.randomUUID(),
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  if (extra) for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return h;
}

export function partnerOk(data: unknown): NextResponse {
  return NextResponse.json({ success: true, data }, { status: 200, headers: headers() });
}

export function partnerErr(code: string, message: string, status: number, extra?: Record<string, string>): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: headers(extra) });
}

function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-nf-client-connection-ip")?.trim() ||
    h.get("cf-connecting-ip")?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * The order is fixed: the in-memory rate limit first (so an unauthenticated
 * flood never reaches the database), then the key lookup. Returns a response
 * to send, or the authenticated partner's id.
 */
export async function partnerGate(req: Request): Promise<{ response: NextResponse } | { partnerId: string }> {
  const result = checkRateLimit(clientIp(req), new URL(req.url).pathname, "standard");
  if (!result.allowed) {
    return { response: partnerErr("RATE_LIMIT_EXCEEDED", "Too many requests", 429, rateLimitHeaders(result)) };
  }
  const auth = await authenticatePartner(req);
  if (!auth.ok) return { response: partnerErr("UNAUTHORIZED", "A valid partner key is required", 401) };
  return { partnerId: auth.partner.id };
}

export function internalError(): NextResponse {
  return partnerErr("INTERNAL_ERROR", "The request could not be completed", 500);
}
