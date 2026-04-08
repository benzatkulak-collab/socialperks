/**
 * Multi-Tenant Isolation Enforcement
 * ────────────────────────────────────
 * Provides tenant context extraction, cross-tenant access guards,
 * scoped query helpers, and per-tenant usage metering.
 *
 * Storage: in-memory Maps with monthly buckets (ready for Postgres migration).
 */

import type { AuthUser } from "@/app/api/v1/_shared";

// ─── Tenant Context ────────────────────────────────────────────────────────

export interface TenantContext {
  tenantId: string;          // businessId
  userId: string;
  role: "owner" | "admin" | "member" | "viewer";
  plan: string;
}

// ─── Usage Types ───────────────────────────────────────────────────────────

export type UsageMetric =
  | "api_calls"
  | "campaigns_created"
  | "submissions_received"
  | "ai_generations"
  | "storage_bytes"
  | "bandwidth_bytes";

export interface UsageBucket {
  tenantId: string;
  metric: UsageMetric;
  /** ISO month key, e.g. "2026-04" */
  period: string;
  amount: number;
}

export interface UsageSummary {
  tenantId: string;
  period: string;
  apiCalls: number;
  campaignsCreated: number;
  submissionsReceived: number;
  aiGenerations: number;
  storageBytes: number;
  bandwidthBytes: number;
}

// ─── Errors ────────────────────────────────────────────────────────────────

export class TenantAccessError extends Error {
  public readonly code = "TENANT_ACCESS_DENIED";
  public readonly status = 403;

  constructor(tenantId: string, resourceOwnerId: string) {
    super(
      `Tenant isolation violation: tenant "${tenantId}" cannot access resource owned by "${resourceOwnerId}".`
    );
    this.name = "TenantAccessError";
  }
}

// ─── Context Extraction ────────────────────────────────────────────────────

/**
 * Derive a TenantContext from the authenticated user.
 * Returns null if the user has no associated businessId (e.g. platform admin).
 */
export function getTenantContext(user: AuthUser): TenantContext | null {
  if (!user.businessId) return null;

  // Map the auth role to a tenant role
  const roleMap: Record<string, TenantContext["role"]> = {
    owner: "owner",
    admin: "admin",
    manager: "admin",
    member: "member",
    viewer: "viewer",
    business: "owner",         // legacy role string
    influencer: "viewer",      // influencers viewing business data are viewers
  };

  const role = roleMap[user.role] ?? "viewer";

  return {
    tenantId: user.businessId,
    userId: user.id,
    role,
    plan: "starter", // Will be looked up from billing in production
  };
}

// ─── Access Guards ─────────────────────────────────────────────────────────

/**
 * Assert that a resource belongs to the given tenant.
 * Throws TenantAccessError on mismatch.
 */
export function assertTenantAccess(tenantId: string, resourceOwnerId: string): void {
  if (tenantId !== resourceOwnerId) {
    throw new TenantAccessError(tenantId, resourceOwnerId);
  }
}

// ─── Scoped Queries ────────────────────────────────────────────────────────

/**
 * Add a businessId filter to an existing filter object.
 * Used to scope all data queries to the current tenant.
 */
export function scopeToTenant<T extends Record<string, unknown>>(
  filter: T,
  tenantId: string
): T & { businessId: string } {
  return { ...filter, businessId: tenantId };
}

// ─── Usage Metering ────────────────────────────────────────────────────────

/** Monthly bucket key: e.g. "2026-04" */
function monthKey(date?: Date): string {
  const d = date ?? new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Composite storage key: tenantId:metric:period */
function bucketKey(tenantId: string, metric: string, period: string): string {
  return `${tenantId}:${metric}:${period}`;
}

/**
 * In-memory usage store. Maps composite keys to cumulative amounts.
 * In production this would be backed by a `tenant_usage` Postgres table.
 */
const usageBuckets = new Map<string, number>();

/**
 * Record a usage event for a tenant.
 * Increments the current month's bucket by the given amount (default 1).
 */
export function recordUsage(
  tenantId: string,
  metric: string,
  amount: number = 1
): void {
  const period = monthKey();
  const key = bucketKey(tenantId, metric, period);
  const current = usageBuckets.get(key) ?? 0;
  usageBuckets.set(key, current + amount);
}

/**
 * Get the accumulated usage for a tenant + metric in a given month.
 * Defaults to the current month if no periodStart is provided.
 */
export function getUsage(
  tenantId: string,
  metric: string,
  periodStart?: Date
): number {
  const period = monthKey(periodStart);
  const key = bucketKey(tenantId, metric, period);
  return usageBuckets.get(key) ?? 0;
}

/**
 * Get an aggregated usage summary for a tenant in the current month.
 */
export function getUsageSummary(tenantId: string): UsageSummary {
  const period = monthKey();
  return {
    tenantId,
    period,
    apiCalls: getUsage(tenantId, "api_calls"),
    campaignsCreated: getUsage(tenantId, "campaigns_created"),
    submissionsReceived: getUsage(tenantId, "submissions_received"),
    aiGenerations: getUsage(tenantId, "ai_generations"),
    storageBytes: getUsage(tenantId, "storage_bytes"),
    bandwidthBytes: getUsage(tenantId, "bandwidth_bytes"),
  };
}

// ─── Testing Helpers ───────────────────────────────────────────────────────

/** Clear all usage data. For testing only. */
export function _resetUsage(): void {
  usageBuckets.clear();
}

/** Expose the raw map for test introspection. For testing only. */
export function _getUsageBuckets(): Map<string, number> {
  return usageBuckets;
}
