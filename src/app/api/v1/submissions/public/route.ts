/**
 * POST /api/v1/submissions/public — Anonymous customer submissions
 *
 * Public-facing campaign pages (/c/[campaignId]) are visited by
 * end-customers who don't have an account on Social Perks. The main
 * /api/v1/submissions endpoint requires `requireAuth` for impersonation
 * resistance, so anonymous customers need a different path.
 *
 * Guards (in order):
 *   1. Strict rate-limit (anonymous flood vector)
 *   2. Honeypot field (`website`) — bots that fill every input get rejected
 *   3. Campaign must exist + be in `active` state
 *   4. Action must be one of the campaign's allowed actions
 *   5. Email-derived userId — derives a stable customer id from the email
 *      so the same email mapping persists across submissions
 *
 * No CSRF: third-party widgets embed the form from arbitrary origins;
 * CSRF would block the legitimate cross-origin POST.
 */

import type { NextRequest } from "next/server";
import { createHash } from "crypto";
import {
  ok,
  err,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import { validateId, validateString, validateEnum } from "@/lib/security/validate";
import { createSubmission } from "@/lib/submissions";
import type { ProofType } from "@/lib/types";
import { campaignManager } from "@/lib/campaign-state-machine";
import { findAction } from "@/lib/platforms";

export const POST = withTiming(async (req: NextRequest) => {
  // 1. Strict rate-limit — anonymous endpoint, no auth bucket to attribute
  //    to, so we rate-limit harder than the authed equivalent.
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  // 2. Parse body
  const body = await parseBody<{
    campaignId?: string;
    actionId?: string;
    email?: string;
    proofUrl?: string;
    proofType?: string;
    website?: string; // honeypot
    metadata?: Record<string, unknown>;
  }>(req);
  if (body instanceof Response) return body;

  // 3. Honeypot — real users never see this field. Bots filling every
  //    input get rejected with a 200 to avoid signaling that the
  //    honeypot was detected.
  if (typeof body.website === "string" && body.website.length > 0) {
    return ok({ submission: null, queued: false }, 200);
  }

  // 4. Validate campaignId
  const cv = validateId(body.campaignId);
  if (!cv.success) return err("INVALID_CAMPAIGN_ID", cv.error, 400);

  // 5. Campaign must exist and be active. Stops submissions to ended /
  //    paused campaigns that would otherwise accumulate noise.
  const lifecycle = campaignManager.getState(cv.data);
  if (!lifecycle) return err("CAMPAIGN_NOT_FOUND", "Campaign not found", 404);
  if (lifecycle.state !== "active") {
    return err(
      "CAMPAIGN_NOT_ACTIVE",
      `Campaign is "${lifecycle.state}". Only active campaigns accept submissions.`,
      409,
    );
  }

  // 6. Validate actionId
  const av = validateId(body.actionId);
  if (!av.success) return err("INVALID_ACTION_ID", av.error, 400);
  // ActionId must be one of the campaign's allowed actions — otherwise
  // a customer could submit a high-reward action under a low-reward
  // campaign.
  const allowed = lifecycle.actions;
  if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(av.data)) {
    return err("ACTION_NOT_ALLOWED", "Action is not part of this campaign", 400);
  }
  if (!findAction(av.data)) {
    return err("INVALID_ACTION_ID", `Unknown action: ${av.data}`, 400);
  }

  // 7. Validate email — required so we can derive a stable userId
  const ev = validateString(body.email, "email", { min: 3, max: 320 });
  if (!ev.success) return err("INVALID_EMAIL", ev.error, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ev.data)) {
    return err("INVALID_EMAIL", "Email is not a valid address", 400);
  }

  // 8. Validate proofUrl + proofType
  const pv = validateString(body.proofUrl, "proofUrl", { min: 1, max: 2048 });
  if (!pv.success) return err("INVALID_PROOF_URL", pv.error, 400);
  const pt = validateEnum(body.proofType, "proofType", ["screenshot", "url", "video", "api_verified"] as const);
  if (!pt.success) return err("INVALID_PROOF_TYPE", pt.error, 400);

  // 9. Derive a stable customer userId from the email. Hashed so the raw
  //    email isn't stored as the primary key; deterministic so repeat
  //    submissions from the same email roll up.
  const emailNorm = ev.data.trim().toLowerCase();
  const customerUserId = `cust_${createHash("sha256").update(emailNorm).digest("hex").slice(0, 24)}`;

  // 10. Create the submission via the engine.
  const result = createSubmission(
    cv.data,
    customerUserId,
    av.data,
    pv.data,
    pt.data as ProofType,
    { ...(body.metadata ?? {}), anonymous: true, email: emailNorm },
  );

  if (!result.success) {
    return err(result.error!.code, result.error!.message, 400);
  }

  return ok({ submission: result.data }, 201);
});
