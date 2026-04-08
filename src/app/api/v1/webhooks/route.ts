/**
 * GET    /api/v1/webhooks — List webhooks for authenticated business
 * POST   /api/v1/webhooks — Register a new webhook endpoint
 * PUT    /api/v1/webhooks — Update an existing webhook
 * DELETE /api/v1/webhooks — Remove (deactivate) a webhook
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
} from "../_shared";
import { NextResponse } from "next/server";
import {
  webhookStore,
  KNOWN_EVENT_TYPES,
} from "@/lib/webhooks";
import { validateId, validateString } from "@/lib/security/validate";

// ─── Helpers ────────────────────────────────────────────────────────────────

function isHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateEvents(events: unknown): string[] | null {
  if (!Array.isArray(events) || events.length === 0) return null;
  for (const e of events) {
    if (typeof e !== "string") return null;
    if (e !== "*" && !KNOWN_EVENT_TYPES.includes(e as (typeof KNOWN_EVENT_TYPES)[number])) {
      return null;
    }
  }
  return events as string[];
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const user = auth as AuthUser;

  if (!user.businessId) {
    return err("NO_BUSINESS", "Business account required to manage webhooks", 403);
  }

  const webhooks = webhookStore.getWebhooks(user.businessId);

  // Attach recent deliveries per webhook
  const result = webhooks.map((wh) => ({
    ...wh,
    // Mask the secret — only show prefix
    secret: wh.secret.slice(0, 10) + "...",
    recentDeliveries: webhookStore.getDeliveries(wh.id, { limit: 5 }),
  }));

  return ok({ webhooks: result, total: result.length });
});

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const user = auth as AuthUser;

  if (!user.businessId) {
    return err("NO_BUSINESS", "Business account required to register webhooks", 403);
  }

  const body = await parseBody<{ url?: string; events?: unknown }>(req);
  if (body instanceof NextResponse) return body;

  // Validate URL
  const urlVal = validateString(body.url, "url", { min: 10, max: 2048 });
  if (!urlVal.success) return err("INVALID_URL", urlVal.error, 400);
  if (!isHttpsUrl(urlVal.data)) {
    return err("INVALID_URL", "Webhook URL must use HTTPS", 400);
  }

  // Validate events
  const events = validateEvents(body.events);
  if (!events) {
    return err(
      "INVALID_EVENTS",
      `events must be a non-empty array of known event types: ${KNOWN_EVENT_TYPES.join(", ")}, or "*" for all`,
      400
    );
  }

  const webhook = webhookStore.registerWebhook(
    user.businessId,
    urlVal.data,
    events
  );

  return ok(
    {
      webhook: {
        ...webhook,
        // Show full secret only on creation
      },
      message: "Webhook registered. Save the secret — it will not be shown again.",
    },
    201
  );
});

// ─── PUT ────────────────────────────────────────────────────────────────────

export const PUT = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const user = auth as AuthUser;

  if (!user.businessId) {
    return err("NO_BUSINESS", "Business account required", 403);
  }

  const body = await parseBody<{
    webhookId?: string;
    url?: string;
    events?: unknown;
    status?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  // Validate webhook ID
  const idVal = validateId(body.webhookId);
  if (!idVal.success) return err("INVALID_WEBHOOK_ID", idVal.error, 400);

  // Verify ownership
  const existing = webhookStore.getWebhook(idVal.data);
  if (!existing || existing.businessId !== user.businessId) {
    return err("NOT_FOUND", "Webhook not found", 404);
  }

  // Build update object
  const updates: Parameters<typeof webhookStore.updateWebhook>[1] = {};

  if (body.url !== undefined) {
    const urlVal = validateString(body.url, "url", { min: 10, max: 2048 });
    if (!urlVal.success) return err("INVALID_URL", urlVal.error, 400);
    if (!isHttpsUrl(urlVal.data)) {
      return err("INVALID_URL", "Webhook URL must use HTTPS", 400);
    }
    updates.url = urlVal.data;
  }

  if (body.events !== undefined) {
    const events = validateEvents(body.events);
    if (!events) {
      return err("INVALID_EVENTS", "events must be a non-empty array of known event types", 400);
    }
    updates.events = events;
  }

  if (body.status !== undefined) {
    if (!["active", "inactive", "failing"].includes(body.status)) {
      return err("INVALID_STATUS", "status must be active, inactive, or failing", 400);
    }
    updates.status = body.status as "active" | "inactive" | "failing";
  }

  const updated = webhookStore.updateWebhook(idVal.data, updates);
  if (!updated) {
    return err("UPDATE_FAILED", "Failed to update webhook", 500);
  }

  return ok({
    webhook: { ...updated, secret: updated.secret.slice(0, 10) + "..." },
  });
});

// ─── DELETE ─────────────────────────────────────────────────────────────────

export const DELETE = withTiming(async (req: NextRequest) => {
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

  const idVal = validateId(webhookId);
  if (!idVal.success) return err("INVALID_WEBHOOK_ID", idVal.error, 400);

  // Verify ownership
  const existing = webhookStore.getWebhook(idVal.data);
  if (!existing || existing.businessId !== user.businessId) {
    return err("NOT_FOUND", "Webhook not found", 404);
  }

  webhookStore.removeWebhook(idVal.data);

  return ok({ message: "Webhook deactivated", webhookId: idVal.data });
});
