/**
 * POST /api/v1/sms/enqueue
 *
 * Production endpoint an authenticated business (or its AI agent)
 * calls to schedule a post-purchase SMS. Distinct from:
 *   - /api/v1/sms/test    — admin-only, fires immediately for QA
 *   - /api/v1/pos/*       — POS providers post here, not agents
 *
 * Why a dedicated endpoint:
 * The MCP server's `enqueue_post_purchase_sms` tool used to call
 * /sms/test. That meant agents needed the WAITLIST_ADMIN_TOKEN
 * (which we obviously cannot ship to agents) — so the tool was
 * effectively unusable for real shop owners. This route is the
 * production-grade path: Bearer-key auth, scope-checked, rate-limited.
 *
 * Auth: Bearer API key from /api/v1/dev/init or dashboard.
 * Scopes: requires "write" or "sms:enqueue" — read-only keys can't
 *         queue customer SMS.
 * Rate limit: standard tier. The cron drain handles delivery; this
 *             only writes a row.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ok, err, rateLimit, parseBody } from "../../_shared";
import { verifyFromHeaders } from "@/lib/api-keys/verify";
import { enqueuePostPurchaseSms } from "@/lib/sms/post-purchase";

export const runtime = "nodejs";

interface EnqueueBody {
  customerPhone?: unknown;
  campaignId?: unknown;
  /** Defaults to 120 (2 hours). Pass 0 for immediate (subject to scope). */
  delayMinutes?: unknown;
  /** Optional perk text — replaces "{perkText}" in the templated body. */
  perkText?: unknown;
  /** Optional purchase amount, used for analytics + SMS personalization. */
  purchaseAmount?: unknown;
  /**
   * Optional businessName override. When omitted, the verified key's
   * business is looked up by id. Today the api_keys table doesn't
   * carry a denormalized business_name column so the caller must
   * pass it; this also matches the agent-runnable signup flow where
   * the agent already knows the name from its own session.
   */
  businessName?: unknown;
}

const E164_RE = /^\+[1-9]\d{6,14}$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // Auth: Bearer API key.
  const verified = await verifyFromHeaders(req.headers);
  if (!verified || !verified.businessId) {
    return err(
      "UNAUTHORIZED",
      "Bearer API key required. Get one with `npx @socialperks/cli init`.",
      401,
    );
  }

  // Scope check: read-only keys can't queue customer-facing SMS.
  const writeOk =
    verified.scopes.includes("write") ||
    verified.scopes.includes("sms:enqueue") ||
    verified.scopes.includes("admin");
  if (!writeOk) {
    return err(
      "INSUFFICIENT_SCOPE",
      "This API key has read-only scope. Promote to write via the dashboard.",
      403,
    );
  }

  const body = await parseBody<EnqueueBody>(req);
  if (body instanceof NextResponse) return body;

  const customerPhone =
    typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
  if (!E164_RE.test(customerPhone)) {
    return err(
      "INVALID_PHONE",
      "customerPhone must be E.164 format, e.g. +14155551234",
      400,
    );
  }

  const campaignId =
    typeof body.campaignId === "string" ? body.campaignId.slice(0, 100) : "";
  if (!campaignId) {
    return err("INVALID_CAMPAIGN", "campaignId is required", 400);
  }

  // Bounds-check delay. Negative is rejected; massive values are clamped
  // to 7 days so a typo doesn't park a row in the queue forever.
  const rawDelay =
    typeof body.delayMinutes === "number" && Number.isFinite(body.delayMinutes)
      ? body.delayMinutes
      : 120;
  const delayMinutes = Math.max(0, Math.min(rawDelay, 7 * 24 * 60));

  const businessName =
    typeof body.businessName === "string" && body.businessName.trim().length > 0
      ? body.businessName.slice(0, 200).trim()
      : "Your Business";

  const perkText =
    typeof body.perkText === "string" && body.perkText.trim().length > 0
      ? body.perkText.slice(0, 100).trim()
      : "next one";

  const purchaseAmount =
    typeof body.purchaseAmount === "number" && body.purchaseAmount > 0
      ? body.purchaseAmount
      : 0;

  const queued = enqueuePostPurchaseSms({
    businessId: verified.businessId,
    businessName,
    campaignId,
    customerPhone,
    purchaseAmount,
    delayMinutes,
    perkText,
  });

  return ok({
    queued: {
      id: queued.id,
      status: queued.status,
      scheduledFor: queued.scheduledFor,
    },
  });
}
