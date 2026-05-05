/**
 * GET    /api/v1/api-keys — list keys for the authenticated business
 * POST   /api/v1/api-keys — issue a new write-scoped key
 * DELETE /api/v1/api-keys?id=… — revoke a key
 *
 * Lifecycle controls for the keys we hand out via /dev/init or
 * dashboard. Until P14, the only way to issue or revoke a key was
 * via the auto-issue layer at signup time — which gave us no story
 * for "rotate this leaked key" or "we need a separate key for this
 * one CI pipeline".
 *
 * Auth: session cookie (sp-access-token). The shop owner manages
 * their own keys. An admin can also revoke any key via the
 * existing admin paths (separate concern).
 *
 * Issuance is rate-limited to prevent a compromised session from
 * spawning thousands of keys. We cap each business at 10 active
 * keys; the dashboard prompts for cleanup when they hit the cap.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { ok, err, rateLimit, parseBody } from "../_shared";
import { verifyJWT } from "@/lib/auth";
import { db, InMemoryConnection } from "@/lib/db/connection";

export const runtime = "nodejs";

const MAX_KEYS_PER_BUSINESS = 10;
const usingDb = !(db instanceof InMemoryConnection);

interface KeyRow {
  id: string;
  business_id: string;
  key_prefix: string;
  name: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

function authedBusiness(req: NextRequest): { businessId: string; userId: string } | null {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(/sp-access-token=([^;]+)/);
  if (!m) return null;
  let session;
  try {
    session = verifyJWT(m[1]!);
  } catch {
    return null;
  }
  if (!session?.businessId) return null;
  return { businessId: session.businessId, userId: session.sub };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;
  const auth = authedBusiness(req);
  if (!auth) return err("UNAUTHORIZED", "Sign in to manage API keys", 401);

  if (!usingDb) {
    // In-memory mode — auto-issue keeps a per-owner map but doesn't
    // expose enumeration. Return empty + a dev hint.
    return ok({ keys: [], note: "API key listing requires DATABASE_URL" });
  }

  try {
    const result = await db.query<KeyRow>(
      `SELECT id, business_id, key_prefix, name, scopes, created_at, last_used_at, revoked_at
         FROM api_keys
        WHERE business_id = $1
        ORDER BY created_at DESC`,
      [auth.businessId],
    );
    const keys = result.rows.map((r) => ({
      id: r.id,
      keyPrefix: r.key_prefix,
      name: r.name,
      scopes: r.scopes,
      createdAt: r.created_at,
      lastUsedAt: r.last_used_at,
      revokedAt: r.revoked_at,
      active: !r.revoked_at,
    }));
    return ok({ keys });
  } catch (e) {
    console.error("[api-keys] list failed:", e);
    return err("DB_ERROR", "Could not list keys", 500);
  }
}

interface CreateBody {
  name?: unknown;
  scopes?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;
  const auth = authedBusiness(req);
  if (!auth) return err("UNAUTHORIZED", "Sign in to manage API keys", 401);

  const body = await parseBody<CreateBody>(req);
  if (body instanceof NextResponse) return body;

  const name = typeof body.name === "string" ? body.name.slice(0, 100).trim() : "";
  if (name.length < 2) {
    return err("INVALID_NAME", "name is required (helps you remember which key is which)", 400);
  }

  const allowedScopes = ["read", "write", "webhooks:write", "sms:enqueue"];
  const scopes = Array.isArray(body.scopes)
    ? body.scopes
        .filter((s): s is string => typeof s === "string")
        .filter((s) => allowedScopes.includes(s))
    : ["read"];
  if (scopes.length === 0) {
    return err("INVALID_SCOPES", `scopes must include at least one of: ${allowedScopes.join(", ")}`, 400);
  }

  if (usingDb) {
    try {
      const count = await db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM api_keys WHERE business_id = $1 AND revoked_at IS NULL`,
        [auth.businessId],
      );
      if (parseInt(count.rows[0]?.count ?? "0", 10) >= MAX_KEYS_PER_BUSINESS) {
        return err(
          "TOO_MANY_KEYS",
          `Active API key limit reached (${MAX_KEYS_PER_BUSINESS}). Revoke one before issuing another.`,
          409,
        );
      }
    } catch (e) {
      console.error("[api-keys] count check failed:", e);
    }
  }

  const secret = `sk_live_${crypto.randomBytes(24).toString("base64url")}`;
  const hash = crypto.createHash("sha256").update(secret).digest("hex");
  const id = crypto.randomUUID();
  const prefix = secret.slice(0, 16) + "…";

  if (usingDb) {
    try {
      await db.query(
        `INSERT INTO api_keys (id, business_id, key_hash, key_prefix, name, scopes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [id, auth.businessId, hash, prefix, name, scopes],
      );
    } catch (e) {
      console.error("[api-keys] create failed:", e);
      return err("DB_ERROR", "Could not create key", 500);
    }
  }

  return ok(
    {
      key: {
        id,
        keyPrefix: prefix,
        name,
        scopes,
        secret, // ONLY shown here.
      },
      warning: "Store the secret now — you can't retrieve it later.",
    },
    201,
  );
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;
  const auth = authedBusiness(req);
  if (!auth) return err("UNAUTHORIZED", "Sign in to manage API keys", 401);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return err("INVALID_REQUEST", "?id= is required", 400);

  if (!usingDb) {
    return ok({ revoked: false, note: "API key revocation requires DATABASE_URL" });
  }

  try {
    const result = await db.query(
      `UPDATE api_keys
          SET revoked_at = NOW()
        WHERE id = $1 AND business_id = $2 AND revoked_at IS NULL`,
      [id, auth.businessId],
    );
    if (result.rowCount === 0) {
      return err("NOT_FOUND", "Key not found, not yours, or already revoked", 404);
    }
    return ok({ revoked: true, id });
  } catch (e) {
    console.error("[api-keys] revoke failed:", e);
    return err("DB_ERROR", "Could not revoke key", 500);
  }
}
