/**
 * POST /api/v1/customer/otp/request
 *
 * Public, rate-limited. Body:
 *   { code: "ABCD23",            // claim code (string, see PR A)
 *     channel: "sms" | "email",  // delivery method
 *     contact: "+15551234567" | "user@example.com" }
 *
 * Issues a fresh OTP, stores it (hashed) in customer_otp, and dispatches
 * the code via Twilio (sms) or Resend (email). The plaintext code never
 * leaves this process — only the hash and metadata are stored.
 *
 * Response is intentionally vague — we don't reveal whether the contact
 * "exists", whether SMS delivery actually succeeded, or whether the
 * code was a re-issue. The customer always sees:
 *   { delivered: true, channel, expiresAt }
 * unless the request itself is malformed (invalid code, bad channel,
 * etc.) which 4xxes loudly.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, parseBody, withTiming } from "../../../_shared";
import {
  getProgramByClaimCode,
  isValidClaimCodeFormat,
} from "@/lib/programs/store";
import { createOtp, OTP_CONSTANTS } from "@/lib/customer-otp";
import { smsProvider, isValidE164 } from "@/lib/sms";
import { emailProvider } from "@/lib/email";
import { validateEmail } from "@/lib/security/validate";

interface Body {
  code?: string;
  channel?: string;
  contact?: string;
}

export const POST = withTiming(async (req: NextRequest) => {
  // Strict rate limit — OTP delivery costs money. 5 req/min/IP.
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const body = await parseBody<Body>(req);
  if (body instanceof Response) return body;

  const { code, channel, contact } = body;

  if (!code || !isValidClaimCodeFormat(code)) {
    return err("INVALID_CODE", "Claim code is missing or malformed", 400);
  }

  if (channel !== "sms" && channel !== "email") {
    return err("INVALID_CHANNEL", "channel must be 'sms' or 'email'", 400);
  }

  // Validate the contact for the chosen channel.
  let normalizedContact: string;
  if (channel === "sms") {
    if (!isValidE164(contact)) {
      return err(
        "INVALID_PHONE",
        "Phone must be E.164 format (e.g. +15551234567)",
        400
      );
    }
    normalizedContact = contact;
  } else {
    const emailResult = validateEmail(contact);
    if (!emailResult.success) {
      return err("INVALID_EMAIL", emailResult.error, 400);
    }
    normalizedContact = emailResult.data;
  }

  const program = getProgramByClaimCode(code);
  if (!program || program.status !== "active") {
    // Same response shape the GET endpoint uses — don't leak existence.
    return err(
      "PROGRAM_NOT_FOUND",
      "This claim code is not available",
      404
    );
  }

  const { code: otpCode, expiresAt } = await createOtp(
    program.id,
    channel,
    normalizedContact
  );

  // Best-effort delivery. We deliberately don't surface delivery failures
  // to the caller — failed sends still let the customer fall through to
  // the verify step (where they'll get not_found / wrong_code), and
  // exposing failures here would leak whether a phone is reachable.
  if (channel === "sms") {
    void smsProvider.send({
      to: normalizedContact,
      body: `${otpCode} is your Social Perks verification code for ${program.name}. Expires in 5 minutes.`,
    });
  } else {
    void emailProvider.send({
      to: normalizedContact,
      subject: `Your Social Perks verification code: ${otpCode}`,
      text: `Your verification code is ${otpCode}. It expires in 5 minutes.\n\nIf you didn't request this, you can ignore the message.`,
      html: `<p>Your verification code for <strong>${escapeText(program.name)}</strong> is:</p>` +
        `<p style="font-size:24px;font-family:monospace;letter-spacing:4px;">${otpCode}</p>` +
        `<p>It expires in 5 minutes. If you didn't request this, you can ignore the message.</p>`,
    });
  }

  return ok({
    delivered: true,
    channel,
    expiresAt,
    ttlSeconds: OTP_CONSTANTS.OTP_TTL_SECONDS,
  });
});

/** Cheap HTML-escape for the program name in the email body. */
function escapeText(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
