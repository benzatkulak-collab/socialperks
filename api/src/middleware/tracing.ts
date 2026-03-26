import { createMiddleware } from "hono/factory";
import { randomUUID } from "crypto";
import { logger } from "@lib/logging/index.js";

export const tracing = createMiddleware(async (c, next) => {
  const requestId = randomUUID();
  const startTime = performance.now();
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = c.req.header("user-agent") || "unknown";

  c.set("requestId", requestId);

  try {
    await next();

    const duration = Math.round(performance.now() - startTime);

    logger.info("request", {
      event: "http.request",
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
      ip,
      userAgent,
    });

    c.header("X-Request-Id", requestId);
    c.header("X-Response-Time", `${duration}ms`);
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    logger.error("request failed", error, {
      event: "http.error",
      requestId,
      method: c.req.method,
      path: c.req.path,
      duration,
      ip,
      userAgent,
    });

    c.header("X-Request-Id", requestId);
    return c.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      500
    );
  }
});
