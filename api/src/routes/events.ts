import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { eventBus } from "@lib/realtime";
import { sessionStore } from "@lib/auth";

const app = new Hono();

// GET /v1/events — Server-Sent Events stream
app.get("/", (c) => {
  const token = c.req.query("token");

  if (!token) {
    return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "token query parameter is required" } }, 401);
  }

  // Validate the session token
  const session = sessionStore.get(token);
  if (!session) {
    return c.json({ success: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } }, 401);
  }

  return streamSSE(c, async (stream) => {
    // Send initial connection event
    await stream.writeSSE({ data: JSON.stringify({ type: "connected", userId: session.userId, timestamp: new Date().toISOString() }), event: "connected" });

    // Subscribe to events for this user
    const handler = async (event: Record<string, unknown>) => {
      try {
        await stream.writeSSE({ data: JSON.stringify(event), event: (event.type as string) ?? "message" });
      } catch {
        // Stream closed
      }
    };

    const unsubscribe = eventBus.subscribe(session.userId, session.businessId, handler);

    // Keep connection alive with heartbeats
    const heartbeat = setInterval(async () => {
      try {
        await stream.writeSSE({ data: JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() }), event: "heartbeat" });
      } catch {
        clearInterval(heartbeat);
      }
    }, 30_000);

    // Clean up on disconnect
    stream.onAbort(() => {
      clearInterval(heartbeat);
      unsubscribe();
    });

    // Keep the stream open indefinitely
    await new Promise(() => {});
  });
});

export default app;
