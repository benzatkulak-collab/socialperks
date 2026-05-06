/**
 * POST /api/v1/customer/otp/verify
 *
 * Public, rate-limited. Body:
 *   { code: "ABCD23",            // claim code (matches request endpoint)
 *     channel: "sms" | "email",
 *     contact: "+15551234567" | "user@example.com",
 *     otp: "123456" }            // 6-digit code from SMS/email
 *
 * On success: returns a short-lived signed claim token bound to
 * (programId, channel, contact). The token is what the submit endpoint
 * (PR C) will accept as proof of ownership. It is NOT a session token —
 * the customer never gets a full account from this flow.
 *
 * On failure: a generic error code so brute-forcers learn as little as
 * possible about which leg of the verification failed.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, parseBody, withTiming } from "../../../_shared";
import {
  getProgramByClaimCode,
  isValidClaimCodeFormat,
} from "@/lib/programs/store";
import { verifyOtp, OTP_CONSTANTS } from "@/lib/customer-otp";
import { isValidE164 } from "@/lib/sms";
import { validateEmail } from "@/lib/security/validate";

interface Body {
  code?: string;
  channel?: string;
  contact?: string;
  otp?: string;
}

export const POST = withTiming(async (req: NextRequest) => {
  // Strict tier — keeps brute force on the OTP space (10^6) bounded
  // even on top of the per-code 5-attempt budget.
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const body = await parseBody<Body>(req);
  if (body instanceof Response) return body;

  const { code, channel, contact, otp } = body;

  if (!code || !isValidClaimCodeFormat(code)) {
    return err("INVALID_CODE", "Claim code is missing or malformed", 400);
  }
  if (channel !== "sms" && channel !== "email") {
    return err("INVALID_CHANNEL", "channel must be 'sms' or 'email'", 400);
  }
  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return err("INVALID_OTP", "OTP must be a 6-digit string", 400);
  }

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
    const result = validateEmail(contact);
    if (!result.success) {
      return err("INVALID_EMAIL", result.error, 400);
    }
    normalizedContact = result.data;
  }

  const program = getProgramByClaimCode(code);
  if (!program || program.status !== "active") {
    return err("PROGRAM_NOT_FOUND", "This claim code is not available", 404);
  }

  const result = await verifyOtp(program.id, channel, normalizedContact, otp);
  if (!result.success) {
    // Map the error codes to HTTP statuses without leaking which one.
    // 401 = bad code, 410 = expired/exhausted (caller should request a
    // fresh code).
    const status = result.error === "expired" || result.error === "too_many_attempts" ? 410 : 401;
    return err(
      "VERIFICATION_FAILED",
      "OTP verification failed. Request a new code if needed.",
      status,
      // Surface the specific reason in a machine-readable header for
      // the UI but keep the body generic.
      { "X-Otp-Reason": String(result.error ?? "unknown") }
    );
  }

  return ok({
    token: result.token,
    programId: program.id,
    channel,
    expiresInSeconds: OTP_CONSTANTS.CLAIM_TOKEN_TTL_SECONDS,
  });
});
