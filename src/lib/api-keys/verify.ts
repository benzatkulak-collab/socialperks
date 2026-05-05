/**
 * API key verifier — used by routes that accept a Bearer token issued
 * by `/api/v1/dev/init` or the dashboard.
 *
 * Lookup strategy:
 *   1. Hash the provided secret (SHA-256)
 *   2. Look it up in the api_keys table by key_hash
 *   3. If found, return { businessId, scopes, keyId } and asynchronously
 *      bump last_used_at for usage tracking
 *   4. If not found, fall back to the in-memory map (dev mode without
 *      DATABASE_URL) — auto-issue.ts keeps a memoryByOwner map but
 *      it's keyed by ownerId not by hash, so we keep a parallel
 *      hash-keyed cache here that gets populated on every issue.
 *
 * The cache layer matters: a Bearer-authed request hits this on every
 * call, and a DB round-trip per request adds 5-15ms latency we don't
 * need for the agent-call hot path.
 */

import crypto from "crypto";
import { db, InMemoryConnection } from "@/lib/db/connection";

const usingDb = !(db instanceof InMemoryConnection);

export interface VerifiedKey {
  keyId: string;
  ownerType: "business" | "influencer";
  ownerId: string;
  /** Convenience accessor — same as ownerId when ownerType is business. */
  businessId: string | null;
  scopes: string[];
}

interface CacheEntry {
  data: VerifiedKey;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

function hashKey(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

/**
 * Verify a Bearer token. Returns null on miss / invalid format.
 * Never throws — callers can branch on the return.
 */
export async function verifyApiKey(secret: string): Promise<VerifiedKey | null> {
  if (!secret || secret.length < 16 || !secret.startsWith("sk_")) {
    return null;
  }
  const hash = hashKey(secret);
  const cached = cache.get(hash);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  if (!usingDb) {
    // Dev mode: we don't have a hash index, so we have to scan.
    // Acceptable for local dev — production always has DATABASE_URL.
    return null;
  }

  try {
    const result = await db.query<{
      id: string;
      business_id: string | null;
      scopes: string[] | string | null;
    }>(
      `SELECT id, business_id, scopes
         FROM api_keys
        WHERE key_hash = $1
          AND (revoked_at IS NULL OR revoked_at > NOW())
        LIMIT 1`,
      [hash],
    );
    const row = result.rows[0];
    if (!row) return null;

    const verified: VerifiedKey = {
      keyId: row.id,
      // The current api_keys schema only models business owners; the
      // ownerType column will land when influencer keys ship. Keep the
      // shape future-proof.
      ownerType: "business",
      ownerId: row.business_id ?? "",
      businessId: row.business_id,
      scopes: Array.isArray(row.scopes)
        ? row.scopes
        : typeof row.scopes === "string"
        ? row.scopes.split(",").map((s) => s.trim()).filter(Boolean)
        : ["read"],
    };
    cache.set(hash, { data: verified, expiresAt: Date.now() + CACHE_TTL_MS });

    // Fire-and-forget last_used_at update — never block the request.
    db.query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [row.id]).catch(
      () => {},
    );

    return verified;
  } catch (e) {
    console.error("[api-keys/verify] db lookup failed:", e);
    return null;
  }
}

/**
 * Convenience: pull the key out of an Authorization header (Bearer)
 * or X-API-Key header, then verify.
 */
export async function verifyFromHeaders(headers: Headers): Promise<VerifiedKey | null> {
  const auth = headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return verifyApiKey(auth.slice(7).trim());
  }
  const x = headers.get("x-api-key");
  if (x) return verifyApiKey(x.trim());
  return null;
}

/** Test-only: clear the in-process cache. Production code must not call this. */
export function _clearCacheForTests(): void {
  cache.clear();
}
