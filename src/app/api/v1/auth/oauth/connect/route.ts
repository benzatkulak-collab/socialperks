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
import { generateCsrfToken } from "@/lib/security/csrf";

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

  // Sign the state with our CSRF HMAC so the callback can prove it was
  // issued by us. `crypto.randomUUID()` alone was unverifiable on return —
  // any random UUID would have been accepted. Binding to `oauth:<provider>`
  // (not a user id, since social login has no logged-in user yet) gives
  // signature + 1h expiry without needing a Redis side-store.
  const state = generateCsrfToken(`oauth:${providerId}`);
  const callbackUri =
    redirectUri ||
    `${req.nextUrl.origin}/api/v1/auth/oauth/${providerId}/callback`;

  const url = getAuthorizationUrl(provider, callbackUri, state);

  return ok({ url, state, provider: provider.name });
});
