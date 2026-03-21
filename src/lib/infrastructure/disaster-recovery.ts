// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Disaster Recovery & Chaos Engineering
//
// Multi-region failover, automated backups, and chaos testing framework.
// Ensures platform resilience through proactive failure testing and
// rapid recovery capabilities.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Region Types ─────────────────────────────────────────────────────────────

export interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "down";
  latency: number;
  errorRate: number;
  lastCheck: string;
}

export interface Region {
  id: string;
  name: string;
  role: "primary" | "secondary" | "standby";
  status: "active" | "degraded" | "failed" | "failover_in_progress";
  services: ServiceStatus[];
  lastHealthCheck: string;
  replicationLag: number;
}

// ─── Backup Types ─────────────────────────────────────────────────────────────

export interface Backup {
  id: string;
  type: "full" | "incremental" | "point_in_time";
  status: "in_progress" | "completed" | "failed" | "verified";
  sizeBytes: number;
  startedAt: string;
  completedAt: string | null;
  retentionDays: number;
  encryptionKeyId: string;
  verifiedAt: string | null;
}

// ─── Failover Types ───────────────────────────────────────────────────────────

export type FailoverStep =
  | "dns_update"
  | "promote_replica"
  | "verify"
  | "route_traffic";

export type FailoverStepStatus = "pending" | "in_progress" | "completed" | "failed";

