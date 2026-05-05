/**
 * Auto-issued API key on signup (Inevitability blueprint).
 *
 * Bots can't bootstrap programmatic access if they have to navigate
 * the dashboard manually. We issue a default scoped key on every
 * signup, stored in the api_keys table, retrievable via authenticated
 * session at GET /api/v1/businesses/me/api-key.
 *
 * Scope: read-only by default. Power tier can request write via
 * POST /api/v1/api-keys/promote.
 */

import crypto from "crypto";
import { db, InMemoryConnection } from "@/lib/db/connection";

const usingDb = !(db instanceof InMemoryConnection);

const memoryByOwner = new Map<string, ApiKey>();

export interface ApiKey {
  id: string;
  ownerType: "business" | "influencer";
  ownerId: string;
  publicId: string;     // sk_live_xxxxx — safe to log
  hashedKey: string;    // SHA256 of the secret
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

export interface IssuedKey extends ApiKey {
  /** Plain-text secret — ONLY available at issuance time. */
  secret: string;
}

function hashKey(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

function generateSecret(): string {
  return `sk_live_${crypto.randomBytes(24).toString("base64url")}`;
}

export async function autoIssueOnSignup(args: {
  ownerType: "business" | "influencer";
  ownerId: string;
}): Promise<IssuedKey> {
  const secret = generateSecret();
  const publicId = secret.slice(0, 16) + "…";
  const hashedKey = hashKey(secret);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const scopes = ["read"];

  if (usingDb) {
    try {
      await db.query(
        `INSERT INTO api_keys (id, business_id, key_hash, key_prefix, name, scopes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [
          id,
          args.ownerType === "business" ? args.ownerId : null,
          hashedKey,
          publicId,
          "Default key (auto-issued)",
          scopes,
          now,
        ],
      );
    } catch {
      /* fall through to memory */
    }
  }

  const key: IssuedKey = {
    id,
    ownerType: args.ownerType,
    ownerId: args.ownerId,
    publicId,
    hashedKey,
    scopes,
    createdAt: now,
    lastUsedAt: null,
    secret,
  };
  memoryByOwner.set(`${args.ownerType}:${args.ownerId}`, key);
  return key;
}
