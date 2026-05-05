/**
 * platform_post_cache helper. Read-through with a 5-minute default
 * TTL. The verification engine consults this before paying a real
 * Graph API call; deletes happen only via the nightly cron prune
 * (which keeps cache_key usage simple).
 *
 * In-memory fallback when DATABASE_URL is unset — the same shape
 * but evaporates on restart, which is fine for dev.
 */

import { db, InMemoryConnection } from "@/lib/db/connection";
import type { PlatformPost, PlatformId } from "./types";

const usingDb = !(db instanceof InMemoryConnection);
const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: PlatformPost;
  expiresAt: number;
  source: "fetch" | "mock" | "manual";
}

const memoryCache = new Map<string, CacheEntry>();

function cacheKey(platform: PlatformId, mediaId: string): string {
  return `${platform}:${mediaId}`;
}

interface DbRow {
  cache_key: string;
  platform: PlatformId;
  media_id: string;
  data: PlatformPost;
  fetched_at: string;
  expires_at: string;
  source: "fetch" | "mock" | "manual";
}

export async function readCache(platform: PlatformId, mediaId: string): Promise<PlatformPost | null> {
  const key = cacheKey(platform, mediaId);
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  if (!usingDb) return null;
  try {
    const result = await db.query<DbRow>(
      `SELECT cache_key, platform, media_id, data, fetched_at, expires_at, source
         FROM platform_post_cache
        WHERE cache_key = $1 AND expires_at > NOW()
        LIMIT 1`,
      [key],
    );
    const row = result.rows[0];
    if (!row) return null;
    memoryCache.set(key, {
      data: row.data,
      expiresAt: new Date(row.expires_at).getTime(),
      source: row.source,
    });
    return row.data;
  } catch (e) {
    console.error("[verification/cache] read failed:", e);
    return null;
  }
}

export async function writeCache(
  post: PlatformPost,
  options: { ttlMs?: number; source?: "fetch" | "mock" | "manual" } = {},
): Promise<void> {
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
  const expiresAt = Date.now() + ttl;
  const key = cacheKey(post.platform, post.id);
  memoryCache.set(key, { data: post, expiresAt, source: options.source ?? "fetch" });

  if (!usingDb) return;
  try {
    await db.query(
      `INSERT INTO platform_post_cache
         (cache_key, platform, media_id, data, fetched_at, expires_at, source)
       VALUES ($1, $2, $3, $4, NOW(), to_timestamp($5 / 1000.0), $6)
       ON CONFLICT (cache_key) DO UPDATE
         SET data = EXCLUDED.data,
             fetched_at = NOW(),
             expires_at = EXCLUDED.expires_at,
             source = EXCLUDED.source`,
      [key, post.platform, post.id, JSON.stringify(post), expiresAt, options.source ?? "fetch"],
    );
  } catch (e) {
    console.error("[verification/cache] write failed:", e);
  }
}

/** Used by the cron prune job (filed for week-3 follow-up). */
export async function prune(): Promise<{ pruned: number }> {
  let pruned = 0;
  const now = Date.now();
  for (const [k, v] of memoryCache.entries()) {
    if (v.expiresAt < now) {
      memoryCache.delete(k);
      pruned += 1;
    }
  }
  if (!usingDb) return { pruned };
  try {
    const result = await db.query(`DELETE FROM platform_post_cache WHERE expires_at < NOW()`);
    return { pruned: pruned + (result.rowCount ?? 0) };
  } catch (e) {
    console.error("[verification/cache] prune failed:", e);
    return { pruned };
  }
}
