/**
 * POST /api/v1/oauth/token
 *
 * Standard OAuth 2.0 token endpoint. Accepts:
 *   grant_type=authorization_code: code, redirect_uri
 *   grant_type=refresh_token:      refresh_token   (TODO: not in P14)
 *
 * Authentication: HTTP Basic with client_id:client_secret in the
 * Authorization header. Body is application/x-www-form-urlencoded
 * per the OAuth spec — JSON also accepted as a developer-friendly
 * fallback.
 *
 * Returns:
 *   {
 *     access_token: "at_...",
 *     refresh_token: "rt_...",
 *     token_type: "Bearer",
 *     expires_in: 3600,
 *     scope: "read write"
 *   }
 *
 * Why we follow the standard shape: Stripe-Connect-style integrations
 * are often built with off-the-shelf OAuth client libraries
 * (passport, simple-oauth2, etc.). Matching the standard JSON shape
 * means those libraries work without per-vendor adapters.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ok, err, rateLimit } from "../../_shared";
import {
  verifyClientCredentials,
  consumeAuthCode,
  grantAuthorization,
  issueTokenPair,
} from "@/lib/oauth/agent-apps";

export const runtime = "nodejs";

function parseBasicAuth(header: string | null): { clientId: string; clientSecret: string } | null {
  if (!header || !header.toLowerCase().startsWith("basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf-8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx < 0) return null;
    return {
      clientId: decoded.slice(0, colonIdx),
      clientSecret: decoded.slice(colonIdx + 1),
    };
  } catch {
    return null;
  }
}

async function readBody(req: NextRequest): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    return Object.fromEntries(params.entries());
  }
  if (contentType.includes("application/json")) {
    const json = (await req.json()) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(json)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  }
  return {};
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // Auth: HTTP Basic OR client_id+client_secret in body (also OAuth-spec).
  let creds = parseBasicAuth(req.headers.get("authorization"));
  const body = await readBody(req);
  if (!creds && body.client_id && body.client_secret) {
    creds = { clientId: body.client_id, clientSecret: body.client_secret };
  }
  if (!creds) {
    return err("invalid_client", "Provide client credentials via Basic auth or body", 401);
  }

  const app = await verifyClientCredentials(creds.clientId, creds.clientSecret);
  if (!app) {
    return err("invalid_client", "Bad client_id or client_secret", 401);
  }

  const grantType = body.grant_type ?? "";

  if (grantType === "authorization_code") {
    const code = body.code ?? "";
    const redirectUri = body.redirect_uri ?? "";
    if (!code) return err("invalid_request", "code is required", 400);
    if (!redirectUri) return err("invalid_request", "redirect_uri is required", 400);

    const consumed = consumeAuthCode(code);
    if (!consumed) {
      return err("invalid_grant", "code is invalid, expired, or already used", 400);
    }
    if (consumed.appId !== app.id) {
      return err("invalid_grant", "code was issued for a different app", 400);
    }
    if (consumed.redirectUri !== redirectUri) {
      return err(
        "invalid_grant",
        "redirect_uri does not match the value used at /authorize",
        400,
      );
    }

    // Persist the long-lived authorization (idempotent on app+business).
    const authz = await grantAuthorization({
      appId: consumed.appId,
      businessId: consumed.businessId,
      scopes: consumed.scopes,
      authorizedByUserId: consumed.authorizedByUserId,
    });
    const tokens = await issueTokenPair(authz);

    // OAuth spec uses snake_case in the response.
    return ok({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: "Bearer",
      expires_in: Math.round(
        (new Date(tokens.expiresAt).getTime() - Date.now()) / 1000,
      ),
      scope: tokens.scopes.join(" "),
    });
  }

  // refresh_token grant — TODO: implement when an integrator asks for
  // it. The token-pair issuance already creates a refresh hash so
  // we just need a verify-and-reissue path here.
  if (grantType === "refresh_token") {
    return err(
      "unsupported_grant_type",
      "refresh_token grant is on the roadmap; for now, re-run /oauth/authorize",
      400,
    );
  }

  return err("unsupported_grant_type", `grant_type '${grantType}' is not supported`, 400);
}
