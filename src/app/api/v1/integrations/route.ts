/**
 * GET    /api/v1/integrations — list authorized agent apps for the
 *                                authenticated business (joins
 *                                agent_authorizations + agent_apps).
 * DELETE /api/v1/integrations?app_id=… — revoke an authorization.
 *
 * Auth: cookie session (sp-access-token). Shop owners manage which
 * agent apps can act on their behalf via this endpoint; the consent
 * page (/oauth/authorize) is the inverse — it grants new access.
 *
 * In-memory mode: returns an empty list. The agent OAuth code does
 * keep an in-memory map but enumerating per-business is not worth
 * supporting outside production (DATABASE_URL).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ok, err, rateLimit } from "../_shared";
import { verifyJWT } from "@/lib/auth";
import { db, InMemoryConnection } from "@/lib/db/connection";
import { revokeAuthorization } from "@/lib/oauth/agent-apps";

export const runtime = "nodejs";

const usingDb = !(db instanceof InMemoryConnection);

interface JoinedRow {
  authz_id: string;
  app_id: string;
  scopes: string[];
  authorized_at: string;
  app_name: string;
  app_description: string | null;
  app_homepage_url: string | null;
  app_status: "active" | "suspended" | "revoked";
  last_used_at: string | null;
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
  if (!auth) return err("UNAUTHORIZED", "Sign in to view integrations", 401);

  if (!usingDb) {
    return ok({
      integrations: [],
      note: "Agent integrations require DATABASE_URL",
    });
  }

  try {
    // Pull active authorizations + the app metadata, plus the most
    // recent token activity so the dashboard can show "last used".
    const result = await db.query<JoinedRow>(
      `SELECT
         az.id            AS authz_id,
         az.app_id        AS app_id,
         az.scopes        AS scopes,
         az.authorized_at AS authorized_at,
         a.name           AS app_name,
         a.description    AS app_description,
         a.homepage_url   AS app_homepage_url,
         a.status         AS app_status,
         (SELECT MAX(t.last_used_at)
            FROM agent_access_tokens t
           WHERE t.authorization_id = az.id) AS last_used_at
       FROM agent_authorizations az
       JOIN agent_apps a ON a.id = az.app_id
       WHERE az.business_id = $1
         AND az.revoked_at IS NULL
       ORDER BY az.authorized_at DESC`,
      [auth.businessId],
    );
    const integrations = result.rows.map((r) => ({
      authorizationId: r.authz_id,
      appId: r.app_id,
      scopes: r.scopes,
      authorizedAt: r.authorized_at,
      lastUsedAt: r.last_used_at,
      app: {
        name: r.app_name,
        description: r.app_description,
        homepageUrl: r.app_homepage_url,
        status: r.app_status,
      },
    }));
    return ok({ integrations });
  } catch (e) {
    console.error("[integrations] list failed:", e);
    return err("DB_ERROR", "Could not list integrations", 500);
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;
  const auth = authedBusiness(req);
  if (!auth) return err("UNAUTHORIZED", "Sign in to revoke integrations", 401);

  const url = new URL(req.url);
  const appId = url.searchParams.get("app_id");
  if (!appId) return err("INVALID_REQUEST", "?app_id= is required", 400);

  try {
    const revoked = await revokeAuthorization(appId, auth.businessId, "user_revoked");
    if (!revoked) {
      return err("NOT_FOUND", "Integration not found, not yours, or already revoked", 404);
    }
    return ok({ revoked: true, appId });
  } catch (e) {
    console.error("[integrations] revoke failed:", e);
    return err("REVOKE_FAILED", "Could not revoke integration", 500);
  }
}
