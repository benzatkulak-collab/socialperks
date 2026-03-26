import { Hono } from "hono";
import { apiResponse, apiError } from "../helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { oauthManager } from "@lib/verification/oauth-manager";
import { logger } from "@lib/logging";

const app = new Hono();

// Platform ID mapping: friendly names → internal IDs
const PLATFORM_MAP: Record<string, string> = {
  instagram: "ig", tiktok: "tt", youtube: "yt", google: "go",
  x: "xw", facebook: "fb", linkedin: "li", pinterest: "pi",
  reddit: "rd", threads: "th", snapchat: "sc", discord: "dc",
  twitch: "tw", tumblr: "tm", mastodon: "md",
};

// POST /v1/oauth/connect — Start OAuth flow
app.post("/connect", rateLimit("standard"), requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { platformId, redirectUri } = body;

    if (!platformId || typeof platformId !== "string") {
      return apiError(c, "MISSING_FIELD", "platformId is required");
    }

    // Resolve friendly name to internal ID
    const internalId = PLATFORM_MAP[platformId] ?? platformId;

    if (!oauthManager.isConfigured(internalId)) {
      return apiError(c, "UNSUPPORTED_PLATFORM", `Platform "${platformId}" is not configured. Check env vars.`);
    }

    const state = crypto.randomUUID().replace(/-/g, "");
    const userId = c.get("userId");
    const callbackUri = redirectUri ?? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/v1/oauth/${platformId}`;

    const authorizationUrl = oauthManager.generateAuthorizationUrl(internalId, callbackUri, state);

    if (!authorizationUrl) {
      return apiError(c, "OAUTH_NOT_AVAILABLE", `OAuth is not available for platform "${platformId}"`, 400);
    }

    console.info(JSON.stringify({ level: "info", event: "oauth.started", platformId: internalId, userId, timestamp: new Date().toISOString() }));

    return apiResponse(c, { authorizationUrl, state, platformId: internalId, expiresIn: 600 });
  } catch (err) {
    logger.error("OAuth connect failed", err);
    return apiError(c, "OAUTH_FAILED", "Failed to start OAuth flow", 500);
  }
});

// GET /v1/oauth/:platform — OAuth callback
app.get("/:platform", async (c) => {
  const platform = c.req.param("platform");
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    console.warn(JSON.stringify({ level: "warn", event: "oauth.error", platform, error, timestamp: new Date().toISOString() }));
    return c.redirect(`${baseUrl}/?oauth_error=${encodeURIComponent(error)}&platform=${platform}`);
  }

  if (!code || !state) {
    return c.redirect(`${baseUrl}/?oauth_error=missing_params&platform=${platform}`);
  }

  const internalId = PLATFORM_MAP[platform] ?? platform;

  if (!oauthManager.isConfigured(internalId)) {
    return c.redirect(`${baseUrl}/?oauth_error=unsupported_platform&platform=${platform}`);
  }

  try {
    // Exchange authorization code for tokens
    const redirectUri = `${baseUrl}/api/v1/oauth/${platform}`;
    const token = await oauthManager.exchangeCode({
      platformId: internalId,
      userId: state, // state contains userId or we extract from session
      authorizationCode: code,
      redirectUri,
    });

    console.info(JSON.stringify({
      level: "info", event: "oauth.connected", platform: internalId,
      platformUserId: token.platformUserId, hasRefreshToken: !!token.refreshToken,
      expiresAt: token.expiresAt ? new Date(token.expiresAt).toISOString() : "never",
      timestamp: new Date().toISOString(),
    }));

    return c.redirect(`${baseUrl}/?oauth_success=true&platform=${platform}`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Token exchange failed";
    console.error(JSON.stringify({ level: "error", event: "oauth.exchange_failed", platform: internalId, error: errorMsg, timestamp: new Date().toISOString() }));
    return c.redirect(`${baseUrl}/?oauth_error=${encodeURIComponent(errorMsg)}&platform=${platform}`);
  }
});

// GET /v1/oauth/connections — List user's connected platforms
app.get("/connections", requireAuth, async (c) => {
  const userId = c.get("userId");
  try {
    const connections = await oauthManager.getUserConnections(userId ?? "");
    return apiResponse(c, { connections });
  } catch (err) {
    logger.error("Failed to list connections", err);
    return apiError(c, "CONNECTIONS_FAILED", "Failed to list platform connections", 500);
  }
});

// POST /v1/oauth/disconnect — Revoke a platform connection
app.post("/disconnect", rateLimit("standard"), requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { platformId } = body;
    const userId = c.get("userId");

    if (!platformId) return apiError(c, "MISSING_FIELD", "platformId is required");

    const internalId = PLATFORM_MAP[platformId] ?? platformId;
    const revoked = await oauthManager.revokeToken(internalId, userId ?? "");

    console.info(JSON.stringify({ level: "info", event: "oauth.disconnected", platform: internalId, userId, revoked, timestamp: new Date().toISOString() }));

    return apiResponse(c, { disconnected: revoked, platformId: internalId });
  } catch (err) {
    logger.error("OAuth disconnect failed", err);
    return apiError(c, "DISCONNECT_FAILED", "Failed to disconnect platform", 500);
  }
});

export default app;
