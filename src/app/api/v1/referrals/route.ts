/**
 * Referrals API Route — /api/v1/referrals
 *
 * GET:  Return referral code, link, stats, and referral list for authenticated business.
 * POST: Actions: generate_code, track_signup
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, parseBody, withTiming } from "../_shared";
import {
  generateReferralCode,
  createReferralLink,
  getReferralsByReferrer,
  getReferralStats,
  createReferral,
  trackReferralSignup,
  hydrateReferrals,
  persistReferral,
  persistBusinessCode,
} from "@/lib/referrals";

// ─── GET /api/v1/referrals ─────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  if (!auth.businessId) {
    return err("NOT_A_BUSINESS", "Referral program is only available to business accounts", 403);
  }

  // Warm the cache from durable storage before reading (cold-start safety).
  await hydrateReferrals();

  const code = generateReferralCode(auth.businessId);
  await persistBusinessCode(auth.businessId, code);
  const link = createReferralLink(code);
  const stats = getReferralStats(auth.businessId);
  const referrals = getReferralsByReferrer(auth.businessId);

  return ok({
    code,
    link,
    stats,
    referrals,
  });
});

// ─── POST /api/v1/referrals ────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  // Warm the cache from durable storage before any referral lookup/mutation.
  await hydrateReferrals();

  const body = await parseBody<{
    action?: string;
    refereeEmail?: string;
    code?: string;
    refereeId?: string;
  }>(req);
  if (body instanceof Response) return body;

  const action = body.action ?? "generate_code";

  switch (action) {
    // ── Generate Code ──────────────────────────────────────────────────────
    case "generate_code": {
      if (!auth.businessId) {
        return err("NOT_A_BUSINESS", "Referral program is only available to business accounts", 403);
      }

      const code = generateReferralCode(auth.businessId);
      await persistBusinessCode(auth.businessId, code);
      const link = createReferralLink(code);

      // If a refereeEmail was provided, create a pending referral
      if (body.refereeEmail) {
        if (typeof body.refereeEmail !== "string") {
          return err("INVALID_INPUT", "refereeEmail must be a string");
        }
        const sanitizedEmail = body.refereeEmail.slice(0, 254).toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
          return err("INVALID_EMAIL", "Please provide a valid email address");
        }

        const referral = createReferral(auth.businessId, auth.email, sanitizedEmail, code);
        await persistReferral(referral);
        return ok({ code, link, referral }, 201);
      }

      return ok({ code, link });
    }

    // ── Track Signup ───────────────────────────────────────────────────────
    case "track_signup": {
      const { code, refereeId, refereeEmail } = body;

      if (!code || typeof code !== "string") {
        return err("MISSING_FIELDS", "code is required");
      }
      if (!refereeId || typeof refereeId !== "string") {
        return err("MISSING_FIELDS", "refereeId is required");
      }
      if (!refereeEmail || typeof refereeEmail !== "string") {
        return err("MISSING_FIELDS", "refereeEmail is required");
      }

      const referral = trackReferralSignup(code, refereeId, refereeEmail);
      await persistReferral(referral);
      return ok({ referral });
    }

    default:
      return err(
        "INVALID_ACTION",
        "action must be 'generate_code' or 'track_signup'"
      );
  }
});
