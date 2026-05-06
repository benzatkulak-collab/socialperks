/**
 * API Key generation, hashing, verification, and lifecycle management.
 *
 * Format: `sp_{env}_{prefix}_{random}` where:
 *   - env is "live" (production) or "test" (preview/dev). Cosmetic only.
 *   - prefix is 8 hex chars, indexed in the DB for fast lookup before hash compare.
 *   - random is 32 hex chars (128 bits of entropy from crypto.randomBytes(16)).
 *
 * Storage: SHA-256 hash of the full plaintext. We never store plaintext.
 * On verify, we look up by prefix (cheap), then constant-time compare hashes.
 *
 * In-memory store today; swap to Postgres via the existing repo pattern when
 * DATABASE_URL is configured. The interface stays the same.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ApiKeyEnv = "live" | "test";

/**
 * Public API-key record. NEVER includes the hash — that stays in the store.
 * If you need the hash to do a comparison, use the internal StoredApiKey type
 * via the store's findByPrefix method.
 */
export interface ApiKeyRecord {
  id: string;
  businessId: string;
  agentName: string;
  keyPrefix: string;
  env: ApiKeyEnv;
  permissions: string[];
  active: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
}

/** Internal storage type — adds the hash to ApiKeyRecord. */
interface StoredApiKey extends ApiKeyRecord {
  keyHash: string;
}

/** Strip the keyHash field for public exposure. */
function stripHash(r: StoredApiKey): ApiKeyRecord {
  // Pick fields explicitly so a future addition to StoredApiKey doesn't
  // accidentally leak through.
  return {
    id: r.id,
    businessId: r.businessId,
    agentName: r.agentName,
    keyPrefix: r.keyPrefix,
    env: r.env,
    permissions: r.permissions,
    active: r.active,
    lastUsedAt: r.lastUsedAt,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
  };
}

export interface NewApiKey {
  /** The full plaintext. ONLY returned at creation time, never stored. */
  plaintext: string;
  /** Public prefix (safe to display in UIs and logs). */
  prefix: string;
  /** Database record (without plaintext or hash). */
  record: ApiKeyRecord;
}

// ─── Hashing & generation ───────────────────────────────────────────────────

/** SHA-256 hex digest. Pure function for unit testing. */
export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

const HEX_PATTERN = /^[0-9a-f]+$/;

/**
 * Constant-time hash comparison. Returns false if either input isn't valid
 * hex of equal length. The hex-format check happens before the byte-level
 * compare so malformed input never reaches timingSafeEqual.
 *
 * Note: Buffer.from(str, "hex") silently drops invalid hex chars rather than
 * throwing, so we cannot rely on a try/catch — explicit validation it is.
 */
