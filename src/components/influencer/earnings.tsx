"use client";

import { useState, useMemo } from "react";
import { formatCurrencyPrecise as formatCurrency } from "@/lib/shared/formatters";

// ═══════════════ Types ═══════════════

export interface EarningRecord {
  id: string;
  campaignId: string;
  campaignName: string;
  businessName: string;
  businessAvatar: string;
  platform: string;
  platformIcon: string;
  amount: number;
  status: "paid" | "pending" | "processing" | "rejected";
  completedAt: string;
  paidAt: string | null;
}

export interface MonthlyEarning {
  month: string;
  year: number;
  total: number;
  campaignCount: number;
}

export interface PlatformEarning {
  platform: string;
  platformIcon: string;
  total: number;
  count: number;
}

export interface PayoutSettings {
  method: "bank" | "paypal" | "stripe" | null;
  connected: boolean;
}

export interface EarningsData {
  totalEarned: number;
  pendingAmount: number;
  availableToWithdraw: number;
  earnings: EarningRecord[];
  monthlyHistory: MonthlyEarning[];
  platformBreakdown: PlatformEarning[];
  payoutSettings: PayoutSettings;
}

interface EarningsProps {
  data: EarningsData;
}

// ═══════════════ Helpers ═══════════════

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-brand-green/10 text-brand-green" },
  pending: { label: "Pending", className: "bg-brand-amber/10 text-brand-amber" },
  processing: { label: "Processing", className: "bg-brand-cyan/10 text-brand-cyan" },
  rejected: { label: "Rejected", className: "bg-brand-red/10 text-brand-red" },
};

// ═══════════════ Component ═══════════════

