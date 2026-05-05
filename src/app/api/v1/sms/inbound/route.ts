/**
 * POST /api/v1/sms/inbound
 *
 * Twilio inbound SMS webhook. Twilio POSTs application/x-www-form-urlencoded
 * with at minimum `From` and `Body` fields. We honor STOP (case-insensitive,
 * trimmed) by adding the sender to the opt-out set and replying with TwiML.
 *
 * Public webhook: no rate limit (Twilio retries aggressively on non-200).
 *
 * Authenticity: every request is verified via X-Twilio-Signature
 * before we trust the From field. Without this, an attacker who
 * knows a target's phone number could curl this endpoint with
 * `From=+15551234567,Body=STOP` and silence the target's perk
 * SMS — a real opt-out-spoofing attack.
 *
 * Dev-mode bypass: when TWILIO_AUTH_TOKEN is unset, signatures are
 * accepted but we log a warning. The readiness probe surfaces the
 * missing token as a configuration issue.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { markOptedOut } from "@/lib/sms/post-purchase";
import {
  verifyTwilioSignature,
  canonicalWebhookUrl,
} from "@/lib/sms/twilio-signature";

export const runtime = "nodejs";

const EMPTY_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
const STOP_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You've been unsubscribed.</Message></Response>`;

function emptyResponse(): NextResponse {
  return new NextResponse(EMPTY_TWIML, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const form = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      // Form-only — skip File entries (Twilio doesn't send these
      // for inbound SMS).
      if (typeof value === "string") params[key] = value;
    }

    // Verify the signature BEFORE trusting any of the form values.
    // A spoofed STOP could opt-out a legitimate customer; we treat
    // failed verification as silent-drop (return EMPTY_TWIML) so
    // attackers don't get a useful error signal.
    const sigResult = verifyTwilioSignature({
      url: canonicalWebhookUrl(req.url),
      params,
      signature: req.headers.get("x-twilio-signature"),
    });
    if (!sigResult.valid) {
      console.warn(
        `[sms/inbound] rejected: ${sigResult.reason ?? "unknown"} ` +
          `(from=${params.From?.slice(0, 6) ?? "?"}…)`,
      );
      return emptyResponse();
    }
    if (sigResult.reason === "no_auth_token_dev_mode") {
      console.warn("[sms/inbound] dev mode — TWILIO_AUTH_TOKEN unset, accepting signature without verification");
    }

    const from = (params.From ?? "").trim();
    const body = (params.Body ?? "").trim().toUpperCase();

    if (from && (body === "STOP" || body === "STOPALL" || body === "UNSUBSCRIBE" || body === "CANCEL" || body === "QUIT")) {
      // Persist the opt-out before responding so a redeploy mid-flight
      // doesn't lose the unsubscribe. markOptedOut writes through to
      // Postgres when DATABASE_URL is set; in-memory otherwise.
      await markOptedOut(from, "user_replied_stop");
      return new NextResponse(STOP_TWIML, {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    return emptyResponse();
  } catch (e) {
    // Never 500 to Twilio — they'll retry. Log and return empty TwiML.
    console.error("sms/inbound error", e);
    return emptyResponse();
  }
}
