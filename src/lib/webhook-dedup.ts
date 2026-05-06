/**
 * Webhook event deduplication, persisted to Postgres.
 *
 * Replaces the previous in-memory `processedEvents` Map / `recentEventIds`
 * Set patterns that were per-instance — a malicious replay hitting a
 * different cold-start instance would succeed.
 *
 * Now backed by `webhook_events` table. The first call for a given
 * (event_id, source) tuple wins; subsequent attempts return false to
 * indicate "already processed".
 *
 * Falls back to an in-memory store when DATABASE_URL is unset (dev/CI).
 */

import { db, InMemoryConnection } from "./db/connection";

const usingDb = !(db instanceof InMemoryConnection);

// In-memory fallback for dev/test mode.
const _memStore = new Set<string>();
const _memMaxSize = 10_000;

/**
 * Atomically register an event ID as processed. Returns true if this
 * is the first time we've seen the event (caller should process it),
 * false if it was already processed (caller should skip).
 *
 * Uses INSERT ... ON CONFLICT DO NOTHING which is atomic in Postgres,
 * so two parallel instances racing on the same event_id will only
 * have one succeed.
 */
export async function markEventProcessed(
  eventId: string,
  source: string
): Promise<boolean> {
  if (!usingDb) {
    // Dev/CI fallback — in-memory only, with simple LRU.
    const key = `${source}:${eventId}`;
    if (_memStore.has(key)) return false;
    if (_memStore.size >= _memMaxSize) {
      const oldest = _memStore.values().next().value;
      if (oldest) _memStore.delete(oldest);
    }
    _memStore.add(key);
    return true;
  }
  try {
    const result = await db.query(
      `INSERT INTO webhook_events (event_id, source, received_at)
       VALUES ($1, $2, now())
       ON CONFLICT (event_id, source) DO NOTHING
       RETURNING event_id`,
      [eventId, source]
    );
    // RETURNING returns 1 row if inserted, 0 rows if conflict.
    return result.rows.length === 1;
  } catch (e) {
    // If DB is down, fall back to allow processing rather than blocking.
    // Replay risk in that brief window is acceptable vs. dropping events.
    console.error(
      `[webhook-dedup] DB error for ${source}:${eventId}:`,
      e instanceof Error ? e.message : e
    );
    return true;
  }
}

/**
 * Test helper. Clears the in-memory store. The DB store is not touched
 * (tests should use a separate DB or run with DATABASE_URL unset).
 */
export function _resetWebhookDedup(): void {
  _memStore.clear();
}
