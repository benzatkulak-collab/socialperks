/**
 * POST /api/v1/auth/oauth/connect
 *
 * Start OAuth social login flow for Google or GitHub.
 * Returns the authorization URL that the client should redirect to.
 * No auth required (this is the login initiation endpoint).
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, parseBody, withTiming } from "../../../_shared";
import {
  oauthProviders,
  getAuthorizationUrl,
} from "@/lib/auth/oauth-providers";

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const body = await parseBody<{
    provider?: string;
    redirectUri?: string;
  }>(req);
  if (body instanceof Response) return body;

  const { provider: providerId, redirectUri } = body;

  if (!providerId || typeof providerId !== "string") {
    return err("MISSING_PROVIDER", "provider is required", 400);
  }

  const provider = oauthProviders[providerId];
  if (!provider) {
    return err(
      "INVALID_PROVIDER",
      `Unknown provider: ${providerId}. Supported: ${Object.keys(oauthProviders).join(", ")}`,
      400
    );
  }

  if (!process.env[provider.clientIdEnv]) {
    return err(
      "PROVIDER_NOT_CONFIGURED",
      `${provider.name} OAuth is not configured`,
      500
    );
  }

  const state = crypto.randomUUID();
  // In production, store state in session/Redis for CSRF protection
  const callbackUri =
    redirectUri ||
    `${req.nextUrl.origin}/api/v1/auth/oauth/${providerId}/callback`;

  const url = getAuthorizationUrl(provider, callbackUri, state);

  return ok({ url, state, provider: provider.name });
});
