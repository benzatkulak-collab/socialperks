/**
 * Drip Email API Route -- /api/v1/drip
 *
 * POST: Trigger drip email check (designed for cron / scheduler).
 *       Requires auth (Bearer token) or internal API key.
 * GET:  Return drip sequence status (how many users at each stage).
 */

import type { NextRequest } from "next/server";
import { ok, err, getUser, rateLimit, withTiming } from "../_shared";
import { emailProvider } from "@/lib/email";
import {
  getDueEmails,
  markSent,
  hasSent,
  businessSequence,
  influencerSequence,
  type DripUser,
} from "@/lib/email/drip";
import { db, InMemoryConnection } from "@/lib/db/connection";
import { campaignManager } from "@/lib/campaign-state-machine";
import { getBusinessPlan } from "@/lib/billing/enforcement";

// -- Internal API Key Check ---------------------------------------------------

const INTERNAL_API_KEY = process.env.DRIP_API_KEY || process.env.INTERNAL_API_KEY;

function isAuthorized(req: NextRequest): boolean {
  // Check for internal API key in header
  const apiKey = req.headers.get("x-api-key");
  if (INTERNAL_API_KEY && apiKey === INTERNAL_API_KEY) {
    return true;
  }

  // Check for authenticated user
  const user = getUser(req);
  return user !== null;
}

// -- User Store Access --------------------------------------------------------
// In production this would query the database. For now we use a simple
// interface that the caller can populate. The POST handler builds DripUser
// objects from whatever user store is available.

/**
 * Build DripUser objects.
 *
 * Production path (when Postgres is wired up): query the users table for
 * real accounts and derive the `hasCampaigns` / `plan` flags from the
 * campaign state machine and billing subscriptions. `signupDate` comes
 * from `users.created_at` so day-1/3/7/14 emails fire on real elapsed
 * time, not on "right now" — which is what the seed fallback used to
 * do, effectively breaking the entire drip sequence in production.
 *
 * Fallback path (no DB / InMemoryConnection): seed data, useful in dev
 * and as a smoke test. Real production deployments will skip this
 * branch entirely once DATABASE_URL is set.
 */
async function fetchDripUsers(): Promise<DripUser[]> {
  const usingDb = !(db instanceof InMemoryConnection);

  if (usingDb) {
    try {
      const result = await db.query<{
        id: string;
        email: string;
        name: string;
        role: string;
        business_id: string | null;
        influencer_id: string | null;
        created_at: Date | string;
      }>(
        `SELECT id, email, name, role, business_id, influencer_id, created_at
         FROM users
         WHERE deleted_at IS NULL
           AND email_verified = true
           AND created_at >= NOW() - INTERVAL '60 days'`
      );

      const users: DripUser[] = [];
      for (const row of result.rows) {
        const role: "business" | "influencer" =
          row.influencer_id ? "influencer" : "business";

        // hasCampaigns + plan derive from in-process state. These are
        // best-effort: if the campaign manager or subscription cache is
        // cold for a given business, hasCampaigns reports false and the
        // user falls into the "didn't launch yet" branch — which is
        // exactly the user we most want to email anyway.
        const businessId = row.business_id ?? "";
        const campaignCount = businessId
          ? campaignManager.listByBusiness(businessId).length
          : 0;
        const plan = businessId ? getBusinessPlan(businessId) : "free";

        users.push({
          id: row.id,
          email: row.email,
          name: row.name,
          role,
          signupDate:
            row.created_at instanceof Date
              ? row.created_at.toISOString()
              : new Date(row.created_at).toISOString(),
          hasCampaigns: campaignCount > 0,
          campaignCount,
          plan,
        });
      }
      return users;
    } catch (e) {
      // If the query fails we'd rather fail-soft to seed than 500 the
      // drip endpoint. Log loudly so the operator notices.
      console.error("[drip] DB query failed, falling back to seed:", e);
    }
  }

  // Fallback: seed data (dev / smoke-test path).
  const { createSeedData } = await import("@social-perks/shared/seed");
  const seed = createSeedData();
  const users: DripUser[] = [];

  // Count campaigns per business from seed data
  const campaignsByBusiness = new Map<string, number>();
  for (const c of seed.campaigns) {
    const bizId = (c as { businessId?: string }).businessId;
    if (bizId) {
      campaignsByBusiness.set(bizId, (campaignsByBusiness.get(bizId) ?? 0) + 1);
    }
  }

  for (const biz of seed.businesses) {
    const count = campaignsByBusiness.get(biz.id) ?? 0;
    users.push({
      id: biz.id,
      email: biz.email,
      name: biz.name,
      role: "business",
      businessType: biz.industry,
      // Seed users get a fixed historical signupDate so the drip can
      // actually fire in dev. Using "now" here was the bug that made
      // the entire drip dead in production — every user stayed at day 0.
      signupDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      hasCampaigns: count > 0,
      campaignCount: count,
      plan: "free",
    });
  }

  for (const inf of seed.influencers) {
    users.push({
      id: inf.id,
      email: inf.email,
      name: inf.displayName,
      role: "influencer",
      signupDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      hasCampaigns: false,
      campaignCount: 0,
      plan: "free",
    });
  }

  return users;
}

// -- POST /api/v1/drip -- Trigger Drip Check ----------------------------------

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  if (!isAuthorized(req)) {
    return err("UNAUTHORIZED", "Authentication or API key required", 401);
  }

  const users = await fetchDripUsers();
  const dueEmails = getDueEmails(users);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const { user, step, stepIndex } of dueEmails) {
    const template = step.templateFn(user);

    // Strip HTML tags for plain-text fallback
    const text = template.html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const result = await emailProvider.send({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text,
    });

    if (result.success) {
      markSent(user.id, stepIndex);
      sent++;
    } else {
      failed++;
      errors.push(`${user.email}: ${result.error ?? "unknown error"}`);
    }
  }

  return ok({
    processed: dueEmails.length,
    sent,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  });
});

// -- GET /api/v1/drip -- Drip Status ------------------------------------------

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  if (!isAuthorized(req)) {
    return err("UNAUTHORIZED", "Authentication or API key required", 401);
  }

  const users = await fetchDripUsers();

  // Count users at each stage for each sequence
  const businessUsers = users.filter((u) => u.role === "business");
  const influencerUsers = users.filter((u) => u.role === "influencer");

  const businessStages = businessSequence.map((step, i) => {
    const sentCount = businessUsers.filter((u) => hasSent(u.id, i)).length;
    const pendingCount = businessUsers.filter(
      (u) => !hasSent(u.id, i) && (!step.condition || step.condition(u))
    ).length;
    return {
      stepIndex: i,
      delayDays: step.delayDays,
      sent: sentCount,
      pending: pendingCount,
    };
  });

  const influencerStages = influencerSequence.map((step, i) => {
    const sentCount = influencerUsers.filter((u) => hasSent(u.id, i)).length;
    const pendingCount = influencerUsers.filter(
      (u) => !hasSent(u.id, i) && (!step.condition || step.condition(u))
    ).length;
    return {
      stepIndex: i,
      delayDays: step.delayDays,
      sent: sentCount,
      pending: pendingCount,
    };
  });

  return ok({
    totalUsers: users.length,
    business: {
      total: businessUsers.length,
      stages: businessStages,
    },
    influencer: {
      total: influencerUsers.length,
      stages: influencerStages,
    },
  });
});
