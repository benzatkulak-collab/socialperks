/**
 * Agent OAuth — multi-tenant access for agency-style AI agents.
 *
 * The model:
 *   1. Developer registers an "agent app" (one-time): /api/v1/oauth-apps
 *      → returns { client_id, client_secret }. They store these.
 *   2. To act on behalf of a shop, the agent redirects the shop owner
 *      to our consent page: /oauth/authorize?client_id=…&scopes=…
 *   3. Shop owner clicks "Authorize". We persist an
 *      agent_authorization row + redirect back to the agent's
 *      configured URI with a one-time `code`.
 *   4. Agent exchanges the code at /api/v1/oauth/token using
 *      client_id + client_secret (Basic auth) → gets access_token
 *      + refresh_token.
 *   5. Agent calls /api/v1/* with `Authorization: Bearer <access_token>`
 *      same as a per-business API key.
 *
 * This module is the data layer (apps + authorizations + tokens) and
 * the cryptographic primitives (hash, verify, generate). The actual
 * HTTP routes live under src/app/api/v1/oauth/ — they're thin wrappers.
 *
 * Why we don't use the existing api_keys table for agent tokens:
 *   - api_keys is per-business, owned by the shop owner. Agent tokens
 *     are owned by the AGENT but scoped TO the business.
 *   - Revoking an agent's authorization for ONE business shouldn't
 *     touch other businesses' tokens.
 *   - Refresh-token rotation needs a separate index from the long-
 *     lived per-business keys.
 *
 * In-memory MVP: when DATABASE_URL is unset, we keep everything in
 * Maps that drop on restart. Production needs Postgres — flagged in
 * the readiness probe.
 */

import crypto from "crypto";
import { db, InMemoryConnection } from "@/lib/db/connection";

const usingDb = !(db instanceof InMemoryConnection);

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AgentApp {
  id: string;
  clientId: string;
  /** ONLY available at creation; never re-emitted. Stored as hash. */
  clientSecret?: string;
  name: string;
  description?: string;
  homepageUrl?: string;
  redirectUris: string[];
  defaultScopes: string[];
  ownerEmail: string;
  ownerBusinessId?: string;
  status: "active" | "suspended" | "revoked";
  createdAt: string;
  updatedAt: string;
}

export interface AgentAuthorization {
  id: string;
  appId: string;
  businessId: string;
  scopes: string[];
  authorizedByUserId: string;
  authorizedAt: string;
  revokedAt?: string;
  revokedReason?: string;
}

export interface AgentAccessToken {
  id: string;
  authorizationId: string;
  /** ONLY available at issuance; not stored in plaintext. */
  accessToken?: string;
  refreshToken?: string;
  expiresAt: string;
  refreshExpiresAt?: string;
  scopes: string[];
  lastUsedAt?: string;
  revokedAt?: string;
  createdAt: string;
}

// ─── In-memory caches (also the source of truth when usingDb=false) ───────

const appsByClientId = new Map<string, AgentApp & { clientSecretHash: string }>();
const authzByCompoundKey = new Map<string, AgentAuthorization>(); // `${appId}:${businessId}`
const tokensByHash = new Map<string, AgentAccessToken & { authorizationId: string }>();
// Parallel refresh-token index. We need O(1) lookup by refresh-hash
// during /oauth/token grant_type=refresh_token; scanning tokensByHash
// for a refresh-hash match would be O(N).
const tokensByRefreshHash = new Map<string, { tokenId: string; authorizationId: string; refreshExpiresAt: string; revokedAt?: string; scopes: string[] }>();

// ─── Crypto helpers ───────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString("base64url")}`;
}

