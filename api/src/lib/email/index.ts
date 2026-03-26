// ==============================================================================
// Social Perks -- Transactional Email System
//
// Provider-agnostic email sending with template system.
// ConsoleEmailProvider for dev/test; ResendEmailProvider for production.
// ==============================================================================

import { escapeHtml } from "../security/sanitize";

// -- Types --------------------------------------------------------------------

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface SendResult {
  success: boolean;
  messageId: string;
  error?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<SendResult>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// -- Default From Address ----------------------------------------------------

const DEFAULT_FROM =
  process.env.EMAIL_FROM || "Social Perks <noreply@socialperks.app>";

// -- Console Provider (dev/test) ----------------------------------------------

export class ConsoleEmailProvider implements EmailProvider {
  public sentMessages: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<SendResult> {
    this.sentMessages.push({ ...message, from: message.from ?? DEFAULT_FROM });
    const messageId = `msg_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    return { success: true, messageId };
  }
}

// -- Resend Provider (production) ---------------------------------------------

export class ResendEmailProvider implements EmailProvider {
  private apiKey: string;
  private baseUrl: string;
  private maxRetries: number;

  constructor(apiKey?: string, baseUrl?: string, maxRetries = 3) {
    this.apiKey = apiKey ?? process.env.RESEND_API_KEY ?? "";
    this.baseUrl = baseUrl ?? "https://api.resend.com";
    this.maxRetries = maxRetries;
  }

  async send(message: EmailMessage): Promise<SendResult> {
    if (!this.apiKey) {
      return { success: false, messageId: "", error: "Resend API key not configured" };
    }

    const payload = JSON.stringify({
      from: message.from ?? DEFAULT_FROM,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/emails`, {
          method: "POST",
          headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
          body: payload,
        });

        if (response.ok) {
          const data = (await response.json().catch(() => ({}))) as { id?: string };
          console.info(JSON.stringify({ level: "info", event: "email.sent", to: message.to, subject: message.subject, messageId: data.id, attempt, timestamp: new Date().toISOString() }));
          return { success: true, messageId: data.id ?? "" };
        }

        // 429 (rate limited) or 5xx (server error) — retry
        if ((response.status === 429 || response.status >= 500) && attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          console.warn(JSON.stringify({ level: "warn", event: "email.retry", to: message.to, status: response.status, attempt, nextRetryMs: delay }));
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        // Non-retryable error
        let errorDetail = `HTTP ${response.status}`;
        try { const body = (await response.json()) as { message?: string }; if (body?.message) errorDetail += `: ${body.message}`; } catch {}
        console.error(JSON.stringify({ level: "error", event: "email.failed", to: message.to, error: errorDetail, attempt }));
        return { success: false, messageId: "", error: `Resend API error: ${errorDetail}` };
      } catch (err) {
        // Network error — retry
        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          console.warn(JSON.stringify({ level: "warn", event: "email.retry", to: message.to, error: err instanceof Error ? err.message : "Network error", attempt, nextRetryMs: delay }));
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        const errorMessage = err instanceof Error ? err.message : "Network error";
        console.error(JSON.stringify({ level: "error", event: "email.failed", to: message.to, error: errorMessage, attempt }));
        return { success: false, messageId: "", error: `Resend network error: ${errorMessage}` };
      }
    }

    return { success: false, messageId: "", error: "Max retries exceeded" };
  }
}

// -- Template Helpers ---------------------------------------------------------

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'DM Sans', Arial, sans-serif; background-color: #0C0F1A; color: #E2E8F0; padding: 24px;">
<div style="max-width: 600px; margin: 0 auto; background-color: #1A1F36; border-radius: 12px; padding: 32px; border: 1px solid #2D3348;">
${body}
</div>
</body>
</html>`;
}

// -- Email Templates ----------------------------------------------------------

export function welcomeEmail(userName: string): EmailTemplate {
  const safeName = escapeHtml(userName);
  const subject = `Welcome to Social Perks, ${safeName}!`;
  const html = wrapHtml(
    `<h1 style="color: #22D3EE; font-family: 'Instrument Serif', serif; font-style: italic;">Welcome, ${safeName}!</h1>
