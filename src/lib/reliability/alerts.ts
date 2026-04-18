/**
 * Alert Engine
 * ============
 *
 * Threshold-based alerting that evaluates metrics and fires notifications.
 * Runs on a configurable interval. Supports critical/high/medium severity.
 *
 * Alert lifecycle: firing -> acknowledged -> resolved
 * Deduplication: same alert won't re-fire while already active.
 */

import { metrics, METRIC } from "./metrics";
import { getCircuitHealth } from "@/lib/resilience";

// ── Types ──────────────────────────────────────────────────────────────────

export type AlertSeverity = "critical" | "high" | "medium";
export type AlertStatus = "firing" | "acknowledged" | "resolved";

export interface AlertDefinition {
  id: string;
  name: string;
  severity: AlertSeverity;
  description: string;
  /** Evaluator returns a string (reason) if alert should fire, null otherwise */
  evaluate: () => string | null;
  /** Suggested remediation */
  suggestedAction: string;
}

export interface ActiveAlert {
  id: string;
  definitionId: string;
  severity: AlertSeverity;
  name: string;
  reason: string;
  suggestedAction: string;
  status: AlertStatus;
  firedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

type AlertHandler = (alert: ActiveAlert) => void;

// ── Alert Engine ───────────────────────────────────────────────────────────

class AlertEngine {
  private definitions: AlertDefinition[] = [];
  private activeAlerts = new Map<string, ActiveAlert>();
  private alertHistory: ActiveAlert[] = [];
  private handlers: AlertHandler[] = [];
  private evaluationInterval: ReturnType<typeof setInterval> | null = null;
  private alertIdCounter = 0;

  // ── Registration ─────────────────────────────────────────────────────

  register(definition: AlertDefinition): void {
    this.definitions.push(definition);
  }

