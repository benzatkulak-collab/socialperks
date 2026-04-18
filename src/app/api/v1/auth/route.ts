/**
 * Auth API Route — /api/v1/auth
 *
 * GET:  Validate session (Bearer token -> user object + expiresAt)
 * POST: signup, login, logout, refresh, session, reset-password, confirm-reset
 *
 * In-memory user store with demo account pre-seeding.
 */

import type { NextRequest } from "next/server";
import { ok, err, getUser, rateLimit, parseBody, withTiming } from "../_shared";
import { metrics, METRIC } from "@/lib/reliability/metrics";
import {
  hashPassword,
  verifyPassword,
  sessionStore,
  createTokenPair,
  verifyJWT,
} from "@/lib/auth";
import { createSeedData } from "@social-perks/shared/seed";
import { emailProvider, passwordResetEmail } from "@/lib/email";
import { eventPublisher } from "@/lib/realtime/publisher";
import { trackReferralSignup } from "@/lib/referrals";
import { emailQueue } from "@/lib/jobs/registry";

// ─── In-Memory User Store ───────────────────────────────────────────────────

interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "business" | "influencer" | "enterprise";
  businessId: string | null;
}

const users = new Map<string, UserRecord>();

// ─── Password Reset Tokens ──────────────────────────────────────────────────

interface ResetToken {
  email: string;
  token: string;
  expiresAt: number;
}

const resetTokens = new Map<string, ResetToken>();
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// ─── Demo Account Seeding ───────────────────────────────────────────────────

let seeded = false;

async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  seeded = true;

  const seed = createSeedData();

  // Seed businesses as users
  for (const biz of seed.businesses) {
    if (users.has(biz.email)) continue;
    const passwordHash = await hashPassword(biz.pin);
    users.set(biz.email, {
      id: biz.id,
      email: biz.email,
      name: biz.name,
      passwordHash,
      role: biz.size === "enterprise" ? "enterprise" : "business",
      businessId: biz.id,
    });
  }

  // Seed influencers as users
  for (const inf of seed.influencers) {
    if (users.has(inf.email)) continue;
    const passwordHash = await hashPassword(inf.pin);
    users.set(inf.email, {
      id: inf.id,
      email: inf.email,
      name: inf.displayName,
      passwordHash,
      role: "influencer",
      businessId: null,
    });
  }
}

// ─── Cookie Helper ──────────────────────────────────────────────────────────

