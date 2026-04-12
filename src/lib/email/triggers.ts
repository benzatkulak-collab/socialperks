/**
 * Email Trigger Functions
 *
 * Transactional email triggers for key platform events.
 * Each function builds the email from templates and sends via the
 * configured email provider.  All sends are fire-and-forget --
 * callers should `.catch()` to avoid unhandled rejections.
 */

import { sendEmail } from "./sender";
import {
  submissionApprovedEmail as approvedTemplate,
  submissionRejectedEmail as rejectedTemplate,
  perkEarnedEmail as perkTemplate,
} from "./templates";
import { generateDigestHtml, type DigestData } from "./digest";
import { escapeHtml } from "@/lib/security/sanitize";
import { logError } from "@/lib/logging";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubmissionEmailData {
  submissionId: string;
  submitterEmail: string;
  submitterName: string;
}

export interface CampaignEmailData {
  campaignId: string;
  campaignName: string;
  businessId: string;
  businessName: string;
}

export interface PerkEmailData {
  perkValue: string;
  businessName: string;
  redemptionCode: string;
}

export interface WeeklyDigestStats {
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  pendingSubmissions: number;
  activeCampaigns: number;
  completions: number;
  marketingValue: number;
  topCampaign: { name: string; completions: number } | null;
  weekOverWeekChange: number;
}

// ─── Submission Approved ─────────────────────────────────────────────────────

/**
 * Send a congratulatory email when a submission is approved.
 * Shows the perk earned and how to view it.
 */
export async function sendSubmissionApprovedEmail(
  submission: SubmissionEmailData,
  campaign: CampaignEmailData,
  perkValue: string,
  redemptionCode: string,
): Promise<void> {
  const template = approvedTemplate({
    campaignName: campaign.campaignName,
    perkValue,
    redemptionCode,
  });

  await sendEmail({
    to: submission.submitterEmail,
    subject: template.subject,
    html: template.html,
  }).catch((err) => {
    logError(err, {
      context: "email_trigger",
      trigger: "submission_approved",
      submissionId: submission.submissionId,
    });
  });
}

// ─── Submission Rejected ─────────────────────────────────────────────────────

/**
 * Send an email explaining why a submission was rejected and how to resubmit.
 */
export async function sendSubmissionRejectedEmail(
  submission: SubmissionEmailData,
  campaign: CampaignEmailData,
  reason?: string,
): Promise<void> {
  const template = rejectedTemplate({
    campaignName: campaign.campaignName,
    reason,
  });

  await sendEmail({
    to: submission.submitterEmail,
    subject: template.subject,
    html: template.html,
  }).catch((err) => {
    logError(err, {
      context: "email_trigger",
      trigger: "submission_rejected",
      submissionId: submission.submissionId,
    });
  });
}

// ─── Perk Earned ─────────────────────────────────────────────────────────────

/**
 * Send an email when a perk is credited to a user's wallet.
 * Shows the perk value and redemption code.
 */
export async function sendPerkEarnedEmail(
  userEmail: string,
  perk: PerkEmailData,
): Promise<void> {
  const template = perkTemplate({
    perkValue: perk.perkValue,
    businessName: perk.businessName,
    code: perk.redemptionCode,
  });

  await sendEmail({
    to: userEmail,
    subject: template.subject,
    html: template.html,
  }).catch((err) => {
    logError(err, {
      context: "email_trigger",
      trigger: "perk_earned",
      userEmail,
    });
  });
}

// ─── Campaign Ending ─────────────────────────────────────────────────────────

/**
 * Remind a business that one of their campaigns is ending soon.
 */
export async function sendCampaignEndingEmail(
  businessEmail: string,
  businessName: string,
  campaignName: string,
  daysLeft: number,
): Promise<void> {
  const safeName = escapeHtml(businessName);
  const safeCampaign = escapeHtml(campaignName);

  const subject = `Your campaign "${safeCampaign}" ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0C0F1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;">
<div style="text-align:center;margin-bottom:32px;">
<h1 style="color:#22D3EE;font-size:24px;font-style:italic;margin:0;">Social Perks</h1>
</div>
<div style="background:#141828;border-radius:12px;padding:32px;border:1px solid rgba(255,255,255,0.06);">
<h2 style="color:#fff;font-size:20px;margin:0 0 16px;">Campaign Ending Soon</h2>
<p style="color:rgba(255,255,255,0.7);line-height:1.6;">Hi ${safeName}, your campaign <strong style="color:#fff;">${safeCampaign}</strong> will end in <strong style="color:#FBBF24;">${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong>.</p>
<div style="background:rgba(251,191,36,0.08);border-left:3px solid #FBBF24;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;">
<p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0;">Extend your campaign or create a new one to keep earning marketing value from your customers.</p>
</div>
<div style="text-align:center;margin-top:24px;">
<a href="https://socialperks.app/dashboard" style="display:inline-block;padding:12px 24px;background:#22D3EE;color:#0C0F1A;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard</a>
</div>
</div>
<p style="color:rgba(255,255,255,0.3);font-size:12px;text-align:center;margin-top:24px;">Social Perks &mdash; Turn customers into your marketing team</p>
</div></body></html>`;

  await sendEmail({
    to: businessEmail,
    subject,
    html,
  }).catch((err) => {
    logError(err, {
      context: "email_trigger",
      trigger: "campaign_ending",
      businessEmail,
    });
  });
}

// ─── Weekly Digest ───────────────────────────────────────────────────────────

/**
 * Send a weekly performance digest to a business.
 */
export async function sendWeeklyDigestEmail(
  businessEmail: string,
  businessId: string,
  businessName: string,
  stats: WeeklyDigestStats,
): Promise<void> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const digestData: DigestData = {
    businessId,
    businessName,
    email: businessEmail,
    period: {
      start: weekAgo.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
    },
    submissions: {
      total: stats.totalSubmissions,
      approved: stats.approvedSubmissions,
      rejected: stats.rejectedSubmissions,
      pending: stats.pendingSubmissions,
    },
    completions: stats.completions,
    marketingValue: stats.marketingValue,
    topCampaign: stats.topCampaign,
    activeCampaigns: stats.activeCampaigns,
    weekOverWeekChange: stats.weekOverWeekChange,
  };

  const { subject, html } = generateDigestHtml(digestData);

  await sendEmail({
    to: businessEmail,
    subject,
    html,
  }).catch((err) => {
    logError(err, {
      context: "email_trigger",
      trigger: "weekly_digest",
      businessId,
    });
  });
}
