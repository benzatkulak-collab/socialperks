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
  | "tenant.access_denied";

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
