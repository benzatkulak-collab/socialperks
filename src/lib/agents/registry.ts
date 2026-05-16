/**
 * Agent registry + runner.
 *
 * Single source of truth for which agents exist, their current mode,
 * config, and run history. Today this is process-local in-memory state;
 * when the platform moves to multi-instance, this becomes a row in
 * Postgres + a leader-elected cron worker.
 */

import { audit } from "@/lib/audit-log";
import type {
  Agent,
  AgentConfigValues,
  AgentDecision,
  AgentMode,
  AgentRunReport,
  AgentState,
} from "./types";

class AgentRegistry {
  private agents = new Map<string, Agent>();
  private state = new Map<string, AgentState>();
  private readonly maxRecentDecisions = 100;

  register(agent: Agent): void {
    if (this.agents.has(agent.id)) {
      // Re-registering is fine in dev (HMR); just overwrite impl, keep state.
      this.agents.set(agent.id, agent);
      return;
    }
    this.agents.set(agent.id, agent);
    this.state.set(agent.id, {
      id: agent.id,
      mode: agent.defaultMode,
      status: "idle",
      config: this.defaultConfig(agent),
      lastRunAt: null,
      lastReport: null,
      recentDecisions: [],
    });
  }

  private defaultConfig(agent: Agent): AgentConfigValues {
    const custom: Record<string, number> = {};
    for (const [k, v] of Object.entries(agent.config.custom ?? {})) {
      custom[k] = v.default;
    }
    return {
      threshold: agent.config.threshold.default,
      maxActionsPerRun: agent.config.maxActionsPerRun.default,
      custom,
    };
  }

  list(): Array<{ agent: Agent; state: AgentState }> {
    return Array.from(this.agents.values())
      .map((agent) => ({ agent, state: this.state.get(agent.id)! }))
      .sort((a, b) => a.agent.name.localeCompare(b.agent.name));
  }

  get(id: string): { agent: Agent; state: AgentState } | null {
    const agent = this.agents.get(id);
    const state = this.state.get(id);
    if (!agent || !state) return null;
    return { agent, state };
  }

  setMode(id: string, mode: AgentMode, actor: string): boolean {
    const state = this.state.get(id);
    if (!state) return false;
    const prev = state.mode;
    state.mode = mode;
    audit({
      action: mode === "off" ? "admin.agent.disabled" : "admin.agent.enabled",
      actor,
      resourceId: `agent:${id}`,
      ok: true,
      meta: { from: prev, to: mode },
    });
    return true;
  }

  setConfig(id: string, config: AgentConfigValues, actor: string): boolean {
    const state = this.state.get(id);
    if (!state) return false;
    const prev = state.config;
    state.config = config;
    audit({
      action: "admin.agent.config_changed",
      actor,
      resourceId: `agent:${id}`,
      ok: true,
      meta: { from: prev, to: config },
    });
    return true;
  }

  /**
   * Execute one run of the named agent. If `actor` is provided this is a
   * manual run from the admin UI; that gets audited as such. Otherwise
   * it's a scheduled run (cron / interval ticker).
   */
  async run(id: string, opts: { actor?: string } = {}): Promise<AgentRunReport | null> {
    const entry = this.get(id);
    if (!entry) return null;
    const { agent, state } = entry;

    if (state.mode === "off") {
      // Off agents only run if explicitly requested via manual override.
      if (!opts.actor) return null;
    }

    if (opts.actor) {
      audit({
        action: "admin.agent.manual_run",
        actor: opts.actor,
        resourceId: `agent:${id}`,
        ok: true,
        meta: { mode: state.mode },
      });
    }

    const live = state.mode === "live";
    const startedAt = new Date();
    state.status = "running";

    let decisions: AgentDecision[] = [];
    let errored = false;
    let errorMsg: string | undefined;

    try {
      decisions = await agent.run({
        live,
        config: state.config,
        now: startedAt.toISOString(),
      });
      // Cap to maxActionsPerRun (agent contract trust-but-verify).
      decisions = decisions.slice(0, state.config.maxActionsPerRun);
    } catch (e) {
      errored = true;
      errorMsg = e instanceof Error ? e.message : String(e);
      audit({
        action: "agent.error",
        actor: `agent:${id}`,
        ok: false,
        meta: { error: errorMsg },
      });
    }

    const finishedAt = new Date();
    const report: AgentRunReport = {
      agentId: id,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      scanned: decisions.length, // agents return a decision per scanned candidate of interest
      decisions,
      errored,
      error: errorMsg,
    };

    state.lastRunAt = finishedAt.toISOString();
    state.lastReport = report;
    state.status = errored ? "errored" : "idle";

    // Push to recent decisions ring buffer.
    for (const d of decisions) {
      state.recentDecisions.unshift({ ...d, runAt: finishedAt.toISOString() });
      // Audit every decision so we have a permanent record.
      audit({
        action: "agent.decision",
        actor: `agent:${id}`,
        resourceId: d.targetId,
        ok: d.executed,
        meta: {
          agentAction: d.action,
          confidence: d.confidence,
          mode: state.mode,
          reason: d.reason,
          ...d.meta,
        },
      });
    }
    if (state.recentDecisions.length > this.maxRecentDecisions) {
      state.recentDecisions = state.recentDecisions.slice(0, this.maxRecentDecisions);
    }

    return report;
  }
}

export const agentRegistry = new AgentRegistry();
