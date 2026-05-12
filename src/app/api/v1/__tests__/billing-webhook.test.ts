/**
 * Integration tests for POST /api/v1/billing/webhook
 *
 * In mock mode (no STRIPE_WEBHOOK_SECRET) the route still requires the
 * Stripe-Signature header, parses the JSON body, enforces replay
 * protection, and dispatches on event type.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000, limit: 100 }),
  rateLimitHeaders: () => ({}),
}));

import { POST } from "../billing/webhook/route";
import { subscriptions } from "@/lib/billing/store";
import { createRequest, parseResponse } from "./helpers";

function sigHeader(timestampSec = Math.floor(Date.now() / 1000)): Record<string, string> {
  return { "stripe-signature": `t=${timestampSec},v1=mocksig` };
}

describe("Billing Webhook API", () => {
  it("POST /billing/webhook — missing Stripe-Signature returns 401", async () => {
    const res = await POST(
      createRequest("/api/v1/billing/webhook", {
        method: "POST",
        body: { id: "evt_test_1", type: "checkout.session.completed" },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(401);
    expect(data.error.code).toBe("MISSING_SIGNATURE");
  });

  it("POST /billing/webhook — missing event type returns 400", async () => {
    const res = await POST(
      createRequest("/api/v1/billing/webhook", {
        method: "POST",
        body: { id: `evt_no_type_${Date.now()}` },
        headers: sigHeader(),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.error.code).toBe("MISSING_EVENT_TYPE");
  });

  it("POST /billing/webhook — stale timestamp triggers replay protection (400)", async () => {
    // 10 minutes ago — outside the 5-minute window
    const stale = Math.floor(Date.now() / 1000) - 10 * 60;
    const res = await POST(
      createRequest("/api/v1/billing/webhook", {
        method: "POST",
        body: { id: `evt_stale_${Date.now()}`, type: "checkout.session.completed" },
        headers: sigHeader(stale),
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(400);
    expect(data.error.code).toBe("REPLAY_DETECTED");
  });

  it("POST /billing/webhook — checkout.session.completed creates a subscription and upgrades the plan", async () => {
    const businessId = `biz_test_${Date.now()}`;
    const subscriptionId = `sub_test_${Date.now()}`;
    const eventId = `evt_checkout_${Date.now()}`;

    const res = await POST(
      createRequest("/api/v1/billing/webhook", {
        method: "POST",
        headers: sigHeader(),
        body: {
          id: eventId,
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test_1",
              customer: "cus_test_1",
              subscription: subscriptionId,
              metadata: {
                businessId,
                plan: "pro",
                billingPeriod: "monthly",
              },
            },
          },
        },
      })
    );
    const data = await parseResponse(res);

    expect(data.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.received).toBe(true);

    const created = subscriptions.get(subscriptionId);
    expect(created).toBeDefined();
    expect(created?.businessId).toBe(businessId);
    expect(created?.plan).toBe("pro");
    expect(created?.status).toBe("active");
  });

  it("POST /billing/webhook — duplicate event id is treated idempotently", async () => {
    const eventId = `evt_dup_${Date.now()}`;
    const subscriptionId = `sub_dup_${Date.now()}`;
    const body = {
      id: eventId,
      type: "checkout.session.completed",
      data: {
        object: {
          subscription: subscriptionId,
          metadata: { businessId: `biz_${Date.now()}`, plan: "pro" },
        },
      },
    };

    const first = await POST(
      createRequest("/api/v1/billing/webhook", { method: "POST", headers: sigHeader(), body })
    );
    expect(first.status).toBe(200);

    const second = await POST(
      createRequest("/api/v1/billing/webhook", { method: "POST", headers: sigHeader(), body })
    );
    const data = await parseResponse(second);

    expect(data.status).toBe(200);
    expect(data.data.received).toBe(true);
    expect(data.data.duplicate).toBe(true);
  });

  it("POST /billing/webhook — customer.subscription.updated mutates status", async () => {
    const subscriptionId = `sub_upd_${Date.now()}`;

    // Seed
    await POST(
      createRequest("/api/v1/billing/webhook", {
        method: "POST",
        headers: sigHeader(),
        body: {
          id: `evt_seed_${Date.now()}`,
          type: "checkout.session.completed",
          data: {
            object: {
              subscription: subscriptionId,
              metadata: { businessId: `biz_${Date.now()}`, plan: "pro" },
            },
          },
        },
      })
    );

    // Update
    const res = await POST(
      createRequest("/api/v1/billing/webhook", {
        method: "POST",
        headers: sigHeader(),
        body: {
          id: `evt_upd_${Date.now()}`,
          type: "customer.subscription.updated",
          data: {
            object: { id: subscriptionId, status: "past_due", cancel_at_period_end: true },
          },
        },
      })
    );

    expect(res.status).toBe(200);
    const updated = subscriptions.get(subscriptionId);
    expect(updated?.status).toBe("past_due");
    expect(updated?.cancelAtPeriodEnd).toBe(true);
  });

  it("POST /billing/webhook — invoice.payment_failed marks subscription past_due", async () => {
    const subscriptionId = `sub_failed_${Date.now()}`;

    await POST(
      createRequest("/api/v1/billing/webhook", {
        method: "POST",
        headers: sigHeader(),
        body: {
          id: `evt_seed2_${Date.now()}`,
          type: "checkout.session.completed",
          data: {
            object: {
              subscription: subscriptionId,
              metadata: { businessId: `biz_${Date.now()}`, plan: "pro" },
            },
          },
        },
      })
    );

    const res = await POST(
      createRequest("/api/v1/billing/webhook", {
        method: "POST",
        headers: sigHeader(),
        body: {
          id: `evt_fail_${Date.now()}`,
          type: "invoice.payment_failed",
          data: { object: { subscription: subscriptionId } },
        },
      })
    );

    expect(res.status).toBe(200);
    expect(subscriptions.get(subscriptionId)?.status).toBe("past_due");
  });
});