function generateSecret(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

/**
 * Constant-time string compare. Used when verifying a presented
 * client_secret against the stored hash.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  try {
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

// ─── App registration ─────────────────────────────────────────────────────

export interface RegisterAppInput {
  name: string;
  description?: string;
  homepageUrl?: string;
  redirectUris: string[];
  defaultScopes?: string[];
  ownerEmail: string;
  ownerBusinessId?: string;
}

export async function registerApp(
  input: RegisterAppInput,
): Promise<AgentApp & { clientSecret: string }> {
  const id = generateId("app");
  const clientId = `cid_${crypto.randomBytes(10).toString("base64url")}`;
  const clientSecret = `csec_${generateSecret()}`;
  const clientSecretHash = hashSecret(clientSecret);
  const now = new Date().toISOString();

  const app: AgentApp & { clientSecretHash: string } = {
    id,
    clientId,
    clientSecretHash,
    name: input.name.slice(0, 200).trim(),
    description: input.description?.slice(0, 500).trim(),
    homepageUrl: input.homepageUrl,
    redirectUris: input.redirectUris.slice(0, 10),
    defaultScopes: input.defaultScopes ?? ["read"],
    ownerEmail: input.ownerEmail.toLowerCase().trim(),
    ownerBusinessId: input.ownerBusinessId,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  appsByClientId.set(clientId, app);

  if (usingDb) {
    try {
      await db.query(
        `INSERT INTO agent_apps
           (id, client_id, client_secret_hash, name, description, homepage_url,
            redirect_uris, default_scopes, owner_email, owner_business_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')`,
        [
          app.id,
          app.clientId,
          app.clientSecretHash,
          app.name,
          app.description ?? null,
          app.homepageUrl ?? null,
          app.redirectUris,
          app.defaultScopes,
          app.ownerEmail,
          app.ownerBusinessId ?? null,
        ],
      );
    } catch (e) {
      console.error("[oauth/agent-apps] register persist failed:", e);
    }
  }

  return { ...app, clientSecret };
}

export async function findAppByClientId(clientId: string): Promise<(AgentApp & { clientSecretHash: string }) | null> {
  const cached = appsByClientId.get(clientId);
  if (cached) return cached;
  if (!usingDb) return null;
  try {
    const result = await db.query<{
      id: string;
      client_id: string;
      client_secret_hash: string;
      name: string;
      description: string | null;
      homepage_url: string | null;
      redirect_uris: string[];
      default_scopes: string[];
      owner_email: string;
      owner_business_id: string | null;
      status: AgentApp["status"];
      created_at: string;
      updated_at: string;
    }>(
      `SELECT * FROM agent_apps WHERE client_id = $1 LIMIT 1`,
      [clientId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const app: AgentApp & { clientSecretHash: string } = {
      id: row.id,
      clientId: row.client_id,
      clientSecretHash: row.client_secret_hash,
      name: row.name,
      description: row.description ?? undefined,
      homepageUrl: row.homepage_url ?? undefined,
      redirectUris: row.redirect_uris,
      defaultScopes: row.default_scopes,
      ownerEmail: row.owner_email,
      ownerBusinessId: row.owner_business_id ?? undefined,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    appsByClientId.set(clientId, app);
    return app;
  } catch (e) {
    console.error("[oauth/agent-apps] findApp failed:", e);
    return null;
  }
}

/** Verify client credentials. Returns the app on success. */
export async function verifyClientCredentials(
  clientId: string,
  clientSecret: string,
): Promise<AgentApp | null> {
  const app = await findAppByClientId(clientId);
  if (!app || app.status !== "active") return null;
  const presentedHash = hashSecret(clientSecret);
  if (!safeEqual(presentedHash, app.clientSecretHash)) return null;
  return app;
}

// ─── Authorization grants ─────────────────────────────────────────────────

export interface GrantAuthorizationInput {
  appId: string;
  businessId: string;
  scopes: string[];
  authorizedByUserId: string;
}

export async function grantAuthorization(
  input: GrantAuthorizationInput,
): Promise<AgentAuthorization> {
  const id = generateId("auth");
  const now = new Date().toISOString();
  const authz: AgentAuthorization = {
    id,
    appId: input.appId,
    businessId: input.businessId,
    scopes: input.scopes,
    authorizedByUserId: input.authorizedByUserId,
    authorizedAt: now,
  };
  authzByCompoundKey.set(`${input.appId}:${input.businessId}`, authz);

  if (usingDb) {
    try {
      await db.query(
        `INSERT INTO agent_authorizations
           (id, app_id, business_id, scopes, authorized_by_user_id, authorized_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (app_id, business_id) DO UPDATE
           SET scopes = EXCLUDED.scopes,
               authorized_at = NOW(),
               revoked_at = NULL,
               revoked_reason = NULL`,
        [authz.id, authz.appId, authz.businessId, authz.scopes, authz.authorizedByUserId],
      );
    } catch (e) {
      console.error("[oauth/agent-apps] grant persist failed:", e);
    }
  }
  return authz;
}

export async function revokeAuthorization(
  appId: string,
  businessId: string,
  reason?: string,
): Promise<boolean> {
  const key = `${appId}:${businessId}`;
  const cached = authzByCompoundKey.get(key);
  if (cached) {
    cached.revokedAt = new Date().toISOString();
    cached.revokedReason = reason;
  }
  if (!usingDb) return !!cached;
  try {
    const result = await db.query(
      `UPDATE agent_authorizations
          SET revoked_at = NOW(), revoked_reason = $3
        WHERE app_id = $1 AND business_id = $2 AND revoked_at IS NULL`,
      [appId, businessId, reason ?? null],
    );
    return result.rowCount > 0;
  } catch (e) {
    console.error("[oauth/agent-apps] revoke failed:", e);
    return false;
  }
}

// ─── Access token issuance + verification ────────────────────────────────

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface IssuedTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
  scopes: string[];
}

