/**
 * Magic-link sign-in email template.
 *
 * Used by `POST /api/v1/auth/magic-link` to send a one-time sign-in link
 * (15-minute expiry, single-use). Branded for shop owners — confident,
 * minimal, fast to act on.
 */

import { escapeHtml } from "@/lib/security/sanitize";
import type { EmailTemplate } from "../index";

export interface MagicLinkInput {
  /** Recipient address — used only in the unsubscribe link footer. */
  to: string;
  /** Full URL the user should click to sign in. */
  link: string;
  /** Optional shop owner / business display name for personalization. */
  businessName?: string;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

/**
 * Build the subject + HTML + plaintext body for a magic-link sign-in email.
 *
 * @param input.to            Recipient address (used in unsubscribe link).
 * @param input.link          Single-use sign-in URL.
 * @param input.businessName  Optional first-line greeting personalization.
 */
export function magicLinkEmail(input: MagicLinkInput): EmailTemplate {
  const safeLink = escapeHtml(input.link);
  const safeName = input.businessName ? escapeHtml(input.businessName) : null;
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(input.to)}`;

  const greeting = safeName ? `Hey ${safeName},` : "Hey there,";

  const subject = "Sign in to Social Perks";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#0C0F1A;font-family:'Helvetica Neue',Arial,sans-serif;color:#FFFFFF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0C0F1A;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#0C0F1A;">
        <tr><td style="padding:0 0 24px 0;">
          <p style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:24px;color:#22D3EE;">Social Perks</p>
        </td></tr>
        <tr><td style="padding:0 0 16px 0;">
          <h1 style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:32px;line-height:1.2;color:#FFFFFF;font-weight:400;">${greeting}</h1>
        </td></tr>
        <tr><td style="padding:0 0 24px 0;">
          <p style="margin:0;font-size:16px;line-height:1.6;color:#94A3B8;">Click the button below to sign in to your Social Perks account. This link is good for 15 minutes and can only be used once.</p>
        </td></tr>
        <tr><td style="padding:0 0 32px 0;">
          <a href="${safeLink}" style="display:inline-block;padding:14px 28px;background-color:#22D3EE;color:#0C0F1A;text-decoration:none;font-weight:700;font-size:16px;border-radius:8px;">Sign in &rarr;</a>
        </td></tr>
        <tr><td style="padding:0 0 8px 0;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#64748B;">Or paste this URL into your browser:</p>
        </td></tr>
        <tr><td style="padding:0 0 32px 0;">
          <p style="margin:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.6;color:#94A3B8;word-break:break-all;">${safeLink}</p>
        </td></tr>
        <tr><td style="padding:24px 0 0 0;border-top:1px solid #1F2937;">
          <p style="margin:0 0 8px 0;font-size:12px;line-height:1.5;color:#64748B;">If you didn&rsquo;t request this, you can safely ignore this email — no one can sign in without clicking the link above.</p>
          <p style="margin:0;font-size:11px;line-height:1.5;color:#64748B;">Powered by Social Perks &middot; <a href="${unsubscribeUrl}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${greeting}

Sign in to Social Perks using this link (good for 15 minutes, single-use):

${input.link}

If you didn't request this, you can safely ignore this email.

Powered by Social Perks
Unsubscribe: ${unsubscribeUrl}`;

  return { subject, html, text };
}
