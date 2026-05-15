// ==============================================================================
// Social Perks -- Transactional Email System
//
// Provider-agnostic email sending with template system.
// ConsoleEmailProvider for dev/test; ResendEmailProvider for production.
// ==============================================================================

import { escapeHtml } from "@/lib/security/sanitize";

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
  // Fallback uses routelyos.com because that's the verified Resend
  // sending domain on the current plan. socialperks.app is the user-
  // facing brand but not (yet) a verified sender. When the user adds
  // and verifies socialperks.app in Resend, set
  // EMAIL_FROM=Social Perks <noreply@socialperks.app> on Render to
  // override.
  process.env.EMAIL_FROM || "Social Perks <hello@routelyos.com>";

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

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.RESEND_API_KEY ?? "";
    this.baseUrl = baseUrl ?? "https://api.resend.com";
  }

  async send(message: EmailMessage): Promise<SendResult> {
    if (!this.apiKey) {
      return {
        success: false,
        messageId: "",
        error: "Resend API key not configured",
      };
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: message.from ?? DEFAULT_FROM,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
    } catch (err) {
      // Network failure (DNS, timeout, connection refused, etc.)
      const errorMessage =
        err instanceof Error ? err.message : "Network error";
      return {
        success: false,
        messageId: "",
        error: `Resend network error: ${errorMessage}`,
      };
    }

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errorBody = (await response.json()) as {
          message?: string;
        };
        if (errorBody?.message) {
          errorDetail += `: ${errorBody.message}`;
        }
      } catch {
        // Could not parse error body — use status code only
      }
      return {
        success: false,
        messageId: "",
        error: `Resend API error: ${errorDetail}`,
      };
    }

    try {
      const data = (await response.json()) as { id?: string };
      return { success: true, messageId: data.id ?? "" };
    } catch {
      // Response was 2xx but body wasn't JSON — treat as success
      return { success: true, messageId: "" };
    }
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

export function subscriptionStartedEmail(
  businessName: string,
  plan: string,
  billingPeriod: "monthly" | "annual"
): EmailTemplate {
  const safeName = escapeHtml(businessName);
  const safePlan = escapeHtml(plan.charAt(0).toUpperCase() + plan.slice(1));
  const subject = `Welcome to Social Perks ${safePlan} — your subscription is active`;
  const html = wrapHtml(
    `<h1 style="color: #34D399; font-family: 'Instrument Serif', serif; font-style: italic;">Subscription active</h1>
<p style="color: #94A3B8; line-height: 1.6;">Hi ${safeName} — your Social Perks <strong style="color: #E2E8F0;">${safePlan}</strong> plan is live, billed ${billingPeriod}.</p>
<p style="color: #94A3B8; line-height: 1.6;">Stripe will email you a receipt separately. From here, the fastest path to your first real customer post is:</p>
<ol style="color: #94A3B8; line-height: 1.8; padding-left: 20px;">
  <li>Pick a campaign template that matches your goal</li>
  <li>Print the QR code and put it where customers will see it</li>
  <li>The first time someone scans, you'll get an email — that's how you'll know it's working</li>
</ol>
<a href="https://socialperks.app/dashboard?welcome=1" style="display: inline-block; padding: 12px 24px; background-color: #34D399; color: #0C0F1A; border-radius: 8px; text-decoration: none; font-weight: 600;">Launch your first campaign</a>
<p style="color: #94A3B8; line-height: 1.6; margin-top: 24px; font-size: 14px;">Manage your subscription, update payment, or cancel any time from <a href="https://socialperks.app/dashboard/billing" style="color: #22D3EE;">/dashboard/billing</a>.</p>`
  );
  const text = `Hi ${businessName} — your Social Perks ${plan} plan is active, billed ${billingPeriod}. Stripe will email a receipt separately. Launch your first campaign at https://socialperks.app/dashboard?welcome=1 — manage subscription at https://socialperks.app/dashboard/billing`;
  return { subject, html, text };
}

/**
 * Sent when a Stripe Checkout session expires without completing
 * (default Stripe TTL is 24h). Polite reminder + one-click resume
 * URL so the user can pick up where they left off without re-picking
 * the plan and period.
 *
 * Industry benchmark: 10–15% of abandoned checkouts recover via a
 * single well-timed reminder. That's pure revenue lift for the
 * cost of one email.
 */
