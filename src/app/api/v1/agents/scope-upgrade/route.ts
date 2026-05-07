/**
 * POST /api/v1/agents/scope-upgrade — agent requests scope expansion
 *
 * Auth: x-api-key (the agent's existing read-only key). Uses the
 * key's `id` field surfaced via getUser to bind the request to the
 * exact key the agent currently holds.
 *
 * Body:
 *   {
 *     requestedScopes: ["write"] | ["read","write"] | ["read","write","admin"],
 *     justification: string (50-2000 chars)
 *   }
 *
 * Response 201:
 *   { requestId, status: "pending", expiresAt, expectedReviewWindow }
 *
 * Response 409:
 *   { error: { code: "ALREADY_PENDING", ... } }
 *
 * The justification is the only signal the human reviewer has —
 * "I want write" is not a justification; the agent should explain WHY.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  rateLimit,
  parseBody,
  requireAuth,
  withTiming,
} from "../../_shared";
import {
  createScopeUpgradeRequest,
  type Scope,
} from "@/lib/auth/scope-upgrades";
import { validateString } from "@/lib/security/validate";

interface UpgradeBody {
  requestedScopes?: unknown;
  justification?: unknown;
  contactEmail?: unknown;
}

const ALLOWED_SCOPES: Scope[] = ["read", "write", "admin"];

export const POST = withTiming(async (req: NextRequest) => {
  // Strict tier — 5/min/IP. Stops a malicious agent from spamming.
  // We also block stacking at the lib layer (max 1 pending per key).
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  // Auth required — must be an actual agent key. We do NOT call
  // requireScope("write") here for obvious reasons: the whole point
  // of this endpoint is for read-only agents to ask for write.
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  if (user.role !== "agent") {
    return err(
      "WRONG_AUTH_TYPE",
      "Scope upgrades only apply to agent api-keys. Human users with JWT auth manage scopes via the dashboard.",
      400
    );
  }
  if (!user.businessId) {
    return err("NO_BUSINESS", "Agent has no businessId — re-register.", 400);
  }
  if (!user.id.startsWith("api-key:")) {
    return err("WRONG_AUTH_TYPE", "Expected api-key authentication", 400);
  }
  const apiKeyId = user.id.slice("api-key:".length);

  const body = await parseBody<UpgradeBody>(req);
  if (body instanceof Response) return body;

  // Validate requestedScopes — must be a non-empty array of allowed values.
  if (!Array.isArray(body.requestedScopes)) {
    return err("INVALID_SCOPES", "requestedScopes must be an array", 400);
  }
  const requestedScopes: Scope[] = [];
  for (const s of body.requestedScopes) {
    if (typeof s !== "string" || !ALLOWED_SCOPES.includes(s as Scope)) {
      return err(
        "INVALID_SCOPES",
        `Each scope must be one of: ${ALLOWED_SCOPES.join(", ")}`,
        400
      );
    }
    requestedScopes.push(s as Scope);
  }
  if (requestedScopes.length === 0) {
    return err("INVALID_SCOPES", "requestedScopes cannot be empty", 400);
  }

  // Validate justification — minimum 50 chars to force the agent to
  // actually explain. Below that, the only outcomes are "I need
  // write" / "to do my job" which don't help the reviewer.
  const justRes = validateString(body.justification, "justification", {
    min: 50,
    max: 2000,
  });
  if (!justRes.success) return err("INVALID_JUSTIFICATION", justRes.error, 400);
  if (/[\x00-\x1f\x7f]/.test(justRes.data)) {
    return err(
      "INVALID_JUSTIFICATION",
      "justification cannot contain control characters",
      400
    );
  }

  // Optional contact email override — fall back to whatever the agent
  // registered with.
  let contactEmail: string | null = null;
  if (
    body.contactEmail !== undefined &&
    body.contactEmail !== null &&
    body.contactEmail !== ""
  ) {
    if (typeof body.contactEmail !== "string") {
      return err("INVALID_CONTACT_EMAIL", "contactEmail must be a string", 400);
    }
    contactEmail = body.contactEmail.trim().toLowerCase();
  }

  // Resolve current scopes from the authenticated user.
  const currentScopes = (user.permissions ?? []) as Scope[];

  try {
    const request = createScopeUpgradeRequest({
      apiKeyId,
      agentBusinessId: user.businessId,
      currentScopes,
      requestedScopes,
      justification: justRes.data,
      contactEmail,
    });
    return ok(
      {
        requestId: request.id,
        status: request.status,
        currentScopes: request.currentScopes,
        requestedScopes: request.requestedScopes,
        createdAt: request.createdAt,
        expiresAt: request.expiresAt,
        expectedReviewWindow: "Most requests reviewed within 2 business days.",
      },
      201
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create request";
    if (msg.includes("already pending")) {
      return err("ALREADY_PENDING", msg, 409);
    }
    if (msg.includes("strict superset")) {
      return err("INVALID_SCOPES", msg, 400);
    }
    return err("INTERNAL_ERROR", "Could not create scope upgrade request", 500);
  }
});
