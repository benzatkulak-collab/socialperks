/**
 * GET /api/v1/admin/mcp-telemetry
 *
 * Aggregated view of MCP tool-call telemetry. Reads the in-memory
 * event store, filters to `kind: mcp_tool_call`, and returns
 * per-tool counts + error rate + p50/p95 latency.
 *
 * The whole point of this endpoint: telling us which tool
 * descriptions are wrong. If `create_perk_campaign` has a 70% error
 * rate, the description is leading agents to call it with the wrong
 * arguments — that's a description problem, not a tool problem.
 *
 * Auth: Bearer admin token (WAITLIST_ADMIN_TOKEN). The events
 * themselves contain only API-key prefixes (first 12 chars), never
 * full secrets, but we still admin-gate to avoid leaking which
 * agents are using us.
 */

import type { NextRequest } from "next/server";
import { ok, err } from "../../_shared";
import { eventStore } from "@/lib/events";

export const runtime = "nodejs";

interface ToolCallData {
  kind?: string;
  tool?: string;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
  userAgent?: string;
}

interface ToolStats {
  tool: string;
  calls: number;
  successes: number;
  errors: number;
  errorRate: number;
  p50Ms: number;
  p95Ms: number;
  topErrors: { message: string; count: number }[];
  topUserAgents: { userAgent: string; count: number }[];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx] ?? 0;
}

function topN(counts: Map<string, number>, n: number): { value: string; count: number }[] {
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export async function GET(req: NextRequest): Promise<Response> {
  const adminToken = process.env.WAITLIST_ADMIN_TOKEN;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!adminToken || provided !== adminToken) {
    return err("UNAUTHORIZED", "Admin token required", 401);
  }

  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // The MCP telemetry is recorded under EventType "agent.campaign_execute"
  // with data.kind === "mcp_tool_call". Filter for that.
  const events = eventStore.query({
    type: "agent.campaign_execute",
    after: since,
    limit: 10_000,
  });

  // Bucket by tool name.
  const byTool = new Map<string, ToolCallData[]>();
  for (const ev of events) {
    const data = ev.data as ToolCallData;
    if (data.kind !== "mcp_tool_call" || !data.tool) continue;
    const list = byTool.get(data.tool) ?? [];
    list.push(data);
    byTool.set(data.tool, list);
  }

  const stats: ToolStats[] = [];
  for (const [tool, calls] of byTool) {
    const errors = calls.filter((c) => !c.success);
    const durations = calls
      .map((c) => c.durationMs ?? 0)
      .sort((a, b) => a - b);
    const errorMessages = new Map<string, number>();
    const userAgents = new Map<string, number>();
    for (const e of errors) {
      const m = (e.errorMessage ?? "(no message)").slice(0, 120);
      errorMessages.set(m, (errorMessages.get(m) ?? 0) + 1);
    }
    for (const c of calls) {
      const ua = (c.userAgent ?? "(no UA)").slice(0, 80);
      userAgents.set(ua, (userAgents.get(ua) ?? 0) + 1);
    }
    stats.push({
      tool,
      calls: calls.length,
      successes: calls.length - errors.length,
      errors: errors.length,
      errorRate: calls.length === 0 ? 0 : errors.length / calls.length,
      p50Ms: percentile(durations, 50),
      p95Ms: percentile(durations, 95),
      topErrors: topN(errorMessages, 5).map((e) => ({ message: e.value, count: e.count })),
      topUserAgents: topN(userAgents, 5).map((e) => ({ userAgent: e.value, count: e.count })),
    });
  }
  // Sort by call volume descending — most-used tools at the top.
  stats.sort((a, b) => b.calls - a.calls);

  return ok({
    since,
    totalEvents: events.length,
    tools: stats,
  });
}
