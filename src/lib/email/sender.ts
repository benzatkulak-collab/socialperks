/**
 * Email sending abstraction.
 * Uses Resend when RESEND_API_KEY is set, otherwise logs to console.
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

const FROM_ADDRESS = process.env.EMAIL_FROM || 'Social Perks <noreply@socialperks.io>';

export async function sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev mode: log email to console
    console.warn(`[email] Would send to ${opts.to}: ${opts.subject}`);
    return { success: true, id: `dev-${Date.now()}` };
  }

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
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[email] Failed to send: ${err}`);
      return { success: false };
    }

    const data = await res.json();
    return { success: true, id: data.id };
  } catch (error) {
    console.error('[email] Send error:', error);
    return { success: false };
  }
}
