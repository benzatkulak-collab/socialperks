/**
 * Scope upgrade requests for agent API keys.
 *
 * The flow:
 *   1. An agent (read-only key from /api/v1/agents/register) wants to
 *      do something that requires write scope. They POST a request
 *      with a justification to /api/v1/agents/scope-upgrade.
 *   2. Request lands in a pending state. Admin reviews via
 *      GET /api/v1/admin/scope-upgrades.
 *   3. Admin POSTs an approval or rejection to
 *      /api/v1/admin/scope-upgrades/:id.
 *   4. On approval, the agent's API key has its permissions widened
 *      from ["read"] to ["read", "write"] — the agent's NEXT request
 *      using the same key carries write scope.
 *
 * Why not auto-approve: an agent can do unlimited things with write
 * scope (place orders, submit work, redeem perks). The justification
 * is the only signal we have for abuse review. A human reading "this
 * agent wants write because they're going to spam" should be able to
 * reject before the damage happens.
 *
 * In-memory today; trivially Postgres-able via the same write-through
 * pattern as billing/sessions/webhook-dedup.
 */

import { audit } from "@/lib/audit-log";

// ─── Types ──────────────────────────────────────────────────────────────────

export type UpgradeStatus = "pending" | "approved" | "rejected" | "expired";
export type Scope = "read" | "write" | "admin";

export interface ScopeUpgradeRequest {
  id: string;
  /** API key id the upgrade is for. */
  apiKeyId: string;
  /** Agent business id (for tenant scoping). */
  agentBusinessId: string;
  /** Scopes the agent currently holds. */
  currentScopes: Scope[];
  /** Scopes the agent is asking for. */
  requestedScopes: Scope[];
  /** Free-text justification — why the upgrade is needed. */
  justification: string;
  /** Optional contact email override; defaults to the agent's registration email. */
  contactEmail: string | null;
  status: UpgradeStatus;
  createdAt: string;
  /** When the request was reviewed. Null while pending. */
  decidedAt: string | null;
  /** Admin user id who decided. Null while pending. */
  decidedBy: string | null;
  /** Optional reason supplied by the admin on rejection. */
  decisionReason: string | null;
  /** Auto-expire pending requests after 7 days. */
  expiresAt: string;
}

// ─── Store ──────────────────────────────────────────────────────────────────

const store = new Map<string, ScopeUpgradeRequest>();
/** Secondary index: apiKeyId → set of pending request ids. */
const pendingByApiKey = new Map<string, Set<string>>();

const REQUEST_TTL_DAYS = 7;

function newId(): string {
  return `scupg_${crypto.randomUUID()}`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Allowed transitions: an agent can only ever ask UP from their current scopes. */
function isUpgradeRequest(current: Scope[], requested: Scope[]): boolean {
  for (const c of current) {
    if (!requested.includes(c)) return false; // can't drop a current scope
  }
  // Must contain at least one new scope.
  return requested.some((r) => !current.includes(r));
}

export function createScopeUpgradeRequest(args: {
  apiKeyId: string;
  agentBusinessId: string;
  currentScopes: Scope[];
  requestedScopes: Scope[];
  justification: string;
  contactEmail?: string | null;
}): ScopeUpgradeRequest {
  if (!isUpgradeRequest(args.currentScopes, args.requestedScopes)) {
    throw new Error(
      "requestedScopes must be a strict superset of currentScopes (no scope removal allowed)"
    );
  }

  // Block stacking — at most one pending request per key. Keeps the
  // admin queue clean and prevents an agent from spamming requests.
  const existingPending = pendingByApiKey.get(args.apiKeyId);
  if (existingPending && existingPending.size > 0) {
    throw new Error(
      "A scope upgrade request is already pending for this API key. Wait for review or contact support."
    );
  }

  const id = newId();
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + REQUEST_TTL_DAYS);

  const request: ScopeUpgradeRequest = {
    id,
    apiKeyId: args.apiKeyId,
    agentBusinessId: args.agentBusinessId,
    currentScopes: [...args.currentScopes],
    requestedScopes: [...args.requestedScopes],
    justification: args.justification,
    contactEmail: args.contactEmail ?? null,
    status: "pending",
    createdAt: now.toISOString(),
    decidedAt: null,
    decidedBy: null,
    decisionReason: null,
    expiresAt: expiresAt.toISOString(),
  };

  store.set(id, request);
  let pendingSet = pendingByApiKey.get(args.apiKeyId);
  if (!pendingSet) {
    pendingSet = new Set();
    pendingByApiKey.set(args.apiKeyId, pendingSet);
  }
  pendingSet.add(id);

  audit({
    action: "auth.role_changed", // closest existing action — meta carries the upgrade detail
    actor: `agent:${args.agentBusinessId}`,
    businessId: args.agentBusinessId,
    resourceId: id,
    ok: true,
    meta: {
      origin: "scope_upgrade_requested",
      apiKeyId: args.apiKeyId,
      currentScopes: args.currentScopes,
      requestedScopes: args.requestedScopes,
      justification: args.justification,
    },
  });

  return request;
}

export function getScopeUpgradeRequest(id: string): ScopeUpgradeRequest | null {
  return store.get(id) ?? null;
}

/**
 * List all upgrade requests, optionally filtered by status. Used by the
 * admin queue endpoint.
 */
export function listScopeUpgradeRequests(filter?: {
  status?: UpgradeStatus;
}): ScopeUpgradeRequest[] {
  const out: ScopeUpgradeRequest[] = [];
  for (const r of store.values()) {
    if (filter?.status && r.status !== filter.status) continue;
    out.push(r);
  }
  // Newest first.
  return out.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Decide a pending request. Returns the updated record or null if not
 * found / not pending.
 */
export function decideScopeUpgradeRequest(args: {
  id: string;
  decidedBy: string;
  decision: "approve" | "reject";
  reason?: string;
}): ScopeUpgradeRequest | null {
  const request = store.get(args.id);
  if (!request) return null;
  if (request.status !== "pending") return null;

  request.status = args.decision === "approve" ? "approved" : "rejected";
  request.decidedAt = new Date().toISOString();
  request.decidedBy = args.decidedBy;
  request.decisionReason = args.reason ?? null;

  store.set(args.id, request);
  pendingByApiKey.get(request.apiKeyId)?.delete(args.id);

  audit({
    action: "auth.role_changed",
    actor: `admin:${args.decidedBy}`,
    businessId: request.agentBusinessId,
    resourceId: args.id,
    ok: true,
    meta: {
      origin: `scope_upgrade_${args.decision}d`,
      apiKeyId: request.apiKeyId,
      reason: args.reason ?? "",
    },
  });

  return request;
}

/**
 * Mark expired requests as expired. Called opportunistically on every
 * list/get so we don't need a background sweeper. Cheap because the
 * default TTL is 7 days and the queue is small.
 */
export function expireOldRequests(now: Date = new Date()): number {
  let expired = 0;
  for (const r of store.values()) {
    if (r.status === "pending" && new Date(r.expiresAt) <= now) {
      r.status = "expired";
      pendingByApiKey.get(r.apiKeyId)?.delete(r.id);
      expired += 1;
    }
  }
  return expired;
}

// ─── Test Helpers ───────────────────────────────────────────────────────────

export function _resetScopeUpgradeStore(): void {
  store.clear();
  pendingByApiKey.clear();
}
