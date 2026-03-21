// ==============================================================================
// Social Perks -- Transactional Email System
//
// Provider-agnostic email sending with template system.
// ConsoleEmailProvider for dev/test; swap to SendGrid/SES in production.
// ==============================================================================

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

// -- Console Provider (dev/test) ----------------------------------------------

export class ConsoleEmailProvider implements EmailProvider {
  public sentMessages: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<SendResult> {
    this.sentMessages.push(message);
    const messageId = `msg_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    return { success: true, messageId };
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
  const subject = `Welcome to Social Perks, ${userName}!`;
  const html = wrapHtml(
    `<h1 style="color: #22D3EE; font-family: 'Instrument Serif', serif; font-style: italic;">Welcome, ${userName}!</h1>
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
  const subject = `Your submission for "${campaignName}" was approved!`;
  const html = wrapHtml(
    `<h1 style="color: #34D399; font-family: 'Instrument Serif', serif; font-style: italic;">Submission Approved!</h1>
<p style="color: #94A3B8; line-height: 1.6;">Great news, ${userName}! Your submission for <strong style="color: #E2E8F0;">${campaignName}</strong> has been approved.</p>
<p style="color: #94A3B8; line-height: 1.6;">You earned a perk worth <strong style="color: #22D3EE;">${perkValue}</strong>.</p>
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
  const subject = `Your submission for "${campaignName}" was not approved`;
  const reasonBlock = reason
    ? `<p style="color: #94A3B8; line-height: 1.6;">Reason: <em style="color: #E2E8F0;">${reason}</em></p>`
    : "";
  const html = wrapHtml(
    `<h1 style="color: #FBBF24; font-family: 'Instrument Serif', serif; font-style: italic;">Submission Not Approved</h1>
<p style="color: #94A3B8; line-height: 1.6;">Hi ${userName}, unfortunately your submission for <strong style="color: #E2E8F0;">${campaignName}</strong> was not approved this time.</p>
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
  const subject = "Reset your Social Perks password";
  const html = wrapHtml(
    `<h1 style="color: #FBBF24; font-family: 'Instrument Serif', serif; font-style: italic;">Password Reset</h1>
<p style="color: #94A3B8; line-height: 1.6;">Hi ${userName}, we received a request to reset your password.</p>
<p style="color: #94A3B8; line-height: 1.6;">Click the button below to create a new password. This link expires in 1 hour.</p>
<a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #FBBF24; color: #0C0F1A; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
<p style="color: #64748B; font-size: 12px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>`
  );
  const text = `Hi ${userName}, reset your Social Perks password using this link: ${resetLink}`;
  return { subject, html, text };
}

// -- Default Provider ---------------------------------------------------------

export const emailProvider = new ConsoleEmailProvider();
