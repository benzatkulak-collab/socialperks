/**
 * OAuth code → access token exchange.
 *
 * Each platform has its own token endpoint and request shape. This module
 * normalizes them behind a single `exchangeCode()` function so the
 * callback route doesn't have to special-case each platform.
 *
 * Platforms implemented: ig (Instagram Basic Display), tt (TikTok v2),
 * fb (Facebook Graph). All others fall through to demo mode.
 */

import { getOAuthCredentials } from "@/lib/oauth/env";

export interface ExchangeResult {
  ok: true;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn?: number;
  scope?: string;
  /** Platform-native user identifier returned alongside the token. */
  platformUserId?: string;
  /** True when this came from a real platform call; false when mocked. */
  real: boolean;
}

export interface ExchangeError {
  ok: false;
  code: string;
  message: string;
  /** True when the platform's API responded with a real error. */
  real: boolean;
}

export type ExchangeOutcome = ExchangeResult | ExchangeError;

interface ExchangeArgs {
  platformId: string;
  code: string;
  redirectUri: string;
}

/**
 * Exchange an OAuth authorization code for an access token.
 *
 * If credentials for the platform aren't configured, returns a clearly-
 * flagged mock result instead of calling the platform. Callers can detect
 * `result.real === false` and surface a "demo mode" notice.
 */
export async function exchangeCode(args: ExchangeArgs): Promise<ExchangeOutcome> {
  const { platformId, code, redirectUri } = args;
  const creds = getOAuthCredentials(platformId);

  if (!creds.configured) {
    return mockResult(platformId);
  }

  switch (platformId) {
    case "ig":
      return exchangeInstagram({
        clientId: creds.clientId!,
        clientSecret: creds.clientSecret!,
        code,
        redirectUri,
      });
    case "tt":
      return exchangeTikTok({
        clientId: creds.clientId!,
        clientSecret: creds.clientSecret!,
        code,
        redirectUri,
      });
    case "fb":
      return exchangeFacebook({
        clientId: creds.clientId!,
        clientSecret: creds.clientSecret!,
        code,
        redirectUri,
      });
    default:
      // Credentials configured but exchange not implemented — fall back to
      // mock so the callback doesn't 500. Will be implemented per-platform
      // as those integrations come online.
      return mockResult(platformId);
  }
}

function mockResult(platformId: string): ExchangeResult {
  return {
    ok: true,
    accessToken: `mock_${platformId}_${randomTail()}`,
    refreshToken: `mock_refresh_${platformId}_${randomTail()}`,
    tokenType: "Bearer",
    expiresIn: 3600,
    scope: "demo",
    real: false,
  };
}

function randomTail(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

// ─── Instagram (Basic Display API) ─────────────────────────────────────────
// https://developers.facebook.com/docs/instagram-basic-display-api/getting-started
async function exchangeInstagram(p: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<ExchangeOutcome> {
  try {
    const res = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: p.clientId,
        client_secret: p.clientSecret,
        grant_type: "authorization_code",
        redirect_uri: p.redirectUri,
        code: p.code,
      }).toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        code: "EXCHANGE_FAILED",
        message: `Instagram token exchange failed (${res.status}): ${text.slice(0, 200)}`,
        real: true,
      };
    }
    const data = (await res.json()) as { access_token?: string; user_id?: string | number };
    if (!data.access_token) {
      return { ok: false, code: "NO_TOKEN", message: "Instagram response missing access_token", real: true };
    }
    return {
      ok: true,
      accessToken: data.access_token,
      tokenType: "Bearer",
      // Instagram short-lived tokens are 1 hour; exchange for long-lived after.
      expiresIn: 3600,
      platformUserId: data.user_id !== undefined ? String(data.user_id) : undefined,
      real: true,
    };
  } catch (e) {
    return {
      ok: false,
      code: "NETWORK",
      message: `Network error reaching Instagram: ${e instanceof Error ? e.message : String(e)}`,
      real: true,
    };
  }
}

// ─── TikTok (v2 OAuth) ─────────────────────────────────────────────────────
// https://developers.tiktok.com/doc/login-kit-web
async function exchangeTikTok(p: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<ExchangeOutcome> {
  try {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: p.clientId,
        client_secret: p.clientSecret,
        code: p.code,
        grant_type: "authorization_code",
        redirect_uri: p.redirectUri,
      }).toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        code: "EXCHANGE_FAILED",
        message: `TikTok token exchange failed (${res.status}): ${text.slice(0, 200)}`,
        real: true,
      };
    }
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      open_id?: string;
      error?: string;
      error_description?: string;
    };
    if (data.error) {
      return {
        ok: false,
        code: "TIKTOK_ERROR",
        message: `${data.error}: ${data.error_description ?? ""}`.trim(),
        real: true,
      };
    }
    if (!data.access_token) {
      return { ok: false, code: "NO_TOKEN", message: "TikTok response missing access_token", real: true };
    }
    return {
      ok: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: "Bearer",
      expiresIn: data.expires_in,
      scope: data.scope,
      platformUserId: data.open_id,
      real: true,
    };
  } catch (e) {
    return {
      ok: false,
      code: "NETWORK",
      message: `Network error reaching TikTok: ${e instanceof Error ? e.message : String(e)}`,
      real: true,
    };
  }
}

// ─── Facebook (Graph API v18) ──────────────────────────────────────────────
// https://developers.facebook.com/docs/facebook-login/guides/access-tokens
async function exchangeFacebook(p: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<ExchangeOutcome> {
  try {
    const url = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
    url.searchParams.set("client_id", p.clientId);
    url.searchParams.set("client_secret", p.clientSecret);
    url.searchParams.set("redirect_uri", p.redirectUri);
    url.searchParams.set("code", p.code);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        code: "EXCHANGE_FAILED",
        message: `Facebook token exchange failed (${res.status}): ${text.slice(0, 200)}`,
        real: true,
      };
    }
    const data = (await res.json()) as { access_token?: string; token_type?: string; expires_in?: number };
    if (!data.access_token) {
      return { ok: false, code: "NO_TOKEN", message: "Facebook response missing access_token", real: true };
    }
    return {
      ok: true,
      accessToken: data.access_token,
      tokenType: data.token_type ?? "Bearer",
      expiresIn: data.expires_in,
      real: true,
    };
  } catch (e) {
    return {
      ok: false,
      code: "NETWORK",
      message: `Network error reaching Facebook: ${e instanceof Error ? e.message : String(e)}`,
      real: true,
    };
  }
}
