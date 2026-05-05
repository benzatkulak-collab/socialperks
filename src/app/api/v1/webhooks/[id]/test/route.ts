/**
 * POST /api/v1/webhooks/{id}/test
 *
 * Fire a synthetic event so a shop owner can verify their endpoint is
 * wired up correctly without waiting for a real campaign event.
 *
 * Body: { eventType?: string }
 *   - eventType defaults to "campaign.created"
 *
 * Response: { delivery, deliveryId }
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
  type AuthUser,
} from "../../../_shared";
import { webhookStore, KNOWN_EVENT_TYPES } from "@/lib/webhooks";
import { validateId } from "@/lib/security/validate";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Slightly stricter rate-limit — testing fires real outbound HTTP
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const user = auth as AuthUser;

  if (!user.businessId) {
    return err("NO_BUSINESS", "Business account required", 403);
  }

  const { id } = await (ctx as RouteContext).params;
  const idVal = validateId(id);
  if (!idVal.success) return err("INVALID_WEBHOOK_ID", idVal.error, 400);

  const webhook = webhookStore.getWebhook(idVal.data);
  if (!webhook || webhook.businessId !== user.businessId) {
    return err("NOT_FOUND", "Webhook not found", 404);
  }

  // Optional event type — must be one of the known types
  const body = await parseBody<{ eventType?: string }>(req);
  if (body instanceof NextResponse) return body;

  let eventType: string = "campaign.created";
  if (typeof body.eventType === "string" && body.eventType.trim()) {
    const candidate = body.eventType.trim();
    if (
      candidate !== "*" &&
      !KNOWN_EVENT_TYPES.includes(candidate as (typeof KNOWN_EVENT_TYPES)[number])
    ) {
      return err(
        "INVALID_EVENT_TYPE",
        `eventType must be one of: ${KNOWN_EVENT_TYPES.join(", ")}`,
        400
      );
    }
    eventType = candidate;
  }

  // Build a clearly-marked test payload so receivers can identify
  // it without confusing it for a real event.
  const payload = {
    test: true,
    message: "This is a synthetic test delivery from Social Perks.",
    webhookId: webhook.id,
    businessId: user.businessId,
    triggeredBy: user.email,
    triggeredAt: new Date().toISOString(),
  };

  const deliveryIds = webhookStore.deliverEvent(
    eventType,
    payload,
    user.businessId
  );

  // Find the delivery created for THIS webhook (deliverEvent fans out
  // to every matching subscription for the business — we want ours).
  const ourDeliveryId = deliveryIds.find((did) => {
    const d = webhookStore.getDelivery(did);
    return d?.webhookId === webhook.id;
  });

  if (!ourDeliveryId) {
    return err(
      "NO_DELIVERY",
      `Webhook is not subscribed to "${eventType}" — update its event filter or use a subscribed event type.`,
      400
    );
  }

  // Attempt immediate delivery so the caller gets a same-request
  // pass/fail result.
  const result = await webhookStore.attemptDelivery(ourDeliveryId);

  return ok({
    delivery: result,
    deliveryId: ourDeliveryId,
  });
});
