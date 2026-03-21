import { NextRequest } from "next/server";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import { oauthManager } from "@/lib/verification/oauth-manager";
import { logger } from "@/lib/logging";

// Supported platforms for OAuth connection
const SUPPORTED_PLATFORMS = [
  "ig", "tt", "go", "fb", "xw", "yt", "yp", "li", "pi", "nd", "th", "sc", "ta", "rd", "rf",
  "wa", "tg", "dc", "tw", "tm", "br", "l8", "bs", "md", "gm",
];

/**
 * POST /api/v1/oauth/connect — Start OAuth flow
 *
 * Body:
 *   - platformId: string (required) — e.g. "ig", "tt", "yt"
 *   - redirectUri: string (optional) — override the default redirect URI
 *
 * Returns the authorization URL for the frontend to redirect to.
 */
export async function POST(request: NextRequest) {
  logger.info("POST /api/v1/oauth/connect", { method: "POST", path: "/api/v1/oauth/connect" });

  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();

    const platformId = body.platformId;
    if (!platformId || typeof platformId !== "string") {
      return apiError("MISSING_PLATFORM", "platformId is required and must be a string");
    }

    if (!SUPPORTED_PLATFORMS.includes(platformId)) {
      return apiError(
        "UNSUPPORTED_PLATFORM",
        `platformId must be one of: ${SUPPORTED_PLATFORMS.join(", ")}`
      );
    }

    // Check if the platform is configured (has client credentials)
    if (!oauthManager.isConfigured(platformId)) {
      return apiError(
        "PLATFORM_NOT_CONFIGURED",
        `OAuth is not configured for platform "${platformId}". Set the required environment variables.`,
        501
      );
    }

    // Generate a CSRF state token
    const stateToken = crypto.randomUUID();

    // Build the redirect URI for the callback
    const origin = request.headers.get("origin") ?? "http://localhost:3000";
    const redirectUri = body.redirectUri
      ? String(body.redirectUri)
      : `${origin}/api/v1/oauth/${platformId}`;

    // Generate the authorization URL
    const authorizationUrl = oauthManager.generateAuthorizationUrl(
      platformId,
      redirectUri,
      stateToken
    );

    if (!authorizationUrl) {
      return apiError(
        "URL_GENERATION_FAILED",
        `Could not generate authorization URL for platform "${platformId}"`,
        500
      );
    }

    return apiResponse({
      authorizationUrl,
      state: stateToken,
      platformId,
      redirectUri,
      expiresIn: 600, // State token valid for 10 minutes
    });
  } catch (err) {
    logger.error("OAuth connect failed", err);
    return apiError("OAUTH_ERROR", "Failed to initiate OAuth flow", 500);
  }
}
