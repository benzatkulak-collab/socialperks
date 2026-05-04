/**
 * Self-Healing Engine
 * ===================
 *
 * Automated recovery handlers for known failure types.
 * Each handler is idempotent and safe to retry.
 *
 * Recovery strategies:
 *   - retry: Re-attempt the failed operation with backoff
 *   - reconcile: Fix data by applying source-of-truth rules
 *   - escalate: Log and alert when auto-recovery isn't possible
 */

import { metrics, METRIC } from "./metrics";

// ── Types ──────────────────────────────────────────────────────────────────

export type HealingAction = "retry" | "reconcile" | "cleanup" | "escalate";

export interface HealingResult {
  handler: string;
  action: HealingAction;
  success: boolean;
  message: string;
  affectedIds: string[];
  timestamp: string;
  durationMs: number;
}

export interface HealingHandler {
  name: string;
  description: string;
  /** What type of finding this handler can address */
  detectorName: string;
  /** The recovery action */
  action: HealingAction;
  /** Execute recovery. Returns true if successful. */
  execute: (affectedIds: string[]) => Promise<HealingResult>;
}

// ── Self-Healing Registry ──────────────────────────────────────────────────

const handlers = new Map<string, HealingHandler>();
const healingLog: HealingResult[] = [];

export function registerHealingHandler(handler: HealingHandler): void {
  handlers.set(handler.name, handler);
}

/**
 * Execute healing for a specific detector finding.
 */
export async function heal(detectorName: string, affectedIds: string[]): Promise<HealingResult | null> {
  // Find a handler that matches this detector
  for (const handler of handlers.values()) {
    if (handler.detectorName === detectorName) {
      try {
        const result = await handler.execute(affectedIds);
        healingLog.push(result);
        trimLog();

        if (result.success) {
          metrics.increment(METRIC.RECONCILIATION_FIX, result.affectedIds.length);
          console.warn(`[self-heal] ${handler.name}: fixed ${result.affectedIds.length} items`);
        } else {
          console.warn(`[self-heal] ${handler.name}: failed — ${result.message}`);
        }

        return result;
      } catch (e) {
        const errorResult: HealingResult = {
          handler: handler.name,
          action: handler.action,
          success: false,
          message: `Handler threw: ${e instanceof Error ? e.message : String(e)}`,
          affectedIds,
          timestamp: new Date().toISOString(),
          durationMs: 0,
        };
        healingLog.push(errorResult);
        trimLog();
        return errorResult;
      }
    }
  }

  return null; // No handler registered for this detector
}

/**
 * Run detection + healing in sequence for all registered handlers.
 */
export async function detectAndHeal(
  runDetector: (name: string) => { findings: { affectedIds: string[]; autoHealable: boolean }[] } | null
): Promise<HealingResult[]> {
  const results: HealingResult[] = [];

  for (const handler of handlers.values()) {
    const detectorResult = runDetector(handler.detectorName);
    if (!detectorResult) continue;

    for (const finding of detectorResult.findings) {
      if (!finding.autoHealable || finding.affectedIds.length === 0) continue;

      const result = await heal(handler.detectorName, finding.affectedIds);
      if (result) results.push(result);
    }
  }

  return results;
}

export function getHealingLog(limit = 50): HealingResult[] {
  return healingLog.slice(-limit);
}

function trimLog(): void {
  if (healingLog.length > 500) {
    healingLog.splice(0, healingLog.length - 250);
  }
}

// ── Built-in Healing Handlers ──────────────────────────────────────────────

/**
 * Generic stuck-job healer: resets jobs stuck in transient states.
 */
export function createStuckJobHealer(config: {
  name: string;
  detectorName: string;
  getStore: () => Map<string, { status: string }>;
  resetStatus: string;
}): HealingHandler {
  return {
    name: config.name,
    description: `Reset stuck items to '${config.resetStatus}' for reprocessing`,
    detectorName: config.detectorName,
    action: "retry",
    execute: async (affectedIds) => {
      const start = Date.now();
      const store = config.getStore();
      const fixed: string[] = [];

      for (const id of affectedIds) {
        const item = store.get(id);
        if (item) {
          item.status = config.resetStatus;
          fixed.push(id);
        }
      }

      return {
        handler: config.name,
        action: "retry",
        success: fixed.length > 0,
        message: fixed.length > 0
          ? `Reset ${fixed.length} items to '${config.resetStatus}'`
          : "No items found to fix",
        affectedIds: fixed,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
      };
    },
  };
}

/**
 * Generic orphan cleaner: removes child records whose parent no longer exists.
 */
export function createOrphanCleaner(config: {
  name: string;
  detectorName: string;
  getStore: () => Map<string, unknown>;
}): HealingHandler {
  return {
    name: config.name,
    description: "Remove orphaned records",
    detectorName: config.detectorName,
    action: "cleanup",
    execute: async (affectedIds) => {
      const start = Date.now();
      const store = config.getStore();
      const cleaned: string[] = [];

      for (const id of affectedIds) {
        if (store.delete(id)) {
          cleaned.push(id);
        }
      }

      return {
        handler: config.name,
        action: "cleanup",
        success: cleaned.length > 0,
        message: cleaned.length > 0
          ? `Cleaned ${cleaned.length} orphaned records`
          : "No orphans found to clean",
        affectedIds: cleaned,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
      };
    },
  };
}

/**
 * Retry with exponential backoff.
 * Wraps any async operation with safe retry logic.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number; label?: string } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 30_000, label = "operation" } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt === maxAttempts) {
        console.error(`[self-heal:retry] ${label} failed after ${maxAttempts} attempts`, e);
        throw e;
      }

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitter = delay * 0.25 * Math.random();
      console.warn(`[self-heal:retry] ${label} attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay + jitter)}ms`);
      await new Promise((r) => setTimeout(r, delay + jitter));
    }
  }

  throw new Error("Unreachable");
}
