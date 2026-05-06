/**
 * POST /api/v1/analytics/track — client-side event collection
 *
 * Public, rate-limited. The browser pixel posts here; this endpoint is
 * the only place where untrusted clients can write to the analytics
 * batcher. We:
 *   - cap the property set size + name length
 *   - reject any event name that doesn't look like a `<surface>.<action>` token
 *   - bind the resolved client IP (from the timing wrapper's IP helper)
 *     as a property the batcher ships to PostHog
 *
 * Body:
 *   { event: "landing.viewed",
 *     distinctId: "anon-uuid-from-cookie",
 *     properties?: { path: "/", referrer: "https://google.com" } }
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, parseBody, withTiming } from "../../_shared";
import { track } from "@/lib/analytics";

interface Body {
  event?: string;
  distinctId?: string;
  properties?: Record<string, unknown>;
}

const EVENT_NAME_RE = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;
const MAX_PROP_KEY_LENGTH = 64;
const MAX_PROP_VALUE_LENGTH = 1024;
const MAX_PROPS = 25;

export const POST = withTiming(async (req: NextRequest) => {
  // Public tier — analytics is high-volume but not cheap to forge in
  // bulk thanks to the IP-based bucket.
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const body = await parseBody<Body>(req);
  if (body instanceof Response) return body;

  if (typeof body.event !== "string" || !EVENT_NAME_RE.test(body.event)) {
    return err(
      "INVALID_EVENT",
      "event must match <surface>.<action>",
      400
    );
  }
  if (typeof body.distinctId !== "string" || body.distinctId.length === 0) {
    return err("MISSING_DISTINCT_ID", "distinctId is required", 400);
  }
  if (body.distinctId.length > 128) {
    return err("INVALID_DISTINCT_ID", "distinctId must be ≤ 128 chars", 400);
  }

  // Sanitize properties — reject anything we can't ship as a flat scalar.
  const cleanProps: Record<string, string | number | boolean | null> = {};
  if (body.properties && typeof body.properties === "object") {
    const entries = Object.entries(body.properties);
    if (entries.length > MAX_PROPS) {
      return err("TOO_MANY_PROPERTIES", `Max ${MAX_PROPS} properties`, 400);
    }
    for (const [key, value] of entries) {
      if (key.length > MAX_PROP_KEY_LENGTH) {
        return err("INVALID_PROPERTY_KEY", `Property key too long: ${key.slice(0, 30)}...`, 400);
      }
      if (key.startsWith("$")) {
        // Reserved for PostHog system properties — don't let clients
        // forge `$user_id` etc.
        continue;
      }
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        if (typeof value === "string" && value.length > MAX_PROP_VALUE_LENGTH) {
          cleanProps[key] = value.slice(0, MAX_PROP_VALUE_LENGTH);
        } else {
          cleanProps[key] = value;
        }
      }
      // Anything else (objects, arrays, undefined) is silently dropped.
    }
  }

  // Bind client IP for downstream geo-lookup, but anonymized — PostHog
  // sees only the IP, never any other request header.
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  track(body.event, {
    distinctId: body.distinctId,
    ...cleanProps,
    ...(ip ? { $ip: ip } : {}),
  });

  return ok({ accepted: true });
});
