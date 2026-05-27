/**
 * POST /api/v1/leads/:id/outreach
 *
 * Generates three personalized outreach drafts (email, IG DM, SMS)
 * for a given lead, using the lead's specific data and fit reasons.
 *
 * No AI required — pure templating against the lead record so this works
 * offline and at zero marginal cost.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  requireCsrf,
  rateLimit,
  withTiming,
} from "../../../_shared";
import { getLead } from "@/lib/leads/store";
import type { Lead } from "@/lib/leads/types";

interface OutreachDraft {
  channel: "email" | "instagram" | "sms";
  subject?: string;
  body: string;
}

function pickPainPoint(lead: Lead): string {
  if (!lead.hasInstagram) {
    return "your business doesn't have an Instagram presence yet";
  }
  if (lead.lastInstagramPostDate) {
    const days = Math.round(
      (Date.now() - new Date(lead.lastInstagramPostDate).getTime()) /
        86_400_000
    );
    if (days > 30) {
      return `your last Instagram post was ${days} days ago`;
    }
  }
  if (!lead.hasResponseToReviews) {
    return "your Google reviews don't have owner replies";
  }
  if (lead.googleReviewCount > 0 && lead.googleReviewCount < 25) {
    return `you only have ${lead.googleReviewCount} Google reviews — your loyal customers could 3x that`;
  }
  return "your loyal customers could be doing your marketing for you";
}

function firstName(lead: Lead): string {
  // Use first word of business name as a friendly stand-in.
  const name = lead.businessName.split(/[-—:]/)[0].trim();
  return name.split(/\s+/)[0] || "there";
}

function buildEmail(lead: Lead): OutreachDraft {
  const pain = pickPainPoint(lead);
  const subject = `Quick idea for ${lead.businessName}`;
  const body = `Hi ${firstName(lead)} team,

I'm reaching out because I noticed ${pain}. I run Social Perks — we help local ${lead.industry} businesses like yours turn happy customers into a marketing team.

The idea is simple: you offer a small perk (e.g. 10% off, a free drink, early access), and customers earn it by doing one tiny social action — leaving a Google review, posting a photo, tagging you on Instagram. We track everything automatically.

For a business in ${lead.city} with ${lead.googleReviewCount} reviews and a ${lead.googleRating.toFixed(
    1
  )} rating, this typically drives 15-40 new reviews and 50+ social posts in the first 90 days. No ad spend.

Want a 10-minute demo this week? Happy to send a Loom if a call doesn't work.

— Sent from Social Perks`;
  return { channel: "email", subject, body };
}

function buildInstagram(lead: Lead): OutreachDraft {
  const pain = pickPainPoint(lead);
  const body = `Hey ${firstName(lead)}! 👋 Love what you're doing in ${lead.city}. Noticed ${pain} — I built a tool called Social Perks that lets ${lead.industry} businesses reward customers for posting/reviewing. Most of our customers see 30+ new reviews in the first month with zero ad spend. Mind if I send you a 2-min Loom?`;
  return { channel: "instagram", body };
}

function buildSms(lead: Lead): OutreachDraft {
  const body = `Hey — this is Ben w/ Social Perks. Saw ${lead.businessName} has a ${lead.googleRating.toFixed(
    1
  )} rating w/ ${lead.googleReviewCount} reviews — we help ${lead.industry} businesses turn customers into reviewers/posters in exchange for small perks. Worth 10 min to show you? Reply YES and I'll send a Loom.`;
  return { channel: "sms", body };
}

export const POST = withTiming(
  async (req: NextRequest, ctx: unknown) => {
    const user = requireAuth(req);
    if (user instanceof Response) return user;

    const csrfError = requireCsrf(req, user);
    if (csrfError) return csrfError;

    const rl = rateLimit(req, "standard");
    if (rl) return rl;

    const params = await (ctx as { params: Promise<{ id: string }> }).params;
    const id = params?.id;
    if (!id) return err("MISSING_FIELD", "id is required", 400);

    const lead = await getLead(id);
    if (!lead) return err("NOT_FOUND", "Lead not found", 404);
    if (lead.ownerId && lead.ownerId !== (user as { id: string }).id) {
      return err("FORBIDDEN", "Not your lead", 403);
    }

    const drafts: OutreachDraft[] = [
      buildEmail(lead),
      buildInstagram(lead),
      buildSms(lead),
    ];

    return ok({ leadId: lead.id, drafts });
  }
);
