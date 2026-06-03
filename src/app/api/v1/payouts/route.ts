/**
 * /api/v1/payouts
 *
 * GET:  Return the influencer's payout account status and history.
 * POST: Actions: create_account, request_payout, get_status.
 *
 * Auth required on all methods.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  requireCsrf,
  rateLimit,
  parseBody,
  withTiming,
} from "../_shared";
import {
  createConnectAccount,
  getOnboardingLink,
  getAccountStatus,
  requestPayout,
  getPayoutHistory,
} from "@/lib/payouts";

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // Identity is derived from the session, never the client — prevents an IDOR
  // where `?influencerId=` would expose another creator's payout account/history.
  const influencerId = user.id;

  const account = await getAccountStatus(influencerId);
  const history = getPayoutHistory(influencerId);

  return ok({
    account,
    payouts: history,
    totalPaid: history
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0),
    pendingAmount: history
      .filter((p) => p.status === "pending" || p.status === "processing")
      .reduce((sum, p) => sum + p.amount, 0),
  });
});

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // CSRF — enforce on mutating routes (PR: live audit found bypass)
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

  const body = await parseBody<{
    action: string;
    influencerId?: string;
    email?: string;
    amount?: number;
    currency?: string;
    returnUrl?: string;
    refreshUrl?: string;
  }>(req);
  if (body instanceof Response) return body;

  const { action } = body;
  // Identity from the session only (ignore body.influencerId) — prevents acting
  // on another creator's payout account or triggering their payouts (IDOR).
  const influencerId = user.id;

  // ── create_account ─────────────────────────────────────────────────────
  if (action === "create_account") {
    const email = body.email ?? user.email;
    if (!email) {
      return err("MISSING_EMAIL", "Email is required to create a payout account", 400);
    }

    const returnUrl =
      body.returnUrl ?? `${req.headers.get("origin") ?? "http://localhost:3000"}/influencer/payouts?onboarding=complete`;
    const refreshUrl =
      body.refreshUrl ?? `${req.headers.get("origin") ?? "http://localhost:3000"}/influencer/payouts?onboarding=refresh`;

    try {
      const account = await createConnectAccount(influencerId, email);

      // Also get the onboarding link
      const onboarding = await getOnboardingLink(
        influencerId,
        returnUrl,
        refreshUrl
      );

      return ok({
        account,
        onboardingUrl: onboarding.url,
        mock: onboarding.mock,
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to create payout account";
      return err("ACCOUNT_CREATION_FAILED", message, 500);
    }
  }

  // ── request_payout ─────────────────────────────────────────────────────
  if (action === "request_payout") {
    const { amount, currency } = body;

    if (!amount || typeof amount !== "number") {
      return err("MISSING_AMOUNT", "amount is required (in cents)", 400);
    }

    if (amount < 1000) {
      return err(
        "BELOW_MINIMUM",
        "Minimum payout amount is $10.00 (1000 cents)",
        400
      );
    }

    try {
      const payout = await requestPayout(
        influencerId,
        amount,
        currency ?? "usd"
      );
      return ok({ payout });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to process payout request";
      return err("PAYOUT_FAILED", message, 400);
    }
  }

  // ── get_status ─────────────────────────────────────────────────────────
  if (action === "get_status") {
    try {
      const account = await getAccountStatus(influencerId);
      const history = getPayoutHistory(influencerId);

      return ok({
        account,
        payouts: history,
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to get account status";
      return err("STATUS_FAILED", message, 500);
    }
  }

  return err(
    "INVALID_ACTION",
    `Unknown action: '${action}'. Valid actions: create_account, request_payout, get_status`,
    400
  );
});
