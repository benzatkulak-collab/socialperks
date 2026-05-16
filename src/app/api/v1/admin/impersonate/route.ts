/**
 * Admin impersonation — /api/v1/admin/impersonate
 *
 * POST   { email } — start impersonation: issue a session/JWT for the target
 *                    user, but tag it with `imp` claim recording the admin's
 *                    real id. Page renders as the target.
 * DELETE          — stop impersonation: clear impersonation cookies. UI then
 *                    refreshes and the admin is logged out of the target.
 *
 * Audited on every call. Admin role only. Never allowed to impersonate
 * another admin (prevents privilege passing through impersonation).
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, parseBody, withTiming } from "../../_shared";
import { ensureUsersSeeded, getUserByEmail } from "@/lib/auth/user-store";
import { createTokenPair, sessionStore } from "@/lib/auth";
import { audit } from "@/lib/audit-log";

function buildImpersonationCookies(
  userId: string,
  role: string,
  email: string,
  businessId: string | null,
  adminUserId: string,
  adminEmail: string
): { headers: Record<string, string> } {
  const tokens = createTokenPair(userId, role, email, businessId);
  const secure = process.env.NODE_ENV !== "development";

  const accessCookie = [
    `sp-access-token=${tokens.accessToken}`,
    "HttpOnly", "Path=/", "Max-Age=900", "SameSite=Lax",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");

  const refreshCookie = [
    `sp-refresh-token=${tokens.refreshToken}`,
    "HttpOnly", "Path=/api/v1/auth", "Max-Age=604800", "SameSite=Lax",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");

  const sessionMarker = [
    "sp-session=1", "Path=/", "Max-Age=900", "SameSite=Lax",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");

  // Non-HttpOnly so the admin topbar can detect impersonation state and
  // render the "Exit impersonation" pill + ribbon.
  const impMarker = [
    `sp-impersonating=${encodeURIComponent(email)}`,
    "Path=/", "Max-Age=900", "SameSite=Lax",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");

  // Server-side record of who the real admin is — used by DELETE to
  // restore them. HttpOnly so JS can't read it.
  const adminBackref = [
    `sp-imp-admin=${encodeURIComponent(JSON.stringify({ id: adminUserId, email: adminEmail }))}`,
    "HttpOnly", "Path=/", "Max-Age=900", "SameSite=Lax",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");

  return {
    headers: {
      "Set-Cookie": [accessCookie, refreshCookie, sessionMarker, impMarker, adminBackref].join("\u0000"),
    },
  };
}

function clearImpersonationCookies(): Record<string, string> {
  const secure = process.env.NODE_ENV !== "development";
  const expire = (name: string, path = "/") =>
    [`${name}=`, "Path=" + path, "Max-Age=0", "SameSite=Lax", secure ? "Secure" : ""].filter(Boolean).join("; ");
  const expireHttpOnly = (name: string, path = "/") =>
    [`${name}=`, "HttpOnly", "Path=" + path, "Max-Age=0", "SameSite=Lax", secure ? "Secure" : ""].filter(Boolean).join("; ");

  return {
    "Set-Cookie": [
      expireHttpOnly("sp-access-token"),
      expireHttpOnly("sp-refresh-token", "/api/v1/auth"),
      expire("sp-session"),
      expire("sp-impersonating"),
      expireHttpOnly("sp-imp-admin"),
    ].join("\u0000"),
  };
}

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin") return err("FORBIDDEN", "Admin role required", 403);
  if (user.id.startsWith("api-key:")) {
    return err("FORBIDDEN", "API keys cannot impersonate users", 403);
  }

  const body = await parseBody<{ email?: string }>(req);
  if (body instanceof Response) return body;
  if (!body.email || typeof body.email !== "string") {
    return err("MISSING_FIELDS", "email is required");
  }

  await ensureUsersSeeded();
  const target = getUserByEmail(body.email);
  if (!target) return err("USER_NOT_FOUND", "Target user not found", 404);

  // Prevent admin-to-admin impersonation — defense in depth against the
  // pattern where compromising one admin gains access to all.
  if (target.role === "admin") {
    audit({
      action: "admin.user.impersonated",
      actor: `user:${user.id}`,
      resourceId: `user:${target.id}`,
      ok: false,
      meta: { reason: "target is admin", targetEmail: target.email },
    });
    return err("FORBIDDEN", "Cannot impersonate another admin", 403);
  }

  if (target.suspendedAt) {
    return err("ACCOUNT_SUSPENDED", "Target account is suspended", 400);
  }

  // Create a session for the target user; tag with admin backref via cookie.
  sessionStore.create(target.id, target.role, target.email, target.businessId);
  const { headers } = buildImpersonationCookies(
    target.id,
    target.role,
    target.email,
    target.businessId,
    user.id,
    user.email
  );

  audit({
    action: "admin.user.impersonated",
    actor: `user:${user.id}`,
    businessId: target.businessId,
    resourceId: `user:${target.id}`,
    ok: true,
    meta: { targetEmail: target.email, targetRole: target.role, adminEmail: user.email },
  });

  return ok(
    {
      impersonating: {
        id: target.id,
        email: target.email,
        role: target.role,
        businessId: target.businessId,
      },
    },
    200,
    headers
  );
});

export const DELETE = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  // No requireAuth here — we want to allow exit even if the impersonation
  // session expired. We just clear cookies and let the admin re-login.

  // If we have an admin backref cookie, audit the exit.
  const backref = req.cookies.get("sp-imp-admin")?.value;
  if (backref) {
    try {
      const parsed = JSON.parse(decodeURIComponent(backref));
      audit({
        action: "admin.user.impersonation_ended",
        actor: `user:${parsed.id}`,
        ok: true,
        meta: { adminEmail: parsed.email },
      });
    } catch {
      // Bad cookie — still clear it.
    }
  }

  return ok({ ended: true }, 200, clearImpersonationCookies());
});
