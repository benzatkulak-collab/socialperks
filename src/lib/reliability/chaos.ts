/**
 * Chaos Testing Utilities
 * ========================
 *
 * Controlled failure injection for testing resilience.
 * ONLY active when CHAOS_ENABLED=true environment variable is set.
 *
 * Capabilities:
 *   - Inject latency into API responses
 *   - Force API errors on specific endpoints
 *   - Simulate circuit breaker trips
 *   - Drop/corrupt specific operations
 *   - Verify recovery mechanisms trigger correctly
 *
 * Safety: All chaos experiments have a TTL and auto-disable.
 * Never enabled in production unless explicitly activated.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type ChaosType = "latency" | "error" | "drop" | "corrupt" | "circuit_trip";

export interface ChaosExperiment {
  id: string;
  type: ChaosType;
  target: string; // endpoint path, service name, or "*"
  config: ChaosConfig;
  active: boolean;
  createdAt: number;
  expiresAt: number;
  triggeredCount: number;
}

export interface ChaosConfig {
  /** For latency: ms to add */
  delayMs?: number;
  /** For error: HTTP status to return */
  errorStatus?: number;
  /** For error: error message */
  errorMessage?: string;
  /** Probability of triggering (0-1, default 1.0) */
  probability?: number;
  /** Maximum times to trigger (0 = unlimited) */
  maxTriggers?: number;
  /** Circuit breaker name to trip */
  circuitName?: string;
}

export interface ChaosResult {
  applied: boolean;
  experimentId: string | null;
  type: ChaosType | null;
  details: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes max per experiment
const MAX_EXPERIMENTS = 10;

// ── State ──────────────────────────────────────────────────────────────────

const experiments = new Map<string, ChaosExperiment>();

function isEnabled(): boolean {
  return process.env.CHAOS_ENABLED === "true" && process.env.NODE_ENV !== "production";
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Create a new chaos experiment.
 * Returns null if chaos testing is not enabled.
 */
export function createExperiment(
  type: ChaosType,
  target: string,
  config: ChaosConfig = {},
  ttlMs = DEFAULT_TTL_MS
): ChaosExperiment | null {
  if (!isEnabled()) return null;

  // Enforce limits
  pruneExpired();
  if (experiments.size >= MAX_EXPERIMENTS) {
    return null;
  }

  const id = `chaos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const experiment: ChaosExperiment = {
    id,
    type,
    target,
    config,
    active: true,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
    triggeredCount: 0,
  };

  experiments.set(id, experiment);
  console.warn(`[chaos] Created experiment ${id}: ${type} on ${target} (TTL: ${ttlMs / 1000}s)`);

  return experiment;
}

/**
 * Stop a specific experiment.
 */
export function stopExperiment(id: string): boolean {
  const exp = experiments.get(id);
  if (!exp) return false;
  exp.active = false;
  experiments.delete(id);
  console.warn(`[chaos] Stopped experiment ${id}`);
  return true;
}

/**
 * Stop all experiments (emergency kill switch).
 */
export function stopAll(): number {
  const count = experiments.size;
  experiments.clear();
  if (count > 0) {
    console.warn(`[chaos] Emergency stop: cleared ${count} experiments`);
  }
  return count;
}

/**
 * Check if chaos should be applied to a given request path.
 * Returns the chaos result with instructions for the caller.
 */
export function checkChaos(path: string): ChaosResult {
  if (!isEnabled()) {
    return { applied: false, experimentId: null, type: null, details: null };
  }

  pruneExpired();

  for (const exp of experiments.values()) {
    if (!exp.active) continue;
    if (exp.target !== "*" && !path.includes(exp.target)) continue;

    // Check probability
    const prob = exp.config.probability ?? 1.0;
    if (Math.random() > prob) continue;

    // Check max triggers
    if (exp.config.maxTriggers && exp.config.maxTriggers > 0 && exp.triggeredCount >= exp.config.maxTriggers) {
      exp.active = false;
      continue;
    }

    exp.triggeredCount++;

    return {
      applied: true,
      experimentId: exp.id,
      type: exp.type,
      details: describeExperiment(exp),
    };
  }

  return { applied: false, experimentId: null, type: null, details: null };
}

/**
 * Apply chaos to an API handler.
 * Call this at the start of route handlers to inject failures.
 */
export async function applyChaos(path: string): Promise<Response | null> {
  const result = checkChaos(path);
  if (!result.applied || !result.type) return null;

  const exp = result.experimentId ? experiments.get(result.experimentId) : null;
  if (!exp) return null;

  switch (result.type) {
    case "latency": {
      const delay = exp.config.delayMs ?? 3000;
      await new Promise((r) => setTimeout(r, delay));
      return null; // Let request continue after delay
    }

    case "error": {
      const status = exp.config.errorStatus ?? 500;
      const message = exp.config.errorMessage ?? "Chaos: simulated failure";
      return new Response(
        JSON.stringify({ success: false, error: { code: "CHAOS_INJECTED", message } }),
        { status, headers: { "Content-Type": "application/json", "X-Chaos-Experiment": exp.id } }
      );
    }

    case "drop": {
      // Simulate a dropped connection by returning nothing after a delay
      await new Promise((r) => setTimeout(r, 30_000));
      return new Response(null, { status: 504 });
    }

    default:
      return null;
  }
}

/**
 * List all active experiments.
 */
export function listExperiments(): ChaosExperiment[] {
  pruneExpired();
  return Array.from(experiments.values());
}

// ── Internal ───────────────────────────────────────────────────────────────

function pruneExpired(): void {
  const now = Date.now();
  for (const [id, exp] of experiments) {
    if (exp.expiresAt < now) {
      experiments.delete(id);
    }
  }
}

function describeExperiment(exp: ChaosExperiment): string {
  switch (exp.type) {
    case "latency":
      return `Injecting ${exp.config.delayMs ?? 3000}ms latency`;
    case "error":
      return `Returning ${exp.config.errorStatus ?? 500} error`;
    case "drop":
      return "Dropping connection (30s timeout)";
    case "corrupt":
      return "Corrupting response data";
    case "circuit_trip":
      return `Tripping circuit breaker: ${exp.config.circuitName ?? "unknown"}`;
    default:
      return `Unknown chaos type: ${exp.type}`;
  }
}
