/**
 * GET /api/v1/usage — Return usage summary for the authenticated tenant
 *
 * Returns per-month metering data: API calls, campaigns created,
 * submissions received, AI generations, storage, and bandwidth.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ok, rateLimit, withTiming } from "../_shared";
import { withTenant } from "../_tenant";
import { getUsageSummary } from "@/lib/multi-tenant/isolation";

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  // Rate limit — relaxed for read-only usage data
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  // Authenticate and extract tenant
  const result = withTenant(req);
  if (result instanceof NextResponse) return result;

  const { tenant } = result;

  // Fetch aggregated usage for the current billing period
  const summary = getUsageSummary(tenant.tenantId);

  return ok({
    usage: summary,
  });
});
