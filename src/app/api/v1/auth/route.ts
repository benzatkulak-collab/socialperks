import { NextRequest, NextResponse } from "next/server";
import { apiResponse, apiError } from "@/lib/api/middleware";
import { withTracing } from "@/lib/api/with-tracing";
import { createSeedData } from "@/lib/seed";
import { businessRepo, userRepo } from "@/lib/db/repositories";
import { hashPassword, verifyPassword, sessionStore, createTokenPair, verifyJWT } from "@/lib/auth";
import { logger } from "@/lib/logging";
import { emailProvider, welcomeEmail } from "@/lib/email";

// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Auth API
// Supports: signup, login (password + legacy PIN), logout, session validation.
// ══════════════════════════════════════════════════════════════════════════════

// ─── In-memory user store for password-based auth (until DB migration) ──────

interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "business" | "influencer" | "enterprise";
  businessId: string | null;
}

const registeredUsers = new Map<string, StoredUser>();

// ─── Seed Data Bootstrap ────────────────────────────────────────────────────

let authSeeded = false;
async function ensureAuthSeeded(): Promise<void> {
  if (authSeeded) return;
  try {
    const existing = await businessRepo.findMany({}, { perPage: 1 });
    if (existing.total > 0) {
      authSeeded = true;
      return;
    }
    const seed = createSeedData();
    for (const biz of seed.businesses) {
      const bizRow = await businessRepo.create({
        name: biz.name,
        type: biz.type,
        email: biz.email,
        pin: biz.pin,
        avatar: biz.avatar,
        size: biz.size,
        location: biz.location,
        industry: biz.industry,
      });
      await userRepo.create({
        email: biz.email,
        name: biz.name,
        role: "business_owner",
        business_id: bizRow.id,
      });
    }
    authSeeded = true;
  } catch (err) {
    logger.error("Auth seeding failed", err);
    // Seeding failed — fall through to seed data fallback
  }
}

// ─── JWT Cookie Helper ──────────────────────────────────────────────────────

function withJWTCookies(
  data: Record<string, unknown>,
  userId: string,
  role: string,
  email: string,
  businessId: string | null,
  status = 200
): NextResponse {
  const tokens = createTokenPair(userId, role, email, businessId);
  const response = NextResponse.json(
    { success: true, data: { ...data, accessToken: tokens.accessToken } },
    { status }
  );
  response.cookies.set("sp-access-token", tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 900,
    path: "/",
  });
  response.cookies.set("sp-refresh-token", tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 604800,
    path: "/api/v1/auth",
  });
  return response;
}

// ─── GET /api/v1/auth — Validate session ────────────────────────────────────

async function _GET(request: NextRequest) {
  logger.info("GET /api/v1/auth", { method: "GET", path: "/api/v1/auth" });

  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return apiError("NO_TOKEN", "No session token provided. Send Authorization: Bearer <token>.", 401);
    }

    const session = sessionStore.get(token);
    if (!session) {
      return apiError("INVALID_SESSION", "Session is invalid or expired.", 401);
    }

    return apiResponse({
      user: {
        id: session.userId,
        email: session.email,
        role: session.userRole,
        businessId: session.businessId,
      },
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  } catch (err) {
    logger.error("Session validation failed", err);
    return apiError("SESSION_CHECK_FAILED", "Failed to validate session", 500);
  }
}

// ─── POST /api/v1/auth — Login, Signup, Logout ─────────────────────────────

