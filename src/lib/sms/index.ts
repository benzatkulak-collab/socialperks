/**
 * Social Perks — Transactional SMS
 *
 * Provider-agnostic SMS sending. ConsoleSmsProvider for dev/test (logs
 * the message and stores it for assertions); TwilioSmsProvider for
 * production. Mirrors the shape of `lib/email/index.ts` so the rest of
 * the app doesn't have to care which channel a notification went out
 * over.
 *
 * Twilio HTTP API only — no SDK dependency. We hit the Messages
 * resource directly with HTTP basic auth, which is the same wire format
 * the official SDK uses internally.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SmsMessage {
  /** E.164-formatted destination, e.g. "+15551234567". */
  to: string;
  body: string;
  from?: string;
}

export interface SmsSendResult {
  success: boolean;
  messageId: string;
  error?: string;
}

export interface SmsProvider {
  send(message: SmsMessage): Promise<SmsSendResult>;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_FROM = process.env.TWILIO_FROM_NUMBER ?? "+15555550100";

// ─── Console Provider (dev/test) ────────────────────────────────────────────

/**
 * No-op provider that records what *would* have been sent. Used in dev
 * and tests so we don't burn Twilio credits on hot-reload reloads.
 */
export class ConsoleSmsProvider implements SmsProvider {
  public sentMessages: SmsMessage[] = [];

  async send(message: SmsMessage): Promise<SmsSendResult> {
    this.sentMessages.push({ ...message, from: message.from ?? DEFAULT_FROM });
    if (process.env.NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.log(
        `[SMS:console] to=${message.to} from=${message.from ?? DEFAULT_FROM}: ${message.body}`
      );
    }
    const messageId = `sms_${Date.now()}_${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)}`;
    return { success: true, messageId };
  }
}

// ─── Twilio Provider ────────────────────────────────────────────────────────

/**
 * Twilio Messages API. Requires TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN;
 * the From number defaults to TWILIO_FROM_NUMBER but per-message override
 * is supported.
 *
 * Errors return success: false with the Twilio error message in `error`.
 * Callers should treat send failures as "fall back to email" (or
 * surface to the user as "we couldn't reach that number").
 */
export class TwilioSmsProvider implements SmsProvider {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly defaultFrom: string = DEFAULT_FROM
  ) {}

  async send(message: SmsMessage): Promise<SmsSendResult> {
    const from = message.from ?? this.defaultFrom;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
      this.accountSid
    )}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
      "base64"
    );
    const body = new URLSearchParams({
      To: message.to,
      From: from,
      Body: message.body,
    });
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!res.ok) {
        let errorMessage = `Twilio responded ${res.status}`;
        try {
          const j = (await res.json()) as { message?: string; code?: number };
          if (j.message) errorMessage = j.message;
        } catch {
          // Twilio sometimes returns plaintext. Fall through with status code.
        }
        return { success: false, messageId: "", error: errorMessage };
      }
      const json = (await res.json()) as { sid: string };
      return { success: true, messageId: json.sid };
    } catch (e) {
      return {
        success: false,
        messageId: "",
        error: e instanceof Error ? e.message : "Unknown SMS error",
      };
    }
  }
}

// ─── Default Provider ───────────────────────────────────────────────────────

function createSmsProvider(): SmsProvider {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (sid && token) {
    return new TwilioSmsProvider(sid, token);
  }
  return new ConsoleSmsProvider();
}

export const smsProvider = createSmsProvider();

// ─── Phone validation ──────────────────────────────────────────────────────

/**
 * Validate E.164 format ("+" followed by 10–15 digits). We don't try to
 * normalize regional / national formats here — the customer is asked
 * to enter their full international number on the form, and any
 * transformation belongs in the UI layer where we know the locale.
 */
export function isValidE164(phone: unknown): phone is string {
  if (typeof phone !== "string") return false;
  return /^\+[1-9]\d{9,14}$/.test(phone);
}
