/**
 * POST /api/v1/sms/inbound
 *
 * Twilio inbound SMS webhook. Twilio POSTs application/x-www-form-urlencoded
 * with at minimum `From` and `Body` fields. We honor STOP (case-insensitive,
 * trimmed) by adding the sender to the opt-out set and replying with TwiML.
 *
 * Public webhook: no rate limit (Twilio retries aggressively on non-200).
 * Authenticity: in production we should verify X-Twilio-Signature using
 * TWILIO_AUTH_TOKEN — TODO once production keys are in place.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { markOptedOut } from "@/lib/sms/post-purchase";

export const runtime = "nodejs";

const EMPTY_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
const STOP_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You've been unsubscribed.</Message></Response>`;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const form = await req.formData();
    const from = String(form.get("From") ?? "").trim();
    const body = String(form.get("Body") ?? "")
      .trim()
      .toUpperCase();

    if (from && body === "STOP") {
      // Persist the opt-out before responding so a redeploy mid-flight
      // doesn't lose the unsubscribe. markOptedOut now writes through
      // to Postgres when DATABASE_URL is set; in-memory otherwise.
      await markOptedOut(from, "user_replied_stop");
      return new NextResponse(STOP_TWIML, {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    return new NextResponse(EMPTY_TWIML, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (e) {
    // Never 500 to Twilio — they'll retry. Log and return empty TwiML.
    console.error("sms/inbound error", e);
    return new NextResponse(EMPTY_TWIML, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
