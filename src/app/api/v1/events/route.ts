/**
 * GET /api/v1/events
 *
 * Server-Sent Events (SSE) stream of the caller's realtime events: a
 * `connected` event, then the events it may receive, and a heartbeat every
 * 30 seconds.
 *
 * HEAD /api/v1/events makes the same checks and answers with the status GET
 * would give, without opening a stream. The browser client asks it, through
 * apiFetch, before each connection: EventSource never shows the status of a
 * refused connection, and apiFetch renews an expired access cookie.
 *
 * Signing in, access credentials only (never the 7-day refresh token):
 *   - `?token=`: an access JWT or a session token, for non-browser clients.
 *     When it is given, it decides.
 *   - otherwise whatever getUser accepts: the `sp-access-token` cookie (all a
 *     browser has: EventSource sends no headers, and page scripts cannot read
 *     the HttpOnly cookie), `Authorization: Bearer`, or `x-api-key`.
 *
 * Answers: 200 and the stream; 204 No Content when the caller may receive no
 * events (204 also tells an EventSource to stop reconnecting); 401 not signed
 * in; 403 asking for another business's events.
 *
 * Does NOT use withTiming — sets up a ReadableStream directly.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticate, err, getQuery, unauthenticated, type Authenticated } from "../_shared";
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

function authenticateToken(token: string): Authenticated | null {
  // Try JWT. Access tokens only: the 7-day refresh token is for minting a
  // new access token, never a credential in its own right.
  const jwt = verifyJWT(token, "access");
  if (jwt) {
    return {
      user: { id: jwt.sub, email: jwt.email, role: jwt.role, businessId: jwt.businessId },
      expiresAt: jwt.exp * 1000,
    };
  }
  // Try session token
  const session = sessionStore.get(token);
  if (session) {
    return {
      user: { id: session.userId, email: session.email, role: session.userRole, businessId: session.businessId },
      expiresAt: session.expiresAt,
    };
  }
  return null;
}

/** No content: there is nothing this caller may receive. */
function noStream(): NextResponse {
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

type Decision =
  | { stream: false; response: NextResponse }
  | {
      stream: true;
      caller: Authenticated;
      effectiveBusinessId: string | null;
      forwards: (eventBusinessId: string | undefined) => boolean;
    };

/** Everything GET checks before it opens a stream, for GET and HEAD alike. */
function decide(req: NextRequest): Decision {
  const q = getQuery(req);
  const token = q.get("token");
  const requestedBusinessId = q.get("businessId");

  const caller = token ? authenticateToken(token) : authenticate(req);
  if (!caller) {
    return {
      stream: false,
      response: token ? err("INVALID_TOKEN", "Invalid or expired token", 401) : unauthenticated(req),
    };
  }
  const { user } = caller;

  // Which events this stream may carry:
  //   - a business: its own business's events only
  //   - the founder (admin, no business): every event, or one business's
  //   - anyone else: no business's events, so there is nothing to stream
  // An event that names no business (e.g. `user.created`, which carries the
  // new account's email) goes to the founder only.
  const isFounder = user.role === "admin" && !user.businessId;
  if (requestedBusinessId && !isFounder && requestedBusinessId !== user.businessId) {
    return { stream: false, response: err("FORBIDDEN", "You can only stream your own business's events", 403) };
  }
  if (!isFounder && !user.businessId) return { stream: false, response: noStream() };

  const effectiveBusinessId: string | null = isFounder ? requestedBusinessId : user.businessId;
  const forwards = (eventBusinessId: string | undefined): boolean => {
    if (isFounder) return !effectiveBusinessId || eventBusinessId === effectiveBusinessId;
    return !!effectiveBusinessId && eventBusinessId === effectiveBusinessId;
  };
  return { stream: true, caller, effectiveBusinessId, forwards };
}

// ─── HEAD ───────────────────────────────────────────────────────────────────

export async function HEAD(req: NextRequest): Promise<NextResponse> {
  const decision = decide(req);
  const status = decision.stream ? 200 : decision.response.status;
  return new NextResponse(null, { status, headers: { "Cache-Control": "no-store" } });
}

// ─── GET ────────────────────────────────────────────────────────────────────

/**
 * The longest a stream stays open, whatever its credential: an access
 * token's lifetime. The stream is checked once, when it opens, so an account
 * suspended or demoted since then, or an impersonation that has ended, stops
 * receiving within this time. The browser client checks again, and renews its
 * cookie, before it reconnects.
 */
const MAX_STREAM_MS = 15 * 60 * 1000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const decision = decide(req);
  if (!decision.stream) return decision.response;
  const { caller, effectiveBusinessId, forwards } = decision;
  const { user } = caller;
  // Ends when the credential that opened it expires, and after MAX_STREAM_MS at most.
  const endsInMs = Math.max(0, Math.min(caller.expiresAt ?? Infinity, Date.now() + MAX_STREAM_MS) - Date.now());

  const encoder = new TextEncoder();
  // Set in start(); called when the caller goes away, the stream is
  // cancelled, or its time is up. Safe to call more than once.
  let end = () => {};

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
        if (!forwards(event.businessId)) return;
        try {
          controller.enqueue(encoder.encode(formatSSE(event.type, event.data)));
        } catch {
          // Client disconnected — clean up handled by end()
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

      const expiry = setTimeout(() => end(), endsInMs);

      let ended = false;
      end = () => {
        if (ended) return;
        ended = true;
        unsubscribe();
        clearInterval(heartbeatInterval);
        clearTimeout(expiry);
        req.signal.removeEventListener("abort", end);
        try {
          controller.close();
        } catch {
          // Already closed, or cancelled by the reader
        }
      };

      // Clean up when the caller goes away
      if (req.signal.aborted) end();
      else req.signal.addEventListener("abort", end);
    },
    cancel() {
      end();
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
