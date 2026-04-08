/**
 * GET /api/v1/events
 *
 * Server-Sent Events (SSE) endpoint for real-time updates.
 * Authenticates via query param token. Sends periodic heartbeats
 * and initial connection event.
 *
 * Does NOT use withTiming — sets up a ReadableStream directly.
 */

import { NextRequest, NextResponse } from "next/server";
import { err, getQuery } from "../_shared";
import { verifyJWT, sessionStore } from "@/lib/auth";
import { eventPublisher } from "@/lib/realtime/publisher";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatSSE(event: string, data: unknown, id?: string): string {
  let msg = "";
  if (id) msg += `id: ${id}\n`;
  msg += `event: ${event}\n`;
  msg += `data: ${JSON.stringify(data)}\n\n`;
  return msg;
}

function authenticateToken(token: string): { id: string; email: string; role: string; businessId: string | null } | null {
  // Try JWT
  const jwt = verifyJWT(token);
  if (jwt) {
    return { id: jwt.sub, email: jwt.email, role: jwt.role, businessId: jwt.businessId };
  }
  // Try session token
  const session = sessionStore.get(token);
  if (session) {
    return { id: session.userId, email: session.email, role: session.userRole, businessId: session.businessId };
  }
  return null;
}

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = getQuery(req);
  const token = q.get("token");
  const businessId = q.get("businessId") ?? undefined;

  if (!token) {
    return err("MISSING_TOKEN", "token query parameter is required for SSE", 401);
  }

  const user = authenticateToken(token);
  if (!user) {
    return err("INVALID_TOKEN", "Invalid or expired token", 401);
  }

  const encoder = new TextEncoder();

  const effectiveBusinessId = businessId ?? user.businessId;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connected event
      const connectedEvent = formatSSE("connected", {
        userId: user.id,
        email: user.email,
        role: user.role,
        businessId: effectiveBusinessId,
        connectedAt: new Date().toISOString(),
      }, "0");
      controller.enqueue(encoder.encode(connectedEvent));

      // Subscribe to the event publisher and forward matching events
      const unsubscribe = eventPublisher.subscribe((event) => {
        // If the event targets a specific business, only forward if it matches
        if (event.businessId && effectiveBusinessId && event.businessId !== effectiveBusinessId) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(formatSSE(event.type, event.data)));
        } catch {
          // Client disconnected — clean up handled by abort listener
        }
      });

      // Heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = formatSSE("heartbeat", {
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
          });
          controller.enqueue(encoder.encode(heartbeat));
        } catch {
          // Client disconnected
          clearInterval(heartbeatInterval);
        }
      }, 30_000);

      // Clean up on cancel
      req.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Request-Id": crypto.randomUUID(),
      "X-Accel-Buffering": "no",
    },
  });
}
