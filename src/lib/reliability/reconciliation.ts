/**
 * Reconciliation Engine
 * ======================
 *
 * Cross-system consistency verification and repair.
 *
 * Source of Truth Rules:
 *   - Payments/Billing: Stripe is the source of truth
 *   - Campaigns: Internal store is source of truth
 *   - Submissions: Internal store, verified by proof URLs
 *   - Programs/Members: Internal store
 *   - User accounts: Auth system (JWT claims)
 *
 * Reconciliation runs periodically or on-demand, compares data sets,
 * and produces a report with optional auto-fix.
 */

import { metrics, METRIC } from "./metrics";

// ── Types ──────────────────────────────────────────────────────────────────

export type ReconciliationStatus = "consistent" | "inconsistent" | "repaired" | "error";

export interface ReconciliationItem {
  entity: string;
  entityId: string;
  field: string;
  sourceValue: unknown;
  targetValue: unknown;
  action: "none" | "fix_target" | "fix_source" | "manual_review";
  fixed: boolean;
}

export interface ReconciliationReport {
  id: string;
  name: string;
  status: ReconciliationStatus;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalChecked: number;
  mismatches: number;
  repaired: number;
  items: ReconciliationItem[];
}

export interface ReconciliationJob {
  name: string;
  description: string;
  sourceOfTruth: string;
  run: (autoFix: boolean) => Promise<ReconciliationReport>;
}

// ── Registry ───────────────────────────────────────────────────────────────

const jobs: ReconciliationJob[] = [];
const reports: ReconciliationReport[] = [];

export function registerReconciliation(job: ReconciliationJob): void {
  jobs.push(job);
}

export async function runReconciliation(name: string, autoFix = false): Promise<ReconciliationReport | null> {
  const job = jobs.find((j) => j.name === name);
  if (!job) return null;

  metrics.increment(METRIC.RECONCILIATION_RUN);

  try {
    const report = await job.run(autoFix);
    reports.push(report);
    trimReports();

    if (report.mismatches > 0) {
      metrics.increment(METRIC.SYNC_MISMATCH, report.mismatches);
    }
    if (report.repaired > 0) {
      metrics.increment(METRIC.RECONCILIATION_FIX, report.repaired);
    }

    return report;
  } catch (e) {
    const errorReport: ReconciliationReport = {
      id: `recon_${Date.now()}`,
      name,
      status: "error",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 0,
      totalChecked: 0,
      mismatches: 0,
      repaired: 0,
      items: [{
        entity: "reconciliation",
        entityId: name,
        field: "error",
        sourceValue: null,
        targetValue: e instanceof Error ? e.message : String(e),
        action: "manual_review",
        fixed: false,
      }],
    };
    reports.push(errorReport);
    trimReports();
    return errorReport;
  }
}

export async function runAllReconciliations(autoFix = false): Promise<ReconciliationReport[]> {
  const results: ReconciliationReport[] = [];
  for (const job of jobs) {
    const report = await runReconciliation(job.name, autoFix);
    if (report) results.push(report);
  }
  return results;
}

export function getReconciliationReports(limit = 20): ReconciliationReport[] {
  return reports.slice(-limit);
}

export function listReconciliationJobs(): { name: string; description: string; sourceOfTruth: string }[] {
  return jobs.map((j) => ({ name: j.name, description: j.description, sourceOfTruth: j.sourceOfTruth }));
}

function trimReports(): void {
  if (reports.length > 200) {
    reports.splice(0, reports.length - 100);
  }
}

// ── Built-in Reconciliation: Subscriptions vs Billing Events ───────────────

/**
 * Factory for creating a generic store-vs-store reconciliation job.
 */
export function createStoreReconciliation<S, T>(config: {
  name: string;
  description: string;
  sourceOfTruth: string;
  getSource: () => Map<string, S>;
  getTarget: () => Map<string, T>;
  /** Map source ID to target ID (if different) */
  mapId?: (sourceId: string, source: S) => string;
  /** Fields to compare between source and target */
  compare: (sourceId: string, source: S, target: T | undefined) => ReconciliationItem[];
  /** Apply a fix from source to target */
  fix?: (item: ReconciliationItem, source: S, targetStore: Map<string, T>) => boolean;
}): ReconciliationJob {
  return {
    name: config.name,
    description: config.description,
    sourceOfTruth: config.sourceOfTruth,
    run: async (autoFix) => {
      const startedAt = new Date().toISOString();
      const start = Date.now();
      const source = config.getSource();
      const target = config.getTarget();
      const items: ReconciliationItem[] = [];
      let totalChecked = 0;
      let repaired = 0;

      for (const [sourceId, sourceItem] of source) {
        const targetId = config.mapId ? config.mapId(sourceId, sourceItem) : sourceId;
        const targetItem = target.get(targetId);
        totalChecked++;

        const mismatches = config.compare(sourceId, sourceItem, targetItem);
        for (const item of mismatches) {
          if (autoFix && item.action === "fix_target" && config.fix) {
            item.fixed = config.fix(item, sourceItem, target);
            if (item.fixed) repaired++;
          }
          items.push(item);
        }
      }

      const report: ReconciliationReport = {
        id: `recon_${Date.now()}`,
        name: config.name,
        status: items.length === 0 ? "consistent" : repaired === items.length ? "repaired" : "inconsistent",
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - start,
        totalChecked,
        mismatches: items.length,
        repaired,
        items: items.slice(0, 100), // Cap items in report
      };

      return report;
    },
  };
}
