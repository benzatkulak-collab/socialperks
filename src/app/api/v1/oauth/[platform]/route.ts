import { NextRequest, NextResponse } from "next/server";
import { oauthManager } from "@/lib/verification/oauth-manager";
import { requireAuth } from "@/lib/api/middleware";
import { logger } from "@/lib/logging";

/**
 * GET /api/v1/oauth/[platform]?code=xxx&state=xxx — OAuth callback
 *
 * This is the redirect target after the user completes OAuth consent on the
 * social platform. It exchanges the authorization code for access tokens
 * and redirects back to the app.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  logger.info("GET /api/v1/oauth/[platform]", { method: "GET", path: "/api/v1/oauth/callback" });

  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  const { platform } = await params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth denial
  if (error) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("oauth_error", error);
    redirectUrl.searchParams.set("platform", platform);
    return NextResponse.redirect(redirectUrl);
  }

  // Validate required params
  if (!code || !state) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("oauth_error", "missing_params");
    redirectUrl.searchParams.set("platform", platform);
    return NextResponse.redirect(redirectUrl);
  }

  // Validate the platform is supported
  const config = oauthManager.getConfig(platform);
  if (!config) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("oauth_error", "unsupported_platform");
    redirectUrl.searchParams.set("platform", platform);
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Exchange the authorization code for tokens
    const userId = auth.userId ?? "unknown";
    const redirectUri = `${new URL(request.url).origin}/api/v1/oauth/${platform}`;

    const token = await oauthManager.exchangeCode({
      platformId: platform,
      userId,
      authorizationCode: code,
      redirectUri,
    });

    // Redirect back to the app with success
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("oauth_success", "true");
    redirectUrl.searchParams.set("platform", platform);
    if (token.platformUserId) {
      redirectUrl.searchParams.set("platform_user_id", token.platformUserId);
    }
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    logger.error("OAuth code exchange failed", err, { platform });
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("oauth_error", "exchange_failed");
    redirectUrl.searchParams.set("platform", platform);
    redirectUrl.searchParams.set(
      "error_detail",
      err instanceof Error ? err.message : "Unknown error"
    );
    return NextResponse.redirect(redirectUrl);
  }
}
