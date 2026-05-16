/**
 * Admin user management — /api/v1/admin/users
 *
 * GET   ?role&search&suspended&page&perPage — paginated user list
 * PATCH { email, action, ... } — suspend / unsuspend / change-role / reset-password
 *
 * Strict admin-only. All mutations are audited. API keys cannot call PATCH.
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, parseBody, getQuery, withTiming } from "../../_shared";
import {
  ensureUsersSeeded,
  listUsers,
  getUserByEmail,
  updateUser,
  countUsers,
  type UserRole,
} from "@/lib/auth/user-store";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit-log";

const VALID_ROLES: UserRole[] = ["business", "influencer", "enterprise", "admin"];

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin") return err("FORBIDDEN", "Admin role required", 403);

  await ensureUsersSeeded();

  const params = getQuery(req);
  const role = params.get("role");
  const suspended = params.get("suspended");
  const result = listUsers({
    role: role && VALID_ROLES.includes(role as UserRole) ? (role as UserRole) : undefined,
    search: params.get("search") ?? undefined,
    suspended:
      suspended === "true" ? true : suspended === "false" ? false : undefined,
    page: params.get("page") ? parseInt(params.get("page")!, 10) : 1,
    perPage: params.get("perPage") ? parseInt(params.get("perPage")!, 10) : 25,
  });

  const counts = countUsers();

  return ok({
    ...result,
    counts,
    totalPages: Math.ceil(result.total / result.perPage),
  });
});

export const PATCH = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin") return err("FORBIDDEN", "Admin role required", 403);
  if (user.id.startsWith("api-key:")) {
    return err("FORBIDDEN", "API keys cannot mutate users", 403);
  }

  const body = await parseBody<{
    email?: string;
    action?: "suspend" | "unsuspend" | "change-role" | "reset-password";
    reason?: string;
    role?: UserRole;
    newPassword?: string;
  }>(req);
  if (body instanceof Response) return body;

  await ensureUsersSeeded();

  const { email, action } = body;
  if (!email || typeof email !== "string") {
    return err("MISSING_FIELDS", "email is required");
  }
  if (!action) return err("MISSING_FIELDS", "action is required");

  const target = getUserByEmail(email);
  if (!target) return err("USER_NOT_FOUND", "User not found", 404);

  // Safety: an admin cannot suspend or demote themselves. Prevents
  // lockout from a single-admin platform.
  if (target.id === user.id && (action === "suspend" || action === "change-role")) {
    return err("SELF_MUTATION", "Admins cannot suspend or demote themselves", 400);
  }

  switch (action) {
    case "suspend": {
      const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : null;
      const updated = updateUser(email, {
        suspendedAt: new Date().toISOString(),
        suspensionReason: reason,
      });
      audit({
        action: "admin.user.suspended",
        actor: `user:${user.id}`,
        businessId: target.businessId,
        resourceId: `user:${target.id}`,
        ok: true,
        meta: { reason, targetEmail: target.email, targetRole: target.role },
      });
      return ok({ user: stripPassword(updated!) });
    }

    case "unsuspend": {
      const updated = updateUser(email, { suspendedAt: null, suspensionReason: null });
      audit({
        action: "admin.user.unsuspended",
        actor: `user:${user.id}`,
        businessId: target.businessId,
        resourceId: `user:${target.id}`,
        ok: true,
        meta: { targetEmail: target.email },
      });
      return ok({ user: stripPassword(updated!) });
    }

    case "change-role": {
      if (!body.role || !VALID_ROLES.includes(body.role)) {
        return err("INVALID_INPUT", `role must be one of: ${VALID_ROLES.join(", ")}`);
      }
      const updated = updateUser(email, { role: body.role });
      audit({
        action: "admin.user.role_changed",
        actor: `user:${user.id}`,
        businessId: target.businessId,
        resourceId: `user:${target.id}`,
        ok: true,
        meta: { from: target.role, to: body.role, targetEmail: target.email },
      });
      return ok({ user: stripPassword(updated!) });
    }

    case "reset-password": {
      const newPassword = body.newPassword;
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) {
        return err("WEAK_PASSWORD", "newPassword must be 8-128 chars");
      }
      const passwordHash = await hashPassword(newPassword);
      const updated = updateUser(email, { passwordHash });
      audit({
        action: "admin.user.password_reset",
        actor: `user:${user.id}`,
        businessId: target.businessId,
        resourceId: `user:${target.id}`,
        ok: true,
        meta: { targetEmail: target.email },
      });
      return ok({ user: stripPassword(updated!) });
    }

    default:
      return err("INVALID_ACTION", "action must be suspend, unsuspend, change-role, or reset-password");
  }
});

function stripPassword<T extends { passwordHash?: string }>(u: T): Omit<T, "passwordHash"> {
  const { passwordHash: _pw, ...rest } = u;
  return rest;
}
