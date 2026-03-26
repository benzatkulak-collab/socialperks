import { createMiddleware } from "hono/factory";
import { checkRateLimit, rateLimitHeaders, type RateLimitTier } from "@lib/security/rate-limiter.js";

/**
 * Rate limit middleware factory.
 * Usage: app.use(rateLimit("standard"))
 */
export function rateLimit(tier: RateLimitTier = "standard") {
  return createMiddleware(async (c, next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const endpoint = c.req.path;
    const result = checkRateLimit(ip, endpoint, tier);

    // Always set rate limit headers
    const headers = rateLimitHeaders(result);
    for (const [k, v] of Object.entries(headers)) {
      c.header(k, v);
    }

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      c.header("Retry-After", String(retryAfter));
      return c.json(
        { success: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
        429
      );
    }

    await next();
  });
}
