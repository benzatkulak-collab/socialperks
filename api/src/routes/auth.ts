import { Hono } from "hono";
import { setCookie, getCookie } from "hono/cookie";
import { apiResponse, apiError } from "../helpers.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { createSeedData } from "@social-perks/shared/seed";
import { businessRepo, userRepo } from "@lib/db/repositories";
import { hashPassword, verifyPassword, sessionStore, createTokenPair, verifyJWT } from "@lib/auth";
import { logger } from "@lib/logging";
import { emailProvider, welcomeEmail, passwordResetEmail } from "@lib/email";

const app = new Hono();

// In-memory user store for password-based auth (until DB migration)
interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "business" | "influencer" | "enterprise";
  businessId: string | null;
}

const registeredUsers = new Map<string, StoredUser>();

// Password reset token store
interface ResetToken { email: string; token: string; expiresAt: number; }
const resetTokens = new Map<string, ResetToken>();
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;
const RESET_BASE_URL = process.env.RESET_PASSWORD_URL || "https://socialperks.app/reset-password";

// Seed data bootstrap
let authSeeded = false;
async function ensureAuthSeeded(): Promise<void> {
  if (authSeeded) return;
  try {
    const existing = await businessRepo.findMany({}, { perPage: 1 });
    if (existing.total > 0) { authSeeded = true; return; }
    const seed = createSeedData();
    for (const biz of seed.businesses) {
      const bizRow = await businessRepo.create({
        name: biz.name, type: biz.type, email: biz.email, pin: biz.pin,
        avatar: biz.avatar, size: biz.size, location: biz.location, industry: biz.industry,
      });
      await userRepo.create({ email: biz.email, name: biz.name, role: "business_owner", business_id: bizRow.id });
    }
    authSeeded = true;
  } catch (err) {
    logger.error("Auth seeding failed", err);
  }
}

function setJWTCookies(c: Parameters<Parameters<typeof app.get>[1]>[0], userId: string, role: string, email: string, businessId: string | null) {
  const tokens = createTokenPair(userId, role, email, businessId);
  const isProduction = process.env.NODE_ENV === "production";
  setCookie(c, "sp-access-token", tokens.accessToken, {
    httpOnly: true, secure: isProduction, sameSite: "Lax", maxAge: 900, path: "/",
  });
  setCookie(c, "sp-refresh-token", tokens.refreshToken, {
    httpOnly: true, secure: isProduction, sameSite: "Strict", maxAge: 604800, path: "/api/v1/auth",
  });
  return tokens;
}

