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
 * Exchange an authorization code for access/refresh tokens.
 */
export async function exchangeCodeForTokens(
  provider: OAuthProvider,
  code: string,
  redirectUri: string
): Promise<Record<string, unknown>> {
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
  return res.json();
}

/**
 * Retrieve user profile info from the provider using an access token.
 */
export async function getUserInfo(
  provider: OAuthProvider,
  accessToken: string
): Promise<Record<string, unknown>> {
  const res = await fetch(provider.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(OAUTH_TIMEOUT_MS),
  });
  return res.json();
}
