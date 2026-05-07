/**
 * GET /api/v1/submissions/:submissionId/receipt
 *
 * Public, cacheable retrieval of a signed attestation receipt for an
 * approved submission. Closes the agent-attraction audit's
 * "attestation / signed receipts" gap (#42) along with the receipts
 * library and the verify endpoint.
 *
 * Public because:
 *   - The receipt itself is the trust artifact — its security comes
 *     from the HMAC, not from access control.
 *   - Any party in the transaction (brand, creator, agents on either
 *     side) needs to be able to fetch it.
 *
 * 404 cases (kept generic — don't leak whether a submission exists):
 *   - Submission not found
 *   - Submission exists but not yet approved (no receipt issued)
 *   - Receipt was issued but the in-memory ring evicted it (Postgres
 *     persistence is the follow-up that closes this last case)
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, withTiming } from "../../../_shared";
import { getReceiptForSubmission } from "@/lib/receipts";

interface RouteContext {
  params: Promise<{ submissionId: string }>;
}

export const GET = withTiming(async (req: NextRequest, ctx?: unknown) => {
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const { submissionId } = await (ctx as RouteContext).params;
  if (!submissionId || typeof submissionId !== "string" || submissionId.length > 200) {
    return err("INVALID_SUBMISSION_ID", "submissionId is missing or malformed", 400);
  }

  const stored = getReceiptForSubmission(submissionId);
  if (!stored) {
    return err(
      "NO_RECEIPT",
      "No signed receipt available for this submission. Receipts are issued at approval time.",
      404
    );
  }

  return ok(
    {
      token: stored.token,
      payload: stored.payload,
      algorithm: "HMAC-SHA256",
      verifyEndpoint: "POST /api/v1/receipts/verify",
      docs: "/AGENTS.md#receipts",
    },
    200,
    { "Cache-Control": "public, max-age=300, s-maxage=300" }
  );
});
