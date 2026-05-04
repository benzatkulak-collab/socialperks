/**
 * POST /api/v1/oauth/connect
 *
 * Start OAuth flow for connecting a social media platform.
 * Generates a state token using CSRF utilities and returns
 * the authorization URL for the requested platform.
 * Auth required, standard rate limit.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import { findPlatform } from "@/lib/platforms";
import { generateCsrfToken } from "@/lib/security/csrf";
import { getOAuthClientId } from "@/lib/oauth/env";

// ─── OAuth URL templates per platform ───────────────────────────────────────

const OAUTH_CONFIGS: Record<
  string,
  { authUrl: string; scopes: string[]; name: string }
> = {
  ig: {
    authUrl: "https://api.instagram.com/oauth/authorize",
    scopes: ["user_profile", "user_media"],
    name: "Instagram",
  },
  fb: {
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    scopes: ["pages_show_list", "pages_read_engagement", "public_profile"],
    name: "Facebook",
  },
  tt: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize",
    scopes: ["user.info.basic", "video.list"],
    name: "TikTok",
  },
  xw: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    scopes: ["tweet.read", "users.read", "offline.access"],
    name: "X",
  },
  yt: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    name: "YouTube",
  },
  li: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    scopes: ["r_liteprofile", "r_emailaddress", "w_member_social"],
    name: "LinkedIn",
  },
  pi: {
    authUrl: "https://api.pinterest.com/oauth",
    scopes: ["boards:read", "pins:read", "user_accounts:read"],
    name: "Pinterest",
  },
  th: {
    authUrl: "https://www.threads.net/oauth/authorize",
    scopes: ["threads_basic", "threads_content_publish"],
    name: "Threads",
  },
  sc: {
    authUrl: "https://accounts.snapchat.com/login/oauth2/authorize",
    scopes: ["snapchat-marketing-api"],
    name: "Snapchat",
  },
  tw: {
    authUrl: "https://id.twitch.tv/oauth2/authorize",
    scopes: ["user:read:email", "channel:read:subscriptions"],
    name: "Twitch",
  },
  rd: {
    authUrl: "https://www.reddit.com/api/v1/authorize",
    scopes: ["identity", "read"],
    name: "Reddit",
  },
};

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Standard rate limit
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const body = await parseBody<{
    platformId: string;
    redirectUri: string;
  }>(req);
  if (body instanceof Response) return body;

  const { platformId, redirectUri } = body;

  // Validate platformId
  if (!platformId || typeof platformId !== "string") {
    return err("MISSING_PLATFORM_ID", "platformId is required", 400);
  }

  if (!findPlatform(platformId)) {
    return err("INVALID_PLATFORM", `Platform '${platformId}' not found`, 400);
  }

  const oauthConfig = OAUTH_CONFIGS[platformId];
  if (!oauthConfig) {
    return err(
      "OAUTH_NOT_SUPPORTED",
      `OAuth is not supported for platform '${platformId}'. Supported: ${Object.keys(OAUTH_CONFIGS).join(", ")}`,
      400
    );
  }

  // Validate redirectUri
  if (!redirectUri || typeof redirectUri !== "string") {
    return err("MISSING_REDIRECT_URI", "redirectUri is required", 400);
  }

  try {
    new URL(redirectUri);
  } catch {
    return err("INVALID_REDIRECT_URI", "redirectUri must be a valid URL", 400);
  }

  // Generate state token using CSRF (binds to user session)
  const state = generateCsrfToken(user.id);

  // Build the OAuth authorization URL. Reads from canonical
  // OAUTH_<ID>_CLIENT_ID, falls back to legacy long-form names
  // (INSTAGRAM_CLIENT_ID, etc.). Returns "demo-client-id" if nothing set.
  const clientId = getOAuthClientId(platformId);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: oauthConfig.scopes.join(" "),
    state,
  });

  const authorizationUrl = `${oauthConfig.authUrl}?${params.toString()}`;

  return ok({
    authorizationUrl,
    state,
    platform: oauthConfig.name,
    platformId,
    scopes: oauthConfig.scopes,
    expiresIn: 3600, // State token valid for 1 hour
  });
});
