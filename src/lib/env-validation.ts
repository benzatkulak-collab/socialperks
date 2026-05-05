/**
 * Production env validation — fail loudly, fail early.
 *
 * Called from `instrumentation.ts` (Next.js startup hook) so it runs
 * exactly once when the server boots. In production, any missing
 * BLOCKING env var causes an unrecoverable error logged at startup —
 * the route handlers will still run, but the readiness probe will be
 * red and the operator sees the error in Vercel's runtime logs.
 *
 * In development, missing vars are reported as warnings only — local
 * dev should never require a full prod env to iterate.
 *
 * Naming policy:
 *   - BLOCKING: must be set in production. Auth + CSRF only.
 *   - REQUIRED_FOR: set this group together if you want this feature.
 *     Missing one of a group is a warning (you forgot something).
 *
 * This is intentionally NOT a Zod schema. The reason: validation
 * across a 40-var landscape with optional groups is more clearly
 * expressed as plain checks than as a recursive schema. Future
 * us can add Zod for typed access if needed; today we just report.
 */

interface EnvCheck {
  key: string;
  severity: "blocking" | "warning";
  feature: string;
  hint: string;
}

interface FeatureGroup {
  name: string;
  vars: string[];
  /** If true, all-or-nothing: missing any when any is set is a warning. */
  allOrNothing?: boolean;
}

// ─── Single-var checks ─────────────────────────────────────────────────────

const SINGLE_CHECKS: EnvCheck[] = [
  {
    key: "AUTH_SECRET",
    severity: "blocking",
    feature: "auth",
    hint: "Generate with: openssl rand -hex 32",
  },
  {
    key: "CSRF_SECRET",
    severity: "warning", // Falls back to AUTH_SECRET — not blocking
    feature: "auth",
    hint: "Generate with: openssl rand -hex 32 (else AUTH_SECRET is reused)",
  },
  {
    key: "DATABASE_URL",
    severity: "warning", // In-memory fallback exists; we just lose on restart
    feature: "persistence",
    hint: "postgresql://user:pass@host:5432/db — without this, all data drops on redeploy",
  },
];

// ─── Feature-group checks ──────────────────────────────────────────────────

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    name: "Stripe billing",
    vars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    allOrNothing: true,
  },
  {
    name: "Email (Resend)",
    vars: ["RESEND_API_KEY", "EMAIL_FROM"],
    allOrNothing: true,
  },
  {
    name: "Twilio SMS pipeline",
    vars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
    allOrNothing: true,
  },
  {
    name: "Square POS webhook",
    vars: ["SQUARE_WEBHOOK_SIGNATURE_KEY", "SQUARE_MERCHANT_TO_BUSINESS_MAP"],
    allOrNothing: true,
  },
  {
    name: "Toast POS webhook",
    vars: ["TOAST_WEBHOOK_SIGNING_SECRET", "TOAST_RESTAURANT_TO_BUSINESS_MAP"],
    allOrNothing: true,
  },
  {
    name: "Instagram OAuth",
    vars: ["OAUTH_IG_CLIENT_ID", "OAUTH_IG_CLIENT_SECRET"],
    allOrNothing: true,
  },
  {
    name: "Platform webhook receiver",
    vars: ["WEBHOOK_VERIFY_TOKEN", "WEBHOOK_SECRET"],
    allOrNothing: true,
  },
];

// ─── Reporters ─────────────────────────────────────────────────────────────

interface ValidationReport {
  blocking: { key: string; hint: string }[];
  warnings: { message: string; hint?: string }[];
  features: { name: string; status: "configured" | "off" | "partial"; missing: string[] }[];
}

export function validateEnv(env: NodeJS.ProcessEnv = process.env): ValidationReport {
  const report: ValidationReport = { blocking: [], warnings: [], features: [] };

  for (const check of SINGLE_CHECKS) {
    if (!env[check.key]) {
      if (check.severity === "blocking") {
        report.blocking.push({ key: check.key, hint: check.hint });
      } else {
        report.warnings.push({ message: `${check.key} not set (${check.feature})`, hint: check.hint });
      }
    }
  }

  for (const group of FEATURE_GROUPS) {
    const present = group.vars.filter((v) => !!env[v]);
    if (present.length === 0) {
      report.features.push({ name: group.name, status: "off", missing: group.vars });
    } else if (present.length === group.vars.length) {
      report.features.push({ name: group.name, status: "configured", missing: [] });
    } else if (group.allOrNothing) {
      const missing = group.vars.filter((v) => !env[v]);
      report.features.push({ name: group.name, status: "partial", missing });
      report.warnings.push({
        message: `${group.name} is partially configured (set or unset all of: ${group.vars.join(", ")})`,
      });
    } else {
      report.features.push({ name: group.name, status: "configured", missing: [] });
    }
  }

  return report;
}

/** Pretty-print a report. Used by instrumentation.ts and the readiness route. */
export function logReport(report: ValidationReport, isProd: boolean): void {
  const tag = "[env-validation]";
  if (report.blocking.length > 0) {
    console.error(`${tag} BLOCKING — ${report.blocking.length} required env var${report.blocking.length === 1 ? "" : "s"} missing:`);
    for (const b of report.blocking) {
      console.error(`  ✗ ${b.key} — ${b.hint}`);
    }
    if (isProd) {
      console.error(`${tag} The app will boot but auth/critical routes will throw 500. Set these on Vercel and redeploy.`);
    }
  }

  if (report.warnings.length > 0) {
    console.warn(`${tag} ${report.warnings.length} warning${report.warnings.length === 1 ? "" : "s"}:`);
    for (const w of report.warnings) {
      console.warn(`  ⚠ ${w.message}${w.hint ? ` — ${w.hint}` : ""}`);
    }
  }

  const configured = report.features.filter((f) => f.status === "configured");
  const off = report.features.filter((f) => f.status === "off");
  const partial = report.features.filter((f) => f.status === "partial");

  console.info(`${tag} Features: ${configured.length} configured, ${off.length} off, ${partial.length} partial`);
  for (const f of configured) console.info(`  ✓ ${f.name}`);
  for (const f of partial) console.info(`  ⚠ ${f.name} (missing: ${f.missing.join(", ")})`);
  // off features are quiet — no need to spam logs with what isn't enabled.
}

/** Convenience: validate + log, returns true if production-ready. */
export function validateAndLog(): boolean {
  const isProd = process.env.NODE_ENV === "production";
  const report = validateEnv();
  logReport(report, isProd);
  return report.blocking.length === 0;
}
