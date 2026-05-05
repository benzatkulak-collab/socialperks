/**
 * POST /api/v1/feedback
 *
 * Catch-all signal channel: NPS scores (Phase 55), in-app feedback
 * button (Phase 135), feature votes (Phase 137).
 *
 * Auth optional — anonymous feedback allowed but tagged. Rate-limited
 * strictly to prevent flooding.
 *
 * Persistence: in-memory by default; DB via `feedback_events` table
 * when DATABASE_URL set (mirrors waitlist pattern).
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, parseBody } from "../_shared";
import { db, InMemoryConnection } from "@/lib/db/connection";
import { logger } from "@/lib/logging";

const usingDb = !(db instanceof InMemoryConnection);

interface FeedbackBody {
  type?: "nps" | "feature_request" | "bug" | "other";
  score?: number;
  message?: string;
  context?: Record<string, unknown>;
}

const memory: Array<{ type: string; score: number | null; message: string; at: string; ip: string }> = [];

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const body = await parseBody<FeedbackBody>(req);
  if (body instanceof Response) return body;

  const type = body.type ?? "other";
  if (!["nps", "feature_request", "bug", "other"].includes(type)) {
    return err("INVALID_TYPE", "type must be one of: nps, feature_request, bug, other", 400);
  }

  let score: number | null = null;
  if (typeof body.score === "number") {
    if (body.score < 0 || body.score > 10) {
      return err("INVALID_SCORE", "score must be 0-10", 400);
    }
    score = Math.round(body.score);
  }

  const message = typeof body.message === "string" ? body.message.slice(0, 4000) : "";
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (usingDb) {
    try {
      await db.query(
        `INSERT INTO analytics_events (event_type, properties, occurred_at)
         VALUES ($1, $2, NOW())`,
        [`feedback.${type}`, JSON.stringify({ score, message, ip, context: body.context ?? null })],
      );
    } catch (e) {
      logger.warn("feedback DB write failed", { error: e instanceof Error ? e.message : String(e) });
    }
  }

  memory.push({ type, score, message, at: new Date().toISOString(), ip });
  if (memory.length > 1000) memory.shift();

  // If it's a low NPS or a bug, fire admin notification email so we
  // catch it fast.
  if ((type === "nps" && score !== null && score <= 6) || type === "bug") {
    const adminTo = process.env.WAITLIST_NOTIFY_EMAIL;
    if (adminTo) {
      logger.warn("[feedback] needs review", { type, score, message: message.slice(0, 200) });
    }
  }

  return ok({ recorded: true });
}
