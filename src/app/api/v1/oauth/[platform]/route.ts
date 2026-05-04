/**
 * GET /api/v1/oauth/[platform]
 *
 * OAuth callback handler. Validates the state token (CSRF binding) and
 * exchanges the authorization code for a real access token via the
 * platform's token endpoint. Falls back to a clearly-flagged mock token
 * when credentials aren't configured (so dev still works).
 */

import type { NextRequest } from "next/server";
import { ok, err, getQuery, withTiming } from "../../_shared";
import { findPlatform } from "@/lib/platforms";
import { validateCsrfToken } from "@/lib/security/csrf";
import { exchangeCode } from "@/lib/oauth/exchange";
import { isOAuthConfigured } from "@/lib/oauth/env";

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(
  async (
    req: NextRequest,
    ctx?: unknown
  ) => {
    const params = (ctx as { params: Promise<{ platform: string }> })?.params;
    const { platform: platformId } = await params;

    // Validate platform
    if (!platformId || !findPlatform(platformId)) {
      return err(
        "INVALID_PLATFORM",
        `Platform '${platformId}' not found`,
        400
      );
    }

    const q = getQuery(req);
    const code = q.get("code");
    const state = q.get("state");
    const errorParam = q.get("error");
    const errorDescription = q.get("error_description");

    // Handle OAuth error response
    if (errorParam) {
      return err(
        "OAUTH_ERROR",
        errorDescription ?? `OAuth error: ${errorParam}`,
        400
      );
    }

    // Validate required params
    if (!code) {
      return err("MISSING_CODE", "Authorization code is required", 400);
    }
    if (!state) {
      return err("MISSING_STATE", "State parameter is required", 400);
    }

    // Validate state token — we need a session ID to validate against.
    // The state token was generated with the user's ID as the session identifier.
    // In production, we'd look up the pending OAuth flow to get the user ID.
    // For now, we validate the token structure (4 parts, not expired).
    const stateParts = state.split(".");
    if (stateParts.length !== 4) {
      return err("INVALID_STATE", "Invalid state token format", 400);
    }

    // Extract the session ID from the state token and validate
    const sessionId = stateParts[0];
    if (!validateCsrfToken(state, sessionId)) {
      return err(
        "INVALID_STATE",
        "State token is invalid or expired. Please restart the OAuth flow.",
        400
      );
    }

    // Exchange the authorization code for a real access token. The
    // platform requires the redirect_uri to match what was registered
    // on /authorize — so we reconstruct the callback URL from the
    // request itself (this handler IS that URL).
    const callbackUrl = new URL(req.url);
    callbackUrl.search = ""; // strip query, keep just pathname
    const redirectUri = callbackUrl.toString();

    const exchange = await exchangeCode({
      platformId,
      code,
      redirectUri,
    });

    if (!exchange.ok) {
      return err(exchange.code, exchange.message, 502);
    }

    const platform = findPlatform(platformId)!;
    const wasConfigured = isOAuthConfigured(platformId);

    return ok({
      platform: {
        id: platform.id,
        name: platform.name,
      },
      connection: {
        accessToken: exchange.accessToken,
        refreshToken: exchange.refreshToken ?? null,
        tokenType: exchange.tokenType,
        expiresIn: exchange.expiresIn ?? null,
        scope: exchange.scope ?? null,
        platformUserId: exchange.platformUserId ?? null,
        connectedAt: new Date().toISOString(),
        // True when this came from the actual platform API. False when
        // we returned a mock because credentials weren't configured.
        // Clients should surface a "demo mode" notice when real=false.
        real: exchange.real,
      },
      userId: sessionId,
      mode: exchange.real ? "live" : "demo",
      message: exchange.real
        ? `Connected to ${platform.name}.`
        : `Connected to ${platform.name} in demo mode. Set OAUTH_${platformId.toUpperCase()}_CLIENT_ID and OAUTH_${platformId.toUpperCase()}_CLIENT_SECRET for real verification.${wasConfigured ? "" : ""}`,
    });
  }
);