export async function issueTokenPair(authz: AgentAuthorization): Promise<IssuedTokenPair> {
  const now = Date.now();
  const accessToken = `at_${generateSecret()}`;
  const refreshToken = `rt_${generateSecret()}`;
  const accessHash = hashSecret(accessToken);
  const refreshHash = hashSecret(refreshToken);
  const id = generateId("tok");
  const expiresAt = new Date(now + ACCESS_TOKEN_TTL_MS).toISOString();
  const refreshExpiresAt = new Date(now + REFRESH_TOKEN_TTL_MS).toISOString();

  const record: AgentAccessToken & { authorizationId: string } = {
    id,
    authorizationId: authz.id,
    expiresAt,
    refreshExpiresAt,
    scopes: authz.scopes,
    createdAt: new Date(now).toISOString(),
  };

  tokensByHash.set(accessHash, record);
  tokensByRefreshHash.set(refreshHash, {
    tokenId: id,
    authorizationId: authz.id,
    refreshExpiresAt,
    scopes: authz.scopes,
  });

  if (usingDb) {
    try {
      await db.query(
        `INSERT INTO agent_access_tokens
           (id, authorization_id, access_token_hash, refresh_token_hash,
            expires_at, refresh_expires_at, scopes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [id, authz.id, accessHash, refreshHash, expiresAt, refreshExpiresAt, authz.scopes],
      );
    } catch (e) {
      console.error("[oauth/agent-apps] issue token persist failed:", e);
    }
  }

  return { accessToken, refreshToken, expiresAt, refreshExpiresAt, scopes: authz.scopes };
}

/**
 * Refresh-token grant — exchange a valid refresh_token for a fresh
 * access/refresh pair. Implements rotation: the OLD refresh token
 * is revoked atomically with issuance of the new one. This is the
 * recommended pattern (RFC 6749 + the OAuth 2.1 draft) — a stolen
 * refresh token can only be used once before being invalidated;
 * if both the legitimate agent AND an attacker try to refresh, the
 * second one fails AND we know there's a leak (can be surfaced via
 * security alerting later).
 *
 * Returns null if the refresh token is invalid, expired, revoked,
 * or its parent authorization was revoked.
 */
export async function refreshTokenPair(
  refreshToken: string,
  appId: string,
): Promise<IssuedTokenPair | null> {
  if (!refreshToken.startsWith("rt_")) return null;
  const refreshHash = hashSecret(refreshToken);

  const cached = tokensByRefreshHash.get(refreshHash);
  if (cached) {
    if (cached.revokedAt) return null;
    if (new Date(cached.refreshExpiresAt).getTime() < Date.now()) return null;
    const authz = await findAuthorizationById(cached.authorizationId);
    if (!authz || authz.revokedAt) return null;
    if (authz.appId !== appId) return null; // mismatched client
    // Rotate: revoke old token, issue new pair, return new.
    await revokeTokenById(cached.tokenId, "rotated");
    return issueTokenPair(authz);
  }

  if (!usingDb) return null;
  try {
    const result = await db.query<{
      id: string;
      authorization_id: string;
      refresh_expires_at: string;
      revoked_at: string | null;
      scopes: string[];
    }>(
      `SELECT id, authorization_id, refresh_expires_at, revoked_at, scopes
         FROM agent_access_tokens
        WHERE refresh_token_hash = $1
        LIMIT 1`,
      [refreshHash],
    );
    const row = result.rows[0];
    if (!row || row.revoked_at) return null;
    if (new Date(row.refresh_expires_at).getTime() < Date.now()) return null;

    const authz = await findAuthorizationById(row.authorization_id);
    if (!authz || authz.revokedAt) return null;
    if (authz.appId !== appId) return null;

    await revokeTokenById(row.id, "rotated");
    return issueTokenPair(authz);
  } catch (e) {
    console.error("[oauth/agent-apps] refresh failed:", e);
    return null;
  }
}

async function revokeTokenById(tokenId: string, reason: string): Promise<void> {
  // Best-effort: clear from both in-memory caches.
  for (const [hash, rec] of tokensByHash.entries()) {
    if (rec.id === tokenId) tokensByHash.delete(hash);
  }
  for (const [hash, rec] of tokensByRefreshHash.entries()) {
    if (rec.tokenId === tokenId) {
      rec.revokedAt = new Date().toISOString();
      tokensByRefreshHash.set(hash, rec);
    }
  }
  if (!usingDb) return;
  try {
    await db.query(
      `UPDATE agent_access_tokens SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL`,
      [tokenId],
    );
    void reason; // logged at call sites; not persisted on the row to keep schema small
  } catch (e) {
    console.error("[oauth/agent-apps] revoke token failed:", e);
  }
}

/**
 * Verify an access token presented as a Bearer. Returns the
 * authorization (with businessId + scopes) on success; null on miss
 * / expired / revoked.
 */
export async function verifyAccessToken(
  accessToken: string,
): Promise<{ authorizationId: string; businessId: string; scopes: string[] } | null> {
  if (!accessToken.startsWith("at_")) return null;
  const hash = hashSecret(accessToken);
  const cached = tokensByHash.get(hash);
  if (cached) {
    if (cached.revokedAt) return null;
    if (new Date(cached.expiresAt).getTime() < Date.now()) return null;
    const authz = await findAuthorizationById(cached.authorizationId);
    if (!authz || authz.revokedAt) return null;
    return {
      authorizationId: authz.id,
      businessId: authz.businessId,
      scopes: cached.scopes,
    };
  }

  if (!usingDb) return null;
  try {
    const result = await db.query<{
      id: string;
      authorization_id: string;
      expires_at: string;
      revoked_at: string | null;
      scopes: string[];
    }>(
      `SELECT id, authorization_id, expires_at, revoked_at, scopes
         FROM agent_access_tokens
        WHERE access_token_hash = $1
        LIMIT 1`,
      [hash],
    );
    const row = result.rows[0];
    if (!row || row.revoked_at) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;

    const authz = await findAuthorizationById(row.authorization_id);
    if (!authz || authz.revokedAt) return null;

    // Fire-and-forget last_used_at update.
    db.query(`UPDATE agent_access_tokens SET last_used_at = NOW() WHERE id = $1`, [row.id]).catch(() => {});

    return {
      authorizationId: authz.id,
      businessId: authz.businessId,
      scopes: row.scopes,
    };
  } catch (e) {
    console.error("[oauth/agent-apps] verify token failed:", e);
    return null;
  }
}

async function findAuthorizationById(id: string): Promise<AgentAuthorization | null> {
  for (const v of authzByCompoundKey.values()) if (v.id === id) return v;
  if (!usingDb) return null;
  try {
    const result = await db.query<{
      id: string;
      app_id: string;
      business_id: string;
      scopes: string[];
      authorized_by_user_id: string;
      authorized_at: string;
      revoked_at: string | null;
      revoked_reason: string | null;
    }>(`SELECT * FROM agent_authorizations WHERE id = $1 LIMIT 1`, [id]);
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      appId: row.app_id,
      businessId: row.business_id,
      scopes: row.scopes,
      authorizedByUserId: row.authorized_by_user_id,
      authorizedAt: row.authorized_at,
      revokedAt: row.revoked_at ?? undefined,
      revokedReason: row.revoked_reason ?? undefined,
    };
  } catch (e) {
    console.error("[oauth/agent-apps] findAuthorization failed:", e);
    return null;
  }
}

// ─── Authorization codes (one-time, short-lived) ─────────────────────────

interface AuthCodeRecord {
  code: string;
  appId: string;
  businessId: string;
  scopes: string[];
  redirectUri: string;
  authorizedByUserId: string;
  expiresAt: number;
  used: boolean;
}

const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const authCodes = new Map<string, AuthCodeRecord>();

export function issueAuthCode(args: {
  appId: string;
  businessId: string;
  scopes: string[];
  redirectUri: string;
  authorizedByUserId: string;
}): string {
  // Periodically prune expired codes so the map doesn't grow forever.
  const now = Date.now();
  for (const [code, record] of authCodes.entries()) {
    if (record.expiresAt < now) authCodes.delete(code);
  }
  const code = `code_${generateSecret()}`;
  authCodes.set(code, { ...args, code, used: false, expiresAt: now + AUTH_CODE_TTL_MS });
  return code;
}

export function consumeAuthCode(code: string): AuthCodeRecord | null {
  const record = authCodes.get(code);
  if (!record) return null;
  if (record.used) return null;
  if (record.expiresAt < Date.now()) {
    authCodes.delete(code);
    return null;
  }
  record.used = true;
  authCodes.set(code, record);
  return record;
}
