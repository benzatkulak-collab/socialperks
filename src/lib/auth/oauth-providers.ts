/**
 * OAuth Provider Configuration
 * ─────────────────────────────
 * Defines OAuth provider settings for Google and GitHub social login.
 * Each provider includes authorization, token, and user info URLs,
 * plus the environment variable names for client credentials.
 */

export interface OAuthProvider {
  id: string;
  name: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
}

export const oauthProviders: Record<string, OAuthProvider> = {
  google: {
    id: "google",
    name: "Google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    scopes: ["openid", "email", "profile"],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  },
  github: {
    id: "github",
    name: "GitHub",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    scopes: ["user:email"],
    clientIdEnv: "GITHUB_CLIENT_ID",
    clientSecretEnv: "GITHUB_CLIENT_SECRET",
  },
};

/**
 * Generate authorization URL for an OAuth provider.
 * Includes client_id, redirect_uri, scopes, and CSRF state token.
 */
export function getAuthorizationUrl(
  provider: OAuthProvider,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: process.env[provider.clientIdEnv] || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: provider.scopes.join(" "),
    state,
  });
  return `${provider.authUrl}?${params}`;
}

// OAuth providers should respond well within 10s; hard cap protects the
// signin request from hanging when an IdP is slow or unreachable.
const OAUTH_TIMEOUT_MS = 10_000;

/**
 * Standard OAuth token response shape. Concrete enough that callers don't
 * need `as string` casts, loose enough to accept extra provider-specific
 * fields (Google adds `id_token`, GitHub adds `scope`, etc.). Lib audit M7.
 */
export interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  /** Provider-specific error code (e.g. "invalid_grant"). */
  error?: string;
  error_description?: string;
  [key: string]: unknown;
}

export interface OAuthUserInfo {
  /** OpenID `sub` claim or provider-specific user id. */
  id?: string | number;
  sub?: string;
  /** GitHub-only. */
  login?: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  [key: string]: unknown;
}

/**
 * Exchange an authorization code for access/refresh tokens.
 * Throws on network/HTTP failure so the callback route surfaces a real
 * error code instead of treating a 4xx response body as a token payload.
 */
export async function exchangeCodeForTokens(
  provider: OAuthProvider,
  code: string,
  redirectUri: string
): Promise<OAuthTokenResponse> {
  const res = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env[provider.clientIdEnv],
      client_secret: process.env[provider.clientSecretEnv],
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(OAUTH_TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => ({}))) as OAuthTokenResponse;
  if (!res.ok && !body.error) {
    body.error = `http_${res.status}`;
    body.error_description = `Token exchange returned HTTP ${res.status}`;
  }
  return body;
}

/**
 * Retrieve user profile info from the provider using an access token.
 */
export async function getUserInfo(
  provider: OAuthProvider,
  accessToken: string
): Promise<OAuthUserInfo> {
  const res = await fetch(provider.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(OAUTH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`userinfo request failed: HTTP ${res.status}`);
  }
  return (await res.json()) as OAuthUserInfo;
}
