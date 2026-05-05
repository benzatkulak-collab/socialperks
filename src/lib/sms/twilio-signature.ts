/**
 * Twilio request signature verification.
 *
 * Twilio signs every webhook with HMAC-SHA1, header
 * `X-Twilio-Signature`. The signature is computed over:
 *
 *   url + sorted_form_keys.map(k => k + form[k]).join('')
 *
 * where `url` is the full URL Twilio called (we get this back via
 * `req.url`, but proxies can lie — TWILIO_WEBHOOK_URL env override
 * lets you pin the canonical URL Twilio is configured to call), and
 * the form values are the application/x-www-form-urlencoded body
 * decoded into key/value pairs.
 *
 * Why HMAC-SHA1: Twilio's protocol predates SHA-256. Constant-time
 * compare via crypto.timingSafeEqual avoids signature-leaking
 * timing attacks.
 *
 * What this protects against: an attacker who knows a phone number
 * and our webhook URL crafting a fake STOP request to opt that
 * number out of receiving texts from us. Without the signature
 * check, anyone can curl /api/v1/sms/inbound -d "From=+15551234,Body=STOP"
 * and silence a customer's perk pipeline.
 *
 * Dev-mode behavior: if TWILIO_AUTH_TOKEN is unset, verifySignature
 * returns true and logs a warning. This keeps local-dev curl flows
 * working while making it impossible to misconfigure production
 * silently — the readiness probe surfaces missing env.
 */

import crypto from "crypto";

interface VerifyArgs {
  /** Full URL Twilio called. Use req.url; pass an override if behind a proxy. */
  url: string;
  /** Form-decoded body fields. Twilio signs only top-level form fields. */
  params: Record<string, string>;
  /** Header value: `X-Twilio-Signature`. */
  signature: string | null;
  /** Override the auth-token source — defaults to TWILIO_AUTH_TOKEN env. */
  authToken?: string;
}

export interface VerifyResult {
  valid: boolean;
  reason?: "missing_signature" | "no_auth_token_dev_mode" | "computed_mismatch" | "timing_unsafe_compare_failed";
}

export function verifyTwilioSignature(args: VerifyArgs): VerifyResult {
  const authToken = args.authToken ?? process.env.TWILIO_AUTH_TOKEN;

  // Dev-mode bypass: when TWILIO_AUTH_TOKEN is unset, accept everything
  // so local curl flows work. Production deployments MUST set the
  // token; the readiness probe surfaces this as a missing check.
  if (!authToken) {
    return { valid: true, reason: "no_auth_token_dev_mode" };
  }

  if (!args.signature) {
    return { valid: false, reason: "missing_signature" };
  }

  // Twilio signs: url + sorted_keys.map(k => k + form[k]).join('')
  const sortedKeys = Object.keys(args.params).sort();
  const data =
    args.url +
    sortedKeys.map((k) => k + (args.params[k] ?? "")).join("");

  const expected = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  // Constant-time compare. Buffers must be the same length or
  // timingSafeEqual throws — guard explicitly.
  const expectedBuf = Buffer.from(expected, "utf-8");
  const providedBuf = Buffer.from(args.signature, "utf-8");
  if (expectedBuf.length !== providedBuf.length) {
    return { valid: false, reason: "computed_mismatch" };
  }
  try {
    const match = crypto.timingSafeEqual(expectedBuf, providedBuf);
    return match
      ? { valid: true }
      : { valid: false, reason: "computed_mismatch" };
  } catch {
    return { valid: false, reason: "timing_unsafe_compare_failed" };
  }
}

/**
 * Compute the canonical URL Twilio used. Falls back to
 * `req.url` (which Next.js produces from the request line).
 * Behind a proxy, set TWILIO_WEBHOOK_URL to the public URL Twilio
 * is configured to call so the signature math matches.
 */
export function canonicalWebhookUrl(reqUrl: string): string {
  const override = process.env.TWILIO_WEBHOOK_URL;
  if (override && override.startsWith("https://")) return override;
  return reqUrl;
}
