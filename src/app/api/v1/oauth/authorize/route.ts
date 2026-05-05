/**
 * POST /api/v1/oauth/authorize
 *
 * Backend for the consent form on /oauth/authorize. Called when the
 * shop owner clicks "Authorize" — we verify their session, validate
 * the OAuth params, issue a one-time `code`, and return the URL to
 * redirect back to the agent.
 *
 * Auth: session cookie (sp-access-token). The shop owner must be
 * logged in. If not, the caller (consent-form.tsx) bounces to the
 * login page and round-trips back here.
 *
 * Why separate from the consent page: the page is a server component
 * that just renders the consent UI; the actual authorization action
 * is a side-effecting POST that needs the user's session and
 * shouldn't happen on a GET. Standard CSRF posture.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ok, err, rateLimit, parseBody } from "../../_shared";
import { verifyJWT } from "@/lib/auth";
import { findAppByClientId, issueAuthCode } from "@/lib/oauth/agent-apps";

export const runtime = "nodejs";

interface AuthorizeBody {
  appId?: unknown;
  clientId?: unknown;
  redirectUri?: unknown;
  scopes?: unknown;
  state?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // Session cookie — same name our auth route sets.
  const cookieHeader = req.headers.get("cookie") ?? "";
  const accessTokenMatch = cookieHeader.match(/sp-access-token=([^;]+)/);
  const accessToken = accessTokenMatch?.[1];
  if (!accessToken) {
    return err("UNAUTHORIZED", "You must be signed in to authorize an integration", 401);
  }

  let session: ReturnType<typeof verifyJWT>;
  try {
    session = verifyJWT(accessToken);
  } catch {
    return err("UNAUTHORIZED", "Session is invalid or expired", 401);
  }
  if (!session) {
    return err("UNAUTHORIZED", "Session is invalid or expired", 401);
  }
  const businessId = session.businessId;
  if (!businessId) {
    return err(
      "NO_BUSINESS",
      "Your account isn't linked to a business; only business owners can authorize integrations",
      403,
    );
  }

  const body = await parseBody<AuthorizeBody>(req);
  if (body instanceof NextResponse) return body;

  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  const redirectUri = typeof body.redirectUri === "string" ? body.redirectUri : "";
  const scopes = Array.isArray(body.scopes)
    ? body.scopes.filter((s): s is string => typeof s === "string")
    : [];
  const state = typeof body.state === "string" ? body.state : "";

  if (!clientId || !redirectUri || scopes.length === 0) {
    return err("INVALID_REQUEST", "clientId, redirectUri, and scopes are required", 400);
  }

  const app = await findAppByClientId(clientId);
  if (!app || app.status !== "active") {
    return err("UNKNOWN_CLIENT", "No active app with that client_id", 404);
  }
  if (!app.redirectUris.includes(redirectUri)) {
    return err("INVALID_REDIRECT", "redirect_uri is not registered for this app", 400);
  }

  const code = issueAuthCode({
    appId: app.id,
    businessId,
    scopes,
    redirectUri,
    authorizedByUserId: session.sub,
  });

  const back = new URL(redirectUri);
  back.searchParams.set("code", code);
  if (state) back.searchParams.set("state", state);

  return ok({ redirect: back.toString() });
}
