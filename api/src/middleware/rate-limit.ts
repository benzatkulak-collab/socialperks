import { createMiddleware } from "hono/factory";
import type { AppEnv } from "@api/env.js";
import { checkRateLimitAsync, rateLimitHeaders, type RateLimitTier } from "@lib/security/rate-limiter.js";

/**
 * Rate limit middleware factory.
 * Uses Redis when REDIS_URL is set, falls back to in-memory.
 * Usage: app.use(rateLimit("standard"))
 */
export function rateLimit(tier: RateLimitTier = "standard") {
  return createMiddleware<AppEnv>(async (c, next) => {
    // Use the rightmost X-Forwarded-For entry (most likely set by trusted proxy),
    // or fall back to direct connection info. Never trust the leftmost entry blindly.
    const forwardedFor = c.req.header("x-forwarded-for");
    const forwardedParts = forwardedFor?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
    const ip = forwardedParts.length > 0
      ? forwardedParts[forwardedParts.length - 1]
      : "unknown";
    const endpoint = c.req.path;
    const result = await checkRateLimitAsync(ip, endpoint, tier);

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
