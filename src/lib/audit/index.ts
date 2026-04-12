// ==============================================================================
// Social Perks -- Immutable Audit Log
//
// Cryptographically chained audit trail for all security-relevant actions.
// In-memory store now, ready for Postgres / S3 archival migration.
// Each entry is hash-chained (SHA-256) to the previous, making tampering
// detectable via verifyIntegrity().
// ==============================================================================

import crypto from "crypto";

// --- Types -------------------------------------------------------------------

export interface AuditActor {
  userId: string;
  email?: string;
  role: string;
  ip?: string;
}

export interface AuditResource {
  type: string;
  id: string;
}

export interface AuditChanges {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface AuditEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly actor: AuditActor;
  readonly action: string;
  readonly resource: AuditResource;
  readonly changes?: AuditChanges;
  readonly metadata?: Record<string, unknown>;
  readonly requestId?: string;
  readonly hash: string;
  readonly previousHash: string;
}

/** Input to `log()` -- everything except computed fields (id, timestamp, hash, previousHash). */
export interface AuditLogInput {
  actor: AuditActor;
  action: string;
  resource: AuditResource;
  changes?: AuditChanges;
  metadata?: Record<string, unknown>;
  requestId?: string;
}

export interface AuditQueryFilter {
  actorId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}

export interface AuditStats {
  totalEntries: number;
  byAction: Record<string, number>;
  byActor: Record<string, number>;
}

export interface IntegrityResult {
  valid: boolean;
  totalChecked: number;
  firstInvalidIndex?: number;
  error?: string;
}

// --- Constants ---------------------------------------------------------------

const GENESIS_HASH = "0".repeat(64);

// --- ID Generation -----------------------------------------------------------

let auditCounter = 0;

function generateAuditId(): string {
  auditCounter += 1;
  return `aud_${crypto.randomUUID()}_${auditCounter}`;
}

// --- Hash Computation --------------------------------------------------------

function computeHash(previousHash: string, content: string): string {
  return crypto
    .createHash("sha256")
    .update(previousHash + content)
    .digest("hex");
}

/** Serialize entry fields that contribute to the hash (everything except hash/previousHash). */
function contentForHash(entry: Omit<AuditEntry, "hash" | "previousHash">): string {
  return JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    actor: entry.actor,
    action: entry.action,
    resource: entry.resource,
    changes: entry.changes,
    metadata: entry.metadata,
    requestId: entry.requestId,
  });
}

// --- Audit Log Class ---------------------------------------------------------

export class AuditLog {
  private entries: AuditEntry[] = [];
  private readonly maxEntries = 500_000;

  // -- Append -----------------------------------------------------------------

  /**
   * Append an immutable, hash-chained audit entry.
   * Returns the created entry.
   */
  log(input: AuditLogInput): AuditEntry {
    const previousHash =
      this.entries.length > 0
        ? this.entries[this.entries.length - 1].hash
        : GENESIS_HASH;

    const partial = {
      id: generateAuditId(),
      timestamp: new Date().toISOString(),
      actor: input.actor,
      action: input.action,
      resource: input.resource,
      changes: input.changes,
      metadata: input.metadata,
      requestId: input.requestId,
    };

    const content = contentForHash(partial);
    const hash = computeHash(previousHash, content);

    const entry: AuditEntry = {
      ...partial,
      hash,
      previousHash,
    };

    this.entries.push(entry);

    // Capacity guard -- keep newest 80% when limit is reached
    if (this.entries.length > this.maxEntries) {
      const keepCount = Math.floor(this.maxEntries * 0.8);
      const discardCount = this.entries.length - keepCount;
      console.warn(
        `[AuditLog] Capacity reached (${this.maxEntries}). Discarding ${discardCount} oldest entries.`
      );
      this.entries = this.entries.slice(-keepCount);
    }

    return entry;
  }

  // -- Query ------------------------------------------------------------------

  /**
   * Filter entries by any combination of criteria with pagination.
   * Returns entries in chronological order (oldest first).
   */
  query(filter: AuditQueryFilter = {}): { entries: AuditEntry[]; total: number } {
    let results = this.entries;

    if (filter.actorId !== undefined) {
      results = results.filter((e) => e.actor.userId === filter.actorId);
    }
    if (filter.action !== undefined) {
      results = results.filter((e) => e.action === filter.action);
    }
    if (filter.resourceType !== undefined) {
      results = results.filter((e) => e.resource.type === filter.resourceType);
    }
    if (filter.resourceId !== undefined) {
      results = results.filter((e) => e.resource.id === filter.resourceId);
    }
    if (filter.startDate !== undefined) {
      const startMs = new Date(filter.startDate).getTime();
      if (!isNaN(startMs)) {
        results = results.filter((e) => new Date(e.timestamp).getTime() >= startMs);
      }
    }
    if (filter.endDate !== undefined) {
      const endMs = new Date(filter.endDate).getTime();
      if (!isNaN(endMs)) {
        results = results.filter((e) => new Date(e.timestamp).getTime() <= endMs);
      }
    }

    const total = results.length;

    // Pagination
    const page = Math.max(1, filter.page ?? 1);
    const perPage = Math.min(100, Math.max(1, filter.perPage ?? 50));
    const start = (page - 1) * perPage;
    results = results.slice(start, start + perPage);

    return { entries: results, total };
  }

