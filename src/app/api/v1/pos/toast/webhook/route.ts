/**
 * POST /api/v1/pos/toast/webhook
 *
 * Toast POS webhook receiver. Toast uses OAuth2 for API access plus a
 * shared signing secret in the `Toast-Signing-Secret` header for
 * webhook authenticity. Compare constant-time against env.
 *
 * Event shape (subset we care about):
 *   { eventType: "ORDER_PAID", restaurantGuid, customer: { phone }, totals: { total } }
 *
 * Always 200 OK — Toast retries hard on non-200.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { campaignManager } from "@/lib/campaign-state-machine";
import { enqueuePostPurchaseSms } from "@/lib/sms/post-purchase";

export const runtime = "nodejs";

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

function lookupBusinessId(restaurantGuid: string): string | null {
  const raw = process.env.TOAST_RESTAURANT_TO_BUSINESS_MAP;
  if (!raw) return null;
  try {
    // TODO: migrate to `pos_merchants` DB table for scale.
    const map = JSON.parse(raw) as Record<string, string>;
    return map[restaurantGuid] ?? null;
  } catch {
    return null;
  }
}

interface ToastEvent {
  eventType?: string;
  restaurantGuid?: string;
  customer?: { phone?: string };
  totals?: { total?: number };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const headerSecret = req.headers.get("toast-signing-secret") ?? "";
    const expected = process.env.TOAST_WEBHOOK_SIGNING_SECRET;

    if (!expected) {
      console.warn(
        "pos/toast: TOAST_WEBHOOK_SIGNING_SECRET unset — accepting in dev mode",
      );
    } else if (!constantTimeEqual(headerSecret, expected)) {
      console.error("pos/toast: signing secret mismatch");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const rawBody = await req.text();
    const event: ToastEvent = rawBody ? JSON.parse(rawBody) : {};

    if (event.eventType !== "ORDER_PAID") {
      // Other event types are valid but not actionable for SMS.
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const restaurantGuid = event.restaurantGuid ?? "";
    const phone = event.customer?.phone ?? "";
    const total = event.totals?.total ?? 0;

    if (!restaurantGuid) {
      console.warn("pos/toast: missing restaurantGuid");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const businessId = lookupBusinessId(restaurantGuid);
    if (!businessId) {
      console.warn(
        "pos/toast: no business mapping for restaurant",
        restaurantGuid,
      );
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (!phone) {
      console.warn("pos/toast: order has no customer phone, dropping", {
        restaurantGuid,
        businessId,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const lifecycles = campaignManager.listByBusiness(businessId);
    const active = lifecycles.find((c) => c.state === "active");
    if (!active) {
      console.warn("pos/toast: no active campaign for business", businessId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    enqueuePostPurchaseSms({
      businessId,
      businessName: businessId,
      campaignId: active.id,
      customerPhone: phone,
      purchaseAmount: total,
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e) {
    console.error("pos/toast: handler error", e);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
