/**
 * POST /api/v1/submissions/public
 *
 * Anonymous, no-auth, no-CSRF submission endpoint for two callers:
 *   1. The public campaign page (`/c/[campaignId]`) where customers complete
 *      a perk action without signing up.
 *   2. The embeddable perk widget (`/api/v1/widget/embed`) which loads on
 *      third-party origins and cannot maintain a session cookie.
 *
 * Why it exists: the authenticated `/api/v1/submissions` endpoint requires
 * `requireAuth` + `requireCsrf`, which makes it unreachable from either of
 * the public paths above. Until this route was added, every public-page
 * submission silently 403'd while the UI showed "Thanks, submitted!" — a
 * critical money-path bug surfaced during live click-through testing.
 *
 * Hardening
 *   - Strict tier rate limit (per IP) to deter spam without an auth gate.
 *   - email is required so the business knows who to award.
 *   - userId is deterministically derived from `pub_<sha1(email+campaignId)>`
 *     so duplicate submissions from the same customer/campaign collapse
 *     instead of creating N pending rows.
 *   - The campaign must exist and be in an `active` state.
 *   - Honeypot field `_hp` rejects naive bots when present + non-empty.
 *   - Source flag `public_campaign_page` | `widget` is captured in metadata
 *     so analytics can split the funnels later.
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
import { withIdempotency } from "@/lib/api/idempotency";
import { createSubmission } from "@/lib/submissions";
import type { ProofType } from "@/lib/types";
import {
  validateId,
  validateString,
  validateEnum,
  validateEmail,
} from "@/lib/security/validate";
import { campaignManager } from "@/lib/campaign-state-machine";
import { eventPublisher } from "@/lib/realtime/publisher";

interface PublicSubmissionBody {
  campaignId?: string;
  actionId?: string;
  proofUrl?: string;
  proofType?: string;
  email?: string;
  notes?: string;
  source?: "public_campaign_page" | "widget" | string;
  /** honeypot */
  _hp?: string;
}

function deriveUserId(email: string, campaignId: string): string {
  const hash = createHash("sha1").update(`${email}|${campaignId}`).digest("hex").slice(0, 16);
  return `pub_${hash}`;
}

export const POST = withTiming(withIdempotency(async (req: NextRequest) => {
  // Strict rate limit — this is the public spam vector.
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const body = await parseBody<PublicSubmissionBody>(req);
  if (body instanceof Response) return body;

  // Honeypot: real browsers leave `_hp` blank/undefined. Naive bots fill all fields.
  if (typeof body._hp === "string" && body._hp.trim().length > 0) {
    return ok({ submitted: true, throttled: true }, 202);
  }

  const cv = validateId(body.campaignId);
  if (!cv.success) return err("INVALID_CAMPAIGN_ID", cv.error, 400);

  const av = validateId(body.actionId);
  if (!av.success) return err("INVALID_ACTION_ID", av.error, 400);

  const pv = validateString(body.proofUrl, "proofUrl", { min: 1, max: 2048 });
  if (!pv.success) return err("INVALID_PROOF_URL", pv.error, 400);

  const pt = validateEnum(
    body.proofType,
    "proofType",
    ["screenshot", "url", "video"] as const
  );
  if (!pt.success) return err("INVALID_PROOF_TYPE", pt.error, 400);

  const ev = validateEmail(body.email);
  if (!ev.success) return err("INVALID_EMAIL", ev.error, 400);

  // Campaign must exist and be reachable from a public page.
  const campaign = campaignManager.getState(cv.data);
  if (!campaign) {
    return err("CAMPAIGN_NOT_FOUND", "Campaign does not exist", 404);
  }
  if (campaign.state !== "active") {
    return err(
      "CAMPAIGN_NOT_ACTIVE",
      `Campaign is ${campaign.state} and is not accepting submissions`,
      409
    );
  }

  const userId = deriveUserId(ev.data, cv.data);
  const source = typeof body.source === "string"
    ? body.source.slice(0, 64)
    : "public_campaign_page";
  const notes = typeof body.notes === "string"
    ? body.notes.slice(0, 1000)
    : undefined;

  const result = createSubmission(
    cv.data,
    userId,
    av.data,
    pv.data,
    pt.data as ProofType,
    {
      email: ev.data,
      notes,
      source,
      anonymous: true,
    }
  );

  if (!result.success) {
    return err(result.error!.code, result.error!.message, 400);
  }

  eventPublisher.publish(
    "submission.created",
    { submissionId: result.data!.id, campaignId: cv.data },
    campaign.businessId
  );

  return ok({ submission: result.data, anonymous: true }, 201);
}));
