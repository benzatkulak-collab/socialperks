/**
 * Admin agent control plane — /api/v1/admin/agents
 *
 * GET                                — list all agents with config + state + last report
 * PATCH { agentId, mode?, config? }  — update mode/config
 * POST  { agentId, action: "run" }   — manual run (audited as such)
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, parseBody, withTiming } from "../../_shared";
import { agentRegistry } from "@/lib/agents";
import type { AgentMode, AgentConfigValues } from "@/lib/agents/types";

const VALID_MODES: AgentMode[] = ["off", "dry-run", "live"];

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin") return err("FORBIDDEN", "Admin role required", 403);

  const items = agentRegistry.list().map(({ agent, state }) => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    intervalSeconds: agent.intervalSeconds,
    configSpec: agent.config,
    mode: state.mode,
    status: state.status,
    config: state.config,
    lastRunAt: state.lastRunAt,
    lastReport: state.lastReport,
    recentDecisions: state.recentDecisions.slice(0, 20),
  }));

  return ok({ agents: items });
});

export const PATCH = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin") return err("FORBIDDEN", "Admin role required", 403);
  if (user.id.startsWith("api-key:")) return err("FORBIDDEN", "API keys cannot mutate agents", 403);

  const body = await parseBody<{
    agentId?: string;
    mode?: AgentMode;
    config?: Partial<AgentConfigValues>;
  }>(req);
  if (body instanceof Response) return body;
  if (!body.agentId) return err("MISSING_FIELDS", "agentId is required");

  const entry = agentRegistry.get(body.agentId);
  if (!entry) return err("AGENT_NOT_FOUND", "Unknown agent id", 404);

  if (body.mode !== undefined) {
    if (!VALID_MODES.includes(body.mode)) {
      return err("INVALID_INPUT", `mode must be one of: ${VALID_MODES.join(", ")}`);
    }
    agentRegistry.setMode(body.agentId, body.mode, `user:${user.id}`);
  }

  if (body.config) {
    // Merge with current config so admins can submit partial updates.
    const merged: AgentConfigValues = {
      threshold: body.config.threshold ?? entry.state.config.threshold,
      maxActionsPerRun: body.config.maxActionsPerRun ?? entry.state.config.maxActionsPerRun,
      custom: { ...entry.state.config.custom, ...(body.config.custom ?? {}) },
    };

    // Clamp values to spec bounds (trust-but-verify).
    const spec = entry.agent.config;
    merged.threshold = clamp(merged.threshold, spec.threshold.min, spec.threshold.max);
    merged.maxActionsPerRun = clamp(
      merged.maxActionsPerRun,
      spec.maxActionsPerRun.min,
      spec.maxActionsPerRun.max
    );
    for (const [k, v] of Object.entries(merged.custom)) {
      const knob = spec.custom?.[k];
      if (knob) merged.custom[k] = clamp(v, knob.min, knob.max);
    }

    agentRegistry.setConfig(body.agentId, merged, `user:${user.id}`);
  }

  const after = agentRegistry.get(body.agentId)!;
  return ok({
    mode: after.state.mode,
    config: after.state.config,
  });
});

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin") return err("FORBIDDEN", "Admin role required", 403);
  if (user.id.startsWith("api-key:")) return err("FORBIDDEN", "API keys cannot run agents", 403);

  const body = await parseBody<{ agentId?: string; action?: string }>(req);
  if (body instanceof Response) return body;
  if (!body.agentId) return err("MISSING_FIELDS", "agentId is required");
  if (body.action !== "run") return err("INVALID_ACTION", "Only 'run' is supported");

  const report = await agentRegistry.run(body.agentId, { actor: `user:${user.id}` });
  if (!report) return err("AGENT_NOT_FOUND", "Unknown agent id", 404);

  return ok({ report });
});

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
