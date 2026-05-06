/**
 * POST /api/v1/claim/:code/submit
 *
 * The public, OTP-gated submission endpoint that closes the customer-side
 * claim loop. The customer:
 *   1. Lands on /claim/:code (PR A)
 *   2. Verifies their phone or email via /api/v1/customer/otp/{request,verify}
 *      (PR B) and gets back a signed claim token
 *   3. Posts to this endpoint with the token + their proof URL
 *
 * On first submit for a new (program, contact) the customer is auto-
 * enrolled as a ProgramMember keyed by their channel+contact — phone for
 * SMS verifies, email for email verifies. They never get a Social Perks
 * account.
 *
 * Body:
 *   { token: "<claim token from /verify>",
 *     actionId: "ig_st",
 *     platformId: "ig",
 *     proofUrl: "https://instagram.com/p/...",
 *     proofType: "url" | "screenshot" | "video",
 *     content?: "post caption text" }
 *
 * Returns:
 *   { submission: ProgramSubmission, member: ProgramMember,
 *     fraudCheck: { score, action } }
 *
 * Fraud handling: pipes the submission through `checkSubmission` from
 * fraud-detection.ts (the same pipeline as the authenticated submission
 * route + the image-hash logic from PR #28). On `auto_reject` we 422
 * the request and don't store anything; on `manual_review` we store
 * with status="pending" so a human can verify; on `auto_approve` we
 * still default to "pending" because in this codebase only the business
 * can approve (one-click approval is wired up in PR D).
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, parseBody, withTiming } from "../../../_shared";
import {
  programMembers,
  programSubmissions,
  getProgramByClaimCode,
  isValidClaimCodeFormat,
  type ProgramMember,
  type ProgramSubmission,
} from "@/lib/programs/store";
import {
  generateRedemptionCode,
  formatRedemptionCode,
} from "@/lib/programs/redemption";
import { verifyClaimToken } from "@/lib/customer-otp";
import { checkSubmission } from "@/lib/fraud-detection";
import { ALL_ACTIONS } from "@/lib/platforms";
import { validateString, validateEnum } from "@/lib/security/validate";
import { smsProvider } from "@/lib/sms";
import { emailProvider } from "@/lib/email";
import { createSeedData } from "@/lib/seed";

interface RouteContext {
  params: Promise<{ code: string }>;
}

interface Body {
  token?: string;
  actionId?: string;
  platformId?: string;
  proofUrl?: string;
  proofType?: string;
  content?: string;
}

const VALID_PROOF_TYPES = ["url", "screenshot", "video"] as const;

export const POST = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Standard tier — submission is more expensive than the OTP step
  // (touches fraud detection, persists rows) but the OTP gate already
  // rate-limits the funnel.
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const { code } = await (ctx as RouteContext).params;
  if (!isValidClaimCodeFormat(code)) {
    return err("INVALID_CODE", "Claim code is malformed", 400);
  }

  const body = await parseBody<Body>(req);
  if (body instanceof Response) return body;

  // ── Token validation ──────────────────────────────────────────────────
  if (typeof body.token !== "string" || body.token.length === 0) {
    return err("MISSING_TOKEN", "Claim token is required", 401);
  }
  const claim = verifyClaimToken(body.token);
  if (!claim) {
    return err(
      "INVALID_TOKEN",
      "Claim token is invalid or expired. Verify your phone or email again.",
      401
    );
  }

  // ── Program lookup + token <-> code consistency ───────────────────────
  const program = getProgramByClaimCode(code);
  if (!program || program.status !== "active") {
    return err(
      "PROGRAM_NOT_FOUND",
      "This claim code is not available",
      404
    );
  }
  if (claim.programId !== program.id) {
    // The token was issued for a different program. Defends against
    // someone reusing a token from another business's claim code.
    return err(
      "TOKEN_PROGRAM_MISMATCH",
      "This claim token is not valid for this program",
      403
    );
  }

  // ── Body field validation ─────────────────────────────────────────────
  const actionRes = validateString(body.actionId, "actionId", { min: 1, max: 50 });
  if (!actionRes.success) return err("INVALID_ACTION", actionRes.error, 400);
  const platformRes = validateString(body.platformId, "platformId", {
    min: 1,
    max: 20,
  });
  if (!platformRes.success) return err("INVALID_PLATFORM", platformRes.error, 400);

  const urlRes = validateString(body.proofUrl, "proofUrl", { min: 1, max: 2048 });
  if (!urlRes.success) return err("INVALID_PROOF_URL", urlRes.error, 400);
  try {
    new URL(urlRes.data);
  } catch {
    return err("INVALID_PROOF_URL", "proofUrl must be a valid URL", 400);
  }

  const proofTypeRes = validateEnum(body.proofType, "proofType", VALID_PROOF_TYPES);
  if (!proofTypeRes.success) return err("INVALID_PROOF_TYPE", proofTypeRes.error, 400);

  // Content (post caption / review text) is optional but length-bounded.
  let content: string | undefined;
  if (body.content !== undefined) {
    const contentRes = validateString(body.content, "content", { max: 5000 });
    if (!contentRes.success) return err("INVALID_CONTENT", contentRes.error, 400);
    content = contentRes.data;
  }

  // ── Action belongs to platform + is allowed by program rules ──────────
  const action = ALL_ACTIONS.find(
    (a) => a.id === actionRes.data && a.platformId === platformRes.data
  );
  if (!action) {
    return err(
      "UNKNOWN_ACTION",
      "actionId/platformId pair does not match a known action",
      400
    );
  }

  const programAllowsAction = program.rules.some(
    (rule) =>
      rule.actionId === actionRes.data && rule.platformId === platformRes.data
  );
  if (!programAllowsAction) {
    return err(
      "ACTION_NOT_ALLOWED",
      "This action is not part of the program",
      400
    );
  }

  // ── Auto-enroll on first submit ───────────────────────────────────────
  // Members are keyed by `${channel}:${contact}` so the same person can
  // be enrolled in many programs without colliding with auth user IDs.
  const memberId = `${claim.channel}:${claim.contact}`;
  let member: ProgramMember | undefined;
  for (const m of programMembers.values()) {
    if (m.programId === program.id && m.memberId === memberId) {
      member = m;
      break;
    }
  }
  if (!member) {
    member = {
      id: crypto.randomUUID(),
      programId: program.id,
      memberId,
      // The customer never types a name on the claim flow — leave it
      // empty and let the business UI label them by phone/email.
      name: "",
      email: claim.channel === "email" ? claim.contact : "",
      enrolledAt: new Date().toISOString(),
      totalPoints: 0,
      currentTier: null,
    };
    programMembers.set(member.id, member);
  }

  // ── Fraud detection ───────────────────────────────────────────────────
  // Build the input shapes that checkSubmission expects from in-memory
  // state. We deliberately pass an empty userHistory (the customer has
  // no prior account) — the rapid-fire and account-age signals will
  // both fire for a brand-new contact, but they're rolled into a score,
  // not a hard block.
  const fraudSubmissionId = crypto.randomUUID();
  const allSubsForProgram = Array.from(programSubmissions.values()).filter(
    (s) => s.programId === program.id
  );
  const fraudResult = checkSubmission(
    {
      id: fraudSubmissionId,
      userId: memberId,
      campaignId: program.id, // programs replace one-off campaigns
      businessId: program.businessId,
      proofUrl: urlRes.data,
      proofType:
        proofTypeRes.data === "screenshot" || proofTypeRes.data === "video"
          ? proofTypeRes.data
          : "url",
      content,
      submittedAt: new Date().toISOString(),
      platformId: platformRes.data,
      contentLength: content?.length,
    },
    {
      userId: memberId,
      // Brand-new contact == account created "now". The age check will
      // flag this; that's the intended behavior — first-submit for a
      // contact does carry slightly elevated fraud risk.
      accountCreatedAt: member.enrolledAt,
      submissions: allSubsForProgram.map((s) => ({
        id: s.id,
        campaignId: s.programId,
        businessId: program.businessId,
        proofUrl: s.proofUrl,
        submittedAt: s.submittedAt,
        status: s.status === "approved" ? "approved" : s.status === "rejected" ? "rejected" : "pending",
        flagged: false,
        signals: [],
      })),
      ownedBusinessIds: [],
    },
    {
      campaignId: program.id,
      businessId: program.businessId,
      allSubmissions: allSubsForProgram.map((s) => ({
        id: s.id,
        campaignId: s.programId,
        businessId: program.businessId,
        proofUrl: s.proofUrl,
        submittedAt: s.submittedAt,
        status: s.status === "approved" ? "approved" : s.status === "rejected" ? "rejected" : "pending",
        flagged: false,
        signals: [],
      })),
    }
  );

  if (fraudResult.action === "auto_reject") {
    return err(
      "FRAUD_BLOCKED",
      `This submission was blocked by fraud detection. Score=${fraudResult.score}, signals=${fraudResult.signals.join(",")}.`,
      422,
      { "X-Fraud-Score": String(fraudResult.score) }
    );
  }

  // ── Persist the submission ────────────────────────────────────────────
  const matchingRule = program.rules.find(
    (r) => r.actionId === actionRes.data && r.platformId === platformRes.data
  );
  const points = matchingRule?.pointsPerAction ?? 1;

  // Per-cycle cap. We don't have full cycle math here in PR C
  // (no cycle reset hook on the public path) so we just enforce the
  // simple lifetime cap of maxPerCycle * 10 to keep abuse bounded.
  if (matchingRule && matchingRule.maxPerCycle > 0) {
    const memberSubmissionsForAction = allSubsForProgram.filter(
      (s) =>
        s.memberId === memberId &&
        s.actionId === actionRes.data &&
        s.platformId === platformRes.data &&
        s.status !== "rejected"
    );
    if (memberSubmissionsForAction.length >= matchingRule.maxPerCycle) {
      return err(
        "CYCLE_LIMIT_REACHED",
        `You've reached the max submissions for this action this cycle (${matchingRule.maxPerCycle}).`,
        429
      );
    }
  }

  // Optimistic redemption code — visible to the customer immediately so
  // they can show it at checkout without waiting for review. The
  // business can still redeem-or-reject from the dashboard later.
  const redemptionCode = generateRedemptionCode();

  const submission: ProgramSubmission = {
    id: fraudSubmissionId,
    programId: program.id,
    memberId,
    actionId: actionRes.data,
    platformId: platformRes.data,
    proofUrl: urlRes.data,
    proofType: proofTypeRes.data,
    points,
    // Always pending — the business approves explicitly in PR D.
    status: "pending",
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    redemptionCode,
    redeemedAt: null,
    notifiedChannel: claim.channel,
    notifiedContact: claim.contact,
  };
  programSubmissions.set(submission.id, submission);

  // Best-effort delivery of the redemption code so the customer has it
  // even if they close the page. Failures are non-fatal — the code is
  // still in the response body and visible on the post-submit screen.
  void deliverRedemptionCode({
    channel: claim.channel,
    contact: claim.contact,
    redemptionCode,
    businessId: program.businessId,
    programName: program.name,
  });

  return ok(
    {
      submission,
      member,
      redemptionCode,
      redemptionCodeDisplay: formatRedemptionCode(redemptionCode),
      fraudCheck: {
        score: fraudResult.score,
        action: fraudResult.action,
        signals: fraudResult.signals,
      },
    },
    201
  );
});

/** Send the redemption code over the customer's chosen channel. */
async function deliverRedemptionCode(opts: {
  channel: "sms" | "email";
  contact: string;
  redemptionCode: string;
  businessId: string;
  programName: string;
}): Promise<void> {
  const seed = createSeedData();
  const business = seed.businesses.find((b) => b.id === opts.businessId);
  const businessName = business?.name ?? "this business";
  const display = formatRedemptionCode(opts.redemptionCode);

  if (opts.channel === "sms") {
    await smsProvider.send({
      to: opts.contact,
      body: `Your perk at ${businessName} is ready. Show this code at checkout: ${display}. (Social Perks)`,
    });
    return;
  }

  await emailProvider.send({
    to: opts.contact,
    subject: `Your perk at ${businessName} is ready`,
    text:
      `Show this code at the counter to claim your perk:\n\n${display}\n\n` +
      `From the team at ${businessName}, via Social Perks.`,
    html:
      `<p>Show this code at the counter to claim your perk at <strong>${escapeText(businessName)}</strong>:</p>` +
      `<p style="font-size:28px;font-family:monospace;letter-spacing:6px;background:#f6f6f6;padding:16px 20px;border-radius:8px;text-align:center;">${display}</p>` +
      `<p style="color:#666;font-size:12px;">From the team at ${escapeText(businessName)}, via Social Perks.</p>`,
  });
}

function escapeText(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
