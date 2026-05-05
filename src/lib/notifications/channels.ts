/**
 * Multi-channel notification dispatcher (Phase 22).
 *
 * Each channel is independent and configured by env / business
 * settings. The interface returns success/failure so the caller can
 * decide whether to retry — but every channel must be best-effort:
 * a webhook timeout cannot block business logic.
 *
 * Channels:
 *   - email      → Resend / Console (existing)
 *   - slack      → incoming-webhook URL per business
 *   - sms        → Twilio (env-configured fallback to no-op)
 *   - in-app     → SSE event stream (existing)
 */

interface SendResult {
  channel: string;
  success: boolean;
  error?: string;
}

interface SlackPayload {
  webhookUrl: string;
  text: string;
  blocks?: unknown[];
}

interface SmsPayload {
  to: string;
  body: string;
}

export async function sendSlack(p: SlackPayload): Promise<SendResult> {
  if (!p.webhookUrl || !p.webhookUrl.startsWith("https://hooks.slack.com/")) {
    return { channel: "slack", success: false, error: "invalid_webhook_url" };
  }
  try {
    const res = await fetch(p.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: p.text, blocks: p.blocks }),
    });
    if (!res.ok) {
      return { channel: "slack", success: false, error: `http_${res.status}` };
    }
    return { channel: "slack", success: true };
  } catch (e) {
    return { channel: "slack", success: false, error: e instanceof Error ? e.message : "network" };
  }
}

export async function sendSms(p: SmsPayload): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { channel: "sms", success: false, error: "twilio_not_configured" };
  }
  if (!/^\+[1-9]\d{6,14}$/.test(p.to)) {
    return { channel: "sms", success: false, error: "invalid_e164" };
  }
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: p.to, Body: p.body.slice(0, 1500) }).toString(),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      return { channel: "sms", success: false, error: `http_${res.status}: ${body.slice(0, 200)}` };
    }
    return { channel: "sms", success: true };
  } catch (e) {
    return { channel: "sms", success: false, error: e instanceof Error ? e.message : "network" };
  }
}

/** Submission-event helper: format and dispatch across configured channels. */
export async function notifySubmission(args: {
  businessName: string;
  campaignId: string;
  submissionId: string;
  proofUrl: string;
  channels: { slackWebhookUrl?: string; smsTo?: string };
}): Promise<SendResult[]> {
  const results: SendResult[] = [];
  const message = `New submission for ${args.businessName} — proof: ${args.proofUrl} — review at https://socialperks.io/dashboard?campaign=${args.campaignId}&submission=${args.submissionId}`;
  if (args.channels.slackWebhookUrl) {
    results.push(await sendSlack({ webhookUrl: args.channels.slackWebhookUrl, text: message }));
  }
  if (args.channels.smsTo) {
    results.push(await sendSms({ to: args.channels.smsTo, body: message }));
  }
  return results;
}
