/**
 * Agent activity rollups — "what has this agent done on my behalf?"
 *
 * This is the proof-of-value surface for users who delegated work to an
 * AI agent via the OAuth flow. They need a clear answer to:
 *
 *   "What has [agent name] done for my business, and what did it earn me?"
 *
 * Data sources:
 *   - api-keys store: agent identity, when the key was created, last use
 *   - audit log:      every action attributable to actor="agent:<id>"
 *   - campaign manager: details for campaign resourceIds in the audit log
 *
 * No new persistence — this module is a pure read layer that joins
 * existing stores. When traffic justifies it, the per-agent rollup can
 * become a materialized view; for now derive-on-read is plenty fast for
 * <1000 audit entries.
 */

import { listApiKeysForBusiness, type ApiKeyRecord } from "@/lib/auth/api-keys";
import { queryAuditLog, type AuditEntry } from "@/lib/audit-log";
import { campaignManager } from "@/lib/campaign-state-machine";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentActivityEvent {
  /** ISO timestamp the action happened. */
  timestamp: string;
  /** Audit action (e.g. "submission.approved"). */
  action: string;
  /** Human-readable description for the dashboard. */
  description: string;
  /** Resource the action affected. */
  resourceId: string | null;
  /** Resolved resource title when available (campaign name, etc.). */
  resourceTitle: string | null;
  /** Whether the action succeeded. */
  ok: boolean;
}

export interface AgentActivityTotals {
  campaignsCreated: number;
  submissionsCreated: number;
  submissionsApproved: number;
  submissionsRejected: number;
  /** Any other action attributable to the agent — useful for spotting
   * activity we haven't categorized yet. */
  otherActions: number;
}