export function checkoutAbandonedEmail(
  businessName: string,
  plan: string,
  billingPeriod: "monthly" | "annual",
  resumeUrl: string
): EmailTemplate {
  const safeName = escapeHtml(businessName);
  const safePlan = escapeHtml(plan.charAt(0).toUpperCase() + plan.slice(1));
  const safeUrl = escapeHtml(resumeUrl);
  const billingLabel = billingPeriod === "annual" ? "annual" : "monthly";
  const subject = `Finish setting up Social Perks ${safePlan}`;
  const html = wrapHtml(
    `<h1 style="color: #FBBF24; font-family: 'Instrument Serif', serif; font-style: italic;">Almost there, ${safeName}</h1>
<p style="color: #94A3B8; line-height: 1.6;">You started signing up for Social Perks <strong style="color: #E2E8F0;">${safePlan}</strong> (${billingLabel}) but didn't finish checkout. No problem — your spot is still open.</p>
<p style="color: #94A3B8; line-height: 1.6;">Pick up where you left off in one click:</p>
<a href="${safeUrl}" style="display: inline-block; padding: 12px 24px; background-color: #22D3EE; color: #0C0F1A; border-radius: 8px; text-decoration: none; font-weight: 600;">Resume Checkout</a>
<p style="color: #94A3B8; line-height: 1.6; margin-top: 24px;">A few things worth knowing:</p>
<ul style="color: #94A3B8; line-height: 1.8; padding-left: 20px;">
  <li><strong style="color: #E2E8F0;">Cancel anytime</strong> — no contracts, no phone calls.</li>
  <li><strong style="color: #E2E8F0;">30-day money-back</strong> — full refund if it's not working.</li>
  <li>Your Free account stays active either way. The upgrade just raises the cap.</li>
</ul>
<p style="color: #94A3B8; line-height: 1.6; font-size: 14px; margin-top: 24px;">Not the right plan for you? <a href="https://socialperks.app/pricing" style="color: #22D3EE;">Compare plans</a> or <a href="https://socialperks.app/contact?intent=questions" style="color: #22D3EE;">talk to the founder</a>.</p>`
  );
  const text = `Hi ${businessName} — you started signing up for Social Perks ${plan} (${billingLabel}) but didn't finish checkout. Pick up where you left off: ${resumeUrl}\n\nCancel anytime · 30-day money-back · Your free account stays active either way.`;
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

export function contactFormEmail(
  name: string,
  email: string,
  subject: string,
  message: string
): EmailTemplate {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const emailSubject = `[Contact] ${safeSubject} — from ${safeName}`;
  const html = wrapHtml(
    `<h1 style="color: #22D3EE; font-family: 'Instrument Serif', serif; font-style: italic;">New Contact Form Submission</h1>
<table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
  <tr>
    <td style="color: #64748B; padding: 8px 12px 8px 0; vertical-align: top; white-space: nowrap;">Name</td>
    <td style="color: #E2E8F0; padding: 8px 0;"><strong>${safeName}</strong></td>
  </tr>
  <tr>
    <td style="color: #64748B; padding: 8px 12px 8px 0; vertical-align: top; white-space: nowrap;">Email</td>
    <td style="color: #E2E8F0; padding: 8px 0;"><a href="mailto:${safeEmail}" style="color: #22D3EE; text-decoration: underline;">${safeEmail}</a></td>
  </tr>
  <tr>
    <td style="color: #64748B; padding: 8px 12px 8px 0; vertical-align: top; white-space: nowrap;">Subject</td>
    <td style="color: #E2E8F0; padding: 8px 0;">${safeSubject}</td>
  </tr>
</table>
<div style="margin-top: 20px; padding: 16px; background-color: #0C0F1A; border-radius: 8px; border: 1px solid #2D3348;">
  <p style="color: #64748B; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">Message</p>
  <p style="color: #94A3B8; line-height: 1.6; margin: 0;">${safeMessage}</p>
</div>
<p style="color: #64748B; font-size: 12px; margin-top: 24px;">Reply directly to this email to respond to the sender.</p>`
  );
  const text = `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`;
  return { subject: emailSubject, html, text };
}

// -- Default Provider ---------------------------------------------------------

function createEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) {
    return new ResendEmailProvider(process.env.RESEND_API_KEY);
  }
  return new ConsoleEmailProvider();
}

export const emailProvider = createEmailProvider();
