/**
 * Failure Detectors
 * =================
 *
 * Automated detection of data inconsistencies, stuck jobs, orphaned records,
 * and cross-system mismatches. Each detector returns findings that can trigger
 * self-healing or alert escalation.
 *
 * Designed to run on intervals or on-demand via the reliability API.
 */

import { metrics, METRIC } from "./metrics";

// ── Types ──────────────────────────────────────────────────────────────────

export type FindingSeverity = "critical" | "high" | "medium" | "info";

export interface DetectorFinding {
  detector: string;
  severity: FindingSeverity;
  message: string;
  affectedIds: string[];
  timestamp: string;
  autoHealable: boolean;
}

export interface DetectorResult {
  name: string;
  status: "healthy" | "issues_found" | "error";
  findings: DetectorFinding[];
  durationMs: number;
  lastRun: string;
}

type StoreScanner<T> = () => Map<string, T>;

// ── Detector Registry ──────────────────────────────────────────────────────

interface DetectorConfig {
  name: string;
  description: string;
  run: () => DetectorResult;
}

const detectors: DetectorConfig[] = [];
const lastResults = new Map<string, DetectorResult>();

export function registerDetector(config: DetectorConfig): void {
  detectors.push(config);
}

export function runAllDetectors(): DetectorResult[] {
  const results: DetectorResult[] = [];
  for (const detector of detectors) {
    try {
      const result = detector.run();
      lastResults.set(detector.name, result);
      results.push(result);
    } catch (e) {
      const errorResult: DetectorResult = {
        name: detector.name,
        status: "error",
        findings: [{
          detector: detector.name,
          severity: "high",
          message: `Detector failed: ${e instanceof Error ? e.message : String(e)}`,
          affectedIds: [],
          timestamp: new Date().toISOString(),
          autoHealable: false,
        }],
        durationMs: 0,
        lastRun: new Date().toISOString(),
      };
      lastResults.set(detector.name, errorResult);
      results.push(errorResult);
    }
  }
  return results;
}

export function runDetector(name: string): DetectorResult | null {
  const detector = detectors.find((d) => d.name === name);
  if (!detector) return null;
  const result = detector.run();
  lastResults.set(name, result);
  return result;
}

export function getLastResults(): Map<string, DetectorResult> {
  return new Map(lastResults);
}

// ── Generic Detectors ──────────────────────────────────────────────────────

/**
 * Detect orphaned records: children whose parent no longer exists.
 */
export function createOrphanDetector<C, P>(config: {
  name: string;
  childStore: StoreScanner<C>;
  parentStore: StoreScanner<P>;
  getParentId: (child: C) => string | null;
  childLabel: string;
  parentLabel: string;
}): DetectorConfig {
  return {
    name: config.name,
    description: `Detect ${config.childLabel} records without a valid ${config.parentLabel}`,
    run: () => {
      const start = Date.now();
      const children = config.childStore();
      const parents = config.parentStore();
      const orphans: string[] = [];

      for (const [childId, child] of children) {
        const parentId = config.getParentId(child);
        if (parentId && !parents.has(parentId)) {
          orphans.push(childId);
        }
      }

      if (orphans.length > 0) {
        metrics.increment(METRIC.ORPHAN_DETECTED, orphans.length);
      }

      const findings: DetectorFinding[] = orphans.length > 0
        ? [{
            detector: config.name,
            severity: "medium" as FindingSeverity,
            message: `Found ${orphans.length} ${config.childLabel}(s) without a valid ${config.parentLabel}`,
            affectedIds: orphans.slice(0, 100),
            timestamp: new Date().toISOString(),
            autoHealable: true,
          }]
        : [];

      return {
        name: config.name,
        status: orphans.length > 0 ? "issues_found" : "healthy",
        findings,
        durationMs: Date.now() - start,
        lastRun: new Date().toISOString(),
      };
    },
  };
}

/**
 * Detect stuck records: items in a transient state for too long.
 */