  onAlert(handler: AlertHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx !== -1) this.handlers.splice(idx, 1);
    };
  }

  // ── Evaluation ───────────────────────────────────────────────────────

  evaluate(): ActiveAlert[] {
    const newAlerts: ActiveAlert[] = [];

    for (const def of this.definitions) {
      const reason = def.evaluate();

      if (reason) {
        // Check if already firing
        if (this.activeAlerts.has(def.id)) continue;

        const alert: ActiveAlert = {
          id: `alert_${++this.alertIdCounter}_${Date.now()}`,
          definitionId: def.id,
          severity: def.severity,
          name: def.name,
          reason,
          suggestedAction: def.suggestedAction,
          status: "firing",
          firedAt: new Date().toISOString(),
          acknowledgedAt: null,
          resolvedAt: null,
        };

        this.activeAlerts.set(def.id, alert);
        this.alertHistory.push(alert);
        newAlerts.push(alert);

        // Notify handlers
        for (const handler of this.handlers) {
          try {
            handler(alert);
          } catch {
            // Alert handlers must not throw
          }
        }

        console.error(`[ALERT:${def.severity.toUpperCase()}] ${def.name}: ${reason}`);
      } else {
        // Auto-resolve if condition cleared
        const existing = this.activeAlerts.get(def.id);
        if (existing && existing.status !== "resolved") {
          existing.status = "resolved";
          existing.resolvedAt = new Date().toISOString();
          this.activeAlerts.delete(def.id);
        }
      }
    }

    // Trim history
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-500);
    }

    return newAlerts;
  }

  // ── Management ───────────────────────────────────────────────────────

  acknowledge(definitionId: string): boolean {
    const alert = this.activeAlerts.get(definitionId);
    if (!alert) return false;
    alert.status = "acknowledged";
    alert.acknowledgedAt = new Date().toISOString();
    return true;
  }

  resolve(definitionId: string): boolean {
    const alert = this.activeAlerts.get(definitionId);
    if (!alert) return false;
    alert.status = "resolved";
    alert.resolvedAt = new Date().toISOString();
    this.activeAlerts.delete(definitionId);
    return true;
  }

  getActive(): ActiveAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  getHistory(limit = 50): ActiveAlert[] {
    return this.alertHistory.slice(-limit);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  start(intervalMs = 30_000): void {
    if (this.evaluationInterval) return;
    this.evaluationInterval = setInterval(() => this.evaluate(), intervalMs);
    // Run initial evaluation
    this.evaluate();
  }

  stop(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────

export const alertEngine = new AlertEngine();

// ── Default Alert Definitions ──────────────────────────────────────────────

const DEFAULT_ALERTS: AlertDefinition[] = [
  // ── CRITICAL ─────────────────────────────────────────────────────────
  {
    id: "payment_no_job",
    name: "Payment succeeded but no job created",
    severity: "critical",
    description: "A payment was recorded but the corresponding job/subscription was not created",
    evaluate: () => {
      const payments = metrics.getCounter(METRIC.PAYMENT_SUCCESS);
      const jobs = metrics.getCounter(METRIC.JOB_CREATED);
      // If payments are flowing but jobs aren't being created at a similar rate
      if (payments.windowRate > 0 && jobs.windowRate === 0 && payments.total > jobs.total) {
        return `${payments.total} payments vs ${jobs.total} jobs created (${payments.total - jobs.total} gap)`;
      }
      return null;
    },
    suggestedAction: "Check billing webhook handler. Verify Stripe webhook delivery. Review processedEvents map for stuck entries.",
  },
  {
    id: "api_error_spike",
    name: "API error rate exceeds 10%",
    severity: "critical",
    description: "More than 10% of API requests are failing",
    evaluate: () => {
      const requests = metrics.getCounter(METRIC.API_REQUEST);
      const errors = metrics.getCounter(METRIC.API_ERROR);
      if (requests.windowRate > 0.1) {
        const errorRate = errors.windowRate / requests.windowRate;
        if (errorRate > 0.1) {
          return `Error rate: ${(errorRate * 100).toFixed(1)}% (${errors.windowRate.toFixed(1)}/s errors out of ${requests.windowRate.toFixed(1)}/s requests)`;
        }
      }
      return null;
    },
    suggestedAction: "Check API logs for common error codes. Review recent deployments. Check external service health (Stripe, Resend).",
  },
  {
    id: "auth_failure_spike",
    name: "Authentication failure spike",
    severity: "critical",
    description: "Abnormal number of auth failures — possible brute force or credential stuffing",
    evaluate: () => {
      const failures = metrics.getCounter(METRIC.AUTH_FAILURE);
      // More than 1 auth failure per second sustained
      if (failures.windowRate > 1) {
        return `${failures.windowRate.toFixed(1)} auth failures/sec in the last 5 minutes`;
      }
      return null;
    },
    suggestedAction: "Check if IPs are concentrated (possible attack). Review rate limiter effectiveness. Consider temporary IP blocking.",
  },
  {
    id: "circuit_breaker_open",
    name: "Circuit breaker is open",
    severity: "critical",
    description: "An external service circuit breaker has tripped open",
    evaluate: () => {
      const health = getCircuitHealth();
      const openCircuits = Object.entries(health)
        .filter(([, v]) => v.state === "open")
        .map(([name]) => name);
      if (openCircuits.length > 0) {
        return `Open circuits: ${openCircuits.join(", ")}`;
      }
      return null;
    },
    suggestedAction: "Check external service status pages. Review circuit breaker stats for failure patterns. Manual reset available via admin API.",
  },

  // ── HIGH PRIORITY ────────────────────────────────────────────────────
  {
    id: "api_latency_high",
    name: "API latency exceeds threshold",
    severity: "high",
    description: "P95 API latency is above 2 seconds",
    evaluate: () => {
      const latency = metrics.getHistogram(METRIC.API_LATENCY);
      if (latency.count > 10 && latency.p95 > 2000) {
        return `P95 latency: ${latency.p95.toFixed(0)}ms (avg: ${latency.avg.toFixed(0)}ms)`;
      }
      return null;
    },
    suggestedAction: "Check slow endpoints in API logs. Review database query performance. Check for memory pressure.",
  },
  {
    id: "retry_rate_high",
    name: "Elevated job retry rate",
    severity: "high",
    description: "More than 20% of queue jobs are being retried",
    evaluate: () => {
      const retries = metrics.getCounter(METRIC.QUEUE_RETRY);
      const created = metrics.getCounter(METRIC.JOB_CREATED);
      if (created.windowRate > 0) {
        const retryRate = retries.windowRate / created.windowRate;
        if (retryRate > 0.2) {
          return `Retry rate: ${(retryRate * 100).toFixed(1)}%`;
        }
      }
      return null;
    },
    suggestedAction: "Check dead letter queue for failed jobs. Review job processor error logs. Verify external service availability.",
  },
  {
    id: "data_mismatch",
    name: "Cross-system data mismatch detected",
    severity: "high",
    description: "Reconciliation found mismatched records between systems",
    evaluate: () => {
      const mismatches = metrics.getCounter(METRIC.SYNC_MISMATCH);
      if (mismatches.windowRate > 0) {
        return `${mismatches.windowRate.toFixed(2)} mismatches/sec detected in last 5 minutes`;
      }
      return null;
    },
    suggestedAction: "Run full reconciliation via /api/v1/reliability. Review reconciliation log for affected records.",
  },

  // ── MEDIUM ───────────────────────────────────────────────────────────
  {
    id: "rate_limit_frequent",
    name: "Frequent rate limiting",
    severity: "medium",
    description: "Rate limits are being hit frequently — possible misconfigured client or light abuse",
    evaluate: () => {
      const hits = metrics.getCounter(METRIC.RATE_LIMIT_HIT);
      // More than 0.5 rate limit hits per second
      if (hits.windowRate > 0.5) {
        return `${hits.windowRate.toFixed(1)} rate limit hits/sec`;
      }
      return null;
    },
    suggestedAction: "Review rate-limited IPs. Check if a client is misconfigured (infinite retry loops). Consider adjusting rate limit tiers.",
  },
  {
    id: "orphan_records",
    name: "Orphaned records detected",
    severity: "medium",
    description: "Records exist without valid parent references",
    evaluate: () => {
      const orphans = metrics.getCounter(METRIC.ORPHAN_DETECTED);
      if (orphans.total > 0 && orphans.windowRate > 0) {
        return `${orphans.total} orphaned records detected`;
      }
      return null;
    },
    suggestedAction: "Run reconciliation to identify and clean up orphans. Check cascade delete logic.",
  },
];

// Register all defaults
for (const alert of DEFAULT_ALERTS) {
  alertEngine.register(alert);
}