export interface AgentActivitySummary {
  apiKeyId: string;
  agentName: string;
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  permissions: string[];
  totals: AgentActivityTotals;
  /** Most recent events, newest first. Capped at 20 for the dashboard. */
  recent: AgentActivityEvent[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ACTOR_PREFIX = "agent:";

/**
 * Map audit actions to the buckets the dashboard exposes. Anything not
 * in this map falls into `otherActions` — which is intentional: it
 * means activity is happening that we should consider promoting to its
 * own bucket later.
 */
const ACTION_BUCKETS: Record<string, keyof AgentActivityTotals> = {
  "campaign.created": "campaignsCreated",
  "submission.approved": "submissionsApproved",
  "submission.rejected": "submissionsRejected",
};

/**
 * Convert an audit action into a human-readable description for the
 * dashboard timeline. Falls back to the raw action string for entries
 * we haven't given a friendly label.
 */
const ACTION_DESCRIPTIONS: Record<string, string> = {
  "campaign.created": "Created a campaign",
  "submission.approved": "Approved a submission",
  "submission.rejected": "Rejected a submission",
  "submission.fraud_flagged": "Flagged a submission as fraud",
  "cashback.approved": "Approved a cashback request",
  "cashback.rejected": "Rejected a cashback request",
  "cashback.paid": "Paid out a cashback",
  "api_key.verification_failed": "Failed authentication",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function describeAction(action: string): string {
  return ACTION_DESCRIPTIONS[action] ?? action;
}

/**
 * Best-effort lookup of a resource title (campaign name, etc.) for
 * dashboard display. Returns null if the resource is unknown or the
 * lookup fails — the dashboard falls back to the raw id.
 */
function resolveResourceTitle(_action: string, resourceId: string | null): string | null {
  // `_action` reserved for future per-action resolution (e.g. submissions
  // joining the submissions store) — currently we only resolve campaigns.
  if (!resourceId) return null;
  // Campaign resourceIds start with "camp_" by convention; resolve via
  // the in-memory state machine for an O(1) lookup.
  if (resourceId.startsWith("camp_")) {
    try {
      const lifecycle = campaignManager.getState(resourceId);
      // CampaignLifecycle's display name lives in the latest event's
      // data; not all snapshots expose it directly, so we fall back
      // gracefully if the shape doesn't match.
      const name = (lifecycle as unknown as { name?: string })?.name;
      return name ?? null;
    } catch {
      return null;
    }
  }
  // Submission resources don't have a "name" field — we just surface
  // the id (parent code handles this by rendering the id directly).
  return null;
}

function emptyTotals(): AgentActivityTotals {
  return {
    campaignsCreated: 0,
    submissionsCreated: 0,
    submissionsApproved: 0,
    submissionsRejected: 0,
    otherActions: 0,
  };
}

/**
 * Walk a flat list of audit entries and group them by agent (the
 * "agent:<id>" suffix of actor). Returns a map keyed by api-key id.
 */
function groupByAgent(
  entries: Array<AuditEntry & { timestamp: string }>
): Map<string, Array<AuditEntry & { timestamp: string }>> {
  const out = new Map<string, Array<AuditEntry & { timestamp: string }>>();
  for (const e of entries) {
    if (!e.actor.startsWith(ACTOR_PREFIX)) continue;
    const id = e.actor.slice(ACTOR_PREFIX.length);
    let list = out.get(id);
    if (!list) {
      list = [];
      out.set(id, list);
    }
    list.push(e);
  }
  return out;
}

/**
 * Build the activity summary for a single agent given its api-key
 * record + the audit entries attributable to it.
 *
 * Audit entries arrive newest-first; we preserve that order in the
 * `recent` slice. Totals iterate the full list.
 */
function summarize(
  record: ApiKeyRecord,
  entries: Array<AuditEntry & { timestamp: string }>
): AgentActivitySummary {
  const totals = emptyTotals();
  for (const e of entries) {
    const bucket = ACTION_BUCKETS[e.action];
    if (bucket) totals[bucket] += 1;
    else totals.otherActions += 1;
  }

  const recent: AgentActivityEvent[] = entries.slice(0, 20).map((e) => ({
    timestamp: e.timestamp,
    action: e.action,
    description: describeAction(e.action),
    resourceId: e.resourceId ?? null,
    resourceTitle: resolveResourceTitle(e.action, e.resourceId ?? null),
    ok: e.ok,
  }));

  return {
    apiKeyId: record.id,
    agentName: record.agentName,
    active: record.active,
    createdAt: record.createdAt.toISOString(),
    lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
    expiresAt: record.expiresAt?.toISOString() ?? null,
    permissions: record.permissions,
    totals,
    recent,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get a full activity rollup for every API key the business owns.
 * Returns summaries sorted by most recent activity descending — the
 * agent the user actually delegated to recently shows up first.
 */
export async function getBusinessAgentActivity(businessId: string): Promise<{
  agents: AgentActivitySummary[];
  totalEvents: number;
  fromDb: boolean;
}> {
  const keys = listApiKeysForBusiness(businessId);
  if (keys.length === 0) {
    return { agents: [], totalEvents: 0, fromDb: false };
  }

  // Pull a generous window of recent audit entries for this tenant.
  // 500 is more than enough to cover everyday display and lets us
  // surface "old but still relevant" activity when a user revisits
  // a dormant key.
  const result = await queryAuditLog({
    businessId,
    limit: 500,
  });

  const grouped = groupByAgent(result.entries);
  const summaries: AgentActivitySummary[] = keys.map((k) =>
    summarize(k, grouped.get(k.id) ?? [])
  );

  // Sort by lastUsedAt desc, falling back to createdAt for keys that
  // have never been used. Inactive keys at the bottom.
  summaries.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    const aTs = a.lastUsedAt ?? a.createdAt;
    const bTs = b.lastUsedAt ?? b.createdAt;
    return bTs.localeCompare(aTs);
  });

  return {
    agents: summaries,
    totalEvents: result.entries.filter((e) => e.actor.startsWith(ACTOR_PREFIX)).length,
    fromDb: result.fromDb,
  };
}

/**
 * Get activity for a single agent (by api-key id), or null if no key
 * with that id exists for the business.
 *
 * Tenant-isolated: the caller's businessId must match the key's, or we
 * return null (which the route surface up as 404 — leaks no info about
 * whether the id exists in another tenant).
 */
export async function getSingleAgentActivity(
  businessId: string,
  apiKeyId: string
): Promise<AgentActivitySummary | null> {
  const keys = listApiKeysForBusiness(businessId);
  const record = keys.find((k) => k.id === apiKeyId);
  if (!record) return null;

  const result = await queryAuditLog({
    businessId,
    actor: `${ACTOR_PREFIX}${apiKeyId}`,
    limit: 100,
  });

  return summarize(record, result.entries);
}
