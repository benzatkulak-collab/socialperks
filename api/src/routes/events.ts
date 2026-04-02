import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { AppEnv } from "@api/env.js";
import { eventBus } from "@lib/realtime";
import { sessionStore } from "@lib/auth";

const app = new Hono<AppEnv>();

// Connection tracking to prevent SSE abuse
const activeConnections = new Map<string, number>(); // userId → connection count
const MAX_CONNECTIONS_PER_USER = 5;
const MAX_GLOBAL_CONNECTIONS = 500;
let globalConnectionCount = 0;
const MAX_CONNECTION_DURATION = 30 * 60 * 1000; // 30 minutes max per connection

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

  // Enforce connection limits
  if (globalConnectionCount >= MAX_GLOBAL_CONNECTIONS) {
    return c.json({ success: false, error: { code: "TOO_MANY_CONNECTIONS", message: "Server at capacity. Try again later." } }, 503);
  }
  const userConns = activeConnections.get(session.userId) ?? 0;
  if (userConns >= MAX_CONNECTIONS_PER_USER) {
    return c.json({ success: false, error: { code: "TOO_MANY_CONNECTIONS", message: `Maximum ${MAX_CONNECTIONS_PER_USER} concurrent connections per user` } }, 429);
  }

  // Track connection
  activeConnections.set(session.userId, userConns + 1);
  globalConnectionCount += 1;

  return streamSSE(c, async (stream) => {
    const connectionStart = Date.now();
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let cleaned = false;

    // Send initial connection event
    await stream.writeSSE({ data: JSON.stringify({ type: "connected", userId: session.userId, timestamp: new Date().toISOString() }), event: "connected" });

    // Subscribe to events for this user
    const handler = (event: Record<string, unknown>) => {
      try {
        void stream.writeSSE({ data: JSON.stringify(event), event: (event.type as string) ?? "message" });
      } catch {
        // Stream closed
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsubscribe = eventBus.subscribe(session.userId, session.businessId as any, handler as any);

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (typeof unsubscribe === "function") unsubscribe();
      const current = activeConnections.get(session.userId) ?? 1;
      if (current <= 1) activeConnections.delete(session.userId);
      else activeConnections.set(session.userId, current - 1);
      globalConnectionCount = Math.max(0, globalConnectionCount - 1);
    };

    // Keep connection alive with heartbeats
    heartbeatTimer = setInterval(async () => {
      try {
        // Enforce max connection duration
        if (Date.now() - connectionStart > MAX_CONNECTION_DURATION) {
          await stream.writeSSE({ data: JSON.stringify({ type: "timeout", message: "Connection duration exceeded. Please reconnect." }), event: "timeout" });
          cleanup();
          return;
        }
        await stream.writeSSE({ data: JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() }), event: "heartbeat" });
      } catch {
        cleanup();
      }
    }, 30_000);

    // Clean up on disconnect
    stream.onAbort(cleanup);

    // Keep the stream open until timeout
    await new Promise<void>((resolve) => {
      const timer = globalThis.setTimeout(() => { cleanup(); resolve(); }, MAX_CONNECTION_DURATION);
      if (typeof timer === "object" && "unref" in timer) (timer as NodeJS.Timeout).unref();
    });
  });
});

export default app;
