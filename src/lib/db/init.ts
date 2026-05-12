import { db } from "./connection";
import { logger, logError } from "@/lib/logging";

let initialized = false;

/**
 * Lazy database initialization. Call this from API routes on first request.
 * Runs pending migrations if using a real Postgres connection.
 * No-op if using InMemoryConnection or already initialized.
 */
export async function ensureDatabase(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    const health = await db.healthCheck();
    if (!health.connected) {
      logger.warn("database not connected, using in-memory fallback", {
        module: "db/init",
      });
      return;
    }

    // Run migrations
    const { runPendingMigrations } = await import("./migrations");
    await runPendingMigrations(db);
    logger.info("database initialized, migrations complete", {
      module: "db/init",
    });

    // Seed demo data after migrations
    const { seedDatabase } = await import("./seed-data");
    await seedDatabase();
  } catch (err) {
    logError(err, { module: "db/init", stage: "initialization" });
    // Don't throw — allow app to fall back to in-memory
    initialized = false;
  }
}
