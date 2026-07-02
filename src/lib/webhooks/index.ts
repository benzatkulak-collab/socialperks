/**
 * Social Perks — Webhook Delivery System
 *
 * Reliable outbound webhook delivery with HMAC signing, exponential
 * backoff retries, failure tracking, and dead-letter handling.
 *
 * In-memory store now, ready for Postgres migration.
 */

import { createHmac } from "crypto";
import { eventPublisher } from "@/lib/realtime/publisher";
import { isSafeUrl, assertSafeUrl } from "@/lib/security/url";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WebhookEndpoint {
  id: string;
  businessId: string;
  url: string;
  events: string[];
  secret: string;
  status: "active" | "inactive" | "failing";
  failureCount: number;
  lastTriggered: string | null;
  lastSuccess: string | null;
  lastFailure: string | null;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  payload: unknown;
  status: "pending" | "delivered" | "failed" | "dead";
  statusCode: number | null;
  attempts: number;
  maxAttempts: number;
  nextRetry: string | null;
  response: string | null;
  error: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

// ─── Known Event Types ──────────────────────────────────────────────────────

export const KNOWN_EVENT_TYPES = [
  "campaign.created",
  "campaign.launched",
  "campaign.paused",
  "campaign.resumed",
  "campaign.ended",
  "campaign.expired",
  "submission.created",
  "submission.approved",
  "submission.rejected",
  "submission.expired",
  "perk.awarded",
  "perk.redeemed",
  "perk.expired",
  "user.signup",
  "user.login",
  "user.logout",
  "influencer.applied",
  "influencer.accepted",
  "influencer.rejected",
  "agent.query",
  "agent.campaign_execute",
] as const;

export type KnownEventType = (typeof KNOWN_EVENT_TYPES)[number];

// ─── Retry Backoff Schedule ─────────────────────────────────────────────────

/** Delays between retry attempts in milliseconds: 1m, 5m, 30m, 2h, 12h, 72h */
const RETRY_DELAYS_MS = [
  1 * 60_000,       // 1 minute
  5 * 60_000,       // 5 minutes
  30 * 60_000,      // 30 minutes
  2 * 3_600_000,    // 2 hours
  12 * 3_600_000,   // 12 hours
  72 * 3_600_000,   // 72 hours
];

const MAX_ATTEMPTS = 6;

/** Threshold for marking a webhook as "failing" */
const FAILING_THRESHOLD = 3;

/** Threshold for auto-deactivating a webhook */
const INACTIVE_THRESHOLD = 10;

// ─── ID Generation ──────────────────────────────────────────────────────────

let webhookCounter = 0;
let deliveryCounter = 0;

function generateWebhookId(): string {
  webhookCounter += 1;
  return `whk_${crypto.randomUUID().slice(0, 12)}_${webhookCounter}`;
}

function generateDeliveryId(): string {
  deliveryCounter += 1;
  return `dlv_${crypto.randomUUID().slice(0, 12)}_${deliveryCounter}`;
}

function generateSecret(): string {
  return `whsec_${crypto.randomUUID().replace(/-/g, "")}`;
}

// ─── HMAC Signing ───────────────────────────────────────────────────────────

/**
 * Generate HMAC-SHA256 signature for a JSON payload.
 * The signature is hex-encoded, prefixed with "sha256=".
 */
export function signPayload(payload: string, secret: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * Verify an HMAC signature against the expected value.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifySignature(
  payload: string,
  secret: string,
  signature: string
): boolean {
  const expected = signPayload(payload, secret);
  if (expected.length !== signature.length) return false;

  // Timing-safe comparison
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─── Webhook Store ──────────────────────────────────────────────────────────

class WebhookStore {
  private webhooks = new Map<string, WebhookEndpoint>();
  private deliveries = new Map<string, WebhookDelivery>();
  private initialized = false;

  // ── Registration ──────────────────────────────────────────────────────

  /**
   * Register a new webhook endpoint for a business.
   * Generates a unique signing secret for the endpoint.
   */
  registerWebhook(
    businessId: string,
    url: string,
    events: string[]
  ): WebhookEndpoint {
    // SSRF defense — synchronous check before persisting. Rejects
    // file://, http://, http(s)://10.x, 127.0.0.1, 169.254.169.254
    // (cloud metadata), IPv6 ULAs, etc. The full DNS-resolve check
    // also runs at delivery time (assertSafeUrl) so a webhook whose
    // hostname later resolves to a private IP via DNS rebinding is
    // also blocked.
    const shallowError = isSafeUrl(url);
    if (shallowError) {
      throw new Error(`Webhook URL rejected: ${shallowError}`);
    }

    const webhook: WebhookEndpoint = {
      id: generateWebhookId(),
      businessId,
      url,
      events: [...events],
      secret: generateSecret(),
      status: "active",
      failureCount: 0,
      lastTriggered: null,
      lastSuccess: null,
      lastFailure: null,
      createdAt: new Date().toISOString(),
    };

    this.webhooks.set(webhook.id, webhook);
    return webhook;
  }

  /**
   * Remove (deactivate) a webhook endpoint. Does not delete history.
   */
  removeWebhook(webhookId: string): boolean {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return false;
    webhook.status = "inactive";
    return true;
  }

  /**
   * Update webhook properties.
   */
  updateWebhook(
    webhookId: string,
    updates: Partial<Pick<WebhookEndpoint, "url" | "events" | "status">>
  ): WebhookEndpoint | null {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return null;

    if (updates.url !== undefined) {
      // Re-validate on update — same SSRF defense as registration.
      const shallowError = isSafeUrl(updates.url);
      if (shallowError) {
        throw new Error(`Webhook URL rejected: ${shallowError}`);
      }
      webhook.url = updates.url;
    }
    if (updates.events !== undefined) webhook.events = [...updates.events];
    if (updates.status !== undefined) {
      webhook.status = updates.status;
      // Reset failure count when manually reactivating
      if (updates.status === "active") {
        webhook.failureCount = 0;
      }
    }

    return { ...webhook };
  }

  /**
   * List all webhooks for a business.
   */
  getWebhooks(businessId: string): WebhookEndpoint[] {
    const results: WebhookEndpoint[] = [];
    for (const webhook of this.webhooks.values()) {
      if (webhook.businessId === businessId) {
        results.push({ ...webhook });
      }
    }
    return results;
  }

  /**
   * Get a single webhook by ID.
   */
  getWebhook(webhookId: string): WebhookEndpoint | null {
    const webhook = this.webhooks.get(webhookId);
    return webhook ? { ...webhook } : null;
  }

  // ── Delivery ──────────────────────────────────────────────────────────

  /**
   * Deliver an event to all matching webhooks for a given business.
   * Creates a pending delivery record for each matching webhook.
   * Returns the created delivery IDs.
   */
  deliverEvent(
    eventType: string,
    payload: unknown,
    businessId?: string
  ): string[] {
    const deliveryIds: string[] = [];

    for (const webhook of this.webhooks.values()) {
      // Must match business (if specified)
      if (businessId && webhook.businessId !== businessId) continue;

      // Must be active or failing (not inactive)
      if (webhook.status === "inactive") continue;

      // Must subscribe to this event type
      if (!webhook.events.includes(eventType) && !webhook.events.includes("*")) {
        continue;
      }

      const delivery: WebhookDelivery = {
        id: generateDeliveryId(),
        webhookId: webhook.id,
        eventType,
        payload,
        status: "pending",
        statusCode: null,
        attempts: 0,
        maxAttempts: MAX_ATTEMPTS,
        nextRetry: new Date().toISOString(),
        response: null,
        error: null,
        createdAt: new Date().toISOString(),
        deliveredAt: null,
      };

      this.deliveries.set(delivery.id, delivery);
      deliveryIds.push(delivery.id);

      // Update webhook last triggered
      webhook.lastTriggered = delivery.createdAt;
    }

    return deliveryIds;
  }

  /**
   * Attempt to deliver a webhook payload via HTTP.
   * Handles success, failure, retry scheduling, and dead-lettering.
   */
  async attemptDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return null;

    const webhook = this.webhooks.get(delivery.webhookId);
    if (!webhook) {
      delivery.status = "dead";
      delivery.error = "Webhook endpoint not found";
      return { ...delivery };
    }

    delivery.attempts += 1;

    const body = JSON.stringify({
      event: delivery.eventType,
      payload: delivery.payload,
      deliveryId: delivery.id,
      webhookId: webhook.id,
      timestamp: new Date().toISOString(),
    });

    const signature = signPayload(body, webhook.secret);

    try {
      // Defense in depth: even though registration validates the URL
      // synchronously via isSafeUrl, hostnames can change resolution
      // (DNS rebinding, attacker rotates a record after registration).
      // assertSafeUrl re-validates at delivery time with a real DNS
      // lookup so the post-registration window is closed.
      //
      // Skipped in test env because vitest mocks `fetch` but not DNS,
      // so an existing test using e.g. "a.com" would intermittently
      // fail on DNS resolution. The registration-time isSafeUrl check
      // still runs everywhere and catches the attacker-controlled
      // shapes (file://, http://, literal private IPs, AWS metadata) —
      // DNS rebinding requires runtime infra that tests don't have.
      if (process.env.NODE_ENV !== "test") {
        const dnsError = await assertSafeUrl(webhook.url);
        if (dnsError) {
          delivery.status = "failed";
          delivery.statusCode = null;
          delivery.error = `URL safety check failed at delivery: ${dnsError}`;
          delivery.deliveredAt = null;
          delivery.nextRetry = null;
          // Don't retry — this is a permanent rejection, not transient.
          this.deliveries.set(delivery.id, delivery);
          webhook.failureCount += 1;
          webhook.lastFailure = new Date().toISOString();
          return delivery;
        }
      }

      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SocialPerks-Signature": signature,
          "X-SocialPerks-Event": delivery.eventType,
          "X-SocialPerks-Delivery": delivery.id,
          "User-Agent": "SocialPerks-Webhooks/1.0",
        },
        body,
        signal: AbortSignal.timeout(30_000), // 30s timeout
      });

      delivery.statusCode = response.status;

      if (response.ok) {
        // Success
        delivery.status = "delivered";
        delivery.deliveredAt = new Date().toISOString();
        delivery.nextRetry = null;

        try {
          delivery.response = await response.text();
          // Truncate long responses
          if (delivery.response.length > 1024) {
            delivery.response = delivery.response.slice(0, 1024) + "...[truncated]";
          }
        } catch {
          delivery.response = null;
        }

        // Reset failure count on success
        webhook.failureCount = 0;
        if (webhook.status === "failing") {
          webhook.status = "active";
        }
        webhook.lastSuccess = delivery.deliveredAt;
      } else {
        // HTTP error (4xx/5xx)
        this.handleDeliveryFailure(
          delivery,
          webhook,
          `HTTP ${response.status}: ${response.statusText}`
        );
      }
    } catch (error: unknown) {
      // Network error / timeout
      const message =
        error instanceof Error ? error.message : "Unknown fetch error";
      this.handleDeliveryFailure(delivery, webhook, message);
    }

    return { ...delivery };
  }

  /**
   * Handle a failed delivery attempt: schedule retry or dead-letter.
   */
  private handleDeliveryFailure(
    delivery: WebhookDelivery,
    webhook: WebhookEndpoint,
    errorMessage: string
  ): void {
    delivery.error = errorMessage;
    webhook.failureCount += 1;
    webhook.lastFailure = new Date().toISOString();

    if (delivery.attempts >= delivery.maxAttempts) {
      // Exhausted all retries → dead letter
      delivery.status = "dead";
      delivery.nextRetry = null;
    } else {
      // Schedule next retry with exponential backoff
      delivery.status = "failed";
      const delayMs = RETRY_DELAYS_MS[delivery.attempts - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      delivery.nextRetry = new Date(Date.now() + delayMs).toISOString();
    }

    // Update webhook status based on consecutive failure count
    if (webhook.failureCount >= INACTIVE_THRESHOLD) {
      webhook.status = "inactive";
    } else if (webhook.failureCount >= FAILING_THRESHOLD) {
      webhook.status = "failing";
    }
  }

  /**
   * Find all deliveries due for retry and process them.
   * Returns the results of all retry attempts.
   */
  async retryFailedDeliveries(): Promise<WebhookDelivery[]> {
    const now = new Date().toISOString();
    const results: WebhookDelivery[] = [];

    for (const delivery of this.deliveries.values()) {
      if (
        delivery.status === "failed" &&
        delivery.nextRetry &&
        delivery.nextRetry <= now
      ) {
        const result = await this.attemptDelivery(delivery.id);
        if (result) results.push(result);
      }
    }

    return results;
  }

  // ── Delivery Queries ──────────────────────────────────────────────────

  /**
   * List deliveries for a specific webhook, optionally filtered by status.
   */
  getDeliveries(
    webhookId: string,
    options?: { status?: WebhookDelivery["status"]; limit?: number }
  ): WebhookDelivery[] {
    const results: WebhookDelivery[] = [];
    const limit = options?.limit ?? 50;

    for (const delivery of this.deliveries.values()) {
      if (delivery.webhookId !== webhookId) continue;
      if (options?.status && delivery.status !== options.status) continue;
      results.push({ ...delivery });
    }

    // Sort by creation date descending (newest first)
    results.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return results.slice(0, limit);
  }

  /**
   * Get a single delivery by ID.
   */
  getDelivery(deliveryId: string): WebhookDelivery | null {
    const delivery = this.deliveries.get(deliveryId);
    return delivery ? { ...delivery } : null;
  }

  // ── Event Publisher Integration ───────────────────────────────────────

  /**
   * Subscribe to the event publisher so webhooks fire automatically
   * for every published event. Call once at startup.
   */
  initEventSubscription(): () => void {
    if (this.initialized) {
      return () => {}; // Already subscribed
    }
    this.initialized = true;

    const unsubscribe = eventPublisher.subscribe((event) => {
      const deliveryIds = this.deliverEvent(
        event.type,
        event.data,
        event.businessId
      );

      // Fire-and-forget: attempt delivery asynchronously for each
      for (const id of deliveryIds) {
        this.attemptDelivery(id).catch(() => {
          // Delivery errors are recorded on the delivery itself
        });
      }
    });

    return () => {
      unsubscribe();
      this.initialized = false;
    };
  }

  // ── Diagnostics / Testing ─────────────────────────────────────────────

  /** Total registered webhooks */
  get webhookCount(): number {
    return this.webhooks.size;
  }

  /** Total delivery records */
  get deliveryCount(): number {
    return this.deliveries.size;
  }

  /** Clear all data. For testing only. */
  _reset(): void {
    this.webhooks.clear();
    this.deliveries.clear();
    this.initialized = false;
    webhookCounter = 0;
    deliveryCounter = 0;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const webhookStore = new WebhookStore();

// Auto-initialize event subscription so webhooks fire for all published events
webhookStore.initEventSubscription();
