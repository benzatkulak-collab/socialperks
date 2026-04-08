/**
 * Shared Tenant Isolation Middleware for API Routes
 * ──────────────────────────────────────────────────
 * Extracts the tenant context from the authenticated user
 * and provides guards for resource-level access checks.
 *
 * Usage in a route handler:
 *   const result = withTenant(req);
 *   if (result instanceof NextResponse) return result;
 *   const { user, tenant } = result;
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUser, err, type AuthUser } from "./_shared";
import {
  getTenantContext,
  assertTenantAccess,
  TenantAccessError,
  recordUsage,
  type TenantContext,
} from "@/lib/multi-tenant/isolation";

// ─── Tenant Extraction ─────────────────────────────────────────────────────

/**
 * Extract the authenticated user AND their tenant context from the request.
 * Returns a tuple of { user, tenant } or a NextResponse error.
 *
 * This combines auth + tenant resolution in one call so routes don't need
 * to repeat the boilerplate.
 */
export function withTenant(
  req: NextRequest
): { user: AuthUser; tenant: TenantContext } | NextResponse {
  // Step 1: Authenticate
  const user = getUser(req);
  if (!user) {
    return err("NO_TOKEN", "Authentication required", 401);
  }

  // Step 2: Derive tenant context
  const tenant = getTenantContext(user);
  if (!tenant) {
    return err(
      "NO_TENANT",
      "No business associated with this account. Tenant context required.",
      403
    );
  }

  // Step 3: Record the API call for usage metering
  recordUsage(tenant.tenantId, "api_calls");

  return { user, tenant };
}

// ─── Resource Access Check ─────────────────────────────────────────────────

/**
 * Verify that the tenant owns a specific resource (identified by its businessId).
 * Returns null if access is allowed, or a 403 NextResponse if denied.
 */
export function checkResourceAccess(
  tenant: TenantContext,
  resourceBusinessId: string
): NextResponse | null {
  try {
    assertTenantAccess(tenant.tenantId, resourceBusinessId);
    return null; // access allowed
  } catch (e) {
    if (e instanceof TenantAccessError) {
      return err(e.code, e.message, e.status);
    }
    return err("TENANT_ACCESS_DENIED", "Access denied", 403);
  }
}
