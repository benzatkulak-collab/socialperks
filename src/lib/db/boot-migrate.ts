/**
 * Boot-time schema migration.
 *
 * WHY THIS EXISTS
 * ───────────────
 * The canonical migrator (`runMigrations` in ./migrate) is idempotent and
 * forward-only, but NOTHING triggered it automatically: instrumentation.ts
 * only validated config, `ensureDatabase()` had zero callers, and the
 * /api/v1/migrate route 404s in production unless an operator manually sets
 * ALLOW_MIGRATIONS + MIGRATION_SECRET and curls it. The net effect: every
 * schema change shipped fine in code but silently failed to exist in prod
 * until someone remembered to run a migration by hand — and a missing table
 * fails *silently* (writes swallowed, reads empty, app degrades to in-memory).
 *
 * This module makes migrations part of boot, so the durable billing /
 * core-loop tables are a guarantee, not a ritual. `runBootMigrations()` is
 * called from instrumentation.register() on every cold start.
 */

import { captureError } from "@/lib/monitoring";

export interface BootMigrationEnv {
  /** The Next.js runtime the register() hook is executing in. */
  runtime: string | undefined;
  /** DATABASE_URL — absent/empty means the app runs on volatile in-memory. */
  databaseUrl: string | undefined;
  /** Operator kill-switch (DISABLE_BOOT_MIGRATIONS === "true"). */
  disabled: boolean;
}

/**
 * Decide whether boot should run schema migrations.
 *
 * Migrations use the node `postgres` driver, so they must never run on the
 * edge runtime. There is nothing to migrate without a real DATABASE_URL. And
 * an explicit kill-switch always wins so a problematic deploy can opt out.
 * Production-ness is deliberately NOT required: the DDL is idempotent
 * (CREATE ... IF NOT EXISTS) and auto-migrating any environment that has a
 * real database is helpful and safe.
 */
export function shouldRunMigrationsOnBoot(env: BootMigrationEnv): boolean {
  if (env.disabled) return false;
  if (env.runtime !== "nodejs") return false;
  if (!env.databaseUrl || env.databaseUrl.length === 0) return false;
  return true;
}

/**
 * Run schema migrations at boot if the environment calls for it. Best-effort:
 * a migration failure is captured + logged but never throws, so a transient DB
 * blip during a cold start degrades gracefully (the app still boots and falls
 * back to in-memory) instead of taking the whole deployment down. The
 * non-negotiable secrets gate in instrumentation.register() already fails loud
 * on truly fatal misconfiguration.
 */
export async function runBootMigrations(): Promise<void> {
  const should = shouldRunMigrationsOnBoot({
    runtime: process.env.NEXT_RUNTIME,
    databaseUrl: process.env.DATABASE_URL,
    disabled: process.env.DISABLE_BOOT_MIGRATIONS === "true",
  });
  if (!should) return;

  try {
    const { runMigrations } = await import("./migrate");
    const result = await runMigrations();
    console.warn(
      `[startup] Schema migrations ${result.success ? "ok" : "FAILED"} — ` +
        `migration=${result.migrationName} tablesCreated=${result.tablesCreated.length} ` +
        `indexes=${result.indexesCreated} durationMs=${result.durationMs}`,
    );
    if (!result.success) {
      captureError(new Error(`Boot migration reported failure: ${result.migrationName}`), {
        source: "boot-migrate.runBootMigrations",
      });
    }
  } catch (e) {
    // Never let a migration error crash boot — log + alert and continue.
    console.error("[startup] Boot migration threw — continuing without it", e);
    captureError(e, { source: "boot-migrate.runBootMigrations" });
  }
}
