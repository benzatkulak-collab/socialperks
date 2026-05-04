/**
 * GET/POST /api/v1/verification/webhook
 *
 * Platform webhook receiver for social media verification events.
 * POST: Verify HMAC-SHA256 signature, parse payload, log event. Return 200.
 * GET: Handle webhook challenge verification (hub.challenge).
 *
 * No rate limiting — webhooks must always be accepted.
 */

import type { NextRequest } from "next/server";
import { ok, err, getQuery, withTiming } from "../../_shared";
import { createHmac, timingSafeEqual } from "crypto";

// ─── Config ─────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = (() => {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    console.warn("[WEBHOOK] WARNING: WEBHOOK_SECRET not set in production");
  }
  return "dev-webhook-secret";
})();

// Replay protection: track recent event IDs to reject duplicates
const recentEventIds = new Set<string>();
const MAX_RECENT_EVENTS = 10000;

function trackEventId(eventId: string): boolean {
  if (recentEventIds.has(eventId)) return false; // duplicate
  if (recentEventIds.size >= MAX_RECENT_EVENTS) {
    // Evict oldest entries (Sets maintain insertion order)
    const iterator = recentEventIds.values();
    for (let i = 0; i < 1000; i++) {
      const oldest = iterator.next().value;
      if (oldest !== undefined) {
        recentEventIds.delete(oldest);
      }
    }
  }
  recentEventIds.add(eventId);
  return true;
}

// ─── Signature Verification ─────────────────────────────────────────────────

function verifySignature(payload: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  // Support "sha256=..." format (GitHub/Meta style)
  const signature = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;

  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (expected.length !== signature.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

// ─── GET — Webhook Challenge Verification ───────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const q = getQuery(req);

  // Meta/Facebook style challenge verification
  const mode = q.get("hub.mode");
  const challenge = q.get("hub.challenge");
  const verifyToken = q.get("hub.verify_token");

  if (mode === "subscribe" && challenge) {
    // Verify the token matches our expected value
    const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN;
    if (!expectedToken) {
      console.error("[WEBHOOK] WEBHOOK_VERIFY_TOKEN not configured — rejecting challenge");
      return err("WEBHOOK_NOT_CONFIGURED", "Webhook verification is not configured", 500);
    }
    if (verifyToken !== expectedToken) {
      return err("INVALID_VERIFY_TOKEN", "Verification token mismatch", 403);
    }

    // Return the challenge value as plain text
    return new Response(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "X-Request-Id": crypto.randomUUID(),
      },
    }) as unknown as ReturnType<typeof ok>;
  }

  // Generic challenge — return the challenge value if present
  if (challenge) {
    return ok({ challenge });
  }

  return err("MISSING_CHALLENGE", "No hub.challenge parameter found", 400);
});

// ─── POST — Webhook Event Receiver ──────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Read raw body for signature verification
  const rawBody = await req.text();

  // Verify HMAC-SHA256 signature
  const signatureHeader = req.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, signatureHeader)) {
    console.warn("[WEBHOOK] Signature verification failed", {
      hasSignature: !!signatureHeader,
      timestamp: new Date().toISOString(),
    });
    return err("INVALID_SIGNATURE", "Webhook signature verification failed", 401);
  }

  // Parse the payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return err("INVALID_PAYLOAD", "Webhook body is not valid JSON", 400);
  }

  // Extract event metadata
  const eventId =
    (payload.id as string) ??
    (payload.event_id as string) ??
    crypto.randomUUID();
  const eventType =
    (payload.type as string) ??
    (payload.event as string) ??
    (payload.object as string) ??
    "unknown";
  const platform =
    (payload.platform as string) ??
    req.headers.get("x-platform") ??
    "unknown";

  // Replay protection
  if (!trackEventId(eventId)) {
    console.warn("[WEBHOOK] Duplicate event rejected", { eventId, eventType });
    return ok({ received: true, duplicate: true });
  }

  // Log the event (structured JSON logging)
  console.warn(
    JSON.stringify({
      level: "info",
      component: "webhook",
      eventId,
      eventType,
      platform,
      timestamp: new Date().toISOString(),
      payloadKeys: Object.keys(payload),
    })
  );

  // In production, this would dispatch to event handlers based on eventType.
  // For now, acknowledge receipt.
  return ok({
    received: true,
    eventId,
    eventType,
    platform,
    processedAt: new Date().toISOString(),
  });
});
