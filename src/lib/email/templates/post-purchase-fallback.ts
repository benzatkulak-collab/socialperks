/**
 * Post-purchase fallback email template.
 *
 * Sent to a customer (NOT the shop owner) immediately after a purchase
 * when the SMS channel is unavailable or has failed. Asks them to post
 * about their visit in exchange for the configured perk.
 */

import { escapeHtml } from "@/lib/security/sanitize";
import type { EmailTemplate } from "../index";

export interface PostPurchaseFallbackInput {
  /** Customer email — used for unsubscribe link. */
  to: string;
  /** Display name of the shop where the customer purchased. */
  businessName: string;
  /** Campaign whose claim page the CTA links to. */
  campaignId: string;
  /**
   * Human-readable perk text — e.g. "15% off your next visit",
   * "a free pastry", "$5 off". Rendered as bold inline.
   */
  perkText: string;
  /** Optional shop address for the footer. */
  businessAddress?: string;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

/**
 * Build the post-purchase fallback email.
 *
 * Subject: "Thanks for stopping by {businessName}! 🎁"
 * CTA: links to ${SITE_URL}/c/${campaignId}?ref=email so we can
 * attribute conversions to the email channel.
 */
export function postPurchaseFallbackEmail(
  input: PostPurchaseFallbackInput
): EmailTemplate {
  const safeBusiness = escapeHtml(input.businessName);
  const safePerk = escapeHtml(input.perkText);
  const safeCampaignId = encodeURIComponent(input.campaignId);
  const claimUrl = `${SITE_URL}/c/${safeCampaignId}?ref=email`;
  const safeClaim = escapeHtml(claimUrl);
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(input.to)}`;
  const address = input.businessAddress
    ? escapeHtml(input.businessAddress)
    : "Local shop · address on file";

  const subject = `Thanks for stopping by ${input.businessName}! \u{1F381}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#0C0F1A;font-family:'Helvetica Neue',Arial,sans-serif;color:#FFFFFF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0C0F1A;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#0C0F1A;">
        <tr><td style="padding:0 0 24px 0;">
          <p style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:20px;color:#22D3EE;">Social Perks</p>
        </td></tr>
        <tr><td style="padding:0 0 16px 0;">
          <h1 style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:30px;line-height:1.2;color:#FFFFFF;font-weight:400;">Thanks for stopping by ${safeBusiness}!</h1>
        </td></tr>
        <tr><td style="padding:0 0 24px 0;">
          <p style="margin:0;font-size:16px;line-height:1.6;color:#94A3B8;">Here&rsquo;s a little something. Post about your visit on Instagram, TikTok, or Facebook and get <strong style="color:#FFFFFF;">${safePerk}</strong> on your next visit.</p>
        </td></tr>
        <tr><td style="padding:0 0 24px 0;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#94A3B8;">It takes 30 seconds. We&rsquo;ll show you exactly what to post.</p>
        </td></tr>
        <tr><td style="padding:0 0 32px 0;">
          <a href="${safeClaim}" style="display:inline-block;padding:14px 28px;background-color:#22D3EE;color:#0C0F1A;text-decoration:none;font-weight:700;font-size:16px;border-radius:8px;">Claim my perk &rarr;</a>
        </td></tr>
        <tr><td style="padding:0 0 8px 0;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#64748B;">Or paste this URL into your browser:</p>
        </td></tr>
        <tr><td style="padding:0 0 32px 0;">
          <p style="margin:0;font-family:'Courier New',monospace;font-size:11px;line-height:1.6;color:#94A3B8;word-break:break-all;">${safeClaim}</p>
        </td></tr>
        <tr><td style="padding:24px 0 0 0;border-top:1px solid #1F2937;">
          <p style="margin:0 0 8px 0;font-size:11px;line-height:1.5;color:#64748B;">${safeBusiness} &middot; ${address}</p>
          <p style="margin:0;font-size:11px;line-height:1.5;color:#64748B;">Powered by Social Perks &middot; <a href="${unsubscribeUrl}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Thanks for stopping by ${input.businessName}!

Post about your visit on Instagram, TikTok, or Facebook and get ${input.perkText} on your next visit.

Claim my perk: ${claimUrl}

${input.businessName} · ${input.businessAddress ?? "Local shop"}
Powered by Social Perks
Unsubscribe: ${unsubscribeUrl}`;

  return { subject, html, text };
}
