/**
 * API Keys — /api/v1/api-keys
 *
 * GET:  List the calling business's API keys (public fields only).
 * POST: Create a new API key. Returns plaintext ONCE; never again.
 *
 * Requires JWT or session auth (NOT api-key auth — keys can't mint keys).
 * This is the human-in-the-loop step for agent onboarding: a business
 * owner signs in, creates a key, hands it to their agent.
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth,
  requireCsrf, rateLimit, parseBody, withTiming } from "../_shared";
import { createApiKey, listApiKeysForBusiness } from "@/lib/auth/api-keys";

interface CreateBody {
  agentName?: unknown;
  permissions?: unknown;
  env?: unknown;
  expiresInDays?: unknown;
}

export const GET = withTiming(async (req: NextRequest) => {
  // Tighter rate limit on this endpoint — listing keys reveals prefixes.
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // CSRF — enforce on mutating routes (PR: live audit found bypass)
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Don't allow API-key callers to enumerate keys — only humans.
  if (user.role === "agent") {
    return err("FORBIDDEN", "API keys cannot be listed via API key auth. Sign in to your dashboard.", 403);
  }
  if (!user.businessId) {
    return err("NO_BUSINESS", "Account is not associated with a business.", 400);
  }

  const keys = listApiKeysForBusiness(user.businessId).map((k) => ({
    id: k.id,
    agentName: k.agentName,
    keyPrefix: k.keyPrefix,
    env: k.env,
    permissions: k.permissions,
    active: k.active,
    lastUsedAt: k.lastUsedAt,
    createdAt: k.createdAt,
    expiresAt: k.expiresAt,
  }));

  return ok({ keys });
});

export const POST = withTiming(async (req: NextRequest) => {
  // Aggressive rate limit on creation: a stolen JWT shouldn't be able to
  // mint a thousand keys. Strict tier = 10/min.
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  // CSRF — enforce on mutating routes (PR: live audit found bypass)
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role === "agent") {
    return err("FORBIDDEN", "API keys cannot mint other API keys. Sign in to your dashboard.", 403);
  }
  if (!user.businessId) {
    return err("NO_BUSINESS", "Account is not associated with a business.", 400);
  }

  const body = await parseBody<CreateBody>(req);
  if (body instanceof Response) return body;

  // Validate agentName: required, 1-255 chars, no control characters.
  if (typeof body.agentName !== "string" || body.agentName.length === 0 || body.agentName.length > 255) {
    return err("VALIDATION_ERROR", "agentName must be a non-empty string under 255 chars.", 400);
  }
  if (/[\x00-\x1f\x7f]/.test(body.agentName)) {
    return err("VALIDATION_ERROR", "agentName cannot contain control characters.", 400);
  }

  // env: optional, defaults to live in production / test elsewhere.
  let env: "live" | "test" = process.env.NODE_ENV === "production" ? "live" : "test";
  if (body.env === "live" || body.env === "test") env = body.env;

  // permissions: optional string[]. Validate strict allowlist.
  const ALLOWED_PERMISSIONS = ["read", "write", "admin"];
  let permissions: string[] = ["read"];
  if (body.permissions !== undefined) {
    if (!Array.isArray(body.permissions)) {
      return err("VALIDATION_ERROR", "permissions must be an array of strings.", 400);
    }
    for (const p of body.permissions) {
      if (typeof p !== "string" || !ALLOWED_PERMISSIONS.includes(p)) {
        return err("VALIDATION_ERROR", `permissions must be one of: ${ALLOWED_PERMISSIONS.join(", ")}`, 400);
      }
    }
    permissions = body.permissions as string[];
  }

  // expiresInDays: optional number, 1..3650.
  let expiresAt: Date | null = null;
  if (body.expiresInDays !== undefined) {
    const days = Number(body.expiresInDays);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      return err("VALIDATION_ERROR", "expiresInDays must be an integer between 1 and 3650.", 400);
    }
    expiresAt = new Date(Date.now() + days * 86_400_000);
  }

  const created = createApiKey({
    businessId: user.businessId,
    agentName: body.agentName,
    env,
    permissions,
    expiresAt,
  });

  // CRITICAL: plaintext is in `key` and surfaces ONCE here. Never again.
  return ok(
    {
      key: created.plaintext,
      id: created.record.id,
      keyPrefix: created.prefix,
      env: created.record.env,
      agentName: created.record.agentName,
      permissions: created.record.permissions,
      createdAt: created.record.createdAt,
      expiresAt: created.record.expiresAt,
      warning:
        "This is the only time this key will be shown. Store it securely (e.g. environment variable). If lost, revoke and create a new one.",
    },
    201
  );
});
