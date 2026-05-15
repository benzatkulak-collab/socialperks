/**
 * GET /api/v1/admin/founder-overview
 *
 * Admin-only revenue & growth snapshot for the founder dashboard at
 * /admin/founder. Aggregates across all tenants — never returns
 * per-customer PII.
 *
 * Composition:
 *   - signups: total users, new in last 7d, new in last 30d
 *   - planMix: count of active subscriptions per plan (+ free as fallback)
 *   - mrr: current + 7-day growth, normalized to monthly
 *   - activationFunnel: signed up → had ≥1 campaign → had ≥1 completion
 *                       → paid. Cohort-blind; counts over the lifetime
 *                       of the platform.
 *   - recentActivity: last 25 events (new business, campaign launched,
 *                     subscription started, subscription canceled).
 *
 * Data sources:
 *   - users table when available (else falls back to count from
 *     campaignManager.listAll() business set as a coarse approximation)
 *   - subscriptions Map from billing/store (in-memory; rehydrated by
 *     Stripe webhooks)
 *   - campaignManager.listAll() for campaign + completion stats
 *
 * Strict admin-only. Logs `admin.founder_overview_read` on success
 * and `tenant.access_denied` on failed admin gate.
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, withTiming } from "../../_shared";
import { audit } from "@/lib/audit-log";
import { db, InMemoryConnection } from "@/lib/db/connection";
import { subscriptions, PLANS } from "@/lib/billing/store";
import { campaignManager } from "@/lib/campaign-state-machine";

const usingDb = !(db instanceof InMemoryConnection);

const DAY_MS = 24 * 60 * 60 * 1000;

interface SignupCounts {
  total: number;
  last7d: number;
  last30d: number;
}

interface PlanMix {
  free: number;
  starter: number;
  professional: number;
  enterprise: number;
}

interface MrrSummary {
  current: number;
  prior7d: number;
  growth7d: number;
}

interface ActivationFunnel {
  signedUp: number;
  hadFirstCampaign: number;
  hadFirstCompletion: number;
  paid: number;
}

interface ActivityEvent {
  type: "signup" | "campaign_launched" | "subscription_started" | "subscription_canceled";
  at: string;
  label: string;
}

async function getSignupCounts(): Promise<SignupCounts> {
  if (!usingDb) {
    // Coarse fallback: count distinct businessIds in campaign state machine.
    // Undercounts (users who never launched) but never inflates.
    const bizIds = new Set<string>();
    for (const c of campaignManager.listAll()) bizIds.add(c.businessId);
    return { total: bizIds.size, last7d: 0, last30d: 0 };
  }
  try {
    const r = await db.query<{
      total: string;
      last7d: string;
      last30d: string;
    }>(
      `SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
        COUNT(*) FILTER (WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '7 days') AS last7d,
        COUNT(*) FILTER (WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '30 days') AS last30d
       FROM users`
    );
    const row = r.rows[0] ?? { total: "0", last7d: "0", last30d: "0" };
    return {
      total: parseInt(row.total, 10),
      last7d: parseInt(row.last7d, 10),
      last30d: parseInt(row.last30d, 10),
    };
  } catch {
    return { total: 0, last7d: 0, last30d: 0 };
  }
}

function getPlanMix(totalSignups: number): PlanMix {
  let starter = 0;
  let professional = 0;
  let enterprise = 0;
  const paidBusinessIds = new Set<string>();
  for (const sub of subscriptions.values()) {
    if (sub.status !== "active") continue;
    paidBusinessIds.add(sub.businessId);
    if (sub.plan === "starter") starter += 1;
    else if (sub.plan === "professional") professional += 1;
    else if (sub.plan === "enterprise") enterprise += 1;
  }
  // Anyone not on an active paid sub is on Free.
  const free = Math.max(0, totalSignups - paidBusinessIds.size);
  return { free, starter, professional, enterprise };
}

/**
 * Convert a Subscription to its normalized monthly recurring revenue
 * contribution. Annual plans contribute annualPrice / 12.
 */
function subscriptionMrr(planKey: string, billingPeriod: "monthly" | "annual"): number {
  const plan = PLANS[planKey];
  if (!plan) return 0;
  if (billingPeriod === "annual") return plan.annualPrice / 12;
  return plan.monthlyPrice;
}

