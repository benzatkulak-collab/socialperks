/**
 * GET /api/v1/cron/onboarding-drip
 *
 * Scheduled by Vercel Cron (see vercel.json). Runs daily and fires
 * day-1 / day-3 / day-7 / day-14 onboarding emails to real users who
 * crossed the corresponding window since their signup.
 *
 * Why this exists: src/app/api/v1/drip/route.ts implements the full
 * sequence + due-email logic, but until this cron landed nothing was
 * actually invoking it on a schedule. The day-1 "your first campaign
 * in 60 seconds" email — the highest-impact activation email — was
 * effectively dead in production.
 *
 * Auth: same pattern as the waitlist-drip cron — Vercel Cron sends
 * `Authorization: Bearer ${CRON_SECRET}`. Without `CRON_SECRET` set
 * the route refuses to run, so it can't be invoked anonymously from
 * the public internet.
 *
 * Implementation: this route is a thin proxy over POST /api/v1/drip
 * with the internal API key header. That keeps the actual due-email
 * logic in one place (the existing /drip route) and means this cron
 * doesn't have to duplicate the user-fetch + send loop.
 */

import type { NextRequest } from "next/server";
import { ok, err } from "../../_shared";
import { constantTimeEqual } from "@/lib/security/order-by";
import { logger } from "@/lib/logging";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return err(
      "CRON_NOT_CONFIGURED",
      "CRON_SECRET is not set on this deployment.",
      503,
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  if (!constantTimeEqual(auth, `Bearer ${cronSecret}`)) {
    return err("UNAUTHORIZED", "Invalid cron token", 401);
  }

  // Internal API key the /drip route accepts. Same secret pool —
  // CRON_SECRET doubles as the internal trigger token, so operators
  // only have one env var to rotate.
  const internalKey =
    process.env.DRIP_API_KEY ?? process.env.INTERNAL_API_KEY ?? cronSecret;

  // Build the absolute URL to POST to /api/v1/drip. Vercel sets the
  // host headers correctly so url construction via req works.
  const url = new URL("/api/v1/drip", req.nextUrl.origin);

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let errors: string[] = [];

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": internalKey,
      },
      // 5-minute generous budget — drip is bursty but should never
      // take that long. Aborts so a stuck send doesn't wedge the
      // entire cron slot.
      signal: AbortSignal.timeout(5 * 60 * 1000),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error("[cron/onboarding-drip] /drip POST failed", {
        status: res.status,
        body: body.slice(0, 500),
      });
      return err(
        "DRIP_FAILED",
        `Internal /drip endpoint returned ${res.status}`,
        502,
      );
    }

    const json = (await res.json()) as {
      success: boolean;
      data?: {
        processed: number;
        sent: number;
        failed: number;
        errors?: string[];
      };
    };
    if (json.success && json.data) {
      processed = json.data.processed;
      sent = json.data.sent;
      failed = json.data.failed;
      errors = json.data.errors ?? [];
    }
  } catch (e) {
    logger.error("[cron/onboarding-drip] fetch threw", {
      err: e instanceof Error ? e.message : String(e),
    });
    return err(
      "DRIP_FETCH_FAILED",
      e instanceof Error ? e.message : "Unknown error invoking /drip",
      502,
    );
  }

  logger.info("[cron/onboarding-drip] complete", {
    processed,
    sent,
    failed,
    errorCount: errors.length,
  });

  return ok({
    processed,
    sent,
    failed,
    // Only surface error details when there are some, and cap length so
    // a runaway upstream doesn't produce a huge response.
    errors: errors.length > 0 ? errors.slice(0, 50) : undefined,
  });
}
