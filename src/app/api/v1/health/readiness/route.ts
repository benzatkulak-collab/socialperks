/**
 * GET /api/v1/health/readiness
 *
 * Surface what's wired and what's missing for production. Useful both
 * for deployment verification and for catching env regressions
 * (someone rotated a key, the new one didn't make it to Vercel, etc.).
 *
 * Admin-gated to avoid leaking infrastructure details to the public:
 * supply `Authorization: Bearer ${READINESS_TOKEN}` (or, if
 * `READINESS_TOKEN` is unset, the response is allowed but redacted).
 *
 * Distinct from /api/v1/health (which is a public liveness probe).
 */

import type { NextRequest } from "next/server";
import { ok } from "../../_shared";
import { db, InMemoryConnection } from "@/lib/db/connection";
import { isStripeConfigured } from "@/lib/stripe";

interface CheckEntry {
  status: "ok" | "missing" | "warning";
  detail: string;
}

function check(condition: boolean, okDetail: string, missDetail: string, warning = false): CheckEntry {
  if (condition) return { status: "ok", detail: okDetail };
  return { status: warning ? "warning" : "missing", detail: missDetail };
}

export async function GET(req: NextRequest) {
  const readinessToken = process.env.READINESS_TOKEN;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const authed = !readinessToken || provided === readinessToken;

  const isProd = process.env.NODE_ENV === "production";
  const checks: Record<string, CheckEntry> = {
    auth_secret: check(
      !!process.env.AUTH_SECRET,
      "AUTH_SECRET present",
      "AUTH_SECRET missing — auth routes will throw at runtime",
    ),
    csrf_secret: check(
      !!process.env.CSRF_SECRET || !!process.env.AUTH_SECRET,
      "CSRF_SECRET (or AUTH_SECRET fallback) present",
      "CSRF_SECRET missing",
    ),
    database_url: check(
      !(db instanceof InMemoryConnection),
      "Postgres connected",
      "DATABASE_URL not set — using in-memory storage (drops on redeploy)",
      !isProd,
    ),
    stripe: check(
      isStripeConfigured(),
      "Stripe configured",
      "STRIPE_SECRET_KEY missing — checkout will return 503 in prod",
    ),
    stripe_webhook_secret: check(
      !!process.env.STRIPE_WEBHOOK_SECRET,
      "Stripe webhook secret present",
      "STRIPE_WEBHOOK_SECRET missing — webhook signature verification falls back to a non-HMAC mode",
    ),
    resend: check(
      !!process.env.RESEND_API_KEY,
      "Resend configured",
      "RESEND_API_KEY missing — email falls back to console provider; reset-password will 503 in prod",
    ),
    waitlist_notify: check(
      !!process.env.WAITLIST_NOTIFY_EMAIL,
      "Waitlist admin notify configured",
      "WAITLIST_NOTIFY_EMAIL missing — you won't be pinged on signups",
      true,
    ),
    cron_secret: check(
      !!process.env.CRON_SECRET,
      "CRON_SECRET present",
      "CRON_SECRET missing — drip schedule will 503",
    ),
    cron_sms_drain: check(
      !!process.env.CRON_SECRET,
      "SMS drain cron protected (CRON_SECRET set)",
      "CRON_SECRET missing — /api/v1/cron/sms-drain will 503; pending SMS won't be delivered",
    ),
    site_url: check(
      !!process.env.NEXT_PUBLIC_SITE_URL || !!process.env.VERCEL_PROJECT_PRODUCTION_URL,
      "Public site URL resolved",
      "NEXT_PUBLIC_SITE_URL missing — OG/canonical URLs may point at the wrong host",
      true,
    ),
    oauth_instagram: check(
      !!(process.env.OAUTH_IG_CLIENT_ID || process.env.INSTAGRAM_CLIENT_ID),
      "Instagram OAuth configured",
      "Instagram OAuth not configured — verification stays in demo mode",
      true,
    ),
    oauth_tiktok: check(
      !!(process.env.OAUTH_TT_CLIENT_ID || process.env.TIKTOK_CLIENT_KEY || process.env.TIKTOK_CLIENT_ID),
      "TikTok OAuth configured",
      "TikTok OAuth not configured — verification stays in demo mode",
      true,
    ),
    webhook_verify: check(
      !!(process.env.WEBHOOK_VERIFY_TOKEN && process.env.WEBHOOK_SECRET),
      "Platform webhook secrets present",
      "WEBHOOK_VERIFY_TOKEN / WEBHOOK_SECRET missing — incoming platform webhooks will fail",
      true,
    ),
    twilio_sms: check(
      !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
      "Twilio SMS configured",
      "Twilio not configured — post-purchase SMS pipeline silently no-ops",
      true,
    ),
    pos_square: check(
      !!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
      "Square POS webhooks signed",
      "SQUARE_WEBHOOK_SIGNATURE_KEY missing — Square webhooks accept all requests in dev mode",
      true,
    ),
    pos_toast: check(
      !!process.env.TOAST_WEBHOOK_SIGNING_SECRET,
      "Toast POS webhooks signed",
      "TOAST_WEBHOOK_SIGNING_SECRET missing — Toast webhooks accept all requests in dev mode",
      true,
    ),
    pos_clover: check(
      !!process.env.CLOVER_WEBHOOK_AUTH_TOKEN,
      "Clover POS webhooks signed",
      "CLOVER_WEBHOOK_AUTH_TOKEN missing — Clover webhooks accept all requests in dev mode",
      true,
    ),
  };

  // Aggregate readiness — only "missing" (non-warning) failures count
  // against production-readiness. Warnings are noted but don't block.
  const missing = Object.entries(checks).filter(([, v]) => v.status === "missing");
  const warnings = Object.entries(checks).filter(([, v]) => v.status === "warning");
  const ready = missing.length === 0;

  return ok({
    ready,
    environment: isProd ? "production" : process.env.NODE_ENV ?? "development",
    summary: {
      total: Object.keys(checks).length,
      ok: Object.values(checks).filter((c) => c.status === "ok").length,
      missing: missing.length,
      warnings: warnings.length,
    },
    checks: authed
      ? checks
      : Object.fromEntries(
          Object.entries(checks).map(([k, v]) => [
            k,
            { status: v.status, detail: "(redacted — supply READINESS_TOKEN to view)" },
          ]),
        ),
  });
}
