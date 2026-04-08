// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — API Usage Metering
// Records API calls, generates usage reports with latency percentiles,
// top-endpoint analysis, and monthly billing metrics.
// ══════════════════════════════════════════════════════════════════════════════

import type { APICallRecord, UsageReport, BillingMetrics } from "./types";

export class UsageMeter {
  private records: APICallRecord[] = [];

  recordAPICall(
    apiKey: string,
    endpoint: string,
    method: string,
    statusCode: number,
    latencyMs: number,
  ): void {
    this.records.push({
      apiKey,
      endpoint,
      method,
      statusCode,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  }

  getUsageReport(
    apiKey: string,
    periodStart: string,
    periodEnd: string,
  ): UsageReport {
    const filtered = this.records.filter(
      (r) =>
        r.apiKey === apiKey &&
        r.timestamp >= periodStart &&
        r.timestamp <= periodEnd,
    );

    const totalCalls = filtered.length;
    const successCalls = filtered.filter(
      (r) => r.statusCode >= 200 && r.statusCode < 400,
    ).length;
    const errorCalls = totalCalls - successCalls;

    const latencies = filtered.map((r) => r.latencyMs).sort((a, b) => a - b);
    const avgLatencyMs =
      totalCalls > 0
        ? latencies.reduce((sum, l) => sum + l, 0) / totalCalls
        : 0;
    const p95LatencyMs =
      totalCalls > 0 ? latencies[Math.floor(totalCalls * 0.95)] ?? 0 : 0;
    const p99LatencyMs =
      totalCalls > 0 ? latencies[Math.floor(totalCalls * 0.99)] ?? 0 : 0;

    const byEndpoint: Record<string, { calls: number; avgLatencyMs: number }> = {};
    for (const r of filtered) {
      if (!byEndpoint[r.endpoint]) {
        byEndpoint[r.endpoint] = { calls: 0, avgLatencyMs: 0 };
      }
      const ep = byEndpoint[r.endpoint];
      ep.avgLatencyMs = (ep.avgLatencyMs * ep.calls + r.latencyMs) / (ep.calls + 1);
      ep.calls++;
    }

    const byStatusCode: Record<string, number> = {};
    for (const r of filtered) {
      const key = String(r.statusCode);
      byStatusCode[key] = (byStatusCode[key] ?? 0) + 1;
    }

    const byMethod: Record<string, number> = {};
    for (const r of filtered) {
      byMethod[r.method] = (byMethod[r.method] ?? 0) + 1;
    }

    return {
      apiKey,
      periodStart,
      periodEnd,
      totalCalls,
      successCalls,
      errorCalls,
      avgLatencyMs: Math.round(avgLatencyMs * 100) / 100,
      p95LatencyMs,
      p99LatencyMs,
      byEndpoint,
      byStatusCode,
      byMethod,
    };
  }

  getTopEndpoints(
    apiKey: string,
    limit: number = 10,
  ): { endpoint: string; calls: number; avgLatencyMs: number }[] {
    const map = new Map<string, { calls: number; totalLatency: number }>();

    for (const r of this.records) {
      if (r.apiKey !== apiKey) continue;
      const existing = map.get(r.endpoint) ?? { calls: 0, totalLatency: 0 };
      existing.calls++;
      existing.totalLatency += r.latencyMs;
      map.set(r.endpoint, existing);
    }

    return Array.from(map.entries())
      .map(([endpoint, data]) => ({
        endpoint,
        calls: data.calls,
        avgLatencyMs:
          Math.round((data.totalLatency / data.calls) * 100) / 100,
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, limit);
  }

  getBillingMetrics(apiKey: string, month: string): BillingMetrics {
    const monthStart = `${month}-01T00:00:00.000Z`;
    // Compute last day of month
    const [year, mon] = month.split("-").map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`;

    const filtered = this.records.filter(
      (r) =>
        r.apiKey === apiKey &&
        r.timestamp >= monthStart &&
        r.timestamp <= monthEnd,
    );

    const totalCalls = filtered.length;

    // Plan-based included calls per month
    const MONTHLY_INCLUDED: Record<string, number> = {
      starter: 10000,
      professional: 100000,
      enterprise: 1000000,
    };

    // Detect plan from existing rate limiter or default to starter
    const plan = "starter"; // In production, this would query the key's plan
    const includedCalls = MONTHLY_INCLUDED[plan] ?? 10000;
    const overageCalls = Math.max(0, totalCalls - includedCalls);
    const overageRate = 0.001; // $0.001 per overage call
    const estimatedCost =
      Math.round(overageCalls * overageRate * 100) / 100;

    return {
      apiKey,
      month,
      totalCalls,
      includedCalls,
      overageCalls,
      overageRate,
      estimatedCost,
    };
  }
}