async function _POST(request: NextRequest) {
  logger.info("POST /api/v1/auth", { method: "POST", path: "/api/v1/auth" });

  try {
    const body = await request.json();
    const { action = "login" } = body;

    switch (action) {
      // ─── Refresh Token ─────────────────────────────────────────────────
      case "refresh": {
        const refreshCookie = request.cookies.get("sp-refresh-token")?.value;
        if (!refreshCookie) {
          return apiError("NO_REFRESH_TOKEN", "No refresh token provided", 401);
        }
        const payload = verifyJWT(refreshCookie);
        if (!payload || payload.type !== "refresh") {
          return apiError("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired", 401);
        }
        logger.info("Token refreshed", { userId: payload.sub });
        return withJWTCookies(
          { user: { id: payload.sub, email: payload.email, role: payload.role, businessId: payload.businessId } },
          payload.sub,
          payload.role,
          payload.email,
          payload.businessId
        );
      }

      // ─── Signup ─────────────────────────────────────────────────────────
      case "signup": {
        const { email, password, name, role = "business" } = body;

        if (!email || !password || !name) {
          return apiError("MISSING_FIELDS", "email, password, and name are required");
        }

        if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
          return apiError("INVALID_INPUT", "email, password, and name must be strings");
        }

        // Sanitize input lengths
        const sanitizedEmail = email.slice(0, 254).toLowerCase();
        const sanitizedName = name.slice(0, 200);

        if (password.length < 8) {
          return apiError("WEAK_PASSWORD", "Password must be at least 8 characters");
        }

        const validRoles = ["business", "influencer", "enterprise"];
        if (!validRoles.includes(role)) {
          return apiError("INVALID_ROLE", `role must be one of: ${validRoles.join(", ")}`);
        }

        // Check if email already registered
        if (registeredUsers.has(sanitizedEmail)) {
          return apiError("EMAIL_EXISTS", "An account with this email already exists", 409);
        }

        // Hash password and store user
        const passwordHash = await hashPassword(password);
        const userId = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
        const storedUser: StoredUser = {
          id: userId,
          email: sanitizedEmail,
          name: sanitizedName,
          passwordHash,
          role: role as StoredUser["role"],
          businessId: role === "business" ? `biz_${userId}` : null,
        };
        registeredUsers.set(sanitizedEmail, storedUser);

        // Create session
        const session = sessionStore.create(userId, storedUser.role, storedUser.email, storedUser.businessId);

        // Send welcome email (best-effort)
        try {
          const template = welcomeEmail(sanitizedName);
          await emailProvider.send({
            to: sanitizedEmail,
            subject: template.subject,
            html: template.html,
            text: template.text,
          });
        } catch (emailErr) {
          logger.error("Failed to send welcome email", emailErr, { userId, email: sanitizedEmail });
        }

        logger.info("User signed up", { userId, email: sanitizedEmail, role });

        return withJWTCookies(
          {
            user: {
              id: storedUser.id,
              email: storedUser.email,
              name: storedUser.name,
              role: storedUser.role,
              businessId: storedUser.businessId,
            },
            token: session.token,
            expiresAt: new Date(session.expiresAt).toISOString(),
          },
          storedUser.id,
          storedUser.role,
          storedUser.email,
          storedUser.businessId,
          201
        );
      }

      // ─── Login (password-based + legacy PIN fallback) ───────────────────
      case "login": {
        const { email, password, pin } = body;

        if (!email) {
          return apiError("MISSING_CREDENTIALS", "email is required");
        }

        if (!password && !pin) {
          return apiError("MISSING_CREDENTIALS", "password or pin is required");
        }

        // ── Password-based login (new system) ──
        if (password) {
          const storedUser = registeredUsers.get(String(email).toLowerCase());
          if (storedUser) {
            const valid = await verifyPassword(password, storedUser.passwordHash);
            if (valid) {
              const session = sessionStore.create(storedUser.id, storedUser.role, storedUser.email, storedUser.businessId);
              logger.info("User logged in (password)", { userId: storedUser.id });
              return withJWTCookies(
                {
                  user: {
                    id: storedUser.id,
                    email: storedUser.email,
                    name: storedUser.name,
                    role: storedUser.role,
                    businessId: storedUser.businessId,
                  },
                  token: session.token,
                  expiresAt: new Date(session.expiresAt).toISOString(),
                },
                storedUser.id,
                storedUser.role,
                storedUser.email,
                storedUser.businessId
              );
            }
          }

          // Password didn't match any registered user
          return apiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
        }

        // ── Legacy PIN-based login (backwards compat) ──
        if (pin) {
          if (typeof email !== "string" || typeof pin !== "string") {
            return apiError("INVALID_INPUT", "email and pin must be strings");
          }

          await ensureAuthSeeded();
          const seed = createSeedData();

          // Try repository first for business lookup
          try {
            const bizRow = await businessRepo.findByEmail(email);
            if (bizRow && bizRow.pin === pin) {
              const session = sessionStore.create(bizRow.id, "business", bizRow.email, bizRow.id);
              logger.info("User logged in (PIN/repo)", { userId: bizRow.id });
              return withJWTCookies(
                {
                  user: {
                    id: bizRow.id,
                    email: bizRow.email,
                    name: bizRow.name,
                    role: "business_owner",
                    businessId: bizRow.id,
                  },
                  business: {
                    id: bizRow.id,
                    name: bizRow.name,
                    type: bizRow.type,
                    email: bizRow.email,
                    pin: bizRow.pin,
                    avatar: bizRow.avatar,
                    size: bizRow.size,
                    location: bizRow.location,
                    industry: bizRow.industry,
                  },
                  token: session.token,
                  expiresAt: new Date(session.expiresAt).toISOString(),
                },
                bizRow.id,
                "business",
                bizRow.email,
                bizRow.id
              );
            }
          } catch {
            // Repo not available — fall through to seed data
          }

          // Fall back to seed data for businesses
          const biz = seed.businesses.find((b) => b.email === email && b.pin === pin);
          if (biz) {
            const session = sessionStore.create(biz.id, "business", biz.email, biz.id);
            logger.info("User logged in (PIN/seed)", { userId: biz.id });
            return withJWTCookies(
              {
                user: {
                  id: biz.id,
                  email: biz.email,
                  name: biz.name,
                  role: "business_owner",
                  businessId: biz.id,
                },
                business: biz,
                token: session.token,
                expiresAt: new Date(session.expiresAt).toISOString(),
              },
              biz.id,
              "business",
              biz.email,
              biz.id
            );
          }

          // Check influencers (seed data)
          const inf = seed.influencers.find((i) => i.email === email && i.pin === pin);
          if (inf) {
            const session = sessionStore.create(inf.id, "influencer", inf.email, null);
            logger.info("User logged in (PIN/influencer)", { userId: inf.id });
            return withJWTCookies(
              {
                user: {
                  id: inf.id,
                  email: inf.email,
                  name: inf.displayName,
                  role: "influencer",
                  influencerId: inf.id,
                },
                influencer: inf,
                token: session.token,
                expiresAt: new Date(session.expiresAt).toISOString(),
              },
              inf.id,
              "influencer",
              inf.email,
              null
            );
          }

          return apiError("INVALID_CREDENTIALS", "Invalid email or PIN", 401);
        }

        // Should not reach here, but just in case
        return apiError("MISSING_CREDENTIALS", "password or pin is required");
      }

      // ─── Logout ─────────────────────────────────────────────────────────
      case "logout": {
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : body.token;

        if (!token) {
          return apiError("NO_TOKEN", "No session token provided");
        }

        const destroyed = sessionStore.destroy(token);
        return apiResponse({ loggedOut: true, sessionDestroyed: destroyed });
      }

      // ─── Session validation (POST alternative to GET) ───────────────────
      case "session": {
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : body.token;

        if (!token) {
          return apiError("NO_TOKEN", "No session token provided", 401);
        }

        const session = sessionStore.get(token);
        if (!session) {
          return apiError("INVALID_SESSION", "Session is invalid or expired", 401);
        }

        return apiResponse({
          user: {
            id: session.userId,
            email: session.email,
            role: session.userRole,
            businessId: session.businessId,
          },
          expiresAt: new Date(session.expiresAt).toISOString(),
        });
      }

      default:
        return apiError("INVALID_ACTION", "action must be 'login', 'signup', 'logout', 'refresh', or 'session'");
    }
  } catch (err) {
    logger.error("Authentication failed", err);
    return apiError("AUTH_FAILED", "Authentication failed", 500);
  }
}

export const GET = withTracing(_GET, "auth.session");
export const POST = withTracing(_POST, "auth.login");
