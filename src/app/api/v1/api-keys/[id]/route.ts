/**
 * Single API Key — /api/v1/api-keys/[id]
 *
 * DELETE: Revoke the key. Soft-delete (sets active=false). Idempotent.
 *
 * Requires JWT/session auth. The key must belong to the caller's business
 * — cross-business revocation returns 404 (not 403, to avoid leaking key
 * existence).
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, withTiming } from "../../_shared";
import { revokeApiKey } from "@/lib/auth/api-keys";

export const DELETE = withTiming(
  async (
    req: NextRequest,
    ctx?: unknown
  ) => {
    const limited = rateLimit(req, "standard");
    if (limited) return limited;

    const user = requireAuth(req);
    if (user instanceof Response) return user;
    if (user.role === "agent") {
      return err("FORBIDDEN", "API keys cannot revoke other API keys. Sign in to your dashboard.", 403);
    }
    if (!user.businessId) {
      return err("NO_BUSINESS", "Account is not associated with a business.", 400);
    }

    // Next.js 15 dynamic route param: ctx = { params: Promise<{ id: string }> }
    const c = ctx as { params: Promise<{ id: string }> } | undefined;
    if (!c?.params) return err("VALIDATION_ERROR", "Missing route parameter.", 400);
    const { id } = await c.params;
    if (!id || typeof id !== "string") {
      return err("VALIDATION_ERROR", "id is required.", 400);
    }

    const ok_ = revokeApiKey({ id, businessId: user.businessId });
    // Same response whether the key existed and was revoked or didn't exist
    // at all (or belonged to another business). Avoids enumeration of valid IDs.
    if (!ok_) return err("NOT_FOUND", "API key not found.", 404);

    return ok({ id, revoked: true });
  }
);
