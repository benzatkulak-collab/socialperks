import { NextRequest, NextResponse } from "next/server";
import { tracer, metrics } from "@/lib/infrastructure/observability";
import { logger } from "@/lib/logging";

type RouteHandler = (request: NextRequest, context?: unknown) => Promise<NextResponse | Response>;

/**
 * Wraps a Next.js API route handler with request tracing, metrics, and structured logging.
 */
export function withTracing(handler: RouteHandler, operationName: string): RouteHandler {
  return async (request: NextRequest, context?: unknown) => {
    const start = performance.now();
    const requestId = crypto.randomUUID();
    const method = request.method;
    const path = new URL(request.url).pathname;

    const span = tracer.startSpan(operationName, {
      attributes: {
        "http.method": method,
        "http.url": path,
        "http.request_id": requestId,
      },
    });

    let status = 500;
    try {
      const response = await handler(request, context);
      status = response.status;

      tracer.setAttributes(span.spanId, {
        "http.status_code": status,
      });

      // Add request ID to response headers
      const headers = new Headers(response.headers);
      headers.set("X-Request-Id", requestId);

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (err) {
      tracer.setAttributes(span.spanId, { "error": true, "error.message": err instanceof Error ? err.message : "Unknown error" });
      tracer.setStatus(span.spanId, "error");
      throw err;
    } finally {
      const duration = performance.now() - start;
      tracer.endSpan(span.spanId);

      metrics.counter("api_request_count", { method, path, status: String(status) });
      metrics.histogram("api_request_duration_ms", duration, { method, path });

      logger.info(`${method} ${path} ${status}`, {
        method,
        path,
        status,
        durationMs: Math.round(duration),
        requestId,
      });
    }
  };
}