function buildCookieHeaders(
  userId: string,
  role: string,
  email: string,
  businessId: string | null
): { tokens: { accessToken: string; refreshToken: string }; headers: Record<string, string> } {
  const tokens = createTokenPair(userId, role, email, businessId);
  const secure = process.env.NODE_ENV !== "development";
  const accessCookie = [
    `sp-access-token=${tokens.accessToken}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=900`,
    `SameSite=Lax`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  const refreshCookie = [
    `sp-refresh-token=${tokens.refreshToken}`,
    "HttpOnly",
    "Path=/api/v1/auth",
    `Max-Age=604800`,
    `SameSite=Strict`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  return {
    tokens,
    headers: {
      "Set-Cookie": `${accessCookie}, ${refreshCookie}`,
    },
  };
}

function clearCookieHeaders(): Record<string, string> {
  const secure = process.env.NODE_ENV !== "development";
  const accessClear = [
    `sp-access-token=`,
    "HttpOnly",
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  const refreshClear = [
    `sp-refresh-token=`,
    "HttpOnly",
    "Path=/api/v1/auth",
    "Max-Age=0",
    "SameSite=Strict",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  return { "Set-Cookie": `${accessClear}, ${refreshClear}` };
}

// ─── GET /api/v1/auth — Validate Session ────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = getUser(req);
  if (!user) {
    return err("NO_TOKEN", "No session token provided. Send Authorization: Bearer <token>.", 401);
  }

  // Try to get session expiry from the Bearer token
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  let expiresAt: string | null = null;

  if (token) {
    const session = sessionStore.get(token);
    if (session) {
      expiresAt = new Date(session.expiresAt).toISOString();
    } else {
      // Might be a JWT — get exp from payload
      const jwt = verifyJWT(token);
      if (jwt) {
        expiresAt = new Date(jwt.exp * 1000).toISOString();
      }
    }
  }

  return ok({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
    },
    expiresAt,
  });
});

// ─── POST /api/v1/auth — Auth Actions ──────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const body = await parseBody<{
    action?: string;
    email?: string;
    password?: string;
    pin?: string;
    name?: string;
    role?: string;
    token?: string;
    newPassword?: string;
    referralCode?: string;
  }>(req);
  if (body instanceof Response) return body;

  const action = body.action ?? "login";

  switch (action) {
    // ── Signup ──────────────────────────────────────────────────────────────
    case "signup": {
      const { email, password, name, role: requestedRole } = body;

      if (!email || !password || !name) {
        return err("MISSING_FIELDS", "email, password, and name are required");
      }
      if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
        return err("INVALID_INPUT", "email, password, and name must be strings");
      }

      const sanitizedEmail = email.slice(0, 254).toLowerCase().trim();
      const sanitizedName = name.slice(0, 200);

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        return err("INVALID_EMAIL", "Please provide a valid email address");
      }
      if (password.length < 8) {
        return err("WEAK_PASSWORD", "Password must be at least 8 characters");
      }
      if (password.length > 128) {
        return err("INVALID_INPUT", "Password must be 128 characters or less");
      }

      // SECURITY: Only allow "business" or "influencer" on self-signup.
      // "enterprise" requires admin action — never trust client-supplied role escalation.
      const allowedSignupRoles = ["business", "influencer"] as const;
      const role = allowedSignupRoles.includes(requestedRole as typeof allowedSignupRoles[number])
        ? (requestedRole as "business" | "influencer")
        : "business";

      await ensureSeeded();

      if (users.has(sanitizedEmail)) {
        return err("SIGNUP_FAILED", "Unable to create account. Please try again or use a different email.", 409);
      }

      const passwordHash = await hashPassword(password);
      const userId = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const userRole: UserRecord["role"] = role;
      const businessId = userRole === "business" ? `biz_${userId}` : null;

      const record: UserRecord = {
        id: userId,
        email: sanitizedEmail,
        name: sanitizedName,
        passwordHash,
        role: userRole,
        businessId,
      };
      users.set(sanitizedEmail, record);

      const session = sessionStore.create(userId, userRole, sanitizedEmail, businessId);
      const { tokens, headers } = buildCookieHeaders(userId, userRole, sanitizedEmail, businessId);

      // Enqueue welcome email via job queue (retries on failure)
      emailQueue.add({ type: "welcome", to: sanitizedEmail, name: sanitizedName });

      eventPublisher.publish("user.created", { userId, email: sanitizedEmail, role: userRole });

      // Track referral signup if a referral code was provided
      if (body.referralCode && typeof body.referralCode === "string") {
        try {
          trackReferralSignup(body.referralCode, userId, sanitizedEmail);
        } catch {
          // Non-blocking: don't fail signup if referral tracking fails
        }
      }

      return ok(
        {
          user: { id: userId, email: sanitizedEmail, name: sanitizedName, role: userRole, businessId },
          token: session.token,
          accessToken: tokens.accessToken,
          expiresAt: new Date(session.expiresAt).toISOString(),
        },
        201,
        headers
      );
    }

    // ── Login ──────────────────────────────────────────────────────────────
    case "login": {
      const { email, password, pin } = body;

      if (!email) {
        return err("MISSING_CREDENTIALS", "email is required");
      }
      if (!password && !pin) {
        return err("MISSING_CREDENTIALS", "password or pin is required");
      }

      await ensureSeeded();

      // Password-based login
      if (password) {
        if (typeof email !== "string" || typeof password !== "string") {
          return err("INVALID_INPUT", "email and password must be strings");
        }
        const storedUser = users.get(String(email).toLowerCase().trim());
        if (storedUser) {
          const valid = await verifyPassword(password, storedUser.passwordHash);
          if (valid) {
            metrics.increment(METRIC.AUTH_SUCCESS, 1, { method: "password" });
            const session = sessionStore.create(storedUser.id, storedUser.role, storedUser.email, storedUser.businessId);
            const { tokens, headers } = buildCookieHeaders(storedUser.id, storedUser.role, storedUser.email, storedUser.businessId);
            return ok(
              {
                user: { id: storedUser.id, email: storedUser.email, name: storedUser.name, role: storedUser.role, businessId: storedUser.businessId },
                token: session.token,
                accessToken: tokens.accessToken,
                expiresAt: new Date(session.expiresAt).toISOString(),
              },
              200,
              headers
            );
          }
        }
        metrics.increment(METRIC.AUTH_FAILURE, 1, { method: "password" });
        return err("INVALID_CREDENTIALS", "Invalid email or password", 401);
      }

      // Legacy PIN-based login for demo accounts
      if (pin) {
        if (typeof email !== "string" || typeof pin !== "string") {
          return err("INVALID_INPUT", "email and pin must be strings");
        }

        const seed = createSeedData();

        // Check businesses
        const biz = seed.businesses.find((b) => b.email === email && b.pin === pin);
        if (biz) {
          const role = biz.size === "enterprise" ? "enterprise" : "business";
          const session = sessionStore.create(biz.id, role as "business" | "influencer" | "enterprise", biz.email, biz.id);
          const { tokens, headers } = buildCookieHeaders(biz.id, role, biz.email, biz.id);
          return ok(
            {
              user: { id: biz.id, email: biz.email, name: biz.name, role, businessId: biz.id },
              business: biz,
              token: session.token,
              accessToken: tokens.accessToken,
              expiresAt: new Date(session.expiresAt).toISOString(),
            },
            200,
            headers
          );
        }

        // Check influencers
        const inf = seed.influencers.find((i) => i.email === email && i.pin === pin);
        if (inf) {
          const session = sessionStore.create(inf.id, "influencer", inf.email, null);
          const { tokens, headers } = buildCookieHeaders(inf.id, "influencer", inf.email, null);
          return ok(
            {
              user: { id: inf.id, email: inf.email, name: inf.displayName, role: "influencer", influencerId: inf.id },
              influencer: inf,
              token: session.token,
              accessToken: tokens.accessToken,
              expiresAt: new Date(session.expiresAt).toISOString(),
            },
            200,
            headers
          );
        }

        metrics.increment(METRIC.AUTH_FAILURE, 1, { method: "pin" });
        return err("INVALID_CREDENTIALS", "Invalid email or PIN", 401);
      }

      return err("MISSING_CREDENTIALS", "password or pin is required");
    }

    // ── Logout ─────────────────────────────────────────────────────────────
    case "logout": {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : body.token;

      if (!token) {
        return err("NO_TOKEN", "No session token provided");
      }

      const sessionDestroyed = sessionStore.destroy(token);
      // Also try destroying it as a JWT-mapped session — the token itself is stateless
      // but we clear cookies either way
      return ok({ loggedOut: true, sessionDestroyed }, 200, clearCookieHeaders());
    }

    // ── Refresh ────────────────────────────────────────────────────────────
    case "refresh": {
      const refreshCookie = req.cookies.get("sp-refresh-token")?.value;
      if (!refreshCookie) {
        return err("NO_REFRESH_TOKEN", "No refresh token provided", 401);
      }

      const payload = verifyJWT(refreshCookie);
      if (!payload || payload.type !== "refresh") {
        return err("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired", 401);
      }

      const { tokens, headers } = buildCookieHeaders(payload.sub, payload.role, payload.email, payload.businessId);
      return ok(
        {
          user: { id: payload.sub, email: payload.email, role: payload.role, businessId: payload.businessId },
          accessToken: tokens.accessToken,
        },
        200,
        headers
      );
    }

    // ── Session (same as GET but via POST) ─────────────────────────────────
    case "session": {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : body.token;

      if (!token) {
        return err("NO_TOKEN", "No session token provided", 401);
      }

      // Try session store
      const session = sessionStore.get(token);
      if (session) {
        return ok({
          user: { id: session.userId, email: session.email, role: session.userRole, businessId: session.businessId },
          expiresAt: new Date(session.expiresAt).toISOString(),
        });
      }

      // Try JWT
      const jwt = verifyJWT(token);
      if (jwt) {
        return ok({
          user: { id: jwt.sub, email: jwt.email, role: jwt.role, businessId: jwt.businessId },
          expiresAt: new Date(jwt.exp * 1000).toISOString(),
        });
      }

      return err("INVALID_SESSION", "Session is invalid or expired", 401);
    }

    // ── Reset Password ─────────────────────────────────────────────────────
    case "reset-password": {
      const { email } = body;
      if (!email || typeof email !== "string") {
        return err("MISSING_FIELDS", "email is required");
      }

      // Always return success to prevent email enumeration
      const sanitizedEmail = email.slice(0, 254).toLowerCase().trim();

      const storedUser = users.get(sanitizedEmail);
      if (storedUser) {
        // Generate token
        const token = crypto.randomUUID().replace(/-/g, "");
        // Clear any existing tokens for this email
        resetTokens.forEach((entry, key) => {
          if (entry.email === sanitizedEmail) resetTokens.delete(key);
        });
        resetTokens.set(token, {
          email: sanitizedEmail,
          token,
          expiresAt: Date.now() + RESET_TOKEN_EXPIRY_MS,
        });

        // Fire-and-forget password reset email
        const resetLink = `https://socialperks.app/reset-password?token=${token}`;
        const resetEmail = passwordResetEmail(storedUser.name, resetLink);
        emailProvider.send({ to: sanitizedEmail, ...resetEmail }).catch((e: unknown) => console.error("[Email] Password reset email failed:", e instanceof Error ? e.message : e));
      }

      return ok({
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // ── Confirm Reset ──────────────────────────────────────────────────────
    case "confirm-reset": {
      const { token: resetToken, newPassword } = body;

      if (!resetToken || typeof resetToken !== "string") {
        return err("MISSING_FIELDS", "token is required");
      }
      if (!newPassword || typeof newPassword !== "string") {
        return err("MISSING_FIELDS", "newPassword is required");
      }
      if (newPassword.length < 8) {
        return err("WEAK_PASSWORD", "Password must be at least 8 characters");
      }
      if (newPassword.length > 128) {
        return err("INVALID_INPUT", "Password must be 128 characters or less");
      }

      const resetEntry = resetTokens.get(resetToken);
      if (!resetEntry || Date.now() > resetEntry.expiresAt) {
        resetTokens.delete(resetToken);
        return err("INVALID_TOKEN", "Reset token is invalid or expired", 401);
      }

      const storedUser = users.get(resetEntry.email);
      if (!storedUser) {
        resetTokens.delete(resetToken);
        return err("USER_NOT_FOUND", "User not found", 404);
      }

      storedUser.passwordHash = await hashPassword(newPassword);
      users.set(resetEntry.email, storedUser);
      resetTokens.delete(resetToken);

      return ok({
        message: "Password has been reset successfully. You can now log in with your new password.",
      });
    }

    default:
      return err(
        "INVALID_ACTION",
        "action must be 'login', 'signup', 'logout', 'refresh', 'session', 'reset-password', or 'confirm-reset'"
      );
  }
});
