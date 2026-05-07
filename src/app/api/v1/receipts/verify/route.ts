/**
 * POST /api/v1/receipts/verify
 *
 * Verify a signed attestation receipt. Public — verification is
 * inherent in the HMAC; access control would be redundant.
 *
 * Body: { token: string }
 *
 * Response when valid:
 *   { valid: true, payload: { ... full receipt data ... } }
 *
 * Response when invalid:
 *   { valid: false, error: "<generic>" }
 *   (error reason kept generic on this public surface; agents that
 *    need debug info can use the in-process verifyReceipt helper.)
 *
 * Why this endpoint matters:
 *   - Any third party (a brand's auditor, a creator's accountant,
 *     a different platform that wants to import the work history)
 *     can verify a receipt without holding our signing key — they just
 *     post the token and get back true/false + the verified payload.
 *   - Agents that don't trust the receipt holder can verify
 *     independently before acting on it.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, parseBody, withTiming } from "../../_shared";
import { verifyReceipt } from "@/lib/receipts";

interface Body {
  token?: string;
}

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const body = await parseBody<Body>(req);
  if (body instanceof Response) return body;

  if (typeof body.token !== "string" || body.token.length === 0) {
    return err("MISSING_TOKEN", "Receipt token is required", 400);
  }
  if (body.token.length > 4096) {
    // Receipts are <1KB in practice; cap to defend against amplification.
    return err("TOKEN_TOO_LONG", "Token exceeds maximum length", 400);
  }

  const result = verifyReceipt(body.token);
  if (!result.valid) {
    // Generic "invalid" — public callers shouldn't learn whether the
    // failure was malformed input vs. signature mismatch (timing-side
    // channels for the latter would reveal which signing key is in
    // use).
    return ok({
      valid: false,
      error: "invalid_or_expired_receipt",
    });
  }

  return ok({
    valid: true,
    payload: result.payload,
    algorithm: "HMAC-SHA256",
    issuer: result.payload?.issuer,
    keyId: result.payload?.keyId,
  });
});
