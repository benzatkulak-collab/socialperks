import { createMiddleware } from "hono/factory";
import { randomUUID } from "crypto";

export const tracing = createMiddleware(async (c, next) => {
  const requestId = randomUUID();
  const startTime = performance.now();

  c.set("requestId", requestId);

  try {
    await next();

    const duration = Math.round(performance.now() - startTime);
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    console.info(JSON.stringify({
      level: "info",
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
      ip,
      timestamp: new Date().toISOString(),
    }));

    c.header("X-Request-Id", requestId);
    c.header("X-Response-Time", `${duration}ms`);
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    console.error(JSON.stringify({
      level: "error",
      requestId,
      method: c.req.method,
      path: c.req.path,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      ip,
      timestamp: new Date().toISOString(),
    }));

    c.header("X-Request-Id", requestId);
    return c.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      500
    );
  }
});
