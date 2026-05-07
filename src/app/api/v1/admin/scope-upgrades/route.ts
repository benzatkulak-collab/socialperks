/**
 * GET /api/v1/admin/scope-upgrades — admin queue of agent upgrade requests
 *
 * Admin role only. Lists scope upgrade requests, default filter:
 * pending. Used by the future admin review UI; CLI-friendly today.
 *
 * Query: ?status=pending|approved|rejected|expired (default: pending)
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  getQuery,
  withTiming,
} from "../../_shared";
import {
  listScopeUpgradeRequests,
  expireOldRequests,
  type UpgradeStatus,
} from "@/lib/auth/scope-upgrades";

const VALID_STATUS: UpgradeStatus[] = ["pending", "approved", "rejected", "expired"];

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  if (user.role !== "admin") {
    return err("FORBIDDEN", "Admin role required", 403);
  }
  if (user.id.startsWith("api-key:")) {
    return err(
      "FORBIDDEN",
      "API keys cannot review scope upgrades. Sign in via dashboard.",
      403
    );
  }

  const params = getQuery(req);
  const statusParam = params.get("status");
  let statusFilter: UpgradeStatus = "pending";
  if (statusParam) {
    if (!VALID_STATUS.includes(statusParam as UpgradeStatus)) {
      return err("INVALID_STATUS", `status must be one of ${VALID_STATUS.join(", ")}`, 400);
    }
    statusFilter = statusParam as UpgradeStatus;
  }

  // Sweep expired before listing — keeps the queue accurate without
  // a background job.
  expireOldRequests();

  const requests = listScopeUpgradeRequests({ status: statusFilter });
  return ok({ requests, total: requests.length });
});