  // -- Resource History -------------------------------------------------------

  /**
   * Return all audit entries for a specific resource, in chronological order.
   */
  getResourceHistory(type: string, id: string): AuditEntry[] {
    return this.entries.filter(
      (e) => e.resource.type === type && e.resource.id === id
    );
  }

  // -- Actor History ----------------------------------------------------------

  /**
   * Return audit entries for a specific actor, newest first.
   */
  getActorHistory(actorId: string, limit?: number): AuditEntry[] {
    const results = this.entries
      .filter((e) => e.actor.userId === actorId)
      .reverse();
    if (limit !== undefined && limit > 0) {
      return results.slice(0, limit);
    }
    return results;
  }

  // -- Export -----------------------------------------------------------------

  /**
   * Export all entries within a date range (inclusive).
   * Returns entries in chronological order.
   */
  export(startDate: string, endDate: string): AuditEntry[] {
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();

    if (isNaN(startMs) || isNaN(endMs)) {
      return [];
    }

    return this.entries.filter((e) => {
      const ts = new Date(e.timestamp).getTime();
      return ts >= startMs && ts <= endMs;
    });
  }

  // -- Stats ------------------------------------------------------------------

  /**
   * Compute aggregate statistics over the entire log.
   */
  getStats(): AuditStats {
    const byAction: Record<string, number> = {};
    const byActor: Record<string, number> = {};

    for (const entry of this.entries) {
      byAction[entry.action] = (byAction[entry.action] ?? 0) + 1;
      byActor[entry.actor.userId] = (byActor[entry.actor.userId] ?? 0) + 1;
    }

    return {
      totalEntries: this.entries.length,
      byAction,
      byActor,
    };
  }

  // -- Integrity Verification -------------------------------------------------

  /**
   * Walk the hash chain and verify every entry's hash matches its content
   * and the previous entry's hash. Returns a result describing chain validity.
   */
  verifyIntegrity(): IntegrityResult {
    if (this.entries.length === 0) {
      return { valid: true, totalChecked: 0 };
    }

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const expectedPrevious = i === 0 ? GENESIS_HASH : this.entries[i - 1].hash;

      // Check previous hash link
      if (entry.previousHash !== expectedPrevious) {
        return {
          valid: false,
          totalChecked: i + 1,
          firstInvalidIndex: i,
          error: `Entry ${i}: previousHash mismatch`,
        };
      }

      // Recompute hash from content
      const content = contentForHash({
        id: entry.id,
        timestamp: entry.timestamp,
        actor: entry.actor,
        action: entry.action,
        resource: entry.resource,
        changes: entry.changes,
        metadata: entry.metadata,
        requestId: entry.requestId,
      });
      const expectedHash = computeHash(entry.previousHash, content);

      if (entry.hash !== expectedHash) {
        return {
          valid: false,
          totalChecked: i + 1,
          firstInvalidIndex: i,
          error: `Entry ${i}: hash mismatch (content tampered)`,
        };
      }
    }

    return { valid: true, totalChecked: this.entries.length };
  }

  // -- Diagnostics ------------------------------------------------------------

  /** Total number of stored entries. */
  get size(): number {
    return this.entries.length;
  }

  /** Read-only snapshot of all entries. For debugging only. */
  snapshot(): readonly AuditEntry[] {
    return [...this.entries];
  }

  /** Clear all entries. For testing only -- never call in production. */
  _reset(): void {
    this.entries = [];
  }

  /**
   * Direct access to the internal entries array. FOR TESTING ONLY.
   * Allows tests to simulate tampering to verify integrity checks.
   */
  _unsafeGetEntries(): AuditEntry[] {
    return this.entries;
  }
}

// --- Singleton ---------------------------------------------------------------

export const auditLog = new AuditLog();

// --- Known Audit Actions -----------------------------------------------------

export const AUDIT_ACTIONS = [
  "login",
  "logout",
  "campaign_created",
  "campaign_updated",
  "campaign_deleted",
  "submission_reviewed",
  "settings_changed",
  "api_key_created",
  "api_key_revoked",
  "export_requested",
  "password_changed",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// --- Convenience Helper ------------------------------------------------------

/**
 * High-level helper for logging audit events with a simpler interface.
 * Wraps `auditLog.log()` with sensible defaults.
 */
export interface AuditEventInput {
  userId: string;
  email?: string;
  role?: string;
  action: AuditAction | string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export function logAuditEvent(event: AuditEventInput): AuditEntry {
  return auditLog.log({
    actor: {
      userId: event.userId,
      email: event.email,
      role: event.role ?? "unknown",
      ip: event.ipAddress,
    },
    action: event.action,
    resource: {
      type: event.entityType,
      id: event.entityId,
    },
    metadata: {
      ...event.metadata,
      ...(event.userAgent ? { userAgent: event.userAgent } : {}),
    },
    requestId: event.requestId,
  });
}

/**
 * Query the audit log with the same filter interface.
 * Re-exported for convenience.
 */
export function getAuditLog(filters?: AuditQueryFilter) {
  return auditLog.query(filters);
}
