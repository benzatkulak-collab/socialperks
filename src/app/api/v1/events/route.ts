import { NextRequest } from "next/server";
import { sseManager } from "@/lib/realtime";
import { sessionStore } from "@/lib/auth";
import { logger } from "@/lib/logging";

/**
 * GET /api/v1/events?token=xxx — Server-Sent Events stream
 *
 * Establishes an SSE connection for real-time updates.
 * Requires a valid auth token as a query parameter.
 *
 * Query params:
 *   - token: Bearer token (required) — format "demo-token-{userId}" or "sk_..."
 *   - businessId: Optional business ID for business-scoped events
 */
export async function GET(request: NextRequest) {
  logger.info("GET /api/v1/events (SSE)", { method: "GET", path: "/api/v1/events" });

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const businessId = searchParams.get("businessId") ?? undefined;

  // Validate auth token
  if (!token) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Token query parameter is required" },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let userId: string;

  // Check real session tokens first
  const session = sessionStore.get(token);
  if (session) {
    userId = session.userId;
  } else if (token.startsWith("demo-token-")) {
    userId = token.replace("demo-token-", "");
  } else if (token.startsWith("sk_")) {
    userId = `api_${token.slice(3, 11)}`;
  } else {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INVALID_TOKEN", message: "Invalid or expired authentication token" },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  logger.info("SSE connection established", { userId, businessId: businessId ?? null });

  // Create the SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Register this connection
      sseManager.addConnection(userId, controller, businessId);

      // Send initial connection event
      const encoder = new TextEncoder();
      const connectEvent = JSON.stringify({
        type: "connected",
        payload: { userId, businessId: businessId ?? null },
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${connectEvent}\n\n`)
      );
    },
    cancel() {
      // Client disconnected
      sseManager.removeConnection(userId);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
