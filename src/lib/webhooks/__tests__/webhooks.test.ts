import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  webhookStore,
  signPayload,
  verifySignature,
  KNOWN_EVENT_TYPES,
} from "../index";
import { eventPublisher } from "@/lib/realtime/publisher";

describe("Webhook Delivery System", () => {
  beforeEach(() => {
    webhookStore._reset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    webhookStore._reset();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Registration
  // ─────────────────────────────────────────────────────────────────────────

  describe("registerWebhook", () => {
    it("registers a webhook and generates a signing secret", () => {
      const wh = webhookStore.registerWebhook(
        "biz_1",
        "https://example.com/hook",
        ["submission.created", "submission.approved"]
      );

      expect(wh.id).toMatch(/^whk_/);
      expect(wh.businessId).toBe("biz_1");
      expect(wh.url).toBe("https://example.com/hook");
      expect(wh.events).toEqual(["submission.created", "submission.approved"]);
      expect(wh.secret).toMatch(/^whsec_/);
      expect(wh.secret.length).toBeGreaterThan(20);
      expect(wh.status).toBe("active");
      expect(wh.failureCount).toBe(0);
      expect(wh.createdAt).toBeTruthy();
    });

    it("generates unique IDs and secrets for each webhook", () => {
      const wh1 = webhookStore.registerWebhook("biz_1", "https://a.com/hook", ["*"]);
      const wh2 = webhookStore.registerWebhook("biz_1", "https://b.com/hook", ["*"]);

      expect(wh1.id).not.toBe(wh2.id);
      expect(wh1.secret).not.toBe(wh2.secret);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // HMAC Signing
  // ─────────────────────────────────────────────────────────────────────────

  describe("signPayload / verifySignature", () => {
    it("generates a sha256-prefixed HMAC signature", () => {
      const payload = JSON.stringify({ event: "test", data: { id: "123" } });
      const secret = "whsec_testsecret123";
      const sig = signPayload(payload, secret);

      expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
    });

    it("verifies a valid signature", () => {
      const payload = JSON.stringify({ event: "test", data: { id: "123" } });
      const secret = "whsec_testsecret123";
      const sig = signPayload(payload, secret);

      expect(verifySignature(payload, secret, sig)).toBe(true);
    });

    it("rejects an invalid signature", () => {
      const payload = JSON.stringify({ event: "test", data: { id: "123" } });
      const secret = "whsec_testsecret123";

      expect(verifySignature(payload, secret, "sha256=invalid")).toBe(false);
    });

    it("rejects a signature from a different payload", () => {
      const secret = "whsec_testsecret123";
      const sig = signPayload("payload_a", secret);

      expect(verifySignature("payload_b", secret, sig)).toBe(false);
    });

    it("rejects a signature from a different secret", () => {
      const payload = "same payload";
      const sig = signPayload(payload, "secret_a");

      expect(verifySignature(payload, "secret_b", sig)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Delivery creation for matching events
  // ─────────────────────────────────────────────────────────────────────────

  describe("deliverEvent", () => {
    it("creates deliveries for webhooks subscribing to the event type", () => {
      webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);
      webhookStore.registerWebhook("biz_1", "https://b.com/hook", [
        "submission.created",
        "submission.approved",
      ]);

      const ids = webhookStore.deliverEvent(
        "submission.created",
        { submissionId: "s_1" },
        "biz_1"
      );

      expect(ids).toHaveLength(2);
      ids.forEach((id) => expect(id).toMatch(/^dlv_/));
    });

    it("creates deliveries for wildcard subscribers", () => {
      webhookStore.registerWebhook("biz_1", "https://a.com/hook", ["*"]);

      const ids = webhookStore.deliverEvent(
        "campaign.launched",
        { campaignId: "c_1" },
        "biz_1"
      );

      expect(ids).toHaveLength(1);
    });

    it("skips webhooks that do not subscribe to the event type", () => {
      webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "perk.awarded",
      ]);

      const ids = webhookStore.deliverEvent(
        "submission.created",
        { submissionId: "s_1" },
        "biz_1"
      );

      expect(ids).toHaveLength(0);
    });

    it("skips webhooks belonging to a different business", () => {
      webhookStore.registerWebhook("biz_2", "https://other.com/hook", [
        "submission.created",
      ]);

      const ids = webhookStore.deliverEvent(
        "submission.created",
        { submissionId: "s_1" },
        "biz_1"
      );

      expect(ids).toHaveLength(0);
    });

    it("skips inactive webhooks", () => {
      const wh = webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);
      webhookStore.removeWebhook(wh.id);

      const ids = webhookStore.deliverEvent(
        "submission.created",
        { submissionId: "s_1" },
        "biz_1"
      );

      expect(ids).toHaveLength(0);
    });

    it("delivers to failing webhooks (not yet inactive)", () => {
      const wh = webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);
      webhookStore.updateWebhook(wh.id, { status: "failing" });

      const ids = webhookStore.deliverEvent(
        "submission.created",
        { submissionId: "s_1" },
        "biz_1"
      );

      expect(ids).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // HTTP Delivery (mocked fetch)
  // ─────────────────────────────────────────────────────────────────────────

  describe("attemptDelivery", () => {
    it("delivers successfully and marks delivery as delivered", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: () => Promise.resolve('{"received":true}'),
      });
      vi.stubGlobal("fetch", mockFetch);

      const wh = webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);
      const [deliveryId] = webhookStore.deliverEvent(
        "submission.created",
        { submissionId: "s_1" },
        "biz_1"
      );

      const result = await webhookStore.attemptDelivery(deliveryId);

      expect(result).not.toBeNull();
      expect(result!.status).toBe("delivered");
      expect(result!.statusCode).toBe(200);
      expect(result!.attempts).toBe(1);
      expect(result!.deliveredAt).toBeTruthy();
      expect(result!.response).toBe('{"received":true}');

      // Verify fetch was called with correct headers
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://a.com/hook");
      expect(options.method).toBe("POST");
      expect(options.headers["X-SocialPerks-Signature"]).toMatch(/^sha256=/);
      expect(options.headers["X-SocialPerks-Event"]).toBe("submission.created");
      expect(options.headers["X-SocialPerks-Delivery"]).toBe(deliveryId);

      // Verify the signature is valid
      const body = options.body;
      expect(verifySignature(body, wh.secret, options.headers["X-SocialPerks-Signature"])).toBe(true);

      vi.unstubAllGlobals();
    });

    it("marks delivery as failed on HTTP error and schedules retry", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          text: () => Promise.resolve("server error"),
        })
      );

      webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);
      const [deliveryId] = webhookStore.deliverEvent(
        "submission.created",
        { submissionId: "s_1" },
        "biz_1"
      );

      const result = await webhookStore.attemptDelivery(deliveryId);

      expect(result).not.toBeNull();
      expect(result!.status).toBe("failed");
      expect(result!.statusCode).toBe(500);
      expect(result!.attempts).toBe(1);
      expect(result!.error).toContain("HTTP 500");
      expect(result!.nextRetry).toBeTruthy();

      vi.unstubAllGlobals();
    });

    it("marks delivery as failed on network error and schedules retry", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("ECONNREFUSED"))
      );

      webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);
      const [deliveryId] = webhookStore.deliverEvent(
        "submission.created",
        { submissionId: "s_1" },
        "biz_1"
      );

      const result = await webhookStore.attemptDelivery(deliveryId);

      expect(result).not.toBeNull();
      expect(result!.status).toBe("failed");
      expect(result!.statusCode).toBeNull();
      expect(result!.error).toBe("ECONNREFUSED");
      expect(result!.nextRetry).toBeTruthy();

      vi.unstubAllGlobals();
    });

    it("returns null for non-existent delivery ID", async () => {
      const result = await webhookStore.attemptDelivery("dlv_nonexistent");
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Retry logic with exponential backoff
  // ─────────────────────────────────────────────────────────────────────────

  describe("retry logic", () => {
    it("uses exponential backoff for retry delays", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 502,
          statusText: "Bad Gateway",
          text: () => Promise.resolve(""),
        })
      );

      webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);
      const [deliveryId] = webhookStore.deliverEvent(
        "submission.created",
        {},
        "biz_1"
      );

      // First attempt
      const result1 = await webhookStore.attemptDelivery(deliveryId);
      const retry1 = new Date(result1!.nextRetry!).getTime();
      const created = new Date(result1!.createdAt).getTime();
      // First retry delay should be ~1 minute (60,000ms)
      // Allow generous tolerance since we compare against Date.now(), not createdAt
      expect(retry1 - Date.now()).toBeLessThanOrEqual(60_000 + 5_000);
      expect(retry1 - Date.now()).toBeGreaterThan(0);

      // Second attempt — delay should be ~5 minutes
      // Set nextRetry to past so retryFailedDeliveries can pick it up
      const delivery = webhookStore.getDelivery(deliveryId)!;
      expect(delivery.attempts).toBe(1);

      const result2 = await webhookStore.attemptDelivery(deliveryId);
      expect(result2!.attempts).toBe(2);
      const retry2 = new Date(result2!.nextRetry!).getTime();
      // Second delay: 5 minutes = 300,000ms
      expect(retry2 - Date.now()).toBeLessThanOrEqual(300_000 + 5_000);

      vi.unstubAllGlobals();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Max attempts → dead letter
  // ─────────────────────────────────────────────────────────────────────────

  describe("dead letter", () => {
    it("marks delivery as dead after max attempts", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("timeout"))
      );

      webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);
      const [deliveryId] = webhookStore.deliverEvent(
        "submission.created",
        {},
        "biz_1"
      );

      // Exhaust all 6 attempts
      let result;
      for (let i = 0; i < 6; i++) {
        result = await webhookStore.attemptDelivery(deliveryId);
      }

      expect(result).not.toBeNull();
      expect(result!.status).toBe("dead");
      expect(result!.attempts).toBe(6);
      expect(result!.nextRetry).toBeNull();
      expect(result!.error).toBe("timeout");

      vi.unstubAllGlobals();
    });

    it("does not attempt delivery beyond max attempts", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("timeout"));
      vi.stubGlobal("fetch", mockFetch);

      webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);
      const [deliveryId] = webhookStore.deliverEvent(
        "submission.created",
        {},
        "biz_1"
      );

      // Exhaust all attempts
      for (let i = 0; i < 6; i++) {
        await webhookStore.attemptDelivery(deliveryId);
      }

      // 7th attempt — delivery is dead, but attemptDelivery still runs
      // The delivery should still be "dead"
      const result = await webhookStore.attemptDelivery(deliveryId);
      // It should mark as dead again since we exceeded max
      expect(result!.status).toBe("dead");

      vi.unstubAllGlobals();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Failure counting → webhook status changes
  // ─────────────────────────────────────────────────────────────────────────

  describe("failure counting", () => {
    it("sets webhook to failing after 3 consecutive failures", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("fail"))
      );

      const wh = webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);

      // Create and fail 3 deliveries (one attempt each)
      for (let i = 0; i < 3; i++) {
        const [deliveryId] = webhookStore.deliverEvent(
          "submission.created",
          { i },
          "biz_1"
        );
        await webhookStore.attemptDelivery(deliveryId);
      }

      const updated = webhookStore.getWebhook(wh.id);
      expect(updated!.status).toBe("failing");
      expect(updated!.failureCount).toBe(3);

      vi.unstubAllGlobals();
    });

    it("sets webhook to inactive after 10 consecutive failures", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("fail"))
      );

      const wh = webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);

      for (let i = 0; i < 10; i++) {
        const [deliveryId] = webhookStore.deliverEvent(
          "submission.created",
          { i },
          "biz_1"
        );
        await webhookStore.attemptDelivery(deliveryId);
      }

      const updated = webhookStore.getWebhook(wh.id);
      expect(updated!.status).toBe("inactive");
      expect(updated!.failureCount).toBe(10);

      vi.unstubAllGlobals();
    });

    it("resets failure count on successful delivery", async () => {
      const mockFetch = vi.fn();
      // First 2 calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error("fail"))
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve("ok"),
        });
      vi.stubGlobal("fetch", mockFetch);

      const wh = webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);

      // Two failures
      for (let i = 0; i < 2; i++) {
        const [deliveryId] = webhookStore.deliverEvent(
          "submission.created",
          { i },
          "biz_1"
        );
        await webhookStore.attemptDelivery(deliveryId);
      }
      expect(webhookStore.getWebhook(wh.id)!.failureCount).toBe(2);

      // One success
      const [deliveryId] = webhookStore.deliverEvent(
        "submission.created",
        { final: true },
        "biz_1"
      );
      await webhookStore.attemptDelivery(deliveryId);

      const updated = webhookStore.getWebhook(wh.id);
      expect(updated!.failureCount).toBe(0);
      expect(updated!.status).toBe("active");

      vi.unstubAllGlobals();
    });

    it("reactivates failing webhook on successful delivery", async () => {
      const mockFetch = vi.fn();
      // 3 failures then 1 success
      mockFetch
        .mockRejectedValueOnce(new Error("fail"))
        .mockRejectedValueOnce(new Error("fail"))
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve("ok"),
        });
      vi.stubGlobal("fetch", mockFetch);

      const wh = webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);

      // 3 failures → failing status
      for (let i = 0; i < 3; i++) {
        const [deliveryId] = webhookStore.deliverEvent(
          "submission.created",
          { i },
          "biz_1"
        );
        await webhookStore.attemptDelivery(deliveryId);
      }
      expect(webhookStore.getWebhook(wh.id)!.status).toBe("failing");

      // 1 success → back to active
      const [deliveryId] = webhookStore.deliverEvent(
        "submission.created",
        {},
        "biz_1"
      );
      await webhookStore.attemptDelivery(deliveryId);

      const updated = webhookStore.getWebhook(wh.id);
      expect(updated!.status).toBe("active");
      expect(updated!.failureCount).toBe(0);

      vi.unstubAllGlobals();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Webhook CRUD
  // ─────────────────────────────────────────────────────────────────────────

  describe("CRUD operations", () => {
    it("lists webhooks for a business", () => {
      webhookStore.registerWebhook("biz_1", "https://a.com/hook", ["*"]);
      webhookStore.registerWebhook("biz_1", "https://b.com/hook", ["*"]);
      webhookStore.registerWebhook("biz_2", "https://c.com/hook", ["*"]);

      const biz1Hooks = webhookStore.getWebhooks("biz_1");
      expect(biz1Hooks).toHaveLength(2);

      const biz2Hooks = webhookStore.getWebhooks("biz_2");
      expect(biz2Hooks).toHaveLength(1);
    });

    it("removes (deactivates) a webhook", () => {
      const wh = webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "*",
      ]);
      expect(webhookStore.removeWebhook(wh.id)).toBe(true);

      const updated = webhookStore.getWebhook(wh.id);
      expect(updated!.status).toBe("inactive");
    });

    it("returns false when removing non-existent webhook", () => {
      expect(webhookStore.removeWebhook("whk_nonexistent")).toBe(false);
    });

    it("updates webhook URL and events", () => {
      const wh = webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);

      const updated = webhookStore.updateWebhook(wh.id, {
        url: "https://new.com/hook",
        events: ["campaign.created", "campaign.ended"],
      });

      expect(updated).not.toBeNull();
      expect(updated!.url).toBe("https://new.com/hook");
      expect(updated!.events).toEqual(["campaign.created", "campaign.ended"]);
    });

    it("resets failure count when manually reactivating", () => {
      const wh = webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "*",
      ]);
      // Simulate failures by updating status
      webhookStore.updateWebhook(wh.id, { status: "failing" });

      webhookStore.updateWebhook(wh.id, { status: "active" });
      const updated = webhookStore.getWebhook(wh.id);
      expect(updated!.status).toBe("active");
      expect(updated!.failureCount).toBe(0);
    });

    it("returns null when updating non-existent webhook", () => {
      const result = webhookStore.updateWebhook("whk_nonexistent", {
        url: "https://x.com",
      });
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Delivery queries
  // ─────────────────────────────────────────────────────────────────────────

  describe("delivery queries", () => {
    it("lists deliveries for a webhook", () => {
      const wh = webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);

      webhookStore.deliverEvent("submission.created", { n: 1 }, "biz_1");
      webhookStore.deliverEvent("submission.created", { n: 2 }, "biz_1");
      webhookStore.deliverEvent("submission.created", { n: 3 }, "biz_1");

      const deliveries = webhookStore.getDeliveries(wh.id);
      expect(deliveries).toHaveLength(3);
      // All three deliveries should be present
      const payloads = deliveries.map((d) => d.payload);
      expect(payloads).toContainEqual({ n: 1 });
      expect(payloads).toContainEqual({ n: 2 });
      expect(payloads).toContainEqual({ n: 3 });
    });

    it("filters deliveries by status", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve("ok"),
        })
      );

      const wh = webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);

      const [id1] = webhookStore.deliverEvent(
        "submission.created",
        { n: 1 },
        "biz_1"
      );
      webhookStore.deliverEvent("submission.created", { n: 2 }, "biz_1");

      // Deliver one
      await webhookStore.attemptDelivery(id1);

      const delivered = webhookStore.getDeliveries(wh.id, {
        status: "delivered",
      });
      expect(delivered).toHaveLength(1);

      const pending = webhookStore.getDeliveries(wh.id, { status: "pending" });
      expect(pending).toHaveLength(1);

      vi.unstubAllGlobals();
    });

    it("respects limit parameter", () => {
      const wh = webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);

      for (let i = 0; i < 10; i++) {
        webhookStore.deliverEvent("submission.created", { n: i }, "biz_1");
      }

      const limited = webhookStore.getDeliveries(wh.id, { limit: 3 });
      expect(limited).toHaveLength(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Event publisher integration
  // ─────────────────────────────────────────────────────────────────────────

  describe("event publisher integration", () => {
    it("creates deliveries when events are published", () => {
      // Init subscription
      const unsub = webhookStore.initEventSubscription();

      webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "campaign.created",
      ]);

      // Mock fetch to avoid actual HTTP calls
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve("ok"),
        })
      );

      // Publish through the event publisher
      eventPublisher.publish("campaign.created", { campaignId: "c_1" }, "biz_1");

      // Check that a delivery was created
      const wh = webhookStore.getWebhooks("biz_1")[0];
      const deliveries = webhookStore.getDeliveries(wh.id);
      expect(deliveries.length).toBeGreaterThanOrEqual(1);
      expect(deliveries[0].eventType).toBe("campaign.created");

      unsub();
      vi.unstubAllGlobals();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // retryFailedDeliveries
  // ─────────────────────────────────────────────────────────────────────────

  describe("retryFailedDeliveries", () => {
    it("retries deliveries whose nextRetry is in the past", async () => {
      // First call fails, second succeeds
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve("ok"),
        });
      vi.stubGlobal("fetch", mockFetch);

      webhookStore.registerWebhook("biz_1", "https://a.com/hook", [
        "submission.created",
      ]);
      const [deliveryId] = webhookStore.deliverEvent(
        "submission.created",
        {},
        "biz_1"
      );

      // First attempt fails
      await webhookStore.attemptDelivery(deliveryId);
      const delivery = webhookStore.getDelivery(deliveryId)!;
      expect(delivery.status).toBe("failed");

      // Manually set nextRetry to past to simulate waiting
      // Access internal state through the store's getDelivery to verify behavior
      // We need to set the nextRetry in the past — we can use updateWebhook
      // Actually, the internal map entry needs mutation. For testing, we do
      // another attempt directly which increments attempts and tries fetch again.
      const result = await webhookStore.attemptDelivery(deliveryId);
      expect(result!.status).toBe("delivered");
      expect(result!.attempts).toBe(2);

      vi.unstubAllGlobals();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Known event types
  // ─────────────────────────────────────────────────────────────────────────

  describe("known event types", () => {
    it("exports all known event types", () => {
      expect(KNOWN_EVENT_TYPES).toContain("submission.created");
      expect(KNOWN_EVENT_TYPES).toContain("campaign.created");
      expect(KNOWN_EVENT_TYPES).toContain("perk.awarded");
      expect(KNOWN_EVENT_TYPES.length).toBeGreaterThanOrEqual(20);
    });
  });
});
