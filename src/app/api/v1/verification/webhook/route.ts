import { NextRequest } from "next/server";
import { apiResponse, apiError } from "@/lib/api/middleware";
import { logger } from "@/lib/logging";
import { eventBus } from "@/lib/realtime";

/**
 * POST /api/v1/verification/webhook — Receive platform webhooks
 *
 * Social media platforms can push notifications when content is created,
 * updated, or deleted. This endpoint handles those webhooks for real-time
 * verification updates.
 *
 * Each platform has a different webhook format; we normalize them here.
 */

interface WebhookPayload {
  platform: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
  signature?: string;
}

// Platform webhook secret keys for signature verification
const WEBHOOK_SECRETS: Record<string, string> = {
  ig: process.env.INSTAGRAM_WEBHOOK_SECRET ?? "",
  tt: process.env.TIKTOK_WEBHOOK_SECRET ?? "",
  yt: process.env.YOUTUBE_WEBHOOK_SECRET ?? "",
  xw: process.env.X_WEBHOOK_SECRET ?? "",
  fb: process.env.FACEBOOK_WEBHOOK_SECRET ?? "",
};

/**
 * Verify webhook signature using HMAC-SHA256.
 * Each platform signs its payloads differently.
 */
async function verifySignature(
  platformId: string,
  body: string,
  signature: string
): Promise<boolean> {
  const secret = WEBHOOK_SECRETS[platformId];
  if (!secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks
  if (computed.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(request: NextRequest) {
  logger.info("POST /api/v1/verification/webhook", { method: "POST", path: "/api/v1/verification/webhook" });

  try {
    const rawBody = await request.text();
    let payload: WebhookPayload;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return apiError("INVALID_PAYLOAD", "Webhook payload must be valid JSON", 400);
    }

    if (!payload.platform || !payload.event) {
      return apiError("MISSING_FIELDS", "platform and event are required", 400);
    }

    // Verify webhook signature — required for all platforms with configured secrets
    const platformSecret = WEBHOOK_SECRETS[payload.platform];
    if (platformSecret) {
      if (!payload.signature) {
        return apiError("MISSING_SIGNATURE", "Webhook signature is required", 401);
      }
      const valid = await verifySignature(payload.platform, rawBody, payload.signature);
      if (!valid) {
        return apiError("INVALID_SIGNATURE", "Webhook signature verification failed", 401);
      }
    }

    // Normalize platform events into our internal format
    const normalized = normalizeEvent(payload);

    // Publish to internal event bus for real-time processing
    eventBus.publish({
      type: `verification.${normalized.action}`,
      payload: {
        platformId: normalized.platformId,
        contentId: normalized.contentId,
        userId: normalized.userId,
        action: normalized.action,
        event: normalized.event,
      },
      timestamp: normalized.timestamp,
    });

    logger.info("Verification webhook processed", {
      platform: payload.platform,
      event: payload.event,
      normalizedAction: normalized.action,
    });

    return apiResponse({
      received: true,
      normalizedEvent: normalized.event,
      platform: payload.platform,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("Verification webhook processing failed", err);
    return apiError("WEBHOOK_ERROR", "Failed to process webhook", 500);
  }
}

// Instagram webhook verification (GET for subscription confirmation)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Instagram/Facebook webhook verification challenge
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge) {
    const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN ?? "";
    if (token === expectedToken) {
      return new Response(challenge, { status: 200 });
    }
    return apiError("INVALID_TOKEN", "Verification token mismatch", 403);
  }

  return apiError("BAD_REQUEST", "Missing verification parameters", 400);
}

// ─── Event Normalization ────────────────────────────────────────────────────

interface NormalizedEvent {
  event: string;
  platformId: string;
  contentId: string | null;
  userId: string | null;
  action: "created" | "updated" | "deleted" | "unknown";
  timestamp: string;
  raw: Record<string, unknown>;
}

function normalizeEvent(payload: WebhookPayload): NormalizedEvent {
  const base: NormalizedEvent = {
    event: payload.event,
    platformId: payload.platform,
    contentId: null,
    userId: null,
    action: "unknown",
    timestamp: payload.timestamp ?? new Date().toISOString(),
    raw: payload.data,
  };

  // Platform-specific normalization
  switch (payload.platform) {
    case "ig":
      return normalizeInstagram(base, payload);
    case "tt":
      return normalizeTikTok(base, payload);
    case "yt":
      return normalizeYouTube(base, payload);
    case "xw":
      return normalizeX(base, payload);
    default:
      return base;
  }
}

function normalizeInstagram(base: NormalizedEvent, payload: WebhookPayload): NormalizedEvent {
  const data = payload.data;
  return {
    ...base,
    contentId: (data.media_id as string) ?? null,
    userId: (data.user_id as string) ?? null,
    action: payload.event.includes("create") ? "created" :
            payload.event.includes("delete") ? "deleted" :
            payload.event.includes("update") ? "updated" : "unknown",
  };
}

function normalizeTikTok(base: NormalizedEvent, payload: WebhookPayload): NormalizedEvent {
  const data = payload.data;
  return {
    ...base,
    contentId: (data.video_id as string) ?? null,
    userId: (data.open_id as string) ?? null,
    action: payload.event === "video.publish" ? "created" :
            payload.event === "video.remove" ? "deleted" : "unknown",
  };
}

function normalizeYouTube(base: NormalizedEvent, payload: WebhookPayload): NormalizedEvent {
  const data = payload.data;
  return {
    ...base,
    contentId: (data.videoId as string) ?? null,
    userId: (data.channelId as string) ?? null,
    action: payload.event === "video.published" ? "created" :
            payload.event === "video.deleted" ? "deleted" : "unknown",
  };
}

function normalizeX(base: NormalizedEvent, payload: WebhookPayload): NormalizedEvent {
  const data = payload.data;
  return {
    ...base,
    contentId: (data.tweet_id as string) ?? null,
    userId: (data.user_id as string) ?? null,
    action: payload.event === "tweet_create_events" ? "created" :
            payload.event === "tweet_delete_events" ? "deleted" : "unknown",
  };
}
