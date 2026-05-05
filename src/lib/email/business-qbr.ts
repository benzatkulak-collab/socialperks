/**
 * Quarterly Business Review email (Phase 39).
 *
 * Once a quarter we email each active business with their numbers:
 *   - Campaigns shipped
 *   - Customer posts received
 *   - Estimated marketing value
 *
 * Format: structured. Goal: re-engage businesses who launched and
 * went quiet, surface ROI evidence for renewal conversations.
 */

import { ConsoleEmailProvider, ResendEmailProvider, type EmailProvider } from "./index";

export interface QBRPayload {
  businessId: string;
  businessName: string;
  email: string;
  campaignsShipped: number;
  totalCompletions: number;
  estimatedMarketingValueDollars: number;
  topCampaign?: { id: string; completions: number };
  quarterLabel: string; // e.g. "Q2 2026"
}

function provider(): EmailProvider {
  return process.env.RESEND_API_KEY ? new ResendEmailProvider() : new ConsoleEmailProvider();
}

export function qbrTemplate(p: QBRPayload): { subject: string; text: string; html: string } {
  const subject = `${p.quarterLabel} review for ${p.businessName}: ${p.totalCompletions} customer posts`;
  const text = `Hi,

Quick recap of ${p.quarterLabel} for ${p.businessName} on Social Perks:

  Campaigns shipped: ${p.campaignsShipped}
  Customer posts received: ${p.totalCompletions}
  Estimated marketing value: ~$${p.estimatedMarketingValueDollars.toLocaleString()}
${p.topCampaign ? `\n  Top campaign: ${p.topCampaign.id} (${p.topCampaign.completions} completions)\n` : ""}

For comparison: $${p.estimatedMarketingValueDollars.toLocaleString()} of Instagram-style ad reach
typically costs $${Math.round(p.estimatedMarketingValueDollars * 1.4).toLocaleString()}+ on Meta.

If you'd like a 15-minute walkthrough of the next quarter's plan,
just reply to this email.

— Social Perks
`;
  const html = `<p>Hi,</p>
<p>Quick recap of <strong>${p.quarterLabel}</strong> for <strong>${p.businessName}</strong> on Social Perks:</p>
<ul>
  <li>Campaigns shipped: <strong>${p.campaignsShipped}</strong></li>
  <li>Customer posts received: <strong>${p.totalCompletions}</strong></li>
  <li>Estimated marketing value: <strong>~$${p.estimatedMarketingValueDollars.toLocaleString()}</strong></li>
  ${p.topCampaign ? `<li>Top campaign: <code>${p.topCampaign.id}</code> (${p.topCampaign.completions} completions)</li>` : ""}
</ul>
<p>For comparison: $${p.estimatedMarketingValueDollars.toLocaleString()} of Instagram-style ad reach typically costs $${Math.round(p.estimatedMarketingValueDollars * 1.4).toLocaleString()}+ on Meta.</p>
<p>If you'd like a 15-minute walkthrough of the next quarter's plan, just reply to this email.</p>
<p>— Social Perks</p>`;
  return { subject, text, html };
}

export async function sendQBR(p: QBRPayload): Promise<{ success: boolean }> {
  const t = qbrTemplate(p);
  const result = await provider().send({ to: p.email, subject: t.subject, text: t.text, html: t.html });
  return { success: result.success };
}
