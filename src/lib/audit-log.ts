/**
 * Audit log for security-sensitive operations.
 *
 * What goes here:
 *   - API key minted / revoked
 *   - Subscription created / canceled / plan changed
 *   - Submission approved / rejected (esp. with overrides)
 *   - Cashback payouts approved / paid
 *   - Webhook authentication failures
 *   - Auth: login successes/failures, password changes, role changes
 *
 * What does NOT go here:
 *   - Routine reads, healthy auth checks, normal API traffic
 *
 * Storage strategy mirrors webhook-dedup.ts: write-through to Postgres
 * when DATABASE_URL is set, in-memory ring buffer for dev/CI.
 *
 * Calls are fire-and-forget by design — audit logging must NEVER fail
 * the operation it's auditing. A swallowed log is a security hole, but
 * a thrown audit error is a worse security hole because it kills the
 * operation and leaves state half-mutated.
 */

import { db, InMemoryConnection } from "./db/connection";

const usingDb = !(db instanceof InMemoryConnection);

export type AuditAction =
  // Authentication
  | "auth.login_success"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.password_changed"
  | "auth.password_reset_requested"
  | "auth.role_changed"
  // API keys
  | "api_key.created"
  | "api_key.revoked"
  | "api_key.verification_failed"
  // Agent OAuth flow — separate from api_key.created so we can filter
  // for keys minted via human consent vs. dashboard-issued keys.
  | "agent_auth.approved"
  | "agent_auth.token_exchanged"
  // Billing
  | "billing.checkout_started"
  | "billing.subscription_created"
  | "billing.subscription_canceled"
  | "billing.plan_changed"
  | "billing.webhook_received"
  | "billing.webhook_signature_failed"
  // Submissions / cashback
  | "submission.approved"
  | "submission.rejected"
  | "submission.fraud_flagged"
  | "cashback.approved"
  | "cashback.rejected"
  | "cashback.paid"
  // Programs / tenant
  | "program.created"
  | "program.updated"
  | "program.deleted"
  | "tenant.access_denied"
  // Self-audit — the audit log itself was read by an admin.
  | "admin.audit_read"
  // Founder dashboard read — admin-only revenue & growth snapshot.
  | "admin.founder_overview_read"
  // Admin user-management actions
  | "admin.user.suspended"
  | "admin.user.unsuspended"
  | "admin.user.role_changed"
  | "admin.user.password_reset"
  | "admin.user.impersonated"
  | "admin.user.impersonation_ended"
  // Admin agent control plane
  | "admin.agent.enabled"
  | "admin.agent.disabled"
  | "admin.agent.config_changed"
  | "admin.agent.manual_run"
  | "agent.decision"
  | "agent.error";

export interface AuditEntry {
  /** Action that happened. */
  action: AuditAction;
  /** Acting user / API key id (e.g. "user:abc", "api-key:xyz", "stripe-webhook"). */
  actor: string;
  /** Tenant the action affected. */
  businessId?: string | null;
  /** Resource id (campaign, submission, key, …). */
  resourceId?: string | null;
  /** Outcome — true for "happened/allowed", false for "denied/failed". */
  ok: boolean;
  /** Caller IP (rate-limited path). */
  ip?: string;
  /** Free-form context. Keep small; do NOT include secrets. */
  meta?: Record<string, unknown>;
}

// In-memory ring buffer for dev / when DATABASE_URL is unset.
const _ringBuffer: Array<AuditEntry & { timestamp: string }> = [];
const _ringBufferMax = 1000;

/**
 * Record an audit entry. Fire-and-forget; never throws.
 */
export function audit(entry: AuditEntry): void {
  const stamped = { ...entry, timestamp: new Date().toISOString() };

  // Always emit a structured log line (visible in Vercel runtime logs).
  // This is the primary signal for security-monitoring agents to scrape.
  console.warn(JSON.stringify({
    level: "info",
    event: "audit",
    ...stamped,
  }));

  // Ring buffer for dev / quick local lookup.
  _ringBuffer.push(stamped);
  if (_ringBuffer.length > _ringBufferMax) _ringBuffer.shift();

  // Best-effort write-through to Postgres. Fire-and-forget.
  if (usingDb) {
    void persistAuditEntry(stamped).catch((e) => {
      console.error("[audit] db write failed:", e instanceof Error ? e.message : e);
    });
  }
}

