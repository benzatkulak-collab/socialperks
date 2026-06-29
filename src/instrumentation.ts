/**
 * Next.js startup instrumentation. `register()` runs once per server process
 * (including each serverless cold start) BEFORE the app handles requests — the
 * build-safe place to fail loud on misconfiguration. Turns the previously-dead
 * validateProductionConfig() into an actual boot gate.
 *
 * Policy (deliberately two-tier so a misconfigured deploy can't silently run,
 * but the marketing/waitlist site can still serve before payments are wired):
 *
 *   NON-NEGOTIABLE (AUTH_SECRET, DATABASE_URL):
 *     missing or malformed ⇒ THROW. Booting without these means signing JWTs
 *     with the insecure dev fallback and/or running on volatile in-memory
 *     storage — never acceptable in production.
 *
 *   DEGRADED (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, …):
 *     missing ⇒ alert (Sentry + log) but boot. Checkout already 503s cleanly
 *     when Stripe is unconfigured, so the rest of the product still works.
 */

export async function register(): Promise<void> {
  const { config, validateProductionConfig } = await import("@/lib/config");
  const { captureMessage } = await import("@/lib/monitoring");

  if (!config.isProduction) return;

  const NON_NEGOTIABLE = ["AUTH_SECRET", "DATABASE_URL"];
  const missing = validateProductionConfig();

  // A present-but-unparseable DATABASE_URL is as fatal as a missing one — it
  // would otherwise make connection.ts throw lazily on first use (prod) or
  // fall back to in-memory (non-prod). Catch it loudly at boot.
  const dbUrl = process.env.DATABASE_URL;
  let dbMalformed = false;
  if (dbUrl) {
    try {
      new URL(dbUrl);
    } catch {
      dbMalformed = true;
    }
  }

  const fatal = missing.filter((m) => NON_NEGOTIABLE.includes(m));
  if (dbMalformed && !fatal.includes("DATABASE_URL")) fatal.push("DATABASE_URL (malformed)");
  const degraded = missing.filter((m) => !NON_NEGOTIABLE.includes(m));

  if (degraded.length > 0) {
    const msg =
      `[startup] Degraded production config — missing: ${degraded.join(", ")}. ` +
      `Payments/email features are disabled until these are set.`;
    console.warn(msg);
    captureMessage(msg, "warning", { source: "instrumentation.register" });
  }

  if (fatal.length > 0) {
    const msg =
      `[startup] FATAL production config — missing/invalid: ${fatal.join(", ")}. ` +
      `Refusing to boot on the insecure dev secret / volatile in-memory storage.`;
    console.error(msg);
    captureMessage(msg, "fatal", { source: "instrumentation.register" });
    // Throw so the deploy/cold-start fails loudly instead of serving traffic in
    // a fundamentally broken state.
    throw new Error(msg);
  }

  console.warn("[startup] Production config validated — non-negotiable secrets present.");
}