// GET /v1/auth — Validate session
app.get("/", (c) => {
  const authHeader = c.req.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return apiError(c, "NO_TOKEN", "No session token provided. Send Authorization: Bearer <token>.", 401);
  }

  const session = sessionStore.get(token);
  if (!session) {
    return apiError(c, "INVALID_SESSION", "Session is invalid or expired.", 401);
  }

  return apiResponse(c, {
    user: { id: session.userId, email: session.email, role: session.userRole, businessId: session.businessId },
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
});

// POST /v1/auth — Login, Signup, Logout, Refresh, Reset
app.post("/", rateLimit("strict"), async (c) => {
  try {
    const body = await c.req.json();
    const { action = "login" } = body;

    switch (action) {
      case "refresh": {
        const refreshCookie = getCookie(c, "sp-refresh-token");
        if (!refreshCookie) return apiError(c, "NO_REFRESH_TOKEN", "No refresh token provided", 401);
        const payload = verifyJWT(refreshCookie);
        if (!payload || payload.type !== "refresh") return apiError(c, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired", 401);
        const tokens = setJWTCookies(c, payload.sub, payload.role, payload.email, payload.businessId);
        return apiResponse(c, {
          user: { id: payload.sub, email: payload.email, role: payload.role, businessId: payload.businessId },
          accessToken: tokens.accessToken,
        });
      }

      case "signup": {
        const { email, password, name, role = "business" } = body;
        if (!email || !password || !name) return apiError(c, "MISSING_FIELDS", "email, password, and name are required");
        if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
          return apiError(c, "INVALID_INPUT", "email, password, and name must be strings");
        }
        const sanitizedEmail = email.slice(0, 254).toLowerCase();
        const sanitizedName = name.slice(0, 200);
        if (password.length < 8) return apiError(c, "WEAK_PASSWORD", "Password must be at least 8 characters");
        const validRoles = ["business", "influencer", "enterprise"];
        if (!validRoles.includes(role)) return apiError(c, "INVALID_ROLE", `role must be one of: ${validRoles.join(", ")}`);
        if (registeredUsers.has(sanitizedEmail)) return apiError(c, "EMAIL_EXISTS", "An account with this email already exists", 409);

        const passwordHash = await hashPassword(password);
        const userId = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
        const storedUser: StoredUser = { id: userId, email: sanitizedEmail, name: sanitizedName, passwordHash, role: role as StoredUser["role"], businessId: role === "business" ? `biz_${userId}` : null };
        registeredUsers.set(sanitizedEmail, storedUser);

        const session = sessionStore.create(userId, storedUser.role, storedUser.email, storedUser.businessId);
        try {
          const template = welcomeEmail(sanitizedName);
          await emailProvider.send({ to: sanitizedEmail, subject: template.subject, html: template.html, text: template.text });
        } catch (emailErr) { logger.error("Failed to send welcome email", emailErr); }

        const tokens = setJWTCookies(c, storedUser.id, storedUser.role, storedUser.email, storedUser.businessId);
        return apiResponse(c, {
          user: { id: storedUser.id, email: storedUser.email, name: storedUser.name, role: storedUser.role, businessId: storedUser.businessId },
          token: session.token, accessToken: tokens.accessToken, expiresAt: new Date(session.expiresAt).toISOString(),
        }, 201);
      }

      case "login": {
        const { email, password, pin } = body;
        if (!email) return apiError(c, "MISSING_CREDENTIALS", "email is required");
        if (!password && !pin) return apiError(c, "MISSING_CREDENTIALS", "password or pin is required");

        if (password) {
          const storedUser = registeredUsers.get(String(email).toLowerCase());
          if (storedUser) {
            const valid = await verifyPassword(password, storedUser.passwordHash);
            if (valid) {
              const session = sessionStore.create(storedUser.id, storedUser.role, storedUser.email, storedUser.businessId);
              const tokens = setJWTCookies(c, storedUser.id, storedUser.role, storedUser.email, storedUser.businessId);
              return apiResponse(c, {
                user: { id: storedUser.id, email: storedUser.email, name: storedUser.name, role: storedUser.role, businessId: storedUser.businessId },
                token: session.token, accessToken: tokens.accessToken, expiresAt: new Date(session.expiresAt).toISOString(),
              });
            }
          }
          return apiError(c, "INVALID_CREDENTIALS", "Invalid email or password", 401);
        }

        if (pin) {
          if (typeof email !== "string" || typeof pin !== "string") return apiError(c, "INVALID_INPUT", "email and pin must be strings");
          await ensureAuthSeeded();
          const seed = createSeedData();

          try {
            const bizRow = await businessRepo.findByEmail(email);
            if (bizRow && bizRow.pin === pin) {
              const session = sessionStore.create(bizRow.id, "business", bizRow.email, bizRow.id);
              const tokens = setJWTCookies(c, bizRow.id, "business", bizRow.email, bizRow.id);
              return apiResponse(c, {
                user: { id: bizRow.id, email: bizRow.email, name: bizRow.name, role: "business_owner", businessId: bizRow.id },
                business: { id: bizRow.id, name: bizRow.name, type: bizRow.type, email: bizRow.email, pin: bizRow.pin, avatar: bizRow.avatar, size: bizRow.size, location: bizRow.location, industry: bizRow.industry },
                token: session.token, accessToken: tokens.accessToken, expiresAt: new Date(session.expiresAt).toISOString(),
              });
            }
          } catch { /* fall through to seed data */ }

          const biz = seed.businesses.find((b) => b.email === email && b.pin === pin);
          if (biz) {
            const session = sessionStore.create(biz.id, "business", biz.email, biz.id);
            const tokens = setJWTCookies(c, biz.id, "business", biz.email, biz.id);
            return apiResponse(c, {
              user: { id: biz.id, email: biz.email, name: biz.name, role: "business_owner", businessId: biz.id },
              business: biz, token: session.token, accessToken: tokens.accessToken, expiresAt: new Date(session.expiresAt).toISOString(),
            });
          }

          const inf = seed.influencers.find((i) => i.email === email && i.pin === pin);
          if (inf) {
            const session = sessionStore.create(inf.id, "influencer", inf.email, null);
            const tokens = setJWTCookies(c, inf.id, "influencer", inf.email, null);
            return apiResponse(c, {
              user: { id: inf.id, email: inf.email, name: inf.displayName, role: "influencer", influencerId: inf.id },
              influencer: inf, token: session.token, accessToken: tokens.accessToken, expiresAt: new Date(session.expiresAt).toISOString(),
            });
          }

          return apiError(c, "INVALID_CREDENTIALS", "Invalid email or PIN", 401);
        }

        return apiError(c, "MISSING_CREDENTIALS", "password or pin is required");
      }

      case "logout": {
        const authHeader = c.req.header("authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : body.token;
        if (!token) return apiError(c, "NO_TOKEN", "No session token provided");
        const destroyed = sessionStore.destroy(token);
        return apiResponse(c, { loggedOut: true, sessionDestroyed: destroyed });
      }

      case "session": {
        const authHeader = c.req.header("authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : body.token;
        if (!token) return apiError(c, "NO_TOKEN", "No session token provided", 401);
        const session = sessionStore.get(token);
        if (!session) return apiError(c, "INVALID_SESSION", "Session is invalid or expired", 401);
        return apiResponse(c, {
          user: { id: session.userId, email: session.email, role: session.userRole, businessId: session.businessId },
          expiresAt: new Date(session.expiresAt).toISOString(),
        });
      }

      case "reset-password": {
        const { email } = body;
        if (!email || typeof email !== "string") return apiError(c, "MISSING_FIELDS", "email is required");
        const sanitizedEmail = email.slice(0, 254).toLowerCase();
        const storedUser = registeredUsers.get(sanitizedEmail);
        if (!storedUser) return apiResponse(c, { message: "If an account with that email exists, a password reset link has been sent." });

        const token = crypto.randomUUID().replace(/-/g, "");
        for (const [key, entry] of resetTokens) { if (entry.email === sanitizedEmail) resetTokens.delete(key); }
        resetTokens.set(token, { email: sanitizedEmail, token, expiresAt: Date.now() + RESET_TOKEN_EXPIRY_MS });

        const resetLink = `${RESET_BASE_URL}?token=${token}&email=${encodeURIComponent(sanitizedEmail)}`;
        try {
          const template = passwordResetEmail(storedUser.name, resetLink);
          await emailProvider.send({ to: sanitizedEmail, subject: template.subject, html: template.html, text: template.text });
        } catch (emailErr) { logger.error("Failed to send password reset email", emailErr); }

        return apiResponse(c, { message: "If an account with that email exists, a password reset link has been sent." });
      }

      case "confirm-reset": {
        const { token: resetToken, newPassword } = body;
        if (!resetToken || typeof resetToken !== "string") return apiError(c, "MISSING_FIELDS", "token is required");
        if (!newPassword || typeof newPassword !== "string") return apiError(c, "MISSING_FIELDS", "newPassword is required");
        if (newPassword.length < 8) return apiError(c, "WEAK_PASSWORD", "Password must be at least 8 characters");

        const resetEntry = resetTokens.get(resetToken);
        if (!resetEntry || Date.now() > resetEntry.expiresAt) { resetTokens.delete(resetToken); return apiError(c, "INVALID_TOKEN", "Reset token is invalid or expired", 401); }
        const storedUser = registeredUsers.get(resetEntry.email);
        if (!storedUser) { resetTokens.delete(resetToken); return apiError(c, "USER_NOT_FOUND", "User not found", 404); }

        storedUser.passwordHash = await hashPassword(newPassword);
        registeredUsers.set(resetEntry.email, storedUser);
        resetTokens.delete(resetToken);
        return apiResponse(c, { message: "Password has been reset successfully. You can now log in with your new password." });
      }

      default:
        return apiError(c, "INVALID_ACTION", "action must be 'login', 'signup', 'logout', 'refresh', 'session', 'reset-password', or 'confirm-reset'");
    }
  } catch (err) {
    if (err instanceof SyntaxError) return apiError(c, "INVALID_BODY", "Request body must be valid JSON", 400);
    logger.error("Authentication failed", err);
    return apiError(c, "AUTH_FAILED", "Authentication failed", 500);
  }
});

export default app;
