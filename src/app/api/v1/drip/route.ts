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
 * Build DripUser objects from the in-memory auth store.
 * In production, this would be a database query.
 */
async function fetchDripUsers(): Promise<DripUser[]> {
  // Dynamic import to avoid circular dependency with auth module.
  // The auth route's user map isn't exported, so we query the seed data
  // as a stand-in. In production this would be a DB query.
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
      signupDate: new Date().toISOString(), // In production: from DB
      hasCampaigns: count > 0,
      campaignCount: count,
      plan: "free", // In production: from billing/subscription table
    });
  }

  for (const inf of seed.influencers) {
    users.push({
      id: inf.id,
      email: inf.email,
      name: inf.displayName,
      role: "influencer",
      signupDate: new Date().toISOString(), // In production: from DB
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
