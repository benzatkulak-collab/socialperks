/**
 * GET /api/v1/cron/waitlist-drip
 *
 * Scheduled by Vercel Cron (see vercel.json). Runs daily and sends
 * the day-3 + day-7 nurture emails to anyone on the waitlist whose
 * createdAt falls inside the corresponding window.
 *
 * Auth: Vercel Cron sends an `Authorization: Bearer ${CRON_SECRET}`
 * header. We verify it. Without `CRON_SECRET` set, the route refuses
 * to run (so it can't be invoked from the public internet by mistake).
 *
 * Persistence: only operates against the DB-backed waitlist. The
 * in-memory fallback resets on every redeploy and is therefore not a
 * meaningful target for a daily nurture flow.
 */

import type { NextRequest } from "next/server";
import { ok, err } from "../../_shared";
import { db, InMemoryConnection } from "@/lib/db/connection";
import { sendDripBatch, type DripEntry } from "@/lib/email/waitlist-drip";
import { logger } from "@/lib/logging";
import { constantTimeEqual } from "@/lib/security/order-by";

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
  // SECURITY: constant-time compare — was non-constant `!==` which is a
  // (small) timing oracle for the secret.
  if (!constantTimeEqual(auth, `Bearer ${cronSecret}`)) {
    return err("UNAUTHORIZED", "Invalid cron token", 401);
  }

  if (db instanceof InMemoryConnection) {
    return ok({
      ran: false,
      reason: "DATABASE_URL not configured — drip skipped",
      day3: { sent: 0, failed: 0 },
      day7: { sent: 0, failed: 0 },
    });
  }

  let day3 = { sent: 0, failed: 0 };
  let day7 = { sent: 0, failed: 0 };

  try {
    // Day 3: between 3 and 4 days after createdAt, day3_sent_at IS NULL
    const day3Result = await db.query<{
      email: string;
      business_name: string | null;
      city: string | null;
      vertical: string;
      created_at: string;
    }>(
      `SELECT email, business_name, city, vertical, created_at
       FROM waitlist
       WHERE day3_sent_at IS NULL
         AND created_at <= NOW() - INTERVAL '3 days'
         AND created_at >  NOW() - INTERVAL '4 days'
       LIMIT 500`,
    );
    const day3Entries: DripEntry[] = day3Result.rows.map((r) => ({
      email: r.email,
      businessName: r.business_name ?? undefined,
      city: r.city ?? undefined,
      vertical: r.vertical,
      createdAt: r.created_at,
    }));
    day3 = await sendDripBatch(day3Entries, "day3");
    if (day3Entries.length > 0) {
      await db.query(
        `UPDATE waitlist SET day3_sent_at = NOW() WHERE email = ANY($1::text[])`,
        [day3Entries.map((e) => e.email)],
      );
    }
  } catch (e) {
    logger.error("waitlist drip day3 failed", { error: e instanceof Error ? e.message : String(e) });
  }

  try {
    const day7Result = await db.query<{
      email: string;
      business_name: string | null;
      city: string | null;
      vertical: string;
      created_at: string;
    }>(
      `SELECT email, business_name, city, vertical, created_at
       FROM waitlist
       WHERE day7_sent_at IS NULL
         AND created_at <= NOW() - INTERVAL '7 days'
         AND created_at >  NOW() - INTERVAL '8 days'
       LIMIT 500`,
    );
    const day7Entries: DripEntry[] = day7Result.rows.map((r) => ({
      email: r.email,
      businessName: r.business_name ?? undefined,
      city: r.city ?? undefined,
      vertical: r.vertical,
      createdAt: r.created_at,
    }));
    day7 = await sendDripBatch(day7Entries, "day7");
    if (day7Entries.length > 0) {
      await db.query(
        `UPDATE waitlist SET day7_sent_at = NOW() WHERE email = ANY($1::text[])`,
        [day7Entries.map((e) => e.email)],
      );
    }
  } catch (e) {
    logger.error("waitlist drip day7 failed", { error: e instanceof Error ? e.message : String(e) });
  }

  return ok({ ran: true, day3, day7 });
}
