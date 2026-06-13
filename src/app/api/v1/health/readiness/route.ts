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
  };

  // Stripe price IDs — a valid secret key is not enough. Without at least one
  // purchasable monthly price, the checkout route 503s ("BILLING_NOT_CONFIGURED")
  // for every plan, so the storefront looks live but takes no money.
  const purchasable = (
    [
      "STRIPE_PRICE_STARTER_MONTHLY",
      "STRIPE_PRICE_PROFESSIONAL_MONTHLY",
      "STRIPE_PRICE_ENTERPRISE_MONTHLY",
    ] as const
  ).filter((k) => Boolean(process.env[k]));
  checks.stripe_prices = check(
    purchasable.length > 0,
    `Purchasable monthly plans: ${purchasable.length}`,
    "No STRIPE_PRICE_*_MONTHLY configured — every checkout returns 503",
    !isProd,
  );

  // Billing tables — subscriptions + usage must be durable (migration v5),
  // else paying customers revert to free on cold start and free-tier usage
  // never caps. A valid DATABASE_URL with the tables missing is the silent
  // failure this catches.
  // Perk wallet table — earned perks/redemptions must be durable (migration
  // v6), else the reward ledger the product sells drops on every cold start.
  if (!(db instanceof InMemoryConnection)) {
    let tablesDetail = "Billing tables present";
    let tablesOk = true;
    let perksOk = true;
    let perksDetail = "Perk wallet table present";
    let subsTableOk = true;
    let subsTableDetail = "Submission table present";
    let campaignTableOk = true;
    let campaignTableDetail = "Campaign table present";
    try {
      const r = await db.query<{ subs: string | null; usage: string | null; perks: string | null; submissions: string | null; campaigns: string | null }>(
        "SELECT to_regclass('business_subscriptions') AS subs, to_regclass('monthly_usage') AS usage, to_regclass('perk_wallet_entries') AS perks, to_regclass('campaign_submissions_v2') AS submissions, to_regclass('launched_campaign_state') AS campaigns",
      );
      const missingTables: string[] = [];
      if (!r.rows[0]?.subs) missingTables.push("business_subscriptions");
      if (!r.rows[0]?.usage) missingTables.push("monthly_usage");
      tablesOk = missingTables.length === 0;
      if (!tablesOk) tablesDetail = `Missing: ${missingTables.join(", ")} — run /api/v1/migrate`;

      perksOk = !!r.rows[0]?.perks;
      if (!perksOk) perksDetail = "Missing: perk_wallet_entries — run /api/v1/migrate (earned perks won't persist)";

      subsTableOk = !!r.rows[0]?.submissions;
      if (!subsTableOk) subsTableDetail = "Missing: campaign_submissions_v2 — run /api/v1/migrate (proof submissions won't persist)";

      campaignTableOk = !!r.rows[0]?.campaigns;
      if (!campaignTableOk) campaignTableDetail = "Missing: launched_campaign_state — run /api/v1/migrate (campaigns won't survive cold start)";
    } catch (e) {
      tablesOk = false;
      tablesDetail = e instanceof Error ? e.message : "billing table check failed";
      perksOk = false;
      perksDetail = e instanceof Error ? e.message : "perk table check failed";
      subsTableOk = false;
      subsTableDetail = e instanceof Error ? e.message : "submission table check failed";
      campaignTableOk = false;
      campaignTableDetail = e instanceof Error ? e.message : "campaign table check failed";
    }
    checks.billing_tables = check(tablesOk, "Billing tables present", tablesDetail, !isProd);
    checks.perk_tables = check(perksOk, "Perk wallet table present", perksDetail, !isProd);
    checks.submission_tables = check(subsTableOk, "Submission table present", subsTableDetail, !isProd);
    checks.campaign_tables = check(campaignTableOk, "Campaign table present", campaignTableDetail, !isProd);
  } else {
    checks.billing_tables = check(true, "skipped (in-memory storage)", "");
    checks.perk_tables = check(true, "skipped (in-memory storage)", "");
    checks.submission_tables = check(true, "skipped (in-memory storage)", "");
    checks.campaign_tables = check(true, "skipped (in-memory storage)", "");
  }

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