export interface FailoverStepDetail {
  step: FailoverStep;
  status: FailoverStepStatus;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

export interface FailoverStatus {
  id: string;
  fromRegion: string;
  toRegion: string;
  status: "in_progress" | "completed" | "cancelled" | "failed";
  isDryRun: boolean;
  steps: FailoverStepDetail[];
  startedAt: string;
  completedAt: string | null;
}

// ─── Chaos Engineering Types ──────────────────────────────────────────────────

export type ChaosExperiment =
  | { type: "kill_service"; serviceName: string; duration: number }
  | { type: "inject_latency"; serviceName: string; latencyMs: number; percentage: number }
  | { type: "inject_error"; serviceName: string; errorRate: number; statusCode: number }
  | { type: "network_partition"; fromRegion: string; toRegion: string; duration: number }
  | { type: "disk_pressure"; serviceName: string; usagePercent: number }
  | { type: "cpu_pressure"; serviceName: string; usagePercent: number };

export type ExperimentStatus = "defined" | "running" | "stopped" | "completed" | "rolled_back";

export interface ExperimentResult {
  experimentId: string;
  type: string;
  startedAt: string;
  endedAt: string;
  hypothesis: string;
  actualBehavior: string;
  passed: boolean;
  impactMetrics: Record<string, number>;
  findings: string[];
}

interface StoredExperiment {
  id: string;
  experiment: ChaosExperiment;
  hypothesis: string;
  status: ExperimentStatus;
  result: ExperimentResult | null;
  createdAt: string;
  startedAt: string | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface DisasterRecoveryConfig {
  /** Threshold in ms before automatic failover is triggered. */
  autoFailoverThresholdMs: number;
  /** Maximum error rate (0-1) before chaos experiment auto-rollback. */
  chaosMaxErrorRate: number;
  /** Latency multiplier before chaos experiment auto-rollback. */
  chaosMaxLatencyMultiplier: number;
  /** Default backup retention in days. */
  defaultRetentionDays: number;
}

const DEFAULT_CONFIG: DisasterRecoveryConfig = {
  autoFailoverThresholdMs: 30_000,
  chaosMaxErrorRate: 0.10,
  chaosMaxLatencyMultiplier: 5,
  defaultRetentionDays: 30,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

let idCounter = 0;

function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

function now(): string {
  return new Date().toISOString();
}

// ─── Default Services ─────────────────────────────────────────────────────────

const DEFAULT_SERVICES: string[] = [
  "api-gateway",
  "campaign-service",
  "auth-service",
  "submission-service",
  "notification-service",
  "analytics-service",
  "ai-engine",
  "cdn",
];

function createDefaultServices(): ServiceStatus[] {
  return DEFAULT_SERVICES.map((name) => ({
    name,
    status: "healthy" as const,
    latency: Math.floor(Math.random() * 50) + 5,
    errorRate: Math.random() * 0.01,
    lastCheck: now(),
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// Region Manager
// ══════════════════════════════════════════════════════════════════════════════

export class RegionManager {
  private regions: Map<string, Region> = new Map();

  /** Add a region to the managed set. */
  addRegion(region: Region): Region {
    if (this.regions.has(region.id)) {
      throw new Error(`Region "${region.id}" already exists`);
    }
    this.regions.set(region.id, { ...region });
    return this.regions.get(region.id)!;
  }

  /** Remove a region by ID. Cannot remove the primary region. */
  removeRegion(regionId: string): void {
    const region = this.regions.get(regionId);
    if (!region) {
      throw new Error(`Region "${regionId}" not found`);
    }
    if (region.role === "primary" && region.status === "active") {
      throw new Error("Cannot remove the active primary region. Initiate failover first.");
    }
    this.regions.delete(regionId);
  }

  /** Get all regions. */
  getRegions(): Region[] {
    return Array.from(this.regions.values());
  }

  /** Get a region by ID. */
  getRegion(regionId: string): Region | undefined {
    return this.regions.get(regionId);
  }

  /** Run health check on all services in a region. Returns updated region. */
  healthCheck(regionId: string): Region {
    const region = this.regions.get(regionId);
    if (!region) {
      throw new Error(`Region "${regionId}" not found`);
    }

    const timestamp = now();
    const updatedServices = region.services.map((service) => {
      // Simulate health check: services retain their current status
      // but get updated check timestamps and slightly varied metrics
      const baseLatency = service.status === "healthy" ? 20 : service.status === "degraded" ? 200 : 5000;
      const jitter = Math.floor(Math.random() * baseLatency * 0.3);
      const latency = baseLatency + jitter;

      const errorRate =
        service.status === "healthy"
          ? Math.random() * 0.01
          : service.status === "degraded"
            ? 0.03 + Math.random() * 0.07
            : 0.5 + Math.random() * 0.5;

      return {
        ...service,
        latency,
        errorRate: Math.round(errorRate * 10000) / 10000,
        lastCheck: timestamp,
      };
    });

    // Derive region status from service health
    const downCount = updatedServices.filter((s) => s.status === "down").length;
    const degradedCount = updatedServices.filter((s) => s.status === "degraded").length;

    let regionStatus = region.status;
    if (region.status !== "failover_in_progress") {
      if (downCount > updatedServices.length / 2) {
        regionStatus = "failed";
      } else if (downCount > 0 || degradedCount > updatedServices.length / 3) {
        regionStatus = "degraded";
      } else {
        regionStatus = "active";
      }
    }

    const updatedRegion: Region = {
      ...region,
      services: updatedServices,
      status: regionStatus,
      lastHealthCheck: timestamp,
    };

    this.regions.set(regionId, updatedRegion);
    return updatedRegion;
  }

  /** Run health checks on all regions. */
  healthCheckAll(): Region[] {
    const regionIds = Array.from(this.regions.keys());
    return regionIds.map((id) => this.healthCheck(id));
  }

  /** Get replication lag between primary and a secondary region. */
  getReplicationLag(secondaryRegionId?: string): number {
    const primary = this.getPrimaryRegion();
    if (!primary) {
      throw new Error("No primary region configured");
    }

    if (secondaryRegionId) {
      const secondary = this.regions.get(secondaryRegionId);
      if (!secondary) {
        throw new Error(`Region "${secondaryRegionId}" not found`);
      }
      return secondary.replicationLag;
    }

    // Return max replication lag across all secondaries
    const secondaries = Array.from(this.regions.values()).filter(
      (r) => r.role === "secondary" || r.role === "standby"
    );
    if (secondaries.length === 0) return 0;
    return Math.max(...secondaries.map((r) => r.replicationLag));
  }

  /** Get the current primary region. */
  getPrimaryRegion(): Region | undefined {
    return Array.from(this.regions.values()).find((r) => r.role === "primary");
  }

  /** Update a service status within a region. Used by chaos experiments. */
  updateServiceStatus(
    regionId: string,
    serviceName: string,
    updates: Partial<ServiceStatus>
  ): void {
    const region = this.regions.get(regionId);
    if (!region) return;

    const updatedServices = region.services.map((s) =>
      s.name === serviceName ? { ...s, ...updates, lastCheck: now() } : s
    );

    this.regions.set(regionId, { ...region, services: updatedServices });
  }

  /** Promote a region to primary role. */
  promoteRegion(regionId: string): void {
    const region = this.regions.get(regionId);
    if (!region) {
      throw new Error(`Region "${regionId}" not found`);
    }

    // Demote current primary
    const currentPrimary = this.getPrimaryRegion();
    if (currentPrimary) {
      this.regions.set(currentPrimary.id, {
        ...currentPrimary,
        role: "secondary",
      });
    }

    this.regions.set(regionId, {
      ...region,
      role: "primary",
      status: "active",
      replicationLag: 0,
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Failover Controller
// ══════════════════════════════════════════════════════════════════════════════

export class FailoverController {
  private currentFailover: FailoverStatus | null = null;
  private failoverHistory: FailoverStatus[] = [];
  private regionManager: RegionManager;
  private config: DisasterRecoveryConfig;

  constructor(regionManager: RegionManager, config: Partial<DisasterRecoveryConfig> = {}) {
    this.regionManager = regionManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Initiate a failover from one region to another. */
  initiateFailover(fromRegionId: string, toRegionId: string): FailoverStatus {
    if (this.currentFailover && this.currentFailover.status === "in_progress") {
      throw new Error("A failover is already in progress. Cancel or complete it first.");
    }

    const fromRegion = this.regionManager.getRegion(fromRegionId);
    const toRegion = this.regionManager.getRegion(toRegionId);

    if (!fromRegion) throw new Error(`Source region "${fromRegionId}" not found`);
    if (!toRegion) throw new Error(`Target region "${toRegionId}" not found`);

    const timestamp = now();

    const steps: FailoverStepDetail[] = [
      { step: "dns_update", status: "pending", startedAt: null, completedAt: null, error: null },
      { step: "promote_replica", status: "pending", startedAt: null, completedAt: null, error: null },
      { step: "verify", status: "pending", startedAt: null, completedAt: null, error: null },
      { step: "route_traffic", status: "pending", startedAt: null, completedAt: null, error: null },
    ];

    this.currentFailover = {
      id: generateId("fo"),
      fromRegion: fromRegionId,
      toRegion: toRegionId,
      status: "in_progress",
      isDryRun: false,
      steps,
      startedAt: timestamp,
      completedAt: null,
    };

    // Mark the source region as failing over
    const updatedFrom = this.regionManager.getRegion(fromRegionId);
    if (updatedFrom) {
      this.regionManager.removeRegion(fromRegionId);
      this.regionManager.addRegion({
        ...updatedFrom,
        status: "failover_in_progress",
      });
    }

    // Begin executing steps
    this.executeSteps();

    return { ...this.currentFailover };
  }

  /** Execute failover steps sequentially (simulated). */
  private executeSteps(): void {
    if (!this.currentFailover || this.currentFailover.status !== "in_progress") return;

    const timestamp = now();

    for (const step of this.currentFailover.steps) {
      if (step.status !== "pending") continue;

      step.status = "in_progress";
      step.startedAt = timestamp;

      // Simulate step execution
      if (this.currentFailover.isDryRun) {
        step.status = "completed";
        step.completedAt = timestamp;
        continue;
      }

      switch (step.step) {
        case "dns_update":
          step.status = "completed";
          step.completedAt = timestamp;
          break;
        case "promote_replica":
          this.regionManager.promoteRegion(this.currentFailover.toRegion);
          step.status = "completed";
          step.completedAt = timestamp;
          break;
        case "verify": {
          const newPrimary = this.regionManager.healthCheck(this.currentFailover.toRegion);
          if (newPrimary.status === "failed") {
            step.status = "failed";
            step.error = "New primary region failed health check after promotion";
            return;
          }
          step.status = "completed";
          step.completedAt = timestamp;
          break;
        }
        case "route_traffic":
          step.status = "completed";
          step.completedAt = timestamp;
          break;
      }
    }
  }

  /** Get current failover status. */
  getFailoverStatus(): FailoverStatus | null {
    return this.currentFailover ? { ...this.currentFailover } : null;
  }

  /** Complete the failover, confirming it succeeded. */
  completeFailover(): FailoverStatus {
    if (!this.currentFailover) {
      throw new Error("No failover in progress");
    }
    if (this.currentFailover.status !== "in_progress") {
      throw new Error(`Cannot complete failover with status "${this.currentFailover.status}"`);
    }

    const hasFailedSteps = this.currentFailover.steps.some((s) => s.status === "failed");
    if (hasFailedSteps) {
      throw new Error("Cannot complete failover: one or more steps failed");
    }

    // Mark any remaining pending steps as completed
    const timestamp = now();
    for (const step of this.currentFailover.steps) {
      if (step.status === "pending" || step.status === "in_progress") {
        step.status = "completed";
        step.completedAt = timestamp;
      }
    }

    this.currentFailover.status = "completed";
    this.currentFailover.completedAt = timestamp;

    this.failoverHistory.push({ ...this.currentFailover });

    const result = { ...this.currentFailover };
    this.currentFailover = null;
    return result;
  }

  /** Cancel an in-progress failover. */
  cancelFailover(): FailoverStatus {
    if (!this.currentFailover) {
      throw new Error("No failover in progress");
    }
    if (this.currentFailover.status !== "in_progress") {
      throw new Error(`Cannot cancel failover with status "${this.currentFailover.status}"`);
    }

    this.currentFailover.status = "cancelled";
    this.currentFailover.completedAt = now();

    // Mark incomplete steps as failed
    for (const step of this.currentFailover.steps) {
      if (step.status === "pending" || step.status === "in_progress") {
        step.status = "failed";
        step.error = "Failover cancelled";
      }
    }

    this.failoverHistory.push({ ...this.currentFailover });

    const result = { ...this.currentFailover };
    this.currentFailover = null;
    return result;
  }

  /** Simulate a failover without actually switching regions. */
  dryRun(fromRegionId: string, toRegionId: string): FailoverStatus {
    if (this.currentFailover && this.currentFailover.status === "in_progress") {
      throw new Error("A failover is already in progress");
    }

    const fromRegion = this.regionManager.getRegion(fromRegionId);
    const toRegion = this.regionManager.getRegion(toRegionId);

    if (!fromRegion) throw new Error(`Source region "${fromRegionId}" not found`);
    if (!toRegion) throw new Error(`Target region "${toRegionId}" not found`);

    const timestamp = now();

    const steps: FailoverStepDetail[] = [
      { step: "dns_update", status: "completed", startedAt: timestamp, completedAt: timestamp, error: null },
      { step: "promote_replica", status: "completed", startedAt: timestamp, completedAt: timestamp, error: null },
      { step: "verify", status: "completed", startedAt: timestamp, completedAt: timestamp, error: null },
      { step: "route_traffic", status: "completed", startedAt: timestamp, completedAt: timestamp, error: null },
    ];

    const dryRunResult: FailoverStatus = {
      id: generateId("fo_dry"),
      fromRegion: fromRegionId,
      toRegion: toRegionId,
      status: "completed",
      isDryRun: true,
      steps,
      startedAt: timestamp,
      completedAt: timestamp,
    };

    this.failoverHistory.push(dryRunResult);
    return dryRunResult;
  }

  /** Check if automatic failover should trigger based on primary health. */
  checkAutoFailover(): FailoverStatus | null {
    const primary = this.regionManager.getPrimaryRegion();
    if (!primary || primary.status !== "failed") return null;

    // Check if we already have an active failover
    if (this.currentFailover && this.currentFailover.status === "in_progress") return null;

    // Check how long the primary has been down
    const lastCheck = new Date(primary.lastHealthCheck).getTime();
    const elapsed = Date.now() - lastCheck;

    if (elapsed < this.config.autoFailoverThresholdMs) return null;

    // Find best secondary to fail over to
    const candidates = this.regionManager
      .getRegions()
      .filter((r) => r.role === "secondary" && r.status === "active")
      .sort((a, b) => a.replicationLag - b.replicationLag);

    if (candidates.length === 0) return null;

    return this.initiateFailover(primary.id, candidates[0].id);
  }

  /** Get history of all failovers. */
  getFailoverHistory(): FailoverStatus[] {
    return [...this.failoverHistory];
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Backup Manager
// ══════════════════════════════════════════════════════════════════════════════

export class BackupManager {
  private backups: Map<string, Backup> = new Map();
  private config: DisasterRecoveryConfig;
  private lastRestoreDurationMs: number | null = null;

  constructor(config: Partial<DisasterRecoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Create a new backup. */
  createBackup(type: Backup["type"]): Backup {
    const timestamp = now();
    const sizeMultiplier = type === "full" ? 1.0 : type === "incremental" ? 0.15 : 0.05;
    const baseSizeBytes = 5_000_000_000; // 5 GB base

    const backup: Backup = {
      id: generateId("bk"),
      type,
      status: "in_progress",
      sizeBytes: Math.floor(baseSizeBytes * sizeMultiplier * (0.8 + Math.random() * 0.4)),
      startedAt: timestamp,
      completedAt: null,
      retentionDays: this.config.defaultRetentionDays,
      encryptionKeyId: generateId("key"),
      verifiedAt: null,
    };

    this.backups.set(backup.id, backup);

    // Simulate immediate completion for in-memory operations
    const completedBackup: Backup = {
      ...backup,
      status: "completed",
      completedAt: now(),
    };
    this.backups.set(backup.id, completedBackup);

    return completedBackup;
  }

  /** Restore a backup to a target region. Returns updated backup. */
  restoreBackup(backupId: string, _targetRegion: string): Backup {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new Error(`Backup "${backupId}" not found`);
    }
    if (backup.status !== "completed" && backup.status !== "verified") {
      throw new Error(`Cannot restore backup with status "${backup.status}"`);
    }

    // Simulate restore time based on size
    const restoreDurationMs = Math.floor(backup.sizeBytes / 100_000); // ~50s per 5GB
    this.lastRestoreDurationMs = restoreDurationMs;

    return { ...backup };
  }

  /** Verify backup integrity via checksum simulation. */
  verifyBackup(backupId: string): Backup {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new Error(`Backup "${backupId}" not found`);
    }
    if (backup.status !== "completed") {
      throw new Error(`Cannot verify backup with status "${backup.status}"`);
    }

    const verifiedBackup: Backup = {
      ...backup,
      status: "verified",
      verifiedAt: now(),
    };
    this.backups.set(backupId, verifiedBackup);

    return verifiedBackup;
  }

  /** List backups with optional filtering. */
  listBackups(filters?: {
    type?: Backup["type"];
    status?: Backup["status"];
    since?: string;
  }): Backup[] {
    let results = Array.from(this.backups.values());

    if (filters?.type) {
      results = results.filter((b) => b.type === filters.type);
    }
    if (filters?.status) {
      results = results.filter((b) => b.status === filters.status);
    }
    if (filters?.since) {
      const sinceDate = new Date(filters.since).getTime();
      results = results.filter((b) => new Date(b.startedAt).getTime() >= sinceDate);
    }

    return results.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  /** Delete backups that have exceeded their retention period. */
  enforceRetention(): { deleted: number; retained: number } {
    const nowMs = Date.now();
    let deleted = 0;
    let retained = 0;

    for (const [id, backup] of this.backups.entries()) {
      const expiresAt = new Date(backup.startedAt).getTime() + backup.retentionDays * 86_400_000;
      if (nowMs > expiresAt) {
        this.backups.delete(id);
        deleted++;
      } else {
        retained++;
      }
    }

    return { deleted, retained };
  }

  /** Calculate actual Recovery Point Objective from backup history. */
  getRecoveryPointObjective(): { rpoMs: number; lastBackupAt: string | null } {
    const completedBackups = Array.from(this.backups.values())
      .filter((b) => b.status === "completed" || b.status === "verified")
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    if (completedBackups.length === 0) {
      return { rpoMs: Infinity, lastBackupAt: null };
    }

    const lastBackupTime = new Date(completedBackups[0].startedAt).getTime();
    const rpoMs = Date.now() - lastBackupTime;

    return { rpoMs, lastBackupAt: completedBackups[0].startedAt };
  }

  /** Estimate Recovery Time Objective from last restore test. */
  getRecoveryTimeObjective(): { rtoMs: number; basedOnRestore: boolean } {
    if (this.lastRestoreDurationMs !== null) {
      // Add 20% overhead for DNS, verification, traffic routing
      const rtoMs = Math.floor(this.lastRestoreDurationMs * 1.2);
      return { rtoMs, basedOnRestore: true };
    }

    // Estimate from largest completed backup
    const completedBackups = Array.from(this.backups.values())
      .filter((b) => b.status === "completed" || b.status === "verified")
      .sort((a, b) => b.sizeBytes - a.sizeBytes);

    if (completedBackups.length === 0) {
      return { rtoMs: 0, basedOnRestore: false };
    }

    // Rough estimate: 1ms per 100KB restored + 20% overhead
    const estimatedMs = Math.floor((completedBackups[0].sizeBytes / 100_000) * 1.2);
    return { rtoMs: estimatedMs, basedOnRestore: false };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Chaos Engineering Framework
// ══════════════════════════════════════════════════════════════════════════════

export class ChaosRunner {
  private experiments: Map<string, StoredExperiment> = new Map();
  private regionManager: RegionManager;
  private config: DisasterRecoveryConfig;
  /** Snapshot of service states before experiment, keyed by experimentId. */
  private preExperimentSnapshots: Map<string, Map<string, ServiceStatus>> = new Map();

  constructor(regionManager: RegionManager, config: Partial<DisasterRecoveryConfig> = {}) {
    this.regionManager = regionManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Define a new chaos experiment with a hypothesis. */
  defineExperiment(experiment: ChaosExperiment, hypothesis: string): string {
    const id = generateId("chaos");
    const stored: StoredExperiment = {
      id,
      experiment,
      hypothesis,
      status: "defined",
      result: null,
      createdAt: now(),
      startedAt: null,
    };
    this.experiments.set(id, stored);
    return id;
  }

  /** Run a defined chaos experiment. */
  runExperiment(experimentId: string): ExperimentResult {
    const stored = this.experiments.get(experimentId);
    if (!stored) {
      throw new Error(`Experiment "${experimentId}" not found`);
    }
    if (stored.status === "running") {
      throw new Error(`Experiment "${experimentId}" is already running`);
    }

    stored.status = "running";
    stored.startedAt = now();

    // Snapshot current service states for rollback
    this.snapshotServices(experimentId);

    // Apply the chaos
    const impactMetrics: Record<string, number> = {};
    const findings: string[] = [];
    let passed = true;

    try {
      switch (stored.experiment.type) {
        case "kill_service": {
          const { serviceName, duration } = stored.experiment;
          this.applyToAllRegions(serviceName, { status: "down", latency: 0, errorRate: 1.0 });
          impactMetrics["affected_service"] = 1;
          impactMetrics["duration_ms"] = duration;
          impactMetrics["error_rate"] = 1.0;
          findings.push(`Service "${serviceName}" was killed for ${duration}ms`);

          // Safety check: auto-rollback if error rate exceeds threshold
          if (this.shouldAutoRollback(serviceName)) {
            this.rollbackExperiment(experimentId);
            findings.push("Auto-rollback triggered: error rate exceeded safety threshold");
            passed = false;
          }
          break;
        }

        case "inject_latency": {
          const { serviceName, latencyMs, percentage } = stored.experiment;
          const baseLatency = this.getBaselineLatency(serviceName);
          const effectiveLatency = baseLatency + latencyMs;

          this.applyToAllRegions(serviceName, {
            status: effectiveLatency > baseLatency * this.config.chaosMaxLatencyMultiplier
              ? "degraded"
              : "healthy",
            latency: effectiveLatency,
          });

          impactMetrics["injected_latency_ms"] = latencyMs;
          impactMetrics["percentage_affected"] = percentage;
          impactMetrics["effective_latency_ms"] = effectiveLatency;
          findings.push(
            `Injected ${latencyMs}ms latency to ${percentage}% of "${serviceName}" traffic`
          );

          if (effectiveLatency > baseLatency * this.config.chaosMaxLatencyMultiplier) {
            this.rollbackExperiment(experimentId);
            findings.push("Auto-rollback triggered: latency exceeded 5x normal");
            passed = false;
          }
          break;
        }

        case "inject_error": {
          const { serviceName, errorRate, statusCode } = stored.experiment;
          this.applyToAllRegions(serviceName, {
            status: errorRate > 0.05 ? "degraded" : "healthy",
            errorRate,
          });

          impactMetrics["error_rate"] = errorRate;
          impactMetrics["status_code"] = statusCode;
          findings.push(
            `Injected ${(errorRate * 100).toFixed(1)}% error rate (HTTP ${statusCode}) to "${serviceName}"`
          );

          if (errorRate > this.config.chaosMaxErrorRate) {
            this.rollbackExperiment(experimentId);
            findings.push("Auto-rollback triggered: error rate exceeded 10% threshold");
            passed = false;
          }
          break;
        }

        case "network_partition": {
          const { fromRegion, toRegion, duration } = stored.experiment;
          const fromReg = this.regionManager.getRegion(fromRegion);
          const toReg = this.regionManager.getRegion(toRegion);

          if (!fromReg || !toReg) {
            findings.push("Region not found, experiment aborted");
            passed = false;
            break;
          }

          // Simulate network partition by increasing replication lag dramatically
          if (toReg.role !== "primary") {
            this.regionManager.removeRegion(toRegion);
            this.regionManager.addRegion({
              ...toReg,
              replicationLag: 999_999,
              status: "degraded",
            });
          }

          impactMetrics["duration_ms"] = duration;
          impactMetrics["replication_lag_ms"] = 999_999;
          findings.push(
            `Network partition created between "${fromRegion}" and "${toRegion}" for ${duration}ms`
          );
          break;
        }

        case "disk_pressure": {
          const { serviceName, usagePercent } = stored.experiment;
          const status = usagePercent > 90 ? "degraded" : "healthy";
          const latencyIncrease = Math.floor(usagePercent * 2);

          this.applyToAllRegions(serviceName, {
            status,
            latency: 20 + latencyIncrease,
          });

          impactMetrics["disk_usage_percent"] = usagePercent;
          impactMetrics["latency_increase_ms"] = latencyIncrease;
          findings.push(
            `Disk pressure at ${usagePercent}% applied to "${serviceName}"`
          );
          break;
        }

        case "cpu_pressure": {
          const { serviceName, usagePercent } = stored.experiment;
          const status = usagePercent > 85 ? "degraded" : "healthy";
          const latencyMultiplier = 1 + (usagePercent / 100) * 4;
          const baseLatency = this.getBaselineLatency(serviceName);
          const effectiveLatency = Math.floor(baseLatency * latencyMultiplier);

          this.applyToAllRegions(serviceName, {
            status,
            latency: effectiveLatency,
          });

          impactMetrics["cpu_usage_percent"] = usagePercent;
          impactMetrics["latency_multiplier"] = Math.round(latencyMultiplier * 100) / 100;
          findings.push(
            `CPU pressure at ${usagePercent}% applied to "${serviceName}" (${latencyMultiplier.toFixed(1)}x latency)`
          );
          break;
        }
      }
    } catch (error) {
      findings.push(`Experiment error: ${error instanceof Error ? error.message : String(error)}`);
      passed = false;
    }

    const result: ExperimentResult = {
      experimentId,
      type: stored.experiment.type,
      startedAt: stored.startedAt!,
      endedAt: now(),
      hypothesis: stored.hypothesis,
      actualBehavior: findings.join("; "),
      passed,
      impactMetrics,
      findings,
    };

    stored.result = result;
    stored.status = passed ? "completed" : "rolled_back";
    return result;
  }

  /** Monitor ongoing experiment metrics. */
  monitorExperiment(experimentId: string): {
    experimentId: string;
    status: ExperimentStatus;
    currentMetrics: Record<string, number>;
  } {
    const stored = this.experiments.get(experimentId);
    if (!stored) {
      throw new Error(`Experiment "${experimentId}" not found`);
    }

    const currentMetrics: Record<string, number> = {};
    const regions = this.regionManager.getRegions();

    // Collect current metrics across all regions
    let totalLatency = 0;
    let totalErrorRate = 0;
    let serviceCount = 0;

    for (const region of regions) {
      for (const service of region.services) {
        totalLatency += service.latency;
        totalErrorRate += service.errorRate;
        serviceCount++;
      }
    }

    if (serviceCount > 0) {
      currentMetrics["avg_latency_ms"] = Math.round(totalLatency / serviceCount);
      currentMetrics["avg_error_rate"] =
        Math.round((totalErrorRate / serviceCount) * 10000) / 10000;
      currentMetrics["total_services"] = serviceCount;
      currentMetrics["healthy_services"] = regions.reduce(
        (sum, r) => sum + r.services.filter((s) => s.status === "healthy").length,
        0
      );
      currentMetrics["degraded_services"] = regions.reduce(
        (sum, r) => sum + r.services.filter((s) => s.status === "degraded").length,
        0
      );
      currentMetrics["down_services"] = regions.reduce(
        (sum, r) => sum + r.services.filter((s) => s.status === "down").length,
        0
      );
    }

    return {
      experimentId,
      status: stored.status,
      currentMetrics,
    };
  }

  /** Stop a running experiment and restore original state. */
  stopExperiment(experimentId: string): ExperimentResult | null {
    const stored = this.experiments.get(experimentId);
    if (!stored) {
      throw new Error(`Experiment "${experimentId}" not found`);
    }
    if (stored.status !== "running") {
      throw new Error(`Experiment "${experimentId}" is not running (status: ${stored.status})`);
    }

    this.rollbackExperiment(experimentId);
    stored.status = "stopped";

    if (!stored.result) {
      stored.result = {
        experimentId,
        type: stored.experiment.type,
        startedAt: stored.startedAt || now(),
        endedAt: now(),
        hypothesis: stored.hypothesis,
        actualBehavior: "Experiment stopped manually before completion",
        passed: false,
        impactMetrics: {},
        findings: ["Experiment stopped by operator"],
      };
    }

    return stored.result;
  }

  /** Get results for a completed experiment. */
  getResults(experimentId: string): ExperimentResult | null {
    const stored = this.experiments.get(experimentId);
    if (!stored) {
      throw new Error(`Experiment "${experimentId}" not found`);
    }
    return stored.result;
  }

  /** List all experiments, optionally filtered by status. */
  listExperiments(status?: ExperimentStatus): StoredExperiment[] {
    let results = Array.from(this.experiments.values());
    if (status) {
      results = results.filter((e) => e.status === status);
    }
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private snapshotServices(experimentId: string): void {
    const snapshot = new Map<string, ServiceStatus>();
    for (const region of this.regionManager.getRegions()) {
      for (const service of region.services) {
        const key = `${region.id}:${service.name}`;
        snapshot.set(key, { ...service });
      }
    }
    this.preExperimentSnapshots.set(experimentId, snapshot);
  }

  private rollbackExperiment(experimentId: string): void {
    const snapshot = this.preExperimentSnapshots.get(experimentId);
    if (!snapshot) return;

    for (const [key, service] of snapshot.entries()) {
      const [regionId, serviceName] = key.split(":");
      this.regionManager.updateServiceStatus(regionId, serviceName, {
        status: service.status,
        latency: service.latency,
        errorRate: service.errorRate,
      });
    }

    this.preExperimentSnapshots.delete(experimentId);
  }

  private applyToAllRegions(
    serviceName: string,
    updates: Partial<ServiceStatus>
  ): void {
    for (const region of this.regionManager.getRegions()) {
      this.regionManager.updateServiceStatus(region.id, serviceName, updates);
    }
  }

  private getBaselineLatency(serviceName: string): number {
    const regions = this.regionManager.getRegions();
    for (const region of regions) {
      const service = region.services.find((s) => s.name === serviceName);
      if (service) return service.latency;
    }
    return 50; // default baseline
  }

  private shouldAutoRollback(serviceName: string): boolean {
    for (const region of this.regionManager.getRegions()) {
      const service = region.services.find((s) => s.name === serviceName);
      if (service && service.errorRate > this.config.chaosMaxErrorRate) {
        return true;
      }
    }
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Factory — Quick Setup
// ══════════════════════════════════════════════════════════════════════════════

/** Create a fully initialized disaster recovery system with default multi-region setup. */
export function createDisasterRecoverySystem(
  config: Partial<DisasterRecoveryConfig> = {}
): {
  regionManager: RegionManager;
  failoverController: FailoverController;
  backupManager: BackupManager;
  chaosRunner: ChaosRunner;
} {
  const regionManager = new RegionManager();

  // Set up default regions
  regionManager.addRegion({
    id: "us-east-1",
    name: "us-east-1",
    role: "primary",
    status: "active",
    services: createDefaultServices(),
    lastHealthCheck: now(),
    replicationLag: 0,
  });

  regionManager.addRegion({
    id: "us-west-2",
    name: "us-west-2",
    role: "secondary",
    status: "active",
    services: createDefaultServices(),
    lastHealthCheck: now(),
    replicationLag: 45,
  });

  regionManager.addRegion({
    id: "eu-west-1",
    name: "eu-west-1",
    role: "secondary",
    status: "active",
    services: createDefaultServices(),
    lastHealthCheck: now(),
    replicationLag: 120,
  });

  regionManager.addRegion({
    id: "ap-southeast-1",
    name: "ap-southeast-1",
    role: "standby",
    status: "active",
    services: createDefaultServices(),
    lastHealthCheck: now(),
    replicationLag: 200,
  });

  const failoverController = new FailoverController(regionManager, config);
  const backupManager = new BackupManager(config);
  const chaosRunner = new ChaosRunner(regionManager, config);

  return { regionManager, failoverController, backupManager, chaosRunner };
}
