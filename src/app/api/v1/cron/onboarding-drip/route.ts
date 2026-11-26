/**
 * GET /api/v1/cron/onboarding-drip
 *
 * Scheduled by .github/workflows/cron.yml (formerly Vercel Cron). Runs daily and fires
 * day-1 / day-3 / day-7 / day-14 onboarding emails to real users who
 * crossed the corresponding window since their signup.
 *
 * Why this exists: src/app/api/v1/drip/route.ts implements the full
 * sequence + due-email logic, but until this cron landed nothing was
 * actually invoking it on a schedule. The day-1 "your first campaign
 * in 60 seconds" email — the highest-impact activation email — was
 * effectively dead in production.
 *
 * Auth: same pattern as the waitlist-drip cron — the scheduler sends
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
import { getInternalApiKey } from "@/lib/security/internal-key";
import { logger } from "@/lib/logging";
import { createTimeBudget } from "@/lib/cron/time-budget";

// What this route keeps for itself after /drip answers: reading the JSON,
// logging and responding, plus the hop back from the /drip function.
const PROXY_HEADROOM_MS = 1_000;

export async function GET(req: NextRequest) {
  // Netlify Free stops a function at 10s, and this one waits on /drip
  // inside that, so /drip gets what's left of our budget minus headroom.
  const budget = createTimeBudget();
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

  // Internal API key the /drip route accepts, resolved by the same helper
  // /drip uses (DRIP_API_KEY || INTERNAL_API_KEY || CRON_SECRET), so the
  // two sides can't drift apart again. CRON_SECRET is set (checked above).
  const internalKey = getInternalApiKey() ?? cronSecret;

  // Build the absolute URL to POST to /api/v1/drip. The scheduler calls
  // the public URL, so the request origin is the live site.
  const url = new URL("/api/v1/drip", req.nextUrl.origin);

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let more = false;
  let errors: string[] = [];

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": internalKey,
        "x-cron-budget-ms": String(
          Math.max(1, budget.remainingMs() - PROXY_HEADROOM_MS),
        ),
      },
      // /drip stops itself at the cron time budget (Netlify Free kills a
      // function at 10s), so this only guards against a hung request.
      signal: AbortSignal.timeout(9_000),
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
        more?: boolean;
        errors?: string[];
      };
    };
    if (json.success && json.data) {
      processed = json.data.processed;
      sent = json.data.sent;
      failed = json.data.failed;
      more = json.data.more === true;
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
    // The scheduler (.github/workflows/cron.yml) calls again while true.
    more,
    // Only surface error details when there are some, and cap length so
    // a runaway upstream doesn't produce a huge response.
    errors: errors.length > 0 ? errors.slice(0, 50) : undefined,
  });
}