async function persistAuditEntry(entry: AuditEntry & { timestamp: string }): Promise<void> {
  // Note: relies on the audit_log table existing in Postgres. We define
  // it in the schema but if the migration hasn't been run, this swallows
  // the error and logs to console only — no impact on the operation
  // being audited.
  try {
    await db.query(
      `INSERT INTO audit_log (action, actor, business_id, resource_id, ok, ip, meta, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.action,
        entry.actor,
        entry.businessId ?? null,
        entry.resourceId ?? null,
        entry.ok,
        entry.ip ?? null,
        JSON.stringify(entry.meta ?? {}),
        entry.timestamp,
      ]
    );
  } catch {
    // Most likely cause: audit_log table not yet migrated. Don't crash;
    // the console log captures the entry regardless.
  }
}

/** Test helper. */
export function _resetAuditLog(): void {
  _ringBuffer.length = 0;
}

/** Test helper / dev-mode admin tool: read recent in-memory entries. */
export function _peekRecentAuditEntries(): Array<AuditEntry & { timestamp: string }> {
  return [..._ringBuffer];
}

// ─── Query API for the admin viewer ────────────────────────────────────────

export interface AuditQuery {
  /** Filter by action namespace prefix (e.g. "auth", "billing"). */
  actionPrefix?: string;
  /** Filter by exact action. */
  action?: string;
  /** Filter by actor (e.g. "user:abc"). */
  actor?: string;
  /** Filter by businessId tenant. */
  businessId?: string;
  /** Only return failures (ok=false). */
  onlyFailures?: boolean;
  /** Time window — entries occurring after this ISO timestamp. */
  since?: string;
  /** Pagination. */
  limit?: number;
  offset?: number;
}

export interface AuditQueryResult {
  /** Matching entries, newest first. */
  entries: Array<AuditEntry & { timestamp: string }>;
  /** Total count matching the filter (for pagination UI). */
  total: number;
  /** Whether the result came from Postgres (true) or the in-memory ring buffer (false). */
  fromDb: boolean;
}

/**
 * Query audit entries. Reads from Postgres when available, falls back
 * to the in-memory ring buffer (last 1000 entries) otherwise.
 *
 * Filters are AND-ed. Sort is always newest-first.
 */
export async function queryAuditLog(q: AuditQuery): Promise<AuditQueryResult> {
  const limit = Math.max(1, Math.min(200, q.limit ?? 50));
  const offset = Math.max(0, q.offset ?? 0);

  if (usingDb) {
    try {
      const conditions: string[] = [];
      const params: unknown[] = [];
      const push = (sql: string, value: unknown) => {
        params.push(value);
        conditions.push(sql.replace("$N", `$${params.length}`));
      };

      if (q.action) push(`action = $N`, q.action);
      else if (q.actionPrefix) push(`action LIKE $N`, `${q.actionPrefix}%`);
      if (q.actor) push(`actor = $N`, q.actor);
      if (q.businessId) push(`business_id = $N`, q.businessId);
      if (q.onlyFailures) conditions.push(`ok = false`);
      if (q.since) push(`occurred_at >= $N`, q.since);

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const countResult = await db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM audit_log ${whereSql}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

      const limitParamIdx = params.length + 1;
      const offsetParamIdx = params.length + 2;
      const rowsResult = await db.query<{
        action: string; actor: string; business_id: string | null;
        resource_id: string | null; ok: boolean; ip: string | null;
        meta: Record<string, unknown> | null; occurred_at: string;
      }>(
        `SELECT action, actor, business_id, resource_id, ok, ip, meta, occurred_at
         FROM audit_log ${whereSql}
         ORDER BY occurred_at DESC
         LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
        [...params, limit, offset]
      );
      return {
        entries: rowsResult.rows.map((r) => ({
          action: r.action as AuditAction,
          actor: r.actor,
          businessId: r.business_id,
          resourceId: r.resource_id,
          ok: r.ok,
          ip: r.ip ?? undefined,
          meta: r.meta ?? undefined,
          timestamp: new Date(r.occurred_at).toISOString(),
        })),
        total,
        fromDb: true,
      };
    } catch (e) {
      console.error("[audit] query failed, falling back to ring buffer:", e instanceof Error ? e.message : e);
      // Fall through to in-memory.
    }
  }

  // In-memory fallback. Apply filters in JS.
  const filtered = _ringBuffer
    .filter((e) => {
      if (q.action && e.action !== q.action) return false;
      if (q.actionPrefix && !e.action.startsWith(q.actionPrefix)) return false;
      if (q.actor && e.actor !== q.actor) return false;
      if (q.businessId && e.businessId !== q.businessId) return false;
      if (q.onlyFailures && e.ok) return false;
      if (q.since && e.timestamp < q.since) return false;
      return true;
    })
    .slice()
    .reverse(); // newest first
  return {
    entries: filtered.slice(offset, offset + limit),
    total: filtered.length,
    fromDb: false,
  };
}
