/**
 * Email sending abstraction.
 * Uses Resend when RESEND_API_KEY is set, otherwise logs to console.
 */

import { logger, logError } from "@/lib/logging";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

const FROM_ADDRESS = process.env.EMAIL_FROM || 'Social Perks <noreply@socialperks.app>';

export async function sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev mode: log email to console
    logger.info("email send skipped (no provider configured)", {
      to: opts.to,
      subject: opts.subject,
    });
    return { success: true, id: `dev-${Date.now()}` };
  }

  // Hard timeout so a slow Resend response can't hang the calling request.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: opts.from || FROM_ADDRESS,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error("email send failed", undefined, {
        provider: "resend",
        statusCode: res.status,
        to: opts.to,
        subject: opts.subject,
        response: errText.slice(0, 1024),
      });
      return { success: false };
    }

    const data = await res.json();
    return { success: true, id: data.id };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    logError(error, {
      module: "email/sender",
      provider: "resend",
      to: opts.to,
      subject: opts.subject,
      reason: timedOut ? "timeout_10s" : "exception",
    });
    return { success: false };
  } finally {
    clearTimeout(timeout);
  }
}
