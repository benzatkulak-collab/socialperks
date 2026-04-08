/**
 * Database Migration API Route — /api/v1/migrate
 * ────────────────────────────────────────────────
 * Development-only route for running schema migrations.
 * Returns 404 in production to prevent accidental data changes.
 *
 * POST: Run pending schema migrations
 * GET:  Check migration status
 */

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

// ─── POST: Run Migrations ───────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Block in production unless explicitly opted in
  if (isProduction()) {
    return err(
      "NOT_FOUND",
      "Not found",
      404,
    );
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
