/**
 * POST /api/v1/agents/register — public, self-service agent onboarding
 *
 * The single biggest agent-attraction unlock per the audit (PR #42).
 * Before this route, an autonomous agent could not get a Social Perks
 * API key without a human signing in to a dashboard and handing one
 * over. That made the platform unusable for any zero-touch automation.
 *
 * What this endpoint does:
 *   1. Validates the agent's submitted identity (name, contact email,
 *      purpose statement, optional homepage).
 *   2. Strict-rate-limits per IP (5 attempts/min via the limiter; the
 *      caller-side honor system here is "register once, reuse the key
 *      forever").
 *   3. Mints a synthetic agent business so the existing tenant + audit
 *      machinery just works — `agent_${uuid}` namespace so it can't
 *      collide with real businesses.
 *   4. Issues a read-only API key. Write scope requires a human-mediated
 *      upgrade, which is the right friction for now.
 *   5. Audit-logs the registration with the contact + purpose so we have
 *      a paper trail for abuse review.
 *
 * What it does NOT do:
 *   - Verify the contact email (no round-trip required). Open question for
 *     follow-up: should we require a one-time-code email click?
 *   - Validate that the purpose statement is "real". The string is logged
 *     verbatim and reviewed later if abuse signals appear.
 *   - Issue a write-scoped key. Anything that mutates state is
 *     intentionally gated behind `requireScope(user, "write")`.
 *
 * Body:
 *   {
 *     agentName:        string  // 3-100 chars, no control chars
 *     contactEmail:     string  // RFC-like; we email here if abuse review fires
 *     purposeStatement: string  // 20-500 chars; explain what the agent will do
 *     homepage?:        string  // optional URL of the agent / company
 *   }
 *
 * Response 201:
 *   {
 *     apiKey:     "sp_live_..."  // ONLY shown once
 *     agentId:    "agent_..."
 *     businessId: "agent_..."    // same value; surfaced separately for clarity
 *     scopes:     ["read"]
 *     createdAt:  ISO timestamp
 *     expiresAt:  null
 *     docs:       "/AGENTS.md"
 *     rateLimit:  human-readable hint
 *     warning:    "store securely, only shown once"
 *   }
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import { createApiKey } from "@/lib/auth/api-keys";
import { audit } from "@/lib/audit-log";
import { validateEmail, validateString } from "@/lib/security/validate";

interface RegisterBody {
  agentName?: unknown;
  contactEmail?: unknown;
  purposeStatement?: unknown;
  homepage?: unknown;
}

export const POST = withTiming(async (req: NextRequest) => {
  // Strict tier — 5/min/IP. A botnet wanting to grind through could still
  // generate keys, but each one is read-only + audit-logged + tied to the
  // submitted contact. The real abuse defense is reputation + revocation.
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const body = await parseBody<RegisterBody>(req);
  if (body instanceof Response) return body;

  // ── Validation ──────────────────────────────────────────────────────────
  const nameRes = validateString(body.agentName, "agentName", { min: 3, max: 100 });
  if (!nameRes.success) return err("INVALID_AGENT_NAME", nameRes.error, 400);
  // Reject control chars — the audit log shows this verbatim.
  if (/[\x00-\x1f\x7f]/.test(nameRes.data)) {
    return err("INVALID_AGENT_NAME", "agentName cannot contain control characters", 400);
  }

  const emailRes = validateEmail(body.contactEmail);
  if (!emailRes.success) return err("INVALID_CONTACT_EMAIL", emailRes.error, 400);

  const purposeRes = validateString(body.purposeStatement, "purposeStatement", { min: 20, max: 500 });
  if (!purposeRes.success) return err("INVALID_PURPOSE", purposeRes.error, 400);
  if (/[\x00-\x1f\x7f]/.test(purposeRes.data)) {
    return err("INVALID_PURPOSE", "purposeStatement cannot contain control characters", 400);
  }

  // homepage is optional but if present must be a valid http(s) URL.
  let homepage: string | null = null;
  if (body.homepage !== undefined && body.homepage !== null && body.homepage !== "") {
    if (typeof body.homepage !== "string") {
      return err("INVALID_HOMEPAGE", "homepage must be a string", 400);
    }
    try {
      const u = new URL(body.homepage);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return err("INVALID_HOMEPAGE", "homepage must use http or https", 400);
      }
      homepage = u.toString();
    } catch {
      return err("INVALID_HOMEPAGE", "homepage must be a valid URL", 400);
    }
  }

  // ── Synthesize a business id for the agent ──────────────────────────────
  // The api-key + tenant + audit machinery is all keyed by businessId.
  // Real businesses get UUIDs without a prefix; namespacing agents under
  // `agent_*` keeps them distinguishable in the audit log without
  // requiring a schema change.
  const agentId = `agent_${crypto.randomUUID()}`;

  // ── Mint the key ────────────────────────────────────────────────────────
  // Read-only scope by default. The agent gets:
  //   - identity (audit trail, per-agent rate limits in the future)
  //   - read access to public + relaxed-tier endpoints
  //   - no write access — POST/PUT/DELETE that calls requireScope("write")
  //     will 403 with INSUFFICIENT_SCOPE.
  // Upgrades to write require human-mediated review (out of scope here).
  const created = createApiKey({
    businessId: agentId,
    agentName: nameRes.data,
    env: process.env.NODE_ENV === "production" ? "live" : "test",
    permissions: ["read"],
    expiresAt: null,
  });

  // ── Audit trail ─────────────────────────────────────────────────────────
  // Reuses the existing api_key.created action — the meta surfaces the
  // self-mint origin so a later abuse review can filter to these specifically.
  audit({
    action: "api_key.created",
    actor: `agent:${agentId}`,
    businessId: agentId,
    resourceId: created.record.id,
    ok: true,
    meta: {
      origin: "self_mint",
      agentName: nameRes.data,
      contactEmail: emailRes.data,
      purposeStatement: purposeRes.data,
      homepage: homepage ?? "",
      permissions: ["read"],
    },
  });

  return ok(
    {
      apiKey: created.plaintext,
      agentId,
      businessId: agentId,
      scopes: created.record.permissions,
      createdAt: created.record.createdAt,
      expiresAt: created.record.expiresAt,
      docs: "/AGENTS.md",
      rateLimit:
        "120 req/min on public reference endpoints, 60 req/min on read endpoints. Bursts above the limit return 429.",
      warning:
        "This key is only shown ONCE. Store it as an environment variable. If you lose it, register a new agent — keys are revocable and we will revoke compromised keys without notice.",
    },
    201
  );
});
