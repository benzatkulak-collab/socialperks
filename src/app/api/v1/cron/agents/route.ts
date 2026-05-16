/**
 * GET /api/v1/cron/agents
 *
 * Tick endpoint for the agent scheduler. Each invocation runs every
 * agent that's due (interval elapsed since lastRunAt, mode != off).
 *
 * Not registered in vercel.json by default — the current Vercel plan
 * tier already uses its cron budget for the daily campaign-sweeps,
 * waitlist-drip, and onboarding-drip jobs. Add this path to
 * vercel.json `crons` when promoting agents to autonomous scheduling,
 * or drive it from an external scheduler (GitHub Actions on a cron,
 * Cloudflare Worker cron trigger, etc.).
 *
 * Until then, agents fire via the "Run now" button on /admin/agents
 * (audited as admin.agent.manual_run).
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`.
 */

import type { NextRequest } from "next/server";
import { ok, err } from "../../_shared";
import { constantTimeEqual } from "@/lib/security/order-by";
import { agentRegistry } from "@/lib/agents";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return err("CRON_NOT_CONFIGURED", "CRON_SECRET unset", 503);
  const auth = req.headers.get("authorization") ?? "";
  if (!constantTimeEqual(auth, `Bearer ${secret}`)) {
    return err("UNAUTHORIZED", "Invalid cron token", 401);
  }

  const now = Date.now();
  const runs: Array<{ agentId: string; ran: boolean; reason?: string; decisions?: number }> = [];

  for (const { agent, state } of agentRegistry.list()) {
    if (state.mode === "off") {
      runs.push({ agentId: agent.id, ran: false, reason: "off" });
      continue;
    }

    const last = state.lastRunAt ? new Date(state.lastRunAt).getTime() : 0;
    const due = last + agent.intervalSeconds * 1000 <= now;
    if (!due) {
      runs.push({ agentId: agent.id, ran: false, reason: "not-due" });
      continue;
    }

    const report = await agentRegistry.run(agent.id);
    runs.push({
      agentId: agent.id,
      ran: report !== null,
      decisions: report?.decisions.length ?? 0,
    });
  }

  return ok({ tickedAt: new Date(now).toISOString(), runs });
}