export function createStuckDetector<T>(config: {
  name: string;
  store: StoreScanner<T>;
  getStatus: (item: T) => string;
  getTimestamp: (item: T) => string | number | null;
  transientStatuses: string[];
  maxAgeMs: number;
  label: string;
}): DetectorConfig {
  return {
    name: config.name,
    description: `Detect ${config.label} stuck in transient state for > ${config.maxAgeMs / 1000}s`,
    run: () => {
      const start = Date.now();
      const store = config.store();
      const stuck: string[] = [];
      const now = Date.now();

      for (const [id, item] of store) {
        const status = config.getStatus(item);
        if (!config.transientStatuses.includes(status)) continue;

        const ts = config.getTimestamp(item);
        if (!ts) continue;

        const age = now - (typeof ts === "number" ? ts : new Date(ts).getTime());
        if (age > config.maxAgeMs) {
          stuck.push(id);
        }
      }

      const findings: DetectorFinding[] = stuck.length > 0
        ? [{
            detector: config.name,
            severity: "high" as FindingSeverity,
            message: `Found ${stuck.length} ${config.label}(s) stuck in ${config.transientStatuses.join("/")} for > ${config.maxAgeMs / 1000}s`,
            affectedIds: stuck.slice(0, 100),
            timestamp: new Date().toISOString(),
            autoHealable: true,
          }]
        : [];

      return {
        name: config.name,
        status: stuck.length > 0 ? "issues_found" : "healthy",
        findings,
        durationMs: Date.now() - start,
        lastRun: new Date().toISOString(),
      };
    },
  };
}

/**
 * Detect duplicates: multiple records that should be unique.
 */
export function createDuplicateDetector<T>(config: {
  name: string;
  store: StoreScanner<T>;
  getKey: (item: T) => string;
  label: string;
}): DetectorConfig {
  return {
    name: config.name,
    description: `Detect duplicate ${config.label} records`,
    run: () => {
      const start = Date.now();
      const store = config.store();
      const keyMap = new Map<string, string[]>();

      for (const [id, item] of store) {
        const key = config.getKey(item);
        if (!keyMap.has(key)) keyMap.set(key, []);
        keyMap.get(key)!.push(id);
      }

      const duplicateGroups = Array.from(keyMap.entries())
        .filter(([, ids]) => ids.length > 1);
      const duplicateIds = duplicateGroups.flatMap(([, ids]) => ids);

      const findings: DetectorFinding[] = duplicateGroups.length > 0
        ? [{
            detector: config.name,
            severity: "high" as FindingSeverity,
            message: `Found ${duplicateGroups.length} duplicate ${config.label} group(s) (${duplicateIds.length} total records)`,
            affectedIds: duplicateIds.slice(0, 100),
            timestamp: new Date().toISOString(),
            autoHealable: false,
          }]
        : [];

      return {
        name: config.name,
        status: duplicateGroups.length > 0 ? "issues_found" : "healthy",
        findings,
        durationMs: Date.now() - start,
        lastRun: new Date().toISOString(),
      };
    },
  };
}

// ── Payment-Job Mismatch Detector ──────────────────────────────────────────

/**
 * Cross-reference payment records against job/subscription records.
 * Fires when a payment has no corresponding job/subscription.
 */
export function createPaymentJobMismatchDetector(config: {
  getPayments: () => Map<string, { id: string; customerId: string; businessId?: string; status: string }>;
  getSubscriptions: () => Map<string, { id: string; customerId: string; businessId: string; status: string }>;
}): DetectorConfig {
  return {
    name: "payment_job_mismatch",
    description: "Detect payments without corresponding subscriptions/jobs",
    run: () => {
      const start = Date.now();
      const payments = config.getPayments();
      const subscriptions = config.getSubscriptions();
      const mismatched: string[] = [];

      // Build subscription lookup by customerId
      const subsByCustomer = new Map<string, string[]>();
      for (const [subId, sub] of subscriptions) {
        if (!subsByCustomer.has(sub.customerId)) subsByCustomer.set(sub.customerId, []);
        subsByCustomer.get(sub.customerId)!.push(subId);
      }

      // Check each successful payment has at least one subscription
      for (const [paymentId, payment] of payments) {
        if (payment.status !== "succeeded") continue;
        const customerSubs = subsByCustomer.get(payment.customerId);
        if (!customerSubs || customerSubs.length === 0) {
          mismatched.push(paymentId);
        }
      }

      if (mismatched.length > 0) {
        metrics.increment(METRIC.SYNC_MISMATCH, mismatched.length);
      }

      const findings: DetectorFinding[] = mismatched.length > 0
        ? [{
            detector: "payment_job_mismatch",
            severity: "critical" as FindingSeverity,
            message: `${mismatched.length} successful payment(s) without a corresponding subscription`,
            affectedIds: mismatched.slice(0, 50),
            timestamp: new Date().toISOString(),
            autoHealable: true,
          }]
        : [];

      return {
        name: "payment_job_mismatch",
        status: mismatched.length > 0 ? "issues_found" : "healthy",
        findings,
        durationMs: Date.now() - start,
        lastRun: new Date().toISOString(),
      };
    },
  };
}