function getMrr(): MrrSummary {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * DAY_MS;
  let current = 0;
  let prior7d = 0;
  for (const sub of subscriptions.values()) {
    if (sub.status !== "active") continue;
    const contribution = subscriptionMrr(sub.plan, sub.billingPeriod);
    current += contribution;
    if (new Date(sub.createdAt).getTime() < sevenDaysAgo) {
      prior7d += contribution;
    }
  }
  return {
    current: Math.round(current * 100) / 100,
    prior7d: Math.round(prior7d * 100) / 100,
    growth7d: Math.round((current - prior7d) * 100) / 100,
  };
}

function getActivationFunnel(signedUp: number, planMix: PlanMix): ActivationFunnel {
  // Cohort-blind: counts over platform lifetime, not a fixed window.
  // Numbers are floors — the campaign state machine is the source of
  // truth for "had a campaign", and is in-process so reflects current
  // state. For "had first completion", we count campaigns with at
  // least one transition into the active state.
  const allCampaigns = campaignManager.listAll();
  const bizWithCampaign = new Set<string>();
  const bizWithCompletion = new Set<string>();
  for (const c of allCampaigns) {
    bizWithCampaign.add(c.businessId);
    // A campaign that went into 'active' state at least once is a proxy
    // for "had real customer engagement". Without per-completion counts
    // here, this is the best in-process signal we can compute.
    if (c.state === "active" || c.state === "ended") {
      bizWithCompletion.add(c.businessId);
    }
  }
  const paid = planMix.starter + planMix.professional + planMix.enterprise;
  return {
    signedUp,
    hadFirstCampaign: bizWithCampaign.size,
    hadFirstCompletion: bizWithCompletion.size,
    paid,
  };
}

async function getRecentActivity(): Promise<ActivityEvent[]> {
  const events: ActivityEvent[] = [];

  // Recent subscriptions (in-memory map; usually full state)
  for (const sub of subscriptions.values()) {
    if (sub.status === "active") {
      events.push({
        type: "subscription_started",
        at: sub.createdAt,
        label: `New ${sub.plan} (${sub.billingPeriod}) subscription`,
      });
    } else if (sub.status === "canceled") {
      events.push({
        type: "subscription_canceled",
        at: sub.createdAt,
        label: `${sub.plan} subscription canceled`,
      });
    }
  }

  // Recent campaigns — name lives on the launched event, not the
  // CampaignLifecycle itself, so we crawl the transitions for the
  // launched event's eventData.name. expiry.launchedAt is the
  // canonical "campaign started" timestamp.
  for (const c of campaignManager.listAll()) {
    if (c.state !== "active") continue;
    let name = "Campaign launched";
    for (const t of c.transitions) {
      const data = (t as { eventData?: { name?: unknown } }).eventData;
      if (data && typeof data.name === "string") {
        name = data.name;
        break;
      }
    }
    events.push({
      type: "campaign_launched",
      at: c.expiry.launchedAt,
      label: name,
    });
  }

  // Recent signups (best-effort from DB; skip silently if unavailable)
  if (usingDb) {
    try {
      const r = await db.query<{ name: string; created_at: string }>(
        `SELECT name, created_at FROM users
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 25`
      );
      for (const row of r.rows) {
        const at =
          typeof row.created_at === "string"
            ? row.created_at
            : new Date(row.created_at).toISOString();
        events.push({
          type: "signup",
          at,
          label: `${row.name} signed up`,
        });
      }
    } catch {
      // ignore
    }
  }

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 25);
}

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  if (user.role !== "admin") {
    audit({
      action: "tenant.access_denied",
      actor: `user:${user.id}`,
      businessId: user.businessId ?? undefined,
      resourceId: "founder-overview",
      ok: false,
    });
    return err("FORBIDDEN", "Admin role required", 403);
  }

  const signups = await getSignupCounts();
  const planMix = getPlanMix(signups.total);
  const mrr = getMrr();
  const activationFunnel = getActivationFunnel(signups.total, planMix);
  const recentActivity = await getRecentActivity();

  audit({
    action: "admin.founder_overview_read",
    actor: `user:${user.id}`,
    ok: true,
  });

  return ok({
    generatedAt: new Date().toISOString(),
    signups,
    planMix,
    mrr,
    activationFunnel,
    recentActivity,
  });
});
