#!/usr/bin/env tsx
/**
 * CLI runner for the schema-driven migration system.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npm run db:migrate
 *   npm run db:migrate -- --dry-run    (print SQL without applying)
 *   npm run db:migrate -- --status     (show migration state)
 *
 * Without DATABASE_URL set, the InMemoryConnection is used and the
 * migration is recorded but no SQL runs (useful for testing the migration
 * shape without a database).
 */

import { runMigrations, getMigrationState, generateSQL } from "../src/lib/db/migrate";
import { db, InMemoryConnection } from "../src/lib/db/connection";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const statusOnly = args.includes("--status");

  const usingInMemory = db instanceof InMemoryConnection;
  const dbDescription = usingInMemory
    ? "in-memory (no DATABASE_URL set)"
    : `Postgres (${maskUrl(process.env.DATABASE_URL ?? "")})`;

  console.log(`db:migrate — target: ${dbDescription}`);

  if (dryRun) {
    console.log("\n--- generated SQL ---\n");
    console.log(generateSQL());
    console.log("\n--- end SQL ---");
    process.exit(0);
  }

  if (statusOnly) {
    const state = await getMigrationState(db);
    console.log("\nMigration state:");
    console.log(JSON.stringify(state, null, 2));
    process.exit(0);
  }

  if (usingInMemory) {
    console.warn(
      "\n⚠  Running against in-memory connection — no real DDL will execute.\n" +
      "   Set DATABASE_URL to a Postgres URL to apply migrations for real.\n",
    );
  }

  const start = Date.now();
  const result = await runMigrations(db);
  const elapsed = Date.now() - start;

  if (!result.success) {
    console.error(`\n✗ Migration failed after ${elapsed}ms:`);
    console.error(result.error ?? "unknown error");
    process.exit(1);
  }

  if (result.skipped) {
    console.log(`✓ Schema already applied (${result.migrationName}). No changes.`);
  } else {
    console.log(
      `✓ Applied ${result.migrationName} in ${result.durationMs}ms\n` +
      `  Tables: ${result.tablesCreated.length}\n` +
      `  Indexes: ${result.indexesCreated}`,
    );
  }
  process.exit(0);
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "•••";
    return u.toString();
  } catch {
    return "(unparseable)";
  }
}

main().catch((err) => {
  console.error("Migration crashed:");
  console.error(err);
  process.exit(1);
});
