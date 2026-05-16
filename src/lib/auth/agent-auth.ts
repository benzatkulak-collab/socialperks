/**
 * Agent OAuth — pending-authorization code store.
 *
 * Flow (OAuth Authorization Code, adapted for API keys):
 *
 *   1. Agent navigates user to /agent/authorize with query params:
 *        - agent_name: human-readable agent identity ("Acme Marketing AI")
 *        - scope: comma-separated permissions ("campaigns.write,submissions.read")
 *        - redirect_uri: where to send the user after approval
 *        - state: opaque agent-supplied token round-tripped back
 *
 *   2. User signs in (if not already), sees the consent screen, approves.
 *
 *   3. Server mints an API key bound to the user's businessId with the
 *      requested scope, stashes a short-lived (60s) authorization code
 *      mapped to that key, and redirects to:
 *        {redirect_uri}?code={code}&state={state}
 *
 *   4. Agent POSTs to /api/v1/agent-auth/token with {code}, gets back
 *      the plaintext API key once. Code is consumed on exchange.
 *
 * Why this exists: agents can't go through a browser login + dashboard +
 * copy-paste flow. They need a programmatic way to obtain a scoped key
 * after a human has explicitly approved. This is the standard OAuth
 * pattern for that handoff, adapted to issue API keys instead of OAuth
 * access tokens (we already have an API key system; reusing it is
 * cleaner than introducing a parallel token type).
 *
 * Security properties:
 *   - Codes are 256-bit random hex, single-use, 60-second TTL
 *   - Code → API key mapping is one-to-one; consuming a code reveals
 *     the plaintext exactly once
 *   - The actual API key never appears in a URL or browser history;
 *     only the short-lived code does
 *   - Redirect_uri validation rejects javascript:, data:, and any URL
 *     that doesn't parse as http(s)
 *
 * Storage: in-memory only. Codes live for 60s, so the recovery story is
 * "agent retries the authorize flow." Migrating to Postgres is a one-day
 * job (table with code, key_id, business_id, scope, expires_at columns)
 * when traffic justifies it.
 */

import { randomBytes } from "node:crypto";

// ─── Types ──────────────────────────────────────────────────────────────────

/** A pending authorization code, single-use, 60-second TTL. */
interface PendingAuthorization {
  /** The plaintext API key minted at approval time. Returned via token exchange. */
  plaintext: string;
  /** Business the key is bound to. */
  businessId: string;
  /** Permissions encoded on the key (mirrors api-keys.permissions). */
  scope: string[];
  /** Human-readable agent name (mirrors api-keys.agentName). */
  agentName: string;
  /** Unix ms when the code expires. */
  expiresAt: number;
}

const PENDING_CODES = new Map<string, PendingAuthorization>();
const CODE_TTL_MS = 60_000;

// Cleanup interval: every 30s, drop expired codes. Tiny memory footprint
// either way, but keeps the map from growing if an agent abandons mid-flow.
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [code, entry] of PENDING_CODES.entries()) {
      if (entry.expiresAt <= now) PENDING_CODES.delete(code);
    }
  }, 30_000);
  // Allow process to exit even if this timer is alive (tests, scripts).
  if (typeof cleanupTimer === "object" && cleanupTimer && "unref" in cleanupTimer) {
    (cleanupTimer as { unref?: () => void }).unref?.();
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a fresh authorization code and stash its associated API-key
 * plaintext. Returns the code; caller redirects the user with it as a
 * `?code=` query param.
 */
export function createAuthorizationCode(args: {
  plaintext: string;
  businessId: string;
  scope: string[];
  agentName: string;
}): string {
  ensureCleanup();
  const code = randomBytes(32).toString("hex");
  PENDING_CODES.set(code, {
    plaintext: args.plaintext,
    businessId: args.businessId,
    scope: args.scope,
    agentName: args.agentName,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
  return code;
}

/**
 * Exchange an authorization code for the API key it represents. Single-
 * use: the code is deleted whether the exchange succeeds or fails.
 *
 * Returns null if the code is unknown, already used, or expired.
 */
export function consumeAuthorizationCode(code: string): PendingAuthorization | null {
  const entry = PENDING_CODES.get(code);
  if (!entry) return null;
  // Single-use: delete BEFORE returning so a replay races see nothing.
  PENDING_CODES.delete(code);
  if (entry.expiresAt <= Date.now()) return null;
  return entry;
}

// ─── Scope validation ───────────────────────────────────────────────────────

/**
 * Allow-list of agent-requestable scopes. Mirrors the api-keys
 * permissions vocabulary but uses fine-grained dotted names so we can
 * tighten over time without breaking older keys.
 *
 * Mapping to api-keys permissions:
 *   - read.* → "read"
 *   - write.* → "write"
 *   - admin.* → "admin"
 *
 * Today we collapse to the 3-tier permissions model; the dotted names
 * give us room to introduce per-resource scopes later (campaigns.read
 * vs submissions.read) without churning client code.
 */
export const VALID_SCOPES = [
  "read.campaigns",
  "read.submissions",
  "read.analytics",
  "write.campaigns",
  "write.submissions",
  "review.submissions",
] as const;

export type Scope = (typeof VALID_SCOPES)[number];

export function isValidScope(s: string): s is Scope {
  return (VALID_SCOPES as readonly string[]).includes(s);
}

/**
 * Translate dotted scopes into the api-keys 3-tier permissions model.
 * read.* → "read", everything else → "write" (the api-keys store
 * treats "write" as inclusive of "read"). "admin" is reserved for
 * future use and is not currently obtainable via the agent flow.
 */
export function scopesToPermissions(scopes: Scope[]): string[] {
  const permissions = new Set<string>();
  for (const s of scopes) {
    if (s.startsWith("read.")) {
      permissions.add("read");
    } else {
      permissions.add("write");
    }
  }
  return Array.from(permissions);
}

// ─── Redirect URI validation ────────────────────────────────────────────────

/**
 * Reject anything that isn't a parseable http(s) URL. javascript:, data:,
 * file:, and malformed inputs all fail here.
 *
 * Localhost is allowed (development agents) but only at http; everywhere
 * else must be https.
 */
export function isAcceptableRedirectUri(uri: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }
  if (parsed.protocol === "https:") return true;
  if (parsed.protocol === "http:") {
    // Only localhost dev URLs may use http.
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  }
  return false;
}

// ─── Test helpers ───────────────────────────────────────────────────────────

/** Test-only: reset the in-memory store. */
export function _resetAgentAuthStore(): void {
  PENDING_CODES.clear();
}

/** Test-only: inspect pending count. */
export function _pendingCount(): number {
  return PENDING_CODES.size;
}
