import { Hono } from "hono";
import type { AppEnv } from "@api/env.js";
import { apiResponse, apiError } from "../helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { oauthManager } from "@lib/verification/oauth-manager";
import { logger } from "@lib/logging";

const app = new Hono<AppEnv>();

// Server-side OAuth state store: state → { userId, createdAt }
const oauthStateStore = new Map<string, { userId: string; createdAt: number }>();
const OAUTH_STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes

function pruneExpiredStates() {
  const now = Date.now();
  for (const [key, val] of oauthStateStore) {
    if (now - val.createdAt > OAUTH_STATE_EXPIRY) oauthStateStore.delete(key);
  }
}

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

    // Store state → userId mapping server-side for validation in callback
    pruneExpiredStates();
    oauthStateStore.set(state, { userId: userId ?? "anonymous", createdAt: Date.now() });

    const authorizationUrl = oauthManager.generateAuthorizationUrl(internalId, callbackUri, state);

    if (!authorizationUrl) {
      oauthStateStore.delete(state);
      return apiError(c, "OAUTH_NOT_AVAILABLE", `OAuth is not available for platform "${platformId}"`, 400);
    }

    logger.info("OAuth flow started", { platformId: internalId, userId });

    return apiResponse(c, { authorizationUrl, state, platformId: internalId, expiresIn: 600 });
  } catch (err) {
    logger.error("OAuth connect failed", err);
    return apiError(c, "OAUTH_FAILED", "Failed to start OAuth flow", 500);
  }
});

// GET /v1/oauth/:platform — OAuth callback
app.get("/:platform", rateLimit("standard"), async (c) => {
  const platform = c.req.param("platform");
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const safePlatform = encodeURIComponent(platform);

  if (error) {
    logger.warn("OAuth error callback", { platform, error });
    return c.redirect(`${baseUrl}/?oauth_error=${encodeURIComponent(error)}&platform=${safePlatform}`);
  }

  if (!code || !state) {
    return c.redirect(`${baseUrl}/?oauth_error=missing_params&platform=${safePlatform}`);
  }

  // Validate state against server-side store (prevents CSRF / state injection)
  const storedState = oauthStateStore.get(state);
  if (!storedState) {
    logger.warn("OAuth invalid state", { platform, state: state.slice(0, 8) + "..." });
    return c.redirect(`${baseUrl}/?oauth_error=invalid_state&platform=${safePlatform}`);
  }
  // Consume the state (one-time use)
  oauthStateStore.delete(state);

  // Check expiry
  if (Date.now() - storedState.createdAt > OAUTH_STATE_EXPIRY) {
    return c.redirect(`${baseUrl}/?oauth_error=state_expired&platform=${safePlatform}`);
  }

  const userId = storedState.userId;
  const internalId = PLATFORM_MAP[platform] ?? platform;

  if (!oauthManager.isConfigured(internalId)) {
    return c.redirect(`${baseUrl}/?oauth_error=unsupported_platform&platform=${safePlatform}`);
  }

  try {
    // Exchange authorization code for tokens — userId comes from server-side state, not query params
    const redirectUri = `${baseUrl}/api/v1/oauth/${platform}`;
    const token = await oauthManager.exchangeCode({
      platformId: internalId,
      userId,
      authorizationCode: code,
      redirectUri,
    });

    logger.info("OAuth connected", { platform: internalId, platformUserId: token.platformUserId, hasRefreshToken: !!token.refreshToken });

    return c.redirect(`${baseUrl}/?oauth_success=true&platform=${safePlatform}`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Token exchange failed";
    logger.error("OAuth exchange failed", { platform: internalId, error: errorMsg });
    return c.redirect(`${baseUrl}/?oauth_error=${encodeURIComponent(errorMsg)}&platform=${safePlatform}`);
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
