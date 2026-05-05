/**
 * POST /api/v1/pos/clover/webhook
 *
 * Clover POS webhook receiver. Clover signs requests with a shared
 * `X-Clover-Auth` header — verify constant-time against env.
 *
 * Event shape:
 *   { merchants: { [merchantId]: { payments: { [paymentId]: { operation, ts } } } } }
 *
 * Clover does NOT include customer phone in the webhook payload — to
 * deliver post-purchase SMS we'd need to follow up with a Clover
 * Customer API call (TODO). For now we count the event so the
 * dashboard can surface "X recent payments waiting on phone backfill"
 * and we return 200.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";

// In-memory counter — resets on cold start. Replace with DB write
// when we wire the dashboard surface.
const counters: Record<string, { total: number; lastTs: string }> = {};

function constantTimeEqual(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

interface CloverEvent {
  merchants?: Record<
    string,
    { payments?: Record<string, { operation?: string; ts?: number }> }
  >;
}

// Internal accessor — not exported to keep Next route module clean.
// Pull from a separate module if dashboards need this.
function _getCloverCounters(): Record<string, { total: number; lastTs: string }> {
  return { ...counters };
}
void _getCloverCounters;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const headerToken = req.headers.get("x-clover-auth") ?? "";
    const expected = process.env.CLOVER_WEBHOOK_AUTH_TOKEN;

    if (!expected) {
      console.warn(
        "pos/clover: CLOVER_WEBHOOK_AUTH_TOKEN unset — accepting in dev mode",
      );
    } else if (!constantTimeEqual(headerToken, expected)) {
      console.error("pos/clover: auth token mismatch");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const rawBody = await req.text();
    const event: CloverEvent = rawBody ? JSON.parse(rawBody) : {};
    const merchants = event.merchants ?? {};

    for (const [merchantId, payload] of Object.entries(merchants)) {
      const payments = payload?.payments ?? {};
      for (const [, p] of Object.entries(payments)) {
        const existing = counters[merchantId] ?? { total: 0, lastTs: "" };
        existing.total += 1;
        existing.lastTs = p?.ts ? new Date(p.ts).toISOString() : new Date().toISOString();
        counters[merchantId] = existing;
        // TODO: call Clover Customer API to fetch the customer record by
        // payment ID, extract phone, then enqueuePostPurchaseSms. Until
        // then we just count.
        console.warn("pos/clover: phone missing — TODO backfill via Clover Customer API", {
          merchantId,
          operation: p?.operation,
        });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e) {
    console.error("pos/clover: handler error", e);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
