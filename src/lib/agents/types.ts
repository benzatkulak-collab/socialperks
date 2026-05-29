/**
 * Agent control plane — shared types.
 *
 * An "agent" is a backend worker that periodically scans state, scores
 * candidates, and takes (or proposes) an action. Each agent is registered
 * with the AgentRegistry and surfaced in the /admin/agents UI.
 *
 * Design principles:
 *   1. Dry-run by default. New agents start with `mode: "dry-run"` and
 *      only log proposed decisions; they never mutate state. An admin
 *      flips `mode: "live"` once they've inspected the decision log.
 *   2. Every decision is audited. Pass or no-op decisions are logged
 *      too so we can measure the agent's actual behavior.
 *   3. Configurable thresholds. Each agent declares its tunable knobs
 *      and the UI exposes sliders bound to them.
 *   4. Manual override. Admin can pause an agent or invoke a one-shot
 *      run from the UI at any time.
 */

export type AgentMode = "off" | "dry-run" | "live";
export type AgentStatus = "idle" | "running" | "errored";
/**
 * Autonomy level (informational taxonomy):
 *   1 — observe & alert (read-only)
 *   2 — propose (flags items, logs only)
 *   3 — act on safe cases, escalate the rest
 *   4 — autonomous consequential action within guardrails
 *   5 — fully autonomous; reserved for idempotent / self-healing /
 *       event-bound actions where a wrong run is cheap and self-correcting
 */
export type AgentLevel = 1 | 2 | 3 | 4 | 5;

export interface AgentDecision {
  /** Stable id for the decision (e.g. resource id this is about). */
  targetId: string;
  /** Short verb describing what the agent wanted to do. */
  action: string;
  /** 0–1 confidence score; the threshold gate uses this. */
  confidence: number;
  /** Whether the action was actually executed (false in dry-run). */
  executed: boolean;
  /** Free-form context for audit + debugging. */
  reason: string;
  meta?: Record<string, unknown>;
}

export interface AgentRunReport {
  agentId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  scanned: number;
  decisions: AgentDecision[];
  errored: boolean;
  error?: string;
}

/**
 * Shape every agent implements.
 */
export interface Agent {
  /** Stable id used in URLs, audit logs, registry lookups. */
  id: string;
  /** Human label for the UI. */
  name: string;
  /** One-line description shown in the agent card. */
  description: string;
  /** Autonomy level (see AgentLevel). Optional/informational; not enforced. */
  level?: AgentLevel;
  /** Default mode if the registry has no override. */
  defaultMode: AgentMode;
  /** Suggested run interval in seconds (informational; the scheduler may override). */
  intervalSeconds: number;
  /** Declared tunable knobs. Used to render the config form. */
  config: AgentConfigSpec;
  /** Implementation: scan + return decisions. Must be safe to call any time. */
  run: (ctx: AgentRunContext) => Promise<AgentDecision[]>;
}

export interface AgentConfigSpec {
  /** Action confidence threshold — actions below this are queued for human review, not auto-executed. */
  threshold: { min: number; max: number; default: number; step: number };
  /** Max actions per run (rate-limit on the agent itself). */
  maxActionsPerRun: { min: number; max: number; default: number };
  /** Agent-specific extras — string-keyed numeric knobs. */
  custom?: Record<string, { label: string; min: number; max: number; default: number; step: number }>;
}

export interface AgentConfigValues {
  threshold: number;
  maxActionsPerRun: number;
  custom: Record<string, number>;
}

export interface AgentRunContext {
  /** Whether to actually execute side effects (false = dry-run). */
  live: boolean;
  /** Resolved config values from the registry. */
  config: AgentConfigValues;
  /** ISO timestamp of run start. */
  now: string;
}

export interface AgentState {
  id: string;
  mode: AgentMode;
  status: AgentStatus;
  config: AgentConfigValues;
  lastRunAt: string | null;
  lastReport: AgentRunReport | null;
  /** Last-N recent decisions across runs (capped). */
  recentDecisions: Array<AgentDecision & { runAt: string }>;
}
