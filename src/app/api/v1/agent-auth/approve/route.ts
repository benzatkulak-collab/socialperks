/**
 * POST /api/v1/agent-auth/approve
 *
 * Step 3 of the agent OAuth flow (see lib/auth/agent-auth.ts for the
 * full flow). Called by the consent page when a signed-in user clicks
 * "Approve". This route:
 *
 *   1. Authenticates the user (JWT/session — not API key; an API key
 *      cannot mint other API keys)
 *   2. Validates the requested scopes and redirect_uri
 *   3. Mints an API key bound to the user's business with the
 *      requested permissions
 *   4. Creates a short-lived (60s) authorization code mapped to that
 *      key
 *   5. Returns the code to the client, which redirects the user back
 *      to the agent's redirect_uri
 *
 * The plaintext API key is never returned here — only the code. The
 * agent exchanges the code for the key at /api/v1/agent-auth/token.
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, requireCsrf, rateLimit, parseBody, withTiming } from "../../_shared";
import { createApiKey } from "@/lib/auth/api-keys";
import {
  createAuthorizationCode,
  isAcceptableRedirectUri,
  isValidScope,
  scopesToPermissions,
  type Scope,
} from "@/lib/auth/agent-auth";
import { getBusinessPlan, checkFeatureAccess } from "@/lib/billing/enforcement";
import { hydrateSubscriptions } from "@/lib/billing/store";
import { audit } from "@/lib/audit-log";

interface ApproveBody {
  agentName?: unknown;
  scope?: unknown;
  redirectUri?: unknown;
}

export const POST = withTiming(async (req: NextRequest) => {
  // Strict rate limit — this mints credentials. A leaked JWT shouldn't
  // be able to mint hundreds of keys in a burst.
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  // CSRF — this is a browser-side mutating call from the consent page.
  // API-key callers are blocked anyway (next check) but the CSRF helper
  // bypass for them doesn't apply here because we want to be explicit.
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // API keys can't mint API keys. Only authenticated humans.
  if (user.role === "agent") {
    return err(
      "FORBIDDEN",
      "API keys cannot approve agent authorizations. Sign in as a human user.",
      403
    );
  }
  if (!user.businessId) {
    return err("NO_BUSINESS", "Account is not associated with a business.", 400);
  }

  // Plan gate: minting an API credential via the agent-OAuth consent flow is the
  // SAME paid "API access" entitlement enforced on POST /api/v1/api-keys. Without
  // this, a free-tier owner could bypass that gate entirely by going through
  // agent-auth/approve -> token. Hydrate first so a paying customer on a cold
  // serverless instance isn't mis-read as free and wrongly blocked.
  await hydrateSubscriptions();
  if (!checkFeatureAccess(getBusinessPlan(user.businessId), "api")) {
    return err(
      "PLAN_LIMIT_EXCEEDED",
      "API access is a Pro feature. Upgrade at /pricing to authorize agents.",
      403,
    );
  }

  const body = await parseBody<ApproveBody>(req);
  if (body instanceof Response) return body;

  // ── Validate agentName ──────────────────────────────────────────────
  if (
    typeof body.agentName !== "string" ||
    body.agentName.length === 0 ||
    body.agentName.length > 100
  ) {
    return err("VALIDATION_ERROR", "agentName must be a non-empty string under 100 chars.", 400);
  }
  // No control chars — agentName ends up in audit logs and the API
  // keys UI; sanitize at the boundary.
  if (/[\x00-\x1f\x7f]/.test(body.agentName)) {
    return err("VALIDATION_ERROR", "agentName cannot contain control characters.", 400);
  }

  // ── Validate scope (array of strings or comma-separated string) ────
  let rawScopes: string[];
  if (Array.isArray(body.scope)) {
    rawScopes = body.scope.filter((s): s is string => typeof s === "string");
  } else if (typeof body.scope === "string") {
    rawScopes = body.scope.split(/[,\s]+/).filter(Boolean);
  } else {
    return err("VALIDATION_ERROR", "scope must be an array of strings or comma-separated string.", 400);
  }
  if (rawScopes.length === 0) {
    return err("VALIDATION_ERROR", "scope must include at least one permission.", 400);
  }
  const invalid = rawScopes.filter((s) => !isValidScope(s));
  if (invalid.length > 0) {
    return err("INVALID_SCOPE", `Invalid scopes: ${invalid.join(", ")}`, 400);
  }
  const scopes = rawScopes as Scope[];

  // ── Validate redirect_uri ──────────────────────────────────────────
  if (typeof body.redirectUri !== "string" || !isAcceptableRedirectUri(body.redirectUri)) {
    return err(
      "INVALID_REDIRECT_URI",
      "redirectUri must be a valid https URL (http only allowed for localhost).",
      400
    );
  }

  // ── Mint the API key ───────────────────────────────────────────────
  // The key is bound to the user's businessId with the scope-mapped
  // permissions. The agentName encodes the agent's identity for audit
  // logs and the dashboard's key-management UI.
  let created;
  try {
    created = createApiKey({
      businessId: user.businessId,
      agentName: body.agentName,
      permissions: scopesToPermissions(scopes),
      // No expiresAt — agent keys persist until the user revokes
      // them. (Adding an option to set TTL is a follow-up if we find
      // users want time-limited delegations.)
    });
  } catch (e) {
    console.error("[agent-auth] key creation failed", e);
    return err("INTERNAL_ERROR", "Failed to mint API key. Please try again.", 500);
  }

  // ── Stash the plaintext under a single-use code ────────────────────
  const code = createAuthorizationCode({
    plaintext: created.plaintext,
    businessId: user.businessId,
    scope: scopes,
    agentName: body.agentName,
  });

  audit({
    action: "agent_auth.approved",
    actor: `user:${user.id}`,
    businessId: user.businessId,
    resourceId: created.record.id,
    ok: true,
    meta: {
      agentName: body.agentName,
      scope: scopes,
      redirectHost: new URL(body.redirectUri).host,
    },
  });

  // Return ONLY the code. The plaintext key is fetched via the token
  // exchange endpoint, which the agent calls server-to-server with no
  // browser involvement.
  return ok({ code });
});
