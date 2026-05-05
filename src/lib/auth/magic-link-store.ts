/**
 * Magic-link token store with write-through Postgres persistence.
 *
 * Source of truth:
 *   - When DATABASE_URL is set, the `magic_link_tokens` table is the
 *     truth. The in-memory Map is a process-local cache that absorbs
 *     reads in the same request lifecycle and lets local dev work
 *     without a database.
 *   - When DATABASE_URL is unset, the in-memory Map is the truth.
 *     Tokens evaporate on redeploy — fine for dev, wrong for prod.
 *     The readiness probe surfaces the missing DATABASE_URL as a
 *     warning specifically because of this.
 *
 * Why both layers instead of one or the other?
 *   - Pure-Postgres means cold-starts always pay a query for a
 *     just-issued token (the verify route is hit seconds after
 *     request).
 *   - Pure-memory means tokens die on every Vercel deploy — the
 *     user clicks "magic link" and the token is gone.
 *   - Cache-on-write + read-through gives us 0-latency for the
 *     common case (request-then-immediate-verify) while keeping
 *     the database authoritative for redeploys + multi-region.
 *
 * Lives outside `src/app/api/v1/auth/magic-link/` because Next.js
 * disallows arbitrary exports from `route.ts` files (only specific
 * symbols like GET/POST/runtime are valid).
 */

import { db, InMemoryConnection } from "@/lib/db/connection";

export interface MagicLinkRecord {
  email: string;
  businessName?: string;
  /** Unix epoch ms. */
  expiresAt: number;
  used: boolean;
}

export const TOKEN_TTL_MS = 15 * 60 * 1000;

const usingDb = !(db instanceof InMemoryConnection);

// In-memory cache (and the source of truth when DATABASE_URL is unset).
const memoryCache = new Map<string, MagicLinkRecord>();

// Backwards-compat export. Older callers may still poke `magicLinks`
// directly (e.g. in tests). New code should prefer the functional API
// below — the cache map is implementation detail.
export const magicLinks = memoryCache;

interface DbRow {
  token: string;
  email: string;
  business_name: string | null;
  expires_at: string;
  used: boolean;
}

function rowToRecord(row: DbRow): MagicLinkRecord {
  return {
    email: row.email,
    businessName: row.business_name ?? undefined,
    expiresAt: new Date(row.expires_at).getTime(),
    used: row.used,
  };
}

/** Insert or replace a token. Cache-on-write to memory. */
export async function storeMagicLink(token: string, record: MagicLinkRecord): Promise<void> {
  memoryCache.set(token, record);
  if (!usingDb) return;
  try {
    await db.query(
      `INSERT INTO magic_link_tokens (token, email, business_name, expires_at, used)
       VALUES ($1, $2, $3, to_timestamp($4 / 1000.0), $5)
       ON CONFLICT (token) DO UPDATE
         SET email = EXCLUDED.email,
             business_name = EXCLUDED.business_name,
             expires_at = EXCLUDED.expires_at,
             used = EXCLUDED.used`,
      [token, record.email, record.businessName ?? null, record.expiresAt, record.used],
    );
  } catch (e) {
    // Best-effort persistence. The in-memory write succeeded and the
    // user can still verify in the same process — log and move on so
    // the request doesn't 500.
    console.error("[magic-link-store] persist failed:", e);
  }
}

/** Read a token. Memory first, then DB on miss. */
export async function getMagicLink(token: string): Promise<MagicLinkRecord | null> {
  const cached = memoryCache.get(token);
  if (cached) return cached;
  if (!usingDb) return null;
  try {
    const result = await db.query<DbRow>(
      `SELECT token, email, business_name, expires_at, used
         FROM magic_link_tokens
        WHERE token = $1
        LIMIT 1`,
      [token],
    );
    const row = result.rows[0];
    if (!row) return null;
    const record = rowToRecord(row);
    memoryCache.set(token, record); // populate cache for repeat reads
    return record;
  } catch (e) {
    console.error("[magic-link-store] read failed:", e);
    return null;
  }
}

/** Mark a token used. The next read will see used=true. */
export async function markMagicLinkUsed(token: string): Promise<void> {
  const cached = memoryCache.get(token);
  if (cached) {
    cached.used = true;
    memoryCache.set(token, cached);
  }
  if (!usingDb) return;
  try {
    await db.query(`UPDATE magic_link_tokens SET used = TRUE WHERE token = $1`, [token]);
  } catch (e) {
    console.error("[magic-link-store] mark-used failed:", e);
  }
}

/** Delete a token (used on expiry or manual revocation). */
export async function deleteMagicLink(token: string): Promise<void> {
  memoryCache.delete(token);
  if (!usingDb) return;
  try {
    await db.query(`DELETE FROM magic_link_tokens WHERE token = $1`, [token]);
  } catch (e) {
    console.error("[magic-link-store] delete failed:", e);
  }
}

/**
 * Drop expired tokens from both layers. Called opportunistically by
 * the request route. In production we'll also schedule a Vercel cron
 * job to do this so dead tokens don't accumulate.
 */
export async function pruneExpired(): Promise<void> {
  const now = Date.now();
  for (const [token, record] of memoryCache.entries()) {
    if (record.expiresAt < now) memoryCache.delete(token);
  }
  if (!usingDb) return;
  try {
    await db.query(`DELETE FROM magic_link_tokens WHERE expires_at < NOW()`);
  } catch (e) {
    console.error("[magic-link-store] prune failed:", e);
  }
}
