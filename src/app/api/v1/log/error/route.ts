/**
 * POST /api/v1/log/error
 *
 * Receives client-side error reports from the browser (window.onerror,
 * unhandledrejection, React error boundaries) and writes them to the
 * structured log so they're captured alongside server errors.
 *
 * Body shape (all fields optional except message):
 *   {
 *     message: string,
 *     stack?: string,
 *     name?: string,
 *     url?: string,
 *     userAgent?: string,
 *     componentStack?: string,
 *     digest?: string,
 *     userId?: string,
 *     context?: Record<string, unknown>,
 *   }
 *
 * Rate-limited (strict tier) so a runaway client loop can't drown the logs.
 * No auth required — the browser may not have a session when it errors.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, parseBody, withTiming } from "../../_shared";
import { logger } from "@/lib/logging";

interface ClientErrorReport {
  message?: unknown;
  stack?: unknown;
  name?: unknown;
  url?: unknown;
  userAgent?: unknown;
  componentStack?: unknown;
  digest?: unknown;
  userId?: unknown;
  context?: unknown;
}

const MAX_FIELD_LEN = 4096;

function clip(value: unknown, max = MAX_FIELD_LEN): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

export const POST = withTiming(async (req: NextRequest) => {
  // Strict rate limit — a single user shouldn't be able to flood the log endpoint.
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const body = await parseBody<ClientErrorReport>(req);
  if (body instanceof Response) return body;

  const message = clip(body.message);
  if (!message) {
    return err("MISSING_MESSAGE", "message is required", 400);
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  logger.error("client error report", undefined, {
    source: "client",
    message,
    name: clip(body.name, 256),
    stack: clip(body.stack),
    componentStack: clip(body.componentStack),
    digest: clip(body.digest, 256),
    url: clip(body.url, 1024) ?? req.headers.get("referer") ?? undefined,
    userAgent: clip(body.userAgent, 512) ?? req.headers.get("user-agent") ?? undefined,
    userId: clip(body.userId, 128),
    context: body.context && typeof body.context === "object" ? body.context : undefined,
    ip,
  });

  return ok({ received: true });
});
