/**
 * Pay → Provision: the revenue-critical webhook + a regression guard.
 *
 * The single most important code path in the product is "a paid Stripe event
 * grants the buyer their plan." It had ZERO tests, and the exact bug that broke
 * it (PR #112: static buy.stripe.com Payment Links that carry no businessId, so
 * the webhook drops the event and the customer is charged but never upgraded —
 * "took money, gave nothing") had no regression guard. This file locks both in.
 *
 * Runs against the webhook's test-mode path (no STRIPE_WEBHOOK_SECRET ⇒ JSON is
 * parsed directly; a `stripe-signature: t=<now>` header satisfies replay
 * protection) and the durable in-memory subscription store.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { POST } from "../webhook/route";
import { subscriptions } from "@/lib/billing/store";
import { getBusinessPlan } from "@/lib/billing/enforcement";

// ─── Helpers ──────────────────────────────────────────────────────────────

function webhookReq(event: unknown): NextRequest {
  const t = Math.floor(Date.now() / 1000); // current ⇒ inside the 5-min replay window
  return new NextRequest("http://localhost/api/v1/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": `t=${t},v1=test`, "content-type": "application/json" },
    body: JSON.stringify(event),
  });
}

function checkoutCompleted(opts: {
  eventId: string;
  subscriptionId: string;
  businessId?: string;
  plan?: string;
  billingPeriod?: string;
}): unknown {
  const metadata: Record<string, string> = {};
  if (opts.businessId !== undefined) metadata.businessId = opts.businessId;
  if (opts.plan !== undefined) metadata.plan = opts.plan;
  if (opts.billingPeriod !== undefined) metadata.billingPeriod = opts.billingPeriod;
  return {
    id: opts.eventId,
    type: "checkout.session.completed",
    data: { object: { customer: "cus_test", subscription: opts.subscriptionId, metadata } },
  };
}

// ─── The revenue path ───────────────────────────────────────────────────────

describe("POST /api/v1/billing/webhook — pay → provision", () => {
  beforeEach(() => subscriptions.clear());

  it("provisions a paid subscription when the session carries businessId metadata", async () => {
    const subId = "sub_provision_ok";
    const bizId = "biz_provision_ok";

    const res = await POST(
      webhookReq(
        checkoutCompleted({
          eventId: "evt_provision_ok",
          subscriptionId: subId,
          businessId: bizId,
          plan: "professional",
          billingPeriod: "monthly",
        }),
      ),
    );

    expect(res.status).toBe(200);
    // Entitlement actually granted, durably (write-through cache populated).
    expect(subscriptions.has(subId)).toBe(true);
    expect(subscriptions.get(subId)?.businessId).toBe(bizId);
    expect(subscriptions.get(subId)?.status).toBe("active");
    expect(getBusinessPlan(bizId)).toBe("professional");
  });

  it("does NOT grant entitlement when businessId is absent (took-money-gave-nothing guard)", async () => {
    const subId = "sub_no_business";

    const res = await POST(
      webhookReq(
        checkoutCompleted({
          eventId: "evt_no_business",
          subscriptionId: subId,
          plan: "professional", // metadata present but NO businessId
        }),
      ),
    );

    // The webhook acknowledges the event (so Stripe doesn't infinitely retry)…
    expect(res.status).toBe(200);
    // …but it must NOT mint a subscription it can't attribute to an account.
    // This is the invariant that the static-Payment-Link CTA violated: a real
    // session with no businessId would otherwise create an orphan/charge with
    // no entitlement. We assert nothing was provisioned.
    expect(subscriptions.has(subId)).toBe(false);
  });

  it("is idempotent — a duplicated event does not double-provision", async () => {
    const subId = "sub_idem";
    const bizId = "biz_idem";
    const event = checkoutCompleted({
      eventId: "evt_idem",
      subscriptionId: subId,
      businessId: bizId,
      plan: "starter",
    });

    const first = await POST(webhookReq(event));
    const second = await POST(webhookReq(event));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(subscriptions.has(subId)).toBe(true);
    // Still exactly one subscription for this business.
    const mine = [...subscriptions.values()].filter((s) => s.businessId === bizId);
    expect(mine).toHaveLength(1);
  });
});

// ─── Lifecycle: cancellation / payment failure must REVOKE entitlement ───────

describe("POST /api/v1/billing/webhook — lifecycle revokes entitlement", () => {
  beforeEach(() => subscriptions.clear());

  async function provision(subId: string, bizId: string, plan = "professional") {
    await POST(
      webhookReq(checkoutCompleted({ eventId: "evt_seed_" + subId, subscriptionId: subId, businessId: bizId, plan })),
    );
  }

  it("customer.subscription.deleted flips the sub to canceled and revokes the plan", async () => {
    const subId = "sub_cancel";
    const bizId = "biz_cancel";
    await provision(subId, bizId);
    expect(getBusinessPlan(bizId)).toBe("professional");

    const res = await POST(
      webhookReq({ id: "evt_cancel", type: "customer.subscription.deleted", data: { object: { id: subId } } }),
    );
    expect(res.status).toBe(200);
    expect(subscriptions.get(subId)?.status).toBe("canceled");
    expect(getBusinessPlan(bizId)).toBe("free"); // entitlement revoked
  });

  it("invoice.payment_failed marks past_due and revokes the plan", async () => {
    const subId = "sub_pastdue";
    const bizId = "biz_pastdue";
    await provision(subId, bizId);

    const res = await POST(
      webhookReq({ id: "evt_pastdue", type: "invoice.payment_failed", data: { object: { subscription: subId } } }),
    );
    expect(res.status).toBe(200);
    expect(subscriptions.get(subId)?.status).toBe("past_due");
    expect(getBusinessPlan(bizId)).toBe("free");
  });

  it("a lifecycle event for an unknown subscription is acked without crashing (cold-instance safe)", async () => {
    const res = await POST(
      webhookReq({ id: "evt_unknown_cancel", type: "customer.subscription.deleted", data: { object: { id: "sub_never_seen" } } }),
    );
    expect(res.status).toBe(200);
    expect(subscriptions.has("sub_never_seen")).toBe(false);
  });
});

// ─── Regression guard: never reintroduce static Payment Links ────────────────

describe("Pay → Provision regression guard", () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
    }
    return out;
  }

  it("contains no static Stripe Payment Links anywhere in src/ (the #112 bug)", () => {
    const srcDir = join(process.cwd(), "src");
    const offenders = walk(srcDir).filter((f) => /buy\.stripe\.com|PAYMENT_LINKS/.test(readFileSync(f, "utf8")));
    expect(
      offenders,
      `Static Stripe Payment Links reintroduced — these carry no businessId, so the webhook ` +
        `cannot provision the account (money in, nothing granted). Route paid CTAs through ` +
        `signup → create_checkout instead.\nOffending files:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("routes paid pricing CTAs through the signup → create_checkout path", () => {
    const pricing = readFileSync(
      join(process.cwd(), "src/components/landing/pricing-section.tsx"),
      "utf8",
    );
    // The provisioning-safe path: signup carries plan intent → create_checkout
    // attaches businessId → webhook provisions.
    expect(pricing).toContain("#signup?plan=");
    expect(pricing).not.toContain("buy.stripe.com");
  });
});
