/**
 * Magic-link auth — verify endpoint.
 *
 * POST /api/v1/auth/magic-link/verify
 *   body: { token: string }
 *   → { user, expiresAt } + sets sp-access-token / sp-refresh-token cookies
 *
 * Validates a single-use token, marks it used, looks up or creates the
 * user (lazy provisioning: any valid magic-link confirms ownership of
 * the email so we can mint an account on first use), and creates a
 * fresh JWT session pair via the existing createTokenPair helper.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, parseBody, withTiming } from "../../../_shared";
import { createTokenPair, sessionStore } from "@/lib/auth";
import { magicLinks } from "@/lib/auth/magic-link-store";

// ─── In-memory user index for magic-link signups ─────────────────────────────
//
// The primary user store lives in /api/v1/auth/route.ts but is module-scoped
// there. Rather than forcing a wider refactor for this MVP we keep a parallel
// magic-link user index here. When DATABASE_URL lands both will fold into the
// same User table.

interface MagicLinkUser {
  id: string;
  email: string;
  name: string;
  role: "business" | "influencer" | "enterprise";
  businessId: string | null;
}

const magicLinkUsers = new Map<string, MagicLinkUser>();

function buildCookieHeaders(
  userId: string,
  role: string,
  email: string,
  businessId: string | null
): {
  tokens: { accessToken: string; refreshToken: string };
  headers: Record<string, string>;
} {
  const tokens = createTokenPair(userId, role, email, businessId);
  const secure = process.env.NODE_ENV !== "development";
  const accessCookie = [
    `sp-access-token=${tokens.accessToken}`,
    "HttpOnly",
    "Path=/",
    "Max-Age=900",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  const refreshCookie = [
    `sp-refresh-token=${tokens.refreshToken}`,
    "HttpOnly",
    "Path=/api/v1/auth",
    "Max-Age=604800",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  return {
    tokens,
    headers: { "Set-Cookie": `${accessCookie}, ${refreshCookie}` },
  };
}

// ─── POST ────────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const body = await parseBody<{ token?: string }>(req);
  if (body instanceof Response) return body;

  const token = typeof body.token === "string" ? body.token : "";
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return err("INVALID_TOKEN", "Sign-in link is invalid or malformed", 400);
  }

  const record = magicLinks.get(token);
  if (!record) {
    return err("INVALID_TOKEN", "Sign-in link is invalid or already used", 401);
  }
  if (record.used) {
    return err("TOKEN_USED", "Sign-in link has already been used", 401);
  }
  if (record.expiresAt < Date.now()) {
    magicLinks.delete(token);
    return err("TOKEN_EXPIRED", "Sign-in link has expired. Request a new one.", 401);
  }

  // Mark used immediately to prevent races/replays.
  record.used = true;
  magicLinks.set(token, record);

  // Lazy provisioning — magic-link auth implies email ownership, so we
  // can safely mint a business user on first sign-in.
  let user = magicLinkUsers.get(record.email);
  if (!user) {
    const userId = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    user = {
      id: userId,
      email: record.email,
      name: record.businessName ?? record.email.split("@")[0],
      role: "business",
      businessId: `biz_${userId}`,
    };
    magicLinkUsers.set(record.email, user);
  }

  const session = sessionStore.create(user.id, user.role, user.email, user.businessId);
  const { tokens, headers } = buildCookieHeaders(
    user.id,
    user.role,
    user.email,
    user.businessId
  );

  return ok(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.businessId,
      },
      token: session.token,
      accessToken: tokens.accessToken,
      expiresAt: new Date(session.expiresAt).toISOString(),
    },
    200,
    headers
  );
});
