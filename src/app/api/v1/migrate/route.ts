/**
 * Database Migration API Route — /api/v1/migrate
 * ────────────────────────────────────────────────
 * Development-only route for running schema migrations.
 * Returns 404 in production to prevent accidental data changes.
 *
 * POST: Run pending schema migrations
 * GET:  Check migration status
 */

import crypto from "crypto";
import type { NextRequest } from "next/server";
import { ok, err, rateLimit, withTiming } from "../_shared";
import {
  runMigrations,
  getMigrationState,
  generateSQL,
} from "@/lib/db/migrate";

// ─── Environment Guard ──────────────────────────────────────────────────────

function isProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_MIGRATIONS !== "true"
  );
}

// Constant-time compare for the migration secret.
function secretMatches(provided: string, expected: string): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ─── POST: Run Migrations ───────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Production: require BOTH the explicit opt-in flag AND a valid bearer secret.
  // The DDL is idempotent (CREATE ... IF NOT EXISTS), but an unauthenticated DDL
  // trigger is still unacceptable once the opt-in flag is on.
  if (process.env.NODE_ENV === "production") {
    if (process.env.ALLOW_MIGRATIONS !== "true") {
      return err("NOT_FOUND", "Not found", 404);
    }
    const provided = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!secretMatches(provided, process.env.MIGRATION_SECRET ?? "")) {
      return err(
        "UNAUTHORIZED",
        "Valid Bearer MIGRATION_SECRET required to migrate in production",
        401,
      );
    }
  }

  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const result = await runMigrations();

  if (!result.success) {
    return err("MIGRATION_FAILED", result.error ?? "Unknown error", 500);
  }

  if (result.skipped) {
    return ok({
      message: "Schema migration already applied — no changes needed",
      migrationName: result.migrationName,
      durationMs: result.durationMs,
    });
  }

  return ok({
    message: "Schema migration applied successfully",
    migrationName: result.migrationName,
    version: result.version,
    tablesCreated: result.tablesCreated,
    indexesCreated: result.indexesCreated,
    durationMs: result.durationMs,
  });
});

// ─── GET: Migration Status ──────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  // Block in production unless explicitly opted in
  if (isProduction()) {
    return err(
      "NOT_FOUND",
      "Not found",
      404,
    );
  }

  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const params = new URL(req.url).searchParams;
  const includeDDL = params.get("ddl") === "true";

  const state = await getMigrationState();

  return ok({
    status: state.isApplied ? "up_to_date" : "pending",
    currentSchemaName: state.currentSchemaName,
    isApplied: state.isApplied,
    tableCount: state.tableCount,
    tableNames: state.tableNames,
    appliedMigrations: state.appliedMigrations,
    ...(includeDDL ? { ddl: generateSQL() } : {}),
  });
});
