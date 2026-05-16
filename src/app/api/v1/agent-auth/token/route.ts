/**
 * POST /api/v1/agent-auth/token
 *
 * Step 4 of the agent OAuth flow. The agent receives a `code` query
 * param at its redirect_uri after the user approves. It exchanges
 * that code at this endpoint for the actual API key.
 *
 * The code is single-use and 60-second TTL. After exchange the agent
 * stores the api_key as a long-lived credential and uses it for all
 * subsequent API + MCP calls.
 *
 * No CSRF: this is an agent-to-server call (server-to-server in
 * practice), not a browser-originated mutating call. The code itself
 * is the auth — it was bound to a user session at creation time and
 * is unguessable (256-bit random hex).
 *
 * Response shape mirrors OAuth 2.0 token response so standard
 * libraries can parse it: { access_token, token_type, scope, ... }.
 * The "access_token" is our API key plaintext.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, parseBody, withTiming } from "../../_shared";
import { consumeAuthorizationCode } from "@/lib/auth/agent-auth";
import { audit } from "@/lib/audit-log";

interface TokenBody {
  code?: unknown;
  /**
   * Optional grant_type for OAuth-2.0-compatible clients. If present,
   * must be "authorization_code". Other values are rejected so
   * client_credentials and similar non-applicable grants fail loudly
   * rather than silently succeeding.
   */
  grant_type?: unknown;
}

export const POST = withTiming(async (req: NextRequest) => {
  // Standard rate limit. Codes are 256-bit random hex so brute-force
  // isn't a meaningful threat, but we still want to protect against
  // a misbehaving agent slamming this endpoint with retries.
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const body = await parseBody<TokenBody>(req);
  if (body instanceof Response) return body;

  // Accept either {code} or {code, grant_type:"authorization_code"}.
  if (body.grant_type !== undefined && body.grant_type !== "authorization_code") {
    return err(
      "UNSUPPORTED_GRANT_TYPE",
      "Only grant_type=authorization_code is supported.",
      400
    );
  }

  if (typeof body.code !== "string" || body.code.length === 0) {
    return err("VALIDATION_ERROR", "code is required.", 400);
  }
  // Codes are 64-char hex (32 bytes). Anything materially off-shape
  // is a malformed request; reject without hitting the store.
  if (body.code.length !== 64 || !/^[0-9a-f]+$/.test(body.code)) {
    return err("INVALID_GRANT", "code is invalid or expired.", 400);
  }

  // Consume the code (single-use; deleted on this call regardless of
  // success). Replay attempts return null here.
  const entry = consumeAuthorizationCode(body.code);
  if (!entry) {
    return err("INVALID_GRANT", "code is invalid, already used, or expired.", 400);
  }

  audit({
    action: "agent_auth.token_exchanged",
    actor: `agent:${entry.agentName}`,
    businessId: entry.businessId,
    ok: true,
    meta: { scope: entry.scope },
  });

  // OAuth 2.0-style response shape so RFC 6749 client libraries can
  // parse it. token_type is "bearer" because the agent presents the
  // key as `Authorization: Bearer <plaintext>` (or x-api-key).
  return ok({
    access_token: entry.plaintext,
    token_type: "bearer",
    scope: entry.scope.join(" "),
    business_id: entry.businessId,
    // Permissions field is the api-keys-system 3-tier projection of
    // scope (read / write / admin). Agents that only know permissions
    // can use this; agents using fine-grained scopes use the scope
    // field above.
    agent_name: entry.agentName,
  });
});
