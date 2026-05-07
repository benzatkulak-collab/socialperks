/**
 * POST /api/v1/admin/scope-upgrades/:requestId — approve or reject
 *
 * Admin role only. Body:
 *   { decision: "approve" | "reject", reason?: string }
 *
 * On approve: the target API key's permissions are widened to include
 * the requested scopes. The agent's NEXT request using the same key
 * carries the new scopes — no re-issuance needed.
 *
 * On reject: status flips, optional reason recorded for audit + the
 * agent (a future GET-status endpoint will surface this).
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
} from "../../../_shared";
import {
  decideScopeUpgradeRequest,
  getScopeUpgradeRequest,
} from "@/lib/auth/scope-upgrades";
import { updateApiKeyPermissions } from "@/lib/auth/api-keys";
import { validateString } from "@/lib/security/validate";

interface RouteContext {
  params: Promise<{ requestId: string }>;
}

interface DecisionBody {
  decision?: unknown;
  reason?: unknown;
}

export const POST = withTiming(async (req: NextRequest, ctx?: unknown) => {
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
      "API keys cannot decide scope upgrades. Sign in via dashboard.",
      403
    );
  }

  const { requestId } = await (ctx as RouteContext).params;
  if (!requestId || typeof requestId !== "string" || requestId.length > 200) {
    return err("INVALID_REQUEST_ID", "requestId is missing or malformed", 400);
  }

  const body = await parseBody<DecisionBody>(req);
  if (body instanceof Response) return body;

  if (body.decision !== "approve" && body.decision !== "reject") {
    return err(
      "INVALID_DECISION",
      "decision must be 'approve' or 'reject'",
      400
    );
  }

  let reason: string | undefined;
  if (body.reason !== undefined && body.reason !== null && body.reason !== "") {
    const reasonRes = validateString(body.reason, "reason", { max: 1000 });
    if (!reasonRes.success) return err("INVALID_REASON", reasonRes.error, 400);
    reason = reasonRes.data;
  }
  // Reject decision should require a reason — without it, agents have
  // no signal on why they were declined and will just retry blindly.
  if (body.decision === "reject" && !reason) {
    return err(
      "INVALID_REASON",
      "reason is required when rejecting a request",
      400
    );
  }

  // Look up before deciding so we can apply the upgrade on approval.
  const request = getScopeUpgradeRequest(requestId);
  if (!request) {
    return err("NOT_FOUND", "Scope upgrade request not found", 404);
  }
  if (request.status !== "pending") {
    return err(
      "NOT_PENDING",
      `Request is already ${request.status} and cannot be re-decided`,
      409
    );
  }

  const decided = decideScopeUpgradeRequest({
    id: requestId,
    decidedBy: user.id,
    decision: body.decision,
    reason,
  });
  if (!decided) {
    // Race — another admin decided in parallel.
    return err("ALREADY_DECIDED", "Request was decided by another admin", 409);
  }

  // On approve: widen the key's permissions in place.
  if (body.decision === "approve") {
    const updated = updateApiKeyPermissions({
      id: request.apiKeyId,
      permissions: request.requestedScopes,
      actor: `admin:${user.id}`,
    });
    if (!updated) {
      // The api-key was revoked between request and decision. Mark the
      // request as approved (audit trail) but surface the failure so
      // the admin knows the agent still doesn't have the scope.
      return err(
        "KEY_NOT_FOUND",
        "API key has been revoked since the request was filed. Request marked approved but no scopes applied.",
        410
      );
    }
  }

  return ok({ request: decided });
});
