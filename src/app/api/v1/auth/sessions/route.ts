/**
 * /api/v1/auth/sessions
 *
 * GET:  List all active sessions for the current user
 * POST: Revoke a specific session or all other sessions
 *
 * Auth required for all operations.
 */

import { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import { sessionStore } from "@/lib/auth";

// ─── GET: List Active Sessions ──────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // List active sessions for this user
  const sessions = sessionStore.listByUser(user.id);
  const currentToken =
    req.headers.get("authorization")?.slice(7) || "";

  return ok({
    sessions: sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress || "unknown",
      userAgent: s.userAgent || "unknown",
      createdAt: new Date(s.createdAt).toISOString(),
      lastActiveAt: new Date(s.lastActiveAt).toISOString(),
      isCurrent: s.token === currentToken,
    })),
    total: sessions.length,
  });
});

// ─── POST: Revoke Sessions ──────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const body = await parseBody<{
    action?: string;
    sessionId?: string;
  }>(req);
  if (body instanceof Response) return body;

  const { action, sessionId } = body;

  if (!action || typeof action !== "string") {
    return err(
      "MISSING_ACTION",
      "action is required (revoke, revoke-all)",
      400
    );
  }

  switch (action) {
    case "revoke": {
      if (!sessionId || typeof sessionId !== "string") {
        return err("MISSING_SESSION_ID", "sessionId is required", 400);
      }
      const revoked = sessionStore.revoke(sessionId, user.id);
      if (!revoked) {
        return err(
          "SESSION_NOT_FOUND",
          "Session not found or does not belong to you",
          404
        );
      }
      return ok({ revoked: true });
    }

    case "revoke-all": {
      const currentToken =
        req.headers.get("authorization")?.slice(7) || "";
      const count = sessionStore.revokeAll(user.id, currentToken);
      return ok({ revokedCount: count });
    }

    default:
      return err(
        "INVALID_ACTION",
        "action must be one of: revoke, revoke-all",
        400
      );
  }
});
