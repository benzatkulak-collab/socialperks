/**
 * GET /api/v1/admin/webhook-health
 *
 * Operator-facing diagnostic. Aggregates webhook subscription state
 * + recent delivery outcomes across ALL businesses, with a filter
 * for "show only the failing ones."
 *
 * Why this matters: when a popular agent platform deploys a bad
 * webhook URL or their endpoint goes down, we want to know FIRST.
 * The dashboard surface at /dashboard/webhooks is per-business; this
 * route is the platform-wide view that lets us proactively reach
 * out to "your webhooks have been failing for 3 hours."
 *
 * Auth: Bearer admin token (WAITLIST_ADMIN_TOKEN). The data is
 * cross-tenant; only operators see it.
 */

import type { NextRequest } from "next/server";
import { ok, err } from "../../_shared";
import { db, InMemoryConnection } from "@/lib/db/connection";

export const runtime = "nodejs";

interface SubRow {
  id: string;
  business_id: string;
  url: string;
  events: string[];
  active: boolean;
  failure_count: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_failure_reason: string | null;
  created_at: string;
}

interface DeliveryAggregateRow {
  webhook_id: string;
  total: string;
  pending: string;
  failed: string;
  dead: string;
  delivered: string;
  oldest_pending: string | null;
}

const MAX_ROWS = 500;

export async function GET(req: NextRequest): Promise<Response> {
  const adminToken = process.env.WAITLIST_ADMIN_TOKEN;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!adminToken || provided !== adminToken) {
    return err("UNAUTHORIZED", "Admin token required", 401);
  }

  const url = new URL(req.url);
  const onlyFailing = url.searchParams.get("only_failing") === "1";
  const minFailures = parseInt(url.searchParams.get("min_failures") ?? "0", 10) || 0;

  if (db instanceof InMemoryConnection) {
    return ok({
      mode: "in-memory",
      note: "DATABASE_URL not configured — health view requires Postgres so we can aggregate across function instances.",
      summary: { total: 0, failing: 0, inactive: 0 },
      subscriptions: [],
    });
  }

  try {
    // Pull subscriptions + per-sub delivery aggregates in two
    // queries; the join keeps the route simple at the cost of one
    // extra round-trip (acceptable for an admin diagnostic route).
    const subsRes = await db.query<SubRow>(
      `SELECT id, business_id, url, events, active, failure_count,
              last_success_at, last_failure_at, last_failure_reason, created_at
         FROM webhooks
        ORDER BY failure_count DESC, last_failure_at DESC NULLS LAST
        LIMIT $1`,
      [MAX_ROWS],
    );

    const aggRes = await db.query<DeliveryAggregateRow>(
      `SELECT webhook_id,
              COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
              COUNT(*) FILTER (WHERE status = 'failed')::text AS failed,
              COUNT(*) FILTER (WHERE status = 'dead')::text AS dead,
              COUNT(*) FILTER (WHERE status = 'delivered')::text AS delivered,
              MIN(next_retry) FILTER (WHERE status = 'pending') AS oldest_pending
         FROM webhook_deliveries
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY webhook_id`,
    );

    const aggByWebhook = new Map<string, DeliveryAggregateRow>();
    for (const a of aggRes.rows) aggByWebhook.set(a.webhook_id, a);

    let subs = subsRes.rows.map((row) => {
      const agg = aggByWebhook.get(row.id);
      return {
        id: row.id,
        businessId: row.business_id,
        url: row.url,
        events: row.events,
        active: row.active,
        failureCount: row.failure_count,
        lastSuccessAt: row.last_success_at,
        lastFailureAt: row.last_failure_at,
        lastFailureReason: row.last_failure_reason,
        createdAt: row.created_at,
        last7Days: {
          total: parseInt(agg?.total ?? "0", 10),
          pending: parseInt(agg?.pending ?? "0", 10),
          failed: parseInt(agg?.failed ?? "0", 10),
          dead: parseInt(agg?.dead ?? "0", 10),
          delivered: parseInt(agg?.delivered ?? "0", 10),
          oldestPending: agg?.oldest_pending ?? null,
        },
      };
    });

    if (onlyFailing) {
      subs = subs.filter((s) => s.last7Days.failed + s.last7Days.dead > 0 || s.failureCount > 0);
    }
    if (minFailures > 0) {
      subs = subs.filter((s) => s.failureCount >= minFailures);
    }

    const summary = {
      total: subs.length,
      active: subs.filter((s) => s.active && s.failureCount < 3).length,
      failing: subs.filter((s) => s.active && s.failureCount >= 3).length,
      inactive: subs.filter((s) => !s.active).length,
      withDeadDeliveries: subs.filter((s) => s.last7Days.dead > 0).length,
    };

    return ok({
      generatedAt: new Date().toISOString(),
      summary,
      subscriptions: subs,
      filters: { onlyFailing, minFailures },
    });
  } catch (e) {
    console.error("[admin/webhook-health] query failed:", e);
    return err("DB_ERROR", "Could not aggregate webhook health", 500);
  }
}
