/**
 * Resource-ownership guard.
 *
 * Many routes were checking ownership with the pattern:
 *
 *   if (user.businessId && resource.businessId !== user.businessId) {
 *     return 403;
 *   }
 *
 * That pattern has a critical bug: when `user.businessId` is null
 * (influencer accounts, enterprise users without a single-business
 * scope, malformed sessions), the guard short-circuits to "allowed"
 * — letting the caller mutate any business's resource. That's an IDOR.
 *
 * Use `requireOwnership` instead: explicit, fail-closed, treats
 * missing businessId as no-access. Returns either an `AuthUser` (for
 * fluent chaining) or a `NextResponse` 403 the route handler can
 * return directly.
 */

import { NextResponse } from "next/server";
import type { AuthUser } from "@/app/api/v1/_shared";
import { err } from "@/app/api/v1/_shared";

/**
 * Returns null if the caller owns the resource. Returns a 403
 * NextResponse otherwise. The caller should `return` the response on
 * non-null.
 *
 * Treats null user.businessId as no-access (was the IDOR vector).
 *
 * Errors are intentionally generic (NOT_FOUND vs FORBIDDEN) to avoid
 * leaking resource existence to attackers probing for IDs.
 */
export function requireOwnership(
  user: AuthUser,
  resourceBusinessId: string | null | undefined
): NextResponse | null {
  if (!user.businessId) {
    return err("FORBIDDEN", "Resource access denied", 403);
  }
  if (!resourceBusinessId) {
    // Resource has no owner — treat as private to admin only.
    if (user.role !== "admin") {
      return err("FORBIDDEN", "Resource access denied", 403);
    }
    return null;
  }
  if (user.businessId !== resourceBusinessId) {
    // Use NOT_FOUND to avoid leaking which IDs exist.
    return err("NOT_FOUND", "Resource not found", 404);
  }
  return null;
}

/**
 * Variant that returns a 404 NOT_FOUND for ALL access-denied cases
 * (including missing businessId on the user). Use when leaking that
 * the resource exists at all is undesirable.
 */
export function requireOwnershipOrNotFound(
  user: AuthUser,
  resourceBusinessId: string | null | undefined
): NextResponse | null {
  if (!user.businessId || !resourceBusinessId || user.businessId !== resourceBusinessId) {
    return err("NOT_FOUND", "Resource not found", 404);
  }
  return null;
}
