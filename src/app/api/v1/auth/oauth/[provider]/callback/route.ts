/**
 * GET /api/v1/auth/oauth/[provider]/callback
 *
 * OAuth callback handler for social login.
 * Exchanges authorization code for tokens, retrieves user info,
 * creates or links account, and redirects with JWT.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { err, withTiming } from "../../../../_shared";
import {
  oauthProviders,
  exchangeCodeForTokens,
  getUserInfo,
} from "@/lib/auth/oauth-providers";
import { signJWT } from "@/lib/auth";

// ─── In-memory OAuth account store (replace with DB in production) ──────────

interface OAuthAccount {
  userId: string;
  provider: string;
  providerUserId: string;
  email: string;
}

interface OAuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

const oauthAccounts = new Map<string, OAuthAccount>();
const usersByEmail = new Map<string, OAuthUser>();

export const GET = withTiming(
  async (
    req: NextRequest,
    ctx: unknown
  ) => {
    const { provider: providerId } = await (ctx as { params: Promise<{ provider: string }> }).params;
    const provider = oauthProviders[providerId];
    if (!provider) {
      return err("INVALID_PROVIDER", "Unknown OAuth provider", 400);
    }

    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      return err("MISSING_CODE", "Authorization code is required", 400);
    }

    // Optionally validate state param (in production, compare against stored state)
    const state = req.nextUrl.searchParams.get("state");
    if (!state) {
      return err("MISSING_STATE", "State parameter is required", 400);
    }

    try {
      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(
        provider,
        code,
        `${req.nextUrl.origin}/api/v1/auth/oauth/${providerId}/callback`
      );

      if (tokens.error) {
        return err(
          "TOKEN_EXCHANGE_FAILED",
          (tokens.error_description as string) || "Failed to exchange code",
          400
        );
      }

      // Get user info from provider
      const userInfo = await getUserInfo(
        provider,
        tokens.access_token as string
      );

      // Extract email — GitHub may not return email directly
      const email =
        (userInfo.email as string) ||
        (providerId === "github"
          ? `${userInfo.login as string}@github.com`
          : null);

      if (!email) {
        return err(
          "NO_EMAIL",
          "Could not retrieve email from provider",
          400
        );
      }

      // Find or create user
      let user = usersByEmail.get(email);
      if (!user) {
        user = {
          id: crypto.randomUUID(),
          email,
          name:
            (userInfo.name as string) ||
            (userInfo.login as string) ||
            email.split("@")[0],
          role: "business",
        };
        usersByEmail.set(email, user);
      }

      // Link OAuth account
      const providerUserId = String(userInfo.id || userInfo.sub);
      const key = `${providerId}:${providerUserId}`;
      oauthAccounts.set(key, {
        userId: user.id,
        provider: providerId,
        providerUserId,
        email,
      });

      // Generate JWT
      const token = signJWT({
        sub: user.id,
        email: user.email,
        role: user.role,
        businessId: null,
        type: "access",
      });

      // Redirect to app with token
      const redirectUrl = new URL("/", req.nextUrl.origin);
      redirectUrl.searchParams.set("token", token);
      redirectUrl.searchParams.set("provider", providerId);

      return NextResponse.redirect(redirectUrl.toString(), 302);
    } catch {
      return err("OAUTH_ERROR", "OAuth authentication failed", 500);
    }
  }
);
