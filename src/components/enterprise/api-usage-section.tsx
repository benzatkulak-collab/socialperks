"use client";

import type { ApiUsageStats } from "./api-console-types";

// ═══════════════ Types ═══════════════

interface ApiUsageSectionProps {
  usage: ApiUsageStats;
}

// ═══════════════ Component ═══════════════

export function ApiUsageSection({ usage }: ApiUsageSectionProps) {
  const rateLimitPct = usage.rateLimit > 0 ? (usage.rateLimitUsed / usage.rateLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Rate Limit */}
      <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
        <h3 className="font-heading text-lg italic text-brand-white">Rate Limit</h3>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="font-mono text-3xl font-semibold text-brand-cyan">
              {usage.rateLimitUsed.toLocaleString()}
            </p>
            <p className="text-sm text-brand-muted">
              of {usage.rateLimit.toLocaleString()} requests/hour
            </p>
          </div>
          <p className={`font-mono text-sm font-semibold ${
            rateLimitPct > 80 ? "text-brand-red" : rateLimitPct > 50 ? "text-brand-amber" : "text-brand-green"
          }`}>
            {rateLimitPct.toFixed(1)}% used
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-brand-elevated">
          <div
            className={`h-full rounded-full transition-all ${
              rateLimitPct > 80 ? "bg-brand-red" : rateLimitPct > 50 ? "bg-brand-amber" : "bg-brand-green"
            }`}
            style={{ width: `${Math.min(rateLimitPct, 100)}%` }}
            role="progressbar"
            aria-valuenow={usage.rateLimitUsed}
            aria-valuemax={usage.rateLimit}
            aria-label="Rate limit usage"
          />
        </div>
      </div>

      {/* Request Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">Requests Today</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-brand-green">
            {usage.requestsToday.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">This Month</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-brand-purple">
            {usage.requestsThisMonth.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Top Endpoints */}
      <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
        <h3 className="font-heading text-lg italic text-brand-white">Top Endpoints</h3>
        <div className="mt-4 overflow-hidden rounded-lg border border-brand-border">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg/50">
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-brand-muted">
                  Endpoint
                </th>
                <th scope="col" className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-brand-muted">
                  Requests
                </th>
                <th scope="col" className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-brand-muted">
                  Avg Latency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {usage.topEndpoints.map((ep) => (
                <tr key={ep.endpoint} className="transition-colors hover:bg-brand-elevated/50">
                  <td className="px-4 py-2">
                    <code className="font-mono text-xs text-brand-cyan">{ep.endpoint}</code>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-sm text-brand-text">
                    {ep.count.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-sm text-brand-dim">
                    {ep.avgLatency}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