export function compareKeyHashes(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  if (a.length === 0) return false;
  if (!HEX_PATTERN.test(a) || !HEX_PATTERN.test(b)) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/**
 * Generate a fresh API key. Returns plaintext (caller must surface to user
 * once and discard) plus a record-shaped object minus the hash.
 *
 * Plaintext format: sp_live_PREFIX_RANDOM (43 chars total before separators).
 */
export function generateApiKey(args: {
  businessId: string;
  agentName: string;
  env?: ApiKeyEnv;
  permissions?: string[];
  expiresAt?: Date | null;
}): NewApiKey {
  const env: ApiKeyEnv = args.env ?? "live";
  const prefixBytes = randomBytes(4);
  const randomBytesBuf = randomBytes(16);
  const prefix = prefixBytes.toString("hex"); // 8 hex chars
  const random = randomBytesBuf.toString("hex"); // 32 hex chars
  const plaintext = `sp_${env}_${prefix}_${random}`;
  // Hash is computed at persist time (in createApiKey) so unit tests that
  // exercise generateApiKey alone don't store anything.
  const id = randomBytes(16).toString("hex");
  const now = new Date();
  return {
    plaintext,
    prefix,
    record: {
      id,
      businessId: args.businessId,
      agentName: args.agentName,
      keyPrefix: prefix,
      env,
      permissions: args.permissions ?? [],
      active: true,
      lastUsedAt: null,
      createdAt: now,
      expiresAt: args.expiresAt ?? null,
    },
  };
}

/**
 * Parse a plaintext key into its components. Returns null if the format
 * doesn't match — used to short-circuit lookups for obviously-invalid keys
 * without touching storage.
 */
export function parseApiKey(plaintext: string): {
  env: ApiKeyEnv;
  prefix: string;
  random: string;
} | null {
  const m = /^sp_(live|test)_([0-9a-f]{8})_([0-9a-f]{32})$/.exec(plaintext);
  if (!m) return null;
  return { env: m[1] as ApiKeyEnv, prefix: m[2], random: m[3] };
}

// ─── In-memory store (Postgres-ready interface) ─────────────────────────────

class ApiKeyStore {
  private byId = new Map<string, StoredApiKey>();
  private byPrefix = new Map<string, Set<string>>(); // prefix → Set<id>

  insert(record: StoredApiKey): void {
    this.byId.set(record.id, record);
    let bucket = this.byPrefix.get(record.keyPrefix);
    if (!bucket) {
      bucket = new Set();
      this.byPrefix.set(record.keyPrefix, bucket);
    }
    bucket.add(record.id);
  }

  /** Find by prefix. Multiple records can share a prefix (8 hex chars = 4B
   *  possibilities, but defense-in-depth — never assume uniqueness). */
  findByPrefix(prefix: string): StoredApiKey[] {
    const ids = this.byPrefix.get(prefix);
    if (!ids) return [];
    const out: StoredApiKey[] = [];
    for (const id of ids) {
      const r = this.byId.get(id);
      if (r) out.push(r);
    }
    return out;
  }

  listForBusiness(businessId: string): ApiKeyRecord[] {
    const out: ApiKeyRecord[] = [];
    for (const r of this.byId.values()) {
      if (r.businessId === businessId) {
        out.push(stripHash(r));
      }
    }
    // Newest first.
    return out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  get(id: string): StoredApiKey | null {
    return this.byId.get(id) ?? null;
  }

  setActive(id: string, active: boolean): boolean {
    const r = this.byId.get(id);
    if (!r) return false;
    r.active = active;
    return true;
  }

  touchLastUsed(id: string, now: Date = new Date()): void {
    const r = this.byId.get(id);
    if (r) r.lastUsedAt = now;
  }

  /** Test-only: wipe everything. */
  _reset(): void {
    this.byId.clear();
    this.byPrefix.clear();
  }
}

const store = new ApiKeyStore();

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Persist a fresh API key. Returns the same NewApiKey object passed in.
 * Called by the create-key route after generating.
 */
export function persistApiKey(input: NewApiKey): void {
  store.insert({ ...input.record, keyHash: hashApiKey(input.plaintext) });
}

/**
 * High-level helper: generate + persist, return the NewApiKey for the caller
 * to surface to the user. Plaintext is in `result.plaintext` and MUST be
 * shown only once at creation.
 */
export function createApiKey(args: {
  businessId: string;
  agentName: string;
  env?: ApiKeyEnv;
  permissions?: string[];
  expiresAt?: Date | null;
}): NewApiKey {
  const created = generateApiKey(args);
  persistApiKey(created);
  return created;
}

/**
 * Verify an `x-api-key` header value. Returns the matching record or null.
 *
 * Steps:
 *   1. Parse the plaintext format (rejects garbage without DB hit).
 *   2. Look up candidates by prefix (single index hit).
 *   3. Constant-time compare each candidate's hash to the plaintext's hash.
 *   4. Reject inactive / expired keys.
 *   5. Update lastUsedAt (debounced to once per minute per key).
 */
export function verifyApiKey(plaintext: string): ApiKeyRecord | null {
  const parsed = parseApiKey(plaintext);
  if (!parsed) return null;

  const candidates = store.findByPrefix(parsed.prefix);
  if (candidates.length === 0) return null;

  const incomingHash = hashApiKey(plaintext);
  let match: StoredApiKey | null = null;
  for (const c of candidates) {
    if (compareKeyHashes(c.keyHash, incomingHash)) {
      match = c;
      // Don't break early — iterate all candidates to keep timing constant
      // for matched-prefix-but-wrong-key vs matched-everything cases.
    }
  }
  if (!match) return null;
  if (!match.active) return null;
  if (match.expiresAt && match.expiresAt.getTime() <= Date.now()) return null;

  // Debounced last-used update — every 60s max per key. Mutate in place so
  // the next verify() sees the updated timestamp without a re-fetch.
  const last = match.lastUsedAt?.getTime() ?? 0;
  if (Date.now() - last > 60_000) {
    const now = new Date();
    store.touchLastUsed(match.id, now);
    match.lastUsedAt = now;
  }

  return stripHash(match);
}

export function listApiKeysForBusiness(businessId: string): ApiKeyRecord[] {
  return store.listForBusiness(businessId);
}

/**
 * Revoke (soft-delete) a key. Returns true if revoked, false if not found
 * or if the caller doesn't own the key.
 */
export function revokeApiKey(args: { id: string; businessId: string }): boolean {
  const record = store.get(args.id);
  if (!record) return false;
  if (record.businessId !== args.businessId) return false;
  return store.setActive(args.id, false);
}

/** Test helper. Do not call from production code. */
export function _resetApiKeyStore(): void {
  store._reset();
}
