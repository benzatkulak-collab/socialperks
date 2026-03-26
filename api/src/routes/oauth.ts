import { Hono } from "hono";
import { apiResponse, apiError } from "../helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { logger } from "@/lib/logging";

const app = new Hono();

const SUPPORTED_PLATFORMS = ["instagram", "tiktok", "youtube", "x", "facebook", "linkedin", "pinterest"];

// POST /v1/oauth/connect — Start OAuth flow
app.post("/connect", rateLimit("standard"), requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { platformId, redirectUri } = body;

    if (!platformId || typeof platformId !== "string") return apiError(c, "MISSING_FIELD", "platformId is required");
    if (!SUPPORTED_PLATFORMS.includes(platformId)) return apiError(c, "UNSUPPORTED_PLATFORM", `platformId must be one of: ${SUPPORTED_PLATFORMS.join(", ")}`);

    const state = crypto.randomUUID().replace(/-/g, "");
    const userId = c.get("userId");

    // In production, this would generate a real OAuth authorization URL
    const authorizationUrl = `https://oauth.${platformId}.com/authorize?client_id=sp_${platformId}&redirect_uri=${encodeURIComponent(redirectUri ?? `http://localhost:3000/api/v1/oauth/${platformId}`)}&state=${state}&scope=read,write`;

    logger.info("OAuth flow started", { platformId, userId });

    return apiResponse(c, { authorizationUrl, state, platformId, expiresIn: 600 });
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

  if (error) {
    return c.redirect(`/?oauth_error=${encodeURIComponent(error)}&platform=${platform}`);
  }

  if (!code || !state) {
    return c.redirect(`/?oauth_error=missing_params&platform=${platform}`);
  }

  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return c.redirect(`/?oauth_error=unsupported_platform&platform=${platform}`);
  }

  // In production, exchange the code for tokens
  logger.info("OAuth callback received", { platform, hasCode: !!code });

  return c.redirect(`/?oauth_success=true&platform=${platform}`);
});

export default app;
