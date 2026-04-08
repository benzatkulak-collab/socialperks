/**
 * GET  /api/v1/webhooks/deliveries — List deliveries for a webhook
 * POST /api/v1/webhooks/deliveries — Retry a specific failed delivery
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  getQuery,
  withTiming,
  type AuthUser,
} from "../../_shared";
import { NextResponse } from "next/server";
import { webhookStore } from "@/lib/webhooks";
import { validateId, validateNumber, validateEnum } from "@/lib/security/validate";

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const user = auth as AuthUser;

  if (!user.businessId) {
    return err("NO_BUSINESS", "Business account required", 403);
  }

  const params = getQuery(req);
  const webhookId = params.get("webhookId");
  const statusParam = params.get("status");
  const limitParam = params.get("limit");

  // Validate webhookId
  const idVal = validateId(webhookId);
  if (!idVal.success) return err("INVALID_WEBHOOK_ID", idVal.error, 400);

  // Verify ownership
  const webhook = webhookStore.getWebhook(idVal.data);
  if (!webhook || webhook.businessId !== user.businessId) {
    return err("NOT_FOUND", "Webhook not found", 404);
  }

  // Optional status filter
  let status: "pending" | "delivered" | "failed" | "dead" | undefined;
  if (statusParam) {
    const sv = validateEnum(statusParam, "status", [
      "pending",
      "delivered",
      "failed",
      "dead",
    ] as const);
    if (!sv.success) return err("INVALID_STATUS", sv.error, 400);
    status = sv.data;
  }

  // Optional limit
  let limit = 50;
  if (limitParam) {
    const lv = validateNumber(limitParam, "limit", { min: 1, max: 200 });
    if (!lv.success) return err("INVALID_LIMIT", lv.error, 400);
    limit = lv.data;
  }

  const deliveries = webhookStore.getDeliveries(idVal.data, { status, limit });

  return ok({ deliveries, total: deliveries.length });
});

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const user = auth as AuthUser;

  if (!user.businessId) {
    return err("NO_BUSINESS", "Business account required", 403);
  }

  const body = await parseBody<{ deliveryId?: string }>(req);
  if (body instanceof NextResponse) return body;

  const idVal = validateId(body.deliveryId);
  if (!idVal.success) return err("INVALID_DELIVERY_ID", idVal.error, 400);

  // Get the delivery and verify ownership via the webhook
  const delivery = webhookStore.getDelivery(idVal.data);
  if (!delivery) {
    return err("NOT_FOUND", "Delivery not found", 404);
  }

  const webhook = webhookStore.getWebhook(delivery.webhookId);
  if (!webhook || webhook.businessId !== user.businessId) {
    return err("NOT_FOUND", "Delivery not found", 404);
  }

  // Only allow retry on failed or dead deliveries
  if (delivery.status !== "failed" && delivery.status !== "dead") {
    return err(
      "INVALID_STATE",
      `Cannot retry a delivery with status "${delivery.status}"`,
      400
    );
  }

  const result = await webhookStore.attemptDelivery(idVal.data);
  if (!result) {
    return err("RETRY_FAILED", "Failed to retry delivery", 500);
  }

  return ok({ delivery: result });
});