export default function Earnings({ data }: EarningsProps) {
  const [activeTab, setActiveTab] = useState<"all" | "campaigns" | "platforms" | "monthly" | "payout">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "processing" | "rejected">("all");
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawStatus, setWithdrawStatus] = useState<"idle" | "initiated">("idle");

  const filteredEarnings = useMemo(() => {
    if (statusFilter === "all") return data.earnings;
    return data.earnings.filter((e) => e.status === statusFilter);
  }, [data.earnings, statusFilter]);

  const campaignEarnings = useMemo(() => {
    const map = new Map<string, { campaignName: string; businessName: string; total: number; count: number }>();
    for (const earning of data.earnings) {
      const existing = map.get(earning.campaignId);
      if (existing) {
        existing.total += earning.amount;
        existing.count += 1;
      } else {
        map.set(earning.campaignId, {
          campaignName: earning.campaignName,
          businessName: earning.businessName,
          total: earning.amount,
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [data.earnings]);

  return (
    <div className="min-h-screen bg-brand-bg font-body">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl italic text-brand-white">Earnings</h1>
            <p className="mt-1 text-sm text-brand-muted">Track your earnings and manage payouts</p>
          </div>
          <button
            type="button"
            onClick={() => setShowWithdrawConfirm(true)}
            className="w-fit rounded-lg bg-brand-green px-5 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
            aria-label="Withdraw available funds"
          >
            Withdraw {formatCurrency(data.availableToWithdraw)}
          </button>
        </div>

        {/* Withdraw Confirmation */}
        {showWithdrawConfirm && withdrawStatus === "idle" && (
          <div className="mt-4 rounded-xl border border-brand-green/30 bg-brand-green/5 p-4">
            <p className="text-sm text-brand-text">
              Withdraw <span className="font-semibold text-brand-green">{formatCurrency(data.availableToWithdraw)}</span> to your connected payout method?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setWithdrawStatus("initiated");
                }}
                className="rounded-lg bg-brand-green px-4 py-1.5 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/50"
              >
                Confirm Withdrawal
              </button>
              <button
                type="button"
                onClick={() => setShowWithdrawConfirm(false)}
                className="rounded-lg border border-brand-border bg-brand-elevated px-4 py-1.5 text-sm font-medium text-brand-text transition-colors hover:border-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {withdrawStatus === "initiated" && (
          <div className="mt-4 rounded-xl border border-brand-green/30 bg-brand-green/5 p-4">
            <p className="text-sm font-medium text-brand-green" role="status">
              Withdrawal initiated. Funds will arrive in 1-3 business days.
            </p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3" role="region" aria-label="Earnings summary">
          <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">Total Earned</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-brand-green">
              {formatCurrency(data.totalEarned)}
            </p>
            <p className="mt-1 text-xs text-brand-dim">Lifetime earnings</p>
          </div>
          <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">Pending</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-brand-amber">
              {formatCurrency(data.pendingAmount)}
            </p>
            <p className="mt-1 text-xs text-brand-dim">Awaiting verification</p>
          </div>
          <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">Available</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-brand-cyan">
              {formatCurrency(data.availableToWithdraw)}
            </p>
            <p className="mt-1 text-xs text-brand-dim">Ready to withdraw</p>
          </div>
        </div>

        {/* Tabs */}
        <nav className="mt-8 border-b border-brand-border" aria-label="Earnings sections">
          <div className="flex gap-1 overflow-x-auto">
            {([
              { id: "all" as const, label: "All Earnings" },
              { id: "campaigns" as const, label: "By Campaign" },
              { id: "platforms" as const, label: "By Platform" },
              { id: "monthly" as const, label: "Monthly" },
              { id: "payout" as const, label: "Payout Settings" },
            ]).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                  activeTab === tab.id
                    ? "border-b-2 border-brand-cyan text-brand-cyan"
                    : "text-brand-muted hover:text-brand-text"
                }`}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Tab Content */}
        <div className="mt-6" role="tabpanel">
          {/* All Earnings */}
          {activeTab === "all" && (
            <div className="space-y-4">
              {/* Status Filter */}
              <div className="flex gap-2" role="group" aria-label="Filter by status">
                {(["all", "paid", "pending", "processing", "rejected"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                      statusFilter === status
                        ? "bg-brand-cyan/10 text-brand-cyan"
                        : "bg-brand-elevated text-brand-muted hover:text-brand-text"
                    }`}
                    aria-pressed={statusFilter === status}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Earnings List */}
              <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b border-brand-border">
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-muted">
                        Campaign
                      </th>
                      <th scope="col" className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-muted sm:table-cell">
                        Platform
                      </th>
                      <th scope="col" className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-muted md:table-cell">
                        Date
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-brand-muted">
                        Amount
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-brand-muted">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {filteredEarnings.map((earning) => {
                      const statusCfg = STATUS_CONFIG[earning.status];
                      return (
                        <tr key={earning.id} className="transition-colors hover:bg-brand-elevated/50">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-brand-text">{earning.campaignName}</p>
                            <p className="text-xs text-brand-muted">{earning.businessName}</p>
                          </td>
                          <td className="hidden px-4 py-3 sm:table-cell">
                            <span className="flex items-center gap-1.5 text-sm text-brand-dim">
                              <span aria-hidden="true">{earning.platformIcon}</span>
                              {earning.platform}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-sm text-brand-dim md:table-cell">
                            {earning.completedAt}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-brand-green">
                            {formatCurrency(earning.amount)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                              {statusCfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredEarnings.length === 0 && (
                  <div className="flex h-32 items-center justify-center">
                    <p className="text-sm text-brand-muted">No earnings found for this filter.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* By Campaign */}
          {activeTab === "campaigns" && (
            <div className="space-y-3">
              {campaignEarnings.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-surface px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-brand-text">{entry.campaignName}</p>
                    <p className="text-xs text-brand-muted">
                      {entry.businessName} &middot; {entry.count} completion{entry.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <p className="font-mono text-lg font-semibold text-brand-green">
                    {formatCurrency(entry.total)}
                  </p>
                </div>
              ))}
              {campaignEarnings.length === 0 && (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-surface">
                  <p className="text-sm text-brand-muted">No campaign earnings yet.</p>
                </div>
              )}
            </div>
          )}

          {/* By Platform */}
          {activeTab === "platforms" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.platformBreakdown.map((platform) => {
                const maxTotal = Math.max(...data.platformBreakdown.map((p) => p.total), 1);
                const pct = (platform.total / maxTotal) * 100;
                return (
                  <div
                    key={platform.platform}
                    className="rounded-xl border border-brand-border bg-brand-surface p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" aria-hidden="true">{platform.platformIcon}</span>
                        <span className="text-sm font-medium text-brand-text">{platform.platform}</span>
                      </div>
                      <span className="font-mono text-lg font-semibold text-brand-green">
                        {formatCurrency(platform.total)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-elevated">
                        <div
                          className="h-full rounded-full bg-brand-cyan transition-all"
                          style={{ width: `${pct}%` }}
                          role="progressbar"
                          aria-valuenow={platform.total}
                          aria-label={`${platform.platform} earnings progress`}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-brand-muted">
                      {platform.count} completion{platform.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                );
              })}
              {data.platformBreakdown.length === 0 && (
                <div className="col-span-full flex h-32 items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-surface">
                  <p className="text-sm text-brand-muted">No platform data yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Monthly */}
          {activeTab === "monthly" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
                <h3 className="font-heading text-lg italic text-brand-white">Monthly Earnings History</h3>
                {/* Monthly Earnings Bar Chart */}
                <div className="mt-4">
                  <EarningsBarChart monthlyHistory={data.monthlyHistory} />
                </div>
              </div>

              {/* Monthly Table */}
              <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b border-brand-border">
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-muted">
                        Month
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-brand-muted">
                        Campaigns
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-brand-muted">
                        Earned
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {data.monthlyHistory.map((entry, i) => (
                      <tr key={i} className="transition-colors hover:bg-brand-elevated/50">
                        <td className="px-4 py-3 text-sm text-brand-text">
                          {entry.month} {entry.year}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-brand-dim">
                          {entry.campaignCount}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-brand-green">
                          {formatCurrency(entry.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.monthlyHistory.length === 0 && (
                  <div className="flex h-32 items-center justify-center">
                    <p className="text-sm text-brand-muted">No monthly data yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payout Settings */}
          {activeTab === "payout" && (
            <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
              <h3 className="font-heading text-xl italic text-brand-white">Payout Settings</h3>
              <p className="mt-1 text-sm text-brand-muted">Choose how you want to receive your earnings.</p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Bank Transfer */}
                <button
                  type="button"
                  className={`rounded-xl border p-5 text-left transition-all ${
                    data.payoutSettings.method === "bank"
                      ? "border-brand-cyan bg-brand-cyan/5"
                      : "border-brand-border bg-brand-bg hover:border-brand-subtle"
                  }`}
                  aria-pressed={data.payoutSettings.method === "bank"}
                >
                  <p className="text-2xl" aria-hidden="true">🏦</p>
                  <p className="mt-2 text-sm font-medium text-brand-text">Bank Transfer</p>
                  <p className="mt-1 text-xs text-brand-muted">Direct deposit to your bank account. 2-3 business days.</p>
                  {data.payoutSettings.method === "bank" && data.payoutSettings.connected && (
                    <p className="mt-2 text-xs font-medium text-brand-green">Connected</p>
                  )}
                </button>

                {/* PayPal */}
                <button
                  type="button"
                  className={`rounded-xl border p-5 text-left transition-all ${
                    data.payoutSettings.method === "paypal"
                      ? "border-brand-cyan bg-brand-cyan/5"
                      : "border-brand-border bg-brand-bg hover:border-brand-subtle"
                  }`}
                  aria-pressed={data.payoutSettings.method === "paypal"}
                >
                  <p className="text-2xl" aria-hidden="true">💳</p>
                  <p className="mt-2 text-sm font-medium text-brand-text">PayPal</p>
                  <p className="mt-1 text-xs text-brand-muted">Instant transfer to your PayPal account.</p>
                  {data.payoutSettings.method === "paypal" && data.payoutSettings.connected && (
                    <p className="mt-2 text-xs font-medium text-brand-green">Connected</p>
                  )}
                </button>

                {/* Stripe */}
                <button
                  type="button"
                  className={`rounded-xl border p-5 text-left transition-all ${
                    data.payoutSettings.method === "stripe"
                      ? "border-brand-cyan bg-brand-cyan/5"
                      : "border-brand-border bg-brand-bg hover:border-brand-subtle"
                  }`}
                  aria-pressed={data.payoutSettings.method === "stripe"}
                >
                  <p className="text-2xl" aria-hidden="true">⚡</p>
                  <p className="mt-2 text-sm font-medium text-brand-text">Stripe Connect</p>
                  <p className="mt-1 text-xs text-brand-muted">Powered by Stripe. 1-2 business days.</p>
                  {data.payoutSettings.method === "stripe" && data.payoutSettings.connected && (
                    <p className="mt-2 text-xs font-medium text-brand-green">Connected</p>
                  )}
                </button>
              </div>

              {!data.payoutSettings.connected && (
                <div className="mt-6 rounded-lg border border-brand-amber/30 bg-brand-amber/5 p-4">
                  <p className="text-sm text-brand-amber">
                    No payout method connected. Connect a payout method to withdraw your earnings.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════ Earnings Bar Chart ═══════════════

function EarningsBarChart({ monthlyHistory }: { monthlyHistory: MonthlyEarning[] }) {
  const data = monthlyHistory.slice(-8); // Show last 8 months
  const maxValue = Math.max(...data.map((d) => d.total), 1);
  const height = 192;
  const padding = { top: 16, right: 10, bottom: 30, left: 50 };
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = Math.min(36, (100 / Math.max(data.length, 1)) * 0.55);
  const gap = 100 / Math.max(data.length, 1);

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round((maxValue / ticks) * i)
  );

  if (data.length === 0) {
    return (
      <div
        className="flex h-48 items-center justify-center rounded-lg border border-dashed border-brand-border bg-brand-bg/50"
        role="img"
        aria-label="No monthly earnings data"
      >
        <p className="text-sm text-brand-muted">No monthly data to display yet.</p>
      </div>
    );
  }

  return (
    <div role="img" aria-label="Monthly earnings bar chart" className="w-full">
      <svg
        viewBox={`0 0 500 ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {yTicks.map((tick) => {
          const y = padding.top + chartHeight - (tick / maxValue) * chartHeight;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={500 - padding.right}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.35)"
                fontSize="10"
                fontFamily="monospace"
              >
                {formatCurrency(tick)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const barHeight = (d.total / maxValue) * chartHeight;
          const x = padding.left + gap * (i + 0.5) * ((500 - padding.left - padding.right) / 100) - barWidth / 2;
          const y = padding.top + chartHeight - barHeight;
          return (
            <g key={`${d.month}-${d.year}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#34D399"
                rx="3"
                opacity="0.85"
              />
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                fill="rgba(255,255,255,0.6)"
                fontSize="9"
                fontFamily="monospace"
              >
                {formatCurrency(d.total)}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - 6}
                textAnchor="middle"
                fill="rgba(255,255,255,0.45)"
                fontSize="10"
                fontFamily="sans-serif"
              >
                {d.month.slice(0, 3)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
