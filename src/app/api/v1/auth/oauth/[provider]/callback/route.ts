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
import { validateCsrfToken } from "@/lib/security/csrf";

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

    // State validation: the connect step signed this token with
    // `generateCsrfToken(sessionId)` where sessionId == "oauth:<providerId>"
    // for the social-login flow (callers without an established session yet).
    // Validating signature + freshness blocks attackers from feeding a forged
    // state to complete OAuth on the victim's behalf.
    const state = req.nextUrl.searchParams.get("state");
    if (!state) {
      return err("MISSING_STATE", "State parameter is required", 400);
    }
    if (!validateCsrfToken(state, `oauth:${providerId}`)) {
      return err("INVALID_STATE", "OAuth state token is invalid or expired", 400);
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

      // Redirect to app with the JWT set as an httpOnly cookie. Previously
      // the token was put in a URL query param, which leaks into browser
      // history, Referer headers, server access logs, and any 3rd-party
      // analytics on the landing page. Cookie + same-site keeps it inside
      // the auth boundary.
      const redirectUrl = new URL("/", req.nextUrl.origin);
      redirectUrl.searchParams.set("provider", providerId);
      redirectUrl.searchParams.set("oauth", "success");

      const secure = process.env.NODE_ENV !== "development";
      const cookieParts = [
        `sp-access-token=${token}`,
        "Path=/",
        "Max-Age=86400",
        "HttpOnly",
        "SameSite=Lax",
        secure ? "Secure" : "",
      ]
        .filter(Boolean)
        .join("; ");

      const res = NextResponse.redirect(redirectUrl.toString(), 302);
      res.headers.append("Set-Cookie", cookieParts);
      return res;
    } catch {
      return err("OAUTH_ERROR", "OAuth authentication failed", 500);
    }
  }
);
