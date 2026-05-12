/**
 * GET /api/v1/oauth/[platform]
 *
 * OAuth callback handler for social media platform authorization.
 * Validates the state token and exchanges the authorization code
 * for an access token. Returns mock token data since real OAuth
 * credentials are not configured.
 */

import type { NextRequest } from "next/server";
import { ok, err, getQuery, withTiming } from "../../_shared";
import { findPlatform } from "@/lib/platforms";
import { validateCsrfToken } from "@/lib/security/csrf";

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

    // Validate state token. The previous implementation took the session ID
    // *out of the state itself* (`stateParts[0]`) and used that to validate,
    // which is circular — an attacker controls the state, therefore controls
    // the validation key. Any well-formed token was accepted.
    //
    // We now require the matching `sp-oauth-flow` cookie (set by
    // /api/v1/oauth/connect, httpOnly, 10 min TTL) and validate the state
    // signature against that user id. State forgery without an active
    // sp-oauth-flow cookie now fails.
    const oauthFlowUserId = req.cookies.get("sp-oauth-flow")?.value;
    if (!oauthFlowUserId) {
      return err(
        "OAUTH_FLOW_NOT_STARTED",
        "No active OAuth flow. Start by calling POST /api/v1/oauth/connect first.",
        400
      );
    }
    if (!validateCsrfToken(state, oauthFlowUserId)) {
      return err(
        "INVALID_STATE",
        "State token is invalid or expired. Please restart the OAuth flow.",
        400
      );
    }
    const sessionId = oauthFlowUserId;

    // In production, this would exchange the code for real tokens via the platform API.
    // For now, return mock token data.
    const platform = findPlatform(platformId)!;
    const mockAccessToken = `mock_${platformId}_${crypto.randomUUID().slice(0, 8)}`;
    const mockRefreshToken = `mock_refresh_${platformId}_${crypto.randomUUID().slice(0, 8)}`;

    return ok({
      platform: {
        id: platform.id,
        name: platform.name,
      },
      connection: {
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        tokenType: "Bearer",
        expiresIn: 3600,
        scope: "read write",
        connectedAt: new Date().toISOString(),
      },
      userId: sessionId,
      message: `Successfully connected to ${platform.name}. (Mock — no real OAuth credentials configured.)`,
    });
  }
);
