import { db } from "./connection";

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
      console.warn("[DB] Database not connected, using in-memory fallback");
      return;
    }

    // Run migrations
    const { runPendingMigrations } = await import("./migrations");
    await runPendingMigrations(db);
    console.info("[DB] Database initialized, migrations complete");

    // Seed demo data after migrations
    const { seedDatabase } = await import("./seed-data");
    await seedDatabase();
  } catch (err) {
    console.error("[DB] Database initialization failed:", err);
    // Don't throw — allow app to fall back to in-memory
    initialized = false;
  }
}
