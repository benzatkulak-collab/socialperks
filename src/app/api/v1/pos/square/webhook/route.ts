/**
 * POST /api/v1/pos/square/webhook
 *
 * Square sends `payment.created` events here when a customer pays.
 * Verify signature, look up the merchant→business mapping, and enqueue
 * a post-purchase SMS via the Phase 3 pipeline.
 *
 * Signature scheme (Square v2):
 *   HMAC-SHA256(notificationUrl + rawBody) with key SQUARE_WEBHOOK_SIGNATURE_KEY,
 *   base64-encoded, compared against header `x-square-hmacsha256-signature`.
 *
 * Always 200 OK — POS providers retry hard on non-200.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { campaignManager } from "@/lib/campaign-state-machine";
import { enqueuePostPurchaseSms } from "@/lib/sms/post-purchase";

export const runtime = "nodejs";

function verifySquareSignature(
  rawBody: string,
  signature: string,
  notificationUrl: string,
  signingKey: string,
): boolean {
  try {
    const computed = crypto
      .createHmac("sha256", signingKey)
      .update(notificationUrl + rawBody)
      .digest("base64");
    const a = Buffer.from(computed);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function lookupBusinessId(merchantId: string): string | null {
  const raw = process.env.SQUARE_MERCHANT_TO_BUSINESS_MAP;
  if (!raw) return null;
  try {
    // TODO: migrate this mapping to a `pos_merchants` DB table once we
    // have more than ~10 customers — env JSON doesn't scale.
    const map = JSON.parse(raw) as Record<string, string>;
    return map[merchantId] ?? null;
  } catch {
    return null;
  }
}

interface SquarePaymentObject {
  payment?: {
    id?: string;
    amount_money?: { amount?: number };
    buyer_phone?: string;
  };
}

interface SquareEvent {
  merchant_id?: string;
  type?: string;
  data?: { object?: SquarePaymentObject };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-square-hmacsha256-signature") ?? "";
    const signingKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const notificationUrl =
      process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ?? new URL(req.url).toString();

    if (!signingKey) {
      console.warn(
        "pos/square: SQUARE_WEBHOOK_SIGNATURE_KEY unset — accepting in dev mode",
      );
    } else if (!verifySquareSignature(rawBody, signature, notificationUrl, signingKey)) {
      console.error("pos/square: signature verification failed");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const event: SquareEvent = rawBody ? JSON.parse(rawBody) : {};
    const merchantId = event.merchant_id ?? "";
    const phone = event.data?.object?.payment?.buyer_phone ?? "";
    const amountCents = event.data?.object?.payment?.amount_money?.amount ?? 0;

    if (!merchantId) {
      console.warn("pos/square: missing merchant_id");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const businessId = lookupBusinessId(merchantId);
    if (!businessId) {
      console.warn("pos/square: no business mapping for merchant", merchantId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (!phone) {
      console.warn("pos/square: payment has no buyer_phone, dropping", {
        merchantId,
        businessId,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const lifecycles = campaignManager.listByBusiness(businessId);
    const active = lifecycles.find((c) => c.state === "active");
    if (!active) {
      console.warn("pos/square: no active campaign for business", businessId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    enqueuePostPurchaseSms({
      businessId,
      businessName: businessId,
      campaignId: active.id,
      customerPhone: phone,
      purchaseAmount: amountCents / 100,
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e) {
    console.error("pos/square: handler error", e);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
