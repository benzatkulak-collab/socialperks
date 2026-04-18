/**
 * Reliability System — Barrel Export
 * ====================================
 *
 * Self-monitoring, self-healing production reliability infrastructure.
 *
 * Architecture:
 *   Metrics → Alerts → Detectors → Self-Healing → Reconciliation
 *
 *   1. Metrics: Counters/histograms/gauges for business + system health
 *   2. Alerts: Threshold-based evaluation with severity and notification
 *   3. Detectors: Automated scan for orphans, stuck jobs, mismatches
 *   4. Self-Healing: Recovery handlers per failure type
 *   5. Reconciliation: Cross-system consistency checks
 *   6. Idempotency: Operation-level duplicate protection
 *   7. Chaos: Controlled failure injection for testing
 */

// ── Metrics ────────────────────────────────────────────────────────────────
export { metrics, METRIC } from "./metrics";
export type { MetricSnapshot, MetricPoint } from "./metrics";

// ── Alerts ─────────────────────────────────────────────────────────────────
export { alertEngine } from "./alerts";
export type { AlertDefinition, ActiveAlert, AlertSeverity, AlertStatus } from "./alerts";

// ── Detectors ──────────────────────────────────────────────────────────────
export {
  registerDetector,
  runAllDetectors,
  runDetector,
  getLastResults,
  createOrphanDetector,
  createStuckDetector,
  createDuplicateDetector,
  createPaymentJobMismatchDetector,
} from "./detectors";
export type { DetectorFinding, DetectorResult } from "./detectors";

// ── Self-Healing ───────────────────────────────────────────────────────────
export {
  registerHealingHandler,
  heal,
  detectAndHeal,
  getHealingLog,
  createStuckJobHealer,
  createOrphanCleaner,
  retryWithBackoff,
} from "./self-healing";
export type { HealingResult, HealingHandler } from "./self-healing";

// ── Reconciliation ─────────────────────────────────────────────────────────
export {
  registerReconciliation,
  runReconciliation,
  runAllReconciliations,
  getReconciliationReports,
  listReconciliationJobs,
  createStoreReconciliation,
} from "./reconciliation";
export type { ReconciliationReport, ReconciliationItem, ReconciliationJob } from "./reconciliation";

// ── Idempotency ────────────────────────────────────────────────────────────
export {
  withIdempotency,
  getIdempotencyKey,
  getCachedResponse,
  generateFingerprint,
} from "./idempotency";

// ── Chaos Testing ──────────────────────────────────────────────────────────
export {
  createExperiment,
  stopExperiment,
  stopAll as stopAllExperiments,
  checkChaos,
  applyChaos,
  listExperiments,
} from "./chaos";
export type { ChaosExperiment, ChaosType, ChaosConfig } from "./chaos";