<p style="color: #94A3B8; line-height: 1.6;">You're now part of Social Perks -- where businesses reward customers for real marketing actions.</p>
<p style="color: #94A3B8; line-height: 1.6;">Get started by creating your first campaign or browsing available perks.</p>
<a href="https://socialperks.app/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #22D3EE; color: #0C0F1A; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>`
  );
  const text = `Welcome to Social Perks, ${userName}! Get started at https://socialperks.app/dashboard`;
  return { subject, html, text };
}

export function submissionApprovedEmail(
  userName: string,
  campaignName: string,
  perkValue: string
): EmailTemplate {
  const safeName = escapeHtml(userName);
  const safeCampaign = escapeHtml(campaignName);
  const safePerk = escapeHtml(perkValue);
  const subject = `Your submission for "${safeCampaign}" was approved!`;
  const html = wrapHtml(
    `<h1 style="color: #34D399; font-family: 'Instrument Serif', serif; font-style: italic;">Submission Approved!</h1>
<p style="color: #94A3B8; line-height: 1.6;">Great news, ${safeName}! Your submission for <strong style="color: #E2E8F0;">${safeCampaign}</strong> has been approved.</p>
<p style="color: #94A3B8; line-height: 1.6;">You earned a perk worth <strong style="color: #22D3EE;">${safePerk}</strong>.</p>
<a href="https://socialperks.app/perks" style="display: inline-block; padding: 12px 24px; background-color: #34D399; color: #0C0F1A; border-radius: 8px; text-decoration: none; font-weight: 600;">View Your Perks</a>`
  );
  const text = `Your submission for "${campaignName}" was approved! You earned ${perkValue}. View your perks at https://socialperks.app/perks`;
  return { subject, html, text };
}

export function submissionRejectedEmail(
  userName: string,
  campaignName: string,
  reason?: string
): EmailTemplate {
  const safeName = escapeHtml(userName);
  const safeCampaign = escapeHtml(campaignName);
  const safeReason = reason ? escapeHtml(reason) : undefined;
  const subject = `Your submission for "${safeCampaign}" was not approved`;
  const reasonBlock = safeReason
    ? `<p style="color: #94A3B8; line-height: 1.6;">Reason: <em style="color: #E2E8F0;">${safeReason}</em></p>`
    : "";
  const html = wrapHtml(
    `<h1 style="color: #FBBF24; font-family: 'Instrument Serif', serif; font-style: italic;">Submission Not Approved</h1>
<p style="color: #94A3B8; line-height: 1.6;">Hi ${safeName}, unfortunately your submission for <strong style="color: #E2E8F0;">${safeCampaign}</strong> was not approved this time.</p>
${reasonBlock}
<p style="color: #94A3B8; line-height: 1.6;">Don't worry — you can review the guidelines and submit again.</p>
<a href="https://socialperks.app/campaigns" style="display: inline-block; padding: 12px 24px; background-color: #FBBF24; color: #0C0F1A; border-radius: 8px; text-decoration: none; font-weight: 600;">Browse Campaigns</a>`
  );
  const text = `Your submission for "${campaignName}" was not approved.${reason ? ` Reason: ${reason}` : ""} Browse campaigns at https://socialperks.app/campaigns`;
  return { subject, html, text };
}

export function passwordResetEmail(
  userName: string,
  resetLink: string
): EmailTemplate {
  const safeName = escapeHtml(userName);
  const safeLink = escapeHtml(resetLink);
  const subject = "Reset your Social Perks password";
  const html = wrapHtml(
    `<h1 style="color: #FBBF24; font-family: 'Instrument Serif', serif; font-style: italic;">Password Reset</h1>
<p style="color: #94A3B8; line-height: 1.6;">Hi ${safeName}, we received a request to reset your password.</p>
<p style="color: #94A3B8; line-height: 1.6;">Click the button below to create a new password. This link expires in 1 hour.</p>
<a href="${safeLink}" style="display: inline-block; padding: 12px 24px; background-color: #FBBF24; color: #0C0F1A; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
<p style="color: #64748B; font-size: 12px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>`
  );
  const text = `Hi ${userName}, reset your Social Perks password using this link: ${resetLink}`;
  return { subject, html, text };
}

// -- Default Provider ---------------------------------------------------------

function createEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) {
    return new ResendEmailProvider(process.env.RESEND_API_KEY);
  }
  return new ConsoleEmailProvider();
}

export const emailProvider = createEmailProvider();
