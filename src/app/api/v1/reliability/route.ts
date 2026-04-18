/**
 * GET/POST /api/v1/reliability
 *
 * Reliability dashboard API. Admin/enterprise only.
 *
 * GET: Returns full system reliability status.
 *   - Metrics snapshot (business + system)
 *   - Active alerts
 *   - Circuit breaker health
 *   - Detector results
 *   - Healing log
 *   - Reconciliation reports
 *
 * POST actions:
 *   - "run_detectors": Run all failure detectors
 *   - "run_reconciliation": Run reconciliation (optional: name, autoFix)
 *   - "detect_and_heal": Run detectors + auto-heal
 *   - "acknowledge_alert": Acknowledge an alert (requires: alertId)
 *   - "resolve_alert": Resolve an alert (requires: alertId)
 *   - "chaos_create": Create a chaos experiment (dev only)
 *   - "chaos_stop": Stop a chaos experiment
 *   - "chaos_stop_all": Emergency stop all experiments
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
} from "../_shared";

import {
  metrics,
  alertEngine,
  runAllDetectors,
  runDetector,
  detectAndHeal,
  getHealingLog,
  runReconciliation,
  runAllReconciliations,
  getReconciliationReports,
  listReconciliationJobs,
  getLastResults,
  listExperiments,
  createExperiment,
  stopExperiment,
  stopAllExperiments,
} from "@/lib/reliability";
import type { ChaosType, ChaosConfig } from "@/lib/reliability";
import { getCircuitHealth } from "@/lib/resilience";

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  if (user.role !== "admin" && user.role !== "enterprise") {
    return err("FORBIDDEN", "Reliability dashboard requires admin or enterprise role", 403);
  }

  const snapshot = metrics.snapshot();
  const activeAlerts = alertEngine.getActive();
  const alertHistory = alertEngine.getHistory(20);
  const circuitHealth = getCircuitHealth();
  const detectorResults = Object.fromEntries(getLastResults());
  const healingLog = getHealingLog(20);
  const reconciliationReports = getReconciliationReports(10);
  const reconciliationJobs = listReconciliationJobs();
  const chaosExperiments = listExperiments();

  // Compute overall system status
  const criticalAlerts = activeAlerts.filter((a) => a.severity === "critical");
  const openCircuits = Object.values(circuitHealth).filter((c) => c.state === "open");

  let systemStatus: "healthy" | "degraded" | "critical" = "healthy";
  if (criticalAlerts.length > 0 || openCircuits.length > 0) {
    systemStatus = "critical";
  } else if (activeAlerts.length > 0) {
    systemStatus = "degraded";
  }

  return ok({
    systemStatus,
    metrics: snapshot,
    alerts: {
      active: activeAlerts,
      history: alertHistory,
    },
    circuits: circuitHealth,
    detectors: detectorResults,
    healing: healingLog,
    reconciliation: {
      jobs: reconciliationJobs,
      recentReports: reconciliationReports,
    },
    chaos: chaosExperiments,
    serverTime: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  if (user.role !== "admin" && user.role !== "enterprise") {
    return err("FORBIDDEN", "Reliability actions require admin or enterprise role", 403);
  }

  const body = await parseBody<{
    action: string;
    name?: string;
    alertId?: string;
    autoFix?: boolean;
    // Chaos fields
    chaosType?: ChaosType;
    chaosTarget?: string;
    chaosConfig?: ChaosConfig;
    chaosTtlMs?: number;
    experimentId?: string;
  }>(req);
  if (body instanceof Response) return body;

  switch (body.action) {
    case "run_detectors": {
      const results = body.name ? (() => {
        const r = runDetector(body.name!);
        return r ? [r] : [];
      })() : runAllDetectors();
      return ok({ results });
    }

    case "run_reconciliation": {
      if (body.name) {
        const report = await runReconciliation(body.name, body.autoFix ?? false);
        if (!report) return err("NOT_FOUND", `Reconciliation job '${body.name}' not found`, 404);
        return ok({ report });
      }
      const reports = await runAllReconciliations(body.autoFix ?? false);
      return ok({ reports });
    }

    case "detect_and_heal": {
      const results = await detectAndHeal((name) => runDetector(name));
      return ok({ results, healingLog: getHealingLog(20) });
    }

    case "acknowledge_alert": {
      if (!body.alertId) return err("MISSING_ALERT_ID", "alertId is required", 400);
      const acknowledged = alertEngine.acknowledge(body.alertId);
      return ok({ acknowledged });
    }

    case "resolve_alert": {
      if (!body.alertId) return err("MISSING_ALERT_ID", "alertId is required", 400);
      const resolved = alertEngine.resolve(body.alertId);
      return ok({ resolved });
    }

    case "chaos_create": {
      if (!body.chaosType || !body.chaosTarget) {
        return err("MISSING_FIELDS", "chaosType and chaosTarget are required", 400);
      }
      const experiment = createExperiment(
        body.chaosType,
        body.chaosTarget,
        body.chaosConfig ?? {},
        body.chaosTtlMs
      );
      if (!experiment) {
        return err("CHAOS_DISABLED", "Chaos testing is not enabled (set CHAOS_ENABLED=true in non-production)", 400);
      }
      return ok({ experiment }, 201);
    }

    case "chaos_stop": {
      if (!body.experimentId) return err("MISSING_EXPERIMENT_ID", "experimentId is required", 400);
      const stopped = stopExperiment(body.experimentId);
      return ok({ stopped });
    }

    case "chaos_stop_all": {
      const count = stopAllExperiments();
      return ok({ stoppedCount: count });
    }

    default:
      return err(
        "INVALID_ACTION",
        `Unknown action: '${body.action}'. Valid: run_detectors, run_reconciliation, detect_and_heal, acknowledge_alert, resolve_alert, chaos_create, chaos_stop, chaos_stop_all`,
        400
      );
  }
});
