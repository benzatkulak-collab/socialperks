/**
 * Request logging middleware wrapper.
 * Wraps Next.js route handlers with structured request/response logging.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "./index";

type Handler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>;

export function withRequestLogging(handler: Handler): Handler {
  return async (req, ctx) => {
    const start = performance.now();
    const requestId = crypto.randomUUID();

    try {
      const res = await handler(req, ctx);
      const duration = Math.round(performance.now() - start);

      const path = new URL(req.url, "http://localhost").pathname;
      const status = res.status;
      const level =
        status >= 500 ? ("error" as const) : status >= 400 ? ("warn" as const) : ("info" as const);

      logger[level](`${req.method} ${path} ${status}`, {
        requestId,
        path,
        method: req.method,
        statusCode: status,
        durationMs: duration,
      });

      res.headers.set("X-Request-Id", requestId);
      res.headers.set("X-Response-Time", `${duration}ms`);

      return res;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      const path = new URL(req.url, "http://localhost").pathname;

      logger.error(
        "Unhandled error in route handler",
        error instanceof Error ? error : new Error(String(error)),
        {
          requestId,
          path,
          method: req.method,
          durationMs: duration,
        },
      );

      return NextResponse.json(
        {
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Internal server error" },
        },
        { status: 500, headers: { "X-Request-Id": requestId } },
      );
    }
  };
}
