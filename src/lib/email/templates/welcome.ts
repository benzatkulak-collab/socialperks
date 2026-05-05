/**
 * Welcome email template — sent right after a shop owner's first sign-in.
 *
 * Goal: get them to the "first QR poster printed" milestone fast. Three
 * concrete next steps, one big CTA, minimal copy.
 */

import { escapeHtml } from "@/lib/security/sanitize";
import type { EmailTemplate } from "../index";

export interface WelcomeInput {
  to: string;
  /** Optional display name for personalization. */
  name?: string;
  /** Optional dashboard URL override (defaults to ${SITE_URL}/dashboard). */
  dashboardUrl?: string;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

/**
 * Build the welcome email — subject, HTML, and plaintext.
 */
export function welcomeEmail(input: WelcomeInput): EmailTemplate {
  const safeName = input.name ? escapeHtml(input.name) : null;
  const dashboardUrl = input.dashboardUrl ?? `${SITE_URL}/dashboard`;
  const safeDashboard = escapeHtml(dashboardUrl);
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(input.to)}`;

  const greeting = safeName ? `Welcome, ${safeName}!` : "Welcome!";
  const subject = "Welcome to Social Perks \u{1F44B}";

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
          <p style="margin:0;font-size:16px;line-height:1.6;color:#94A3B8;">You&rsquo;re three steps from your first customer-made ad:</p>
        </td></tr>
        <tr><td style="padding:0 0 8px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:12px 0;border-bottom:1px solid #1F2937;">
              <span style="display:inline-block;width:28px;font-family:Georgia,serif;font-style:italic;font-size:20px;color:#22D3EE;">1.</span>
              <span style="font-size:15px;color:#FFFFFF;">Print your QR poster.</span>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #1F2937;">
              <span style="display:inline-block;width:28px;font-family:Georgia,serif;font-style:italic;font-size:20px;color:#22D3EE;">2.</span>
              <span style="font-size:15px;color:#FFFFFF;">Stick it on the counter.</span>
            </td></tr>
            <tr><td style="padding:12px 0;">
              <span style="display:inline-block;width:28px;font-family:Georgia,serif;font-style:italic;font-size:20px;color:#22D3EE;">3.</span>
              <span style="font-size:15px;color:#FFFFFF;">Watch the dashboard.</span>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 32px 0;">
          <a href="${safeDashboard}" style="display:inline-block;padding:14px 28px;background-color:#22D3EE;color:#0C0F1A;text-decoration:none;font-weight:700;font-size:16px;border-radius:8px;">Open dashboard &rarr;</a>
        </td></tr>
        <tr><td style="padding:0 0 24px 0;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#94A3B8;">Reply to this email if you get stuck — a real human reads every reply.</p>
        </td></tr>
        <tr><td style="padding:24px 0 0 0;border-top:1px solid #1F2937;">
          <p style="margin:0 0 8px 0;font-size:11px;line-height:1.5;color:#64748B;">Social Perks &middot; 2261 Market St #4855 &middot; San Francisco, CA 94114</p>
          <p style="margin:0;font-size:11px;line-height:1.5;color:#64748B;">Powered by Social Perks &middot; <a href="${unsubscribeUrl}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${greeting}

You're three steps from your first customer-made ad:

  1. Print your QR poster.
  2. Stick it on the counter.
  3. Watch the dashboard.

Open dashboard: ${dashboardUrl}

Reply to this email if you get stuck — a real human reads every reply.

Powered by Social Perks
Unsubscribe: ${unsubscribeUrl}`;

  return { subject, html, text };
}
