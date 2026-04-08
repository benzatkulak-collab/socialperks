"use client";

import { formatCurrencyPrecise as formatCurrency } from "@/lib/shared/formatters";
import type { AvailableCampaign, EarningEntry } from "./dashboard";

// ═══════════════ Helpers ═══════════════

const STATUS_STYLES: Record<string, string> = {
  paid: "text-brand-green",
  pending: "text-brand-amber",
  processing: "text-brand-cyan",
};

// ═══════════════ StatCard ═══════════════

export function StatCard({
  label,
  value,
  subtext,
  accentClass,
}: {
  label: string;
  value: string;
  subtext: string;
  accentClass: string;
}) {
  return (
    <div className={`rounded-xl border-l-2 border-brand-border bg-brand-surface p-4 ${accentClass.split(" ")[0]}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${accentClass.split(" ")[1]}`}>{value}</p>
      <p className="mt-1 text-xs text-brand-dim">{subtext}</p>
    </div>
  );
}

// ═══════════════ CampaignCard ═══════════════

export function CampaignCard({ campaign, isApplied, onApply }: { campaign: AvailableCampaign; isApplied: boolean; onApply: (id: string) => void }) {
  return (
    <article className="card-hover rounded-xl border border-brand-border bg-brand-surface p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">{campaign.platformIcon}</span>
            <h3 className="font-heading text-lg italic text-brand-white">{campaign.campaignName}</h3>
            <span className="rounded-full bg-brand-cyan/10 px-2 py-0.5 font-mono text-xs text-brand-cyan">
              {campaign.matchScore}% match
            </span>
          </div>
          <p className="mt-1 text-sm text-brand-muted">
            {campaign.businessName} &middot; {campaign.businessType}
          </p>
          <p className="mt-2 text-sm text-brand-dim">{campaign.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {campaign.actionsRequired.map((action) => (
              <span
                key={action}
                className="rounded-md bg-brand-elevated px-2 py-0.5 text-xs text-brand-text"
              >
                {action}
              </span>
            ))}
            <span className="rounded-md bg-brand-elevated px-2 py-0.5 text-xs text-brand-muted">
              Effort: {"●".repeat(campaign.effortLevel)}{"○".repeat(5 - campaign.effortLevel)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="font-mono text-lg font-semibold text-brand-green">
            ~{formatCurrency(campaign.estimatedEarnings)}
          </p>
          <p className="text-xs text-brand-muted">
            {campaign.perkValue}{campaign.perkType === "pct" ? "%" : "$"} perk
          </p>
          {isApplied ? (
            <span className="mt-1 rounded-lg border border-brand-green/30 bg-brand-green/10 px-4 py-1.5 text-sm font-medium text-brand-green">
              Applied
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onApply(campaign.id)}
              className="mt-1 rounded-lg bg-brand-cyan px-4 py-1.5 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
              aria-label={`Apply to ${campaign.campaignName} at ${campaign.businessName}`}
            >
              Apply
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ═══════════════ EarningRow ═══════════════

export function EarningRow({ entry }: { entry: EarningEntry }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-surface px-4 py-3">
      <div>
        <p className="text-sm font-medium text-brand-text">{entry.campaignName}</p>
        <p className="text-xs text-brand-muted">{entry.businessName} &middot; {entry.date}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm font-semibold text-brand-green">{formatCurrency(entry.amount)}</p>
        <p className={`text-xs font-medium capitalize ${STATUS_STYLES[entry.status]}`}>
          {entry.status}
        </p>
      </div>
    </div>
  );
}

// ═══════════════ MiniStat ═══════════════

export function MiniStat({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-bg/50 p-4">
      <p className="text-xs text-brand-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-brand-white">{value}</p>
      <p className={`mt-0.5 text-xs ${positive ? "text-brand-green" : "text-brand-red"}`}>{change}</p>
    </div>
  );
}

// ═══════════════ SimpleBarChart ═══════════════

export function SimpleBarChart({
  data,
  height = 200,
  barColor = "#22D3EE",
  formatValue = (v: number) => String(v),
  ariaLabel = "Bar chart",
}: {
  data: { label: string; value: number }[];
  height?: number;
  barColor?: string;
  formatValue?: (v: number) => string;
  ariaLabel?: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const padding = { top: 20, right: 10, bottom: 32, left: 50 };
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = Math.min(40, (100 / data.length) * 0.6);
  const gap = 100 / data.length;

  // Y-axis ticks
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round((maxValue / ticks) * i)
  );

  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <svg
        viewBox={`0 0 500 ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y-axis grid lines and labels */}
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
                fontSize="11"
                fontFamily="monospace"
              >
                {formatValue(tick)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * chartHeight;
          const x = padding.left + gap * (i + 0.5) * ((500 - padding.left - padding.right) / 100) - barWidth / 2;
          const y = padding.top + chartHeight - barHeight;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={barColor}
                rx="3"
                opacity="0.85"
              />
              {/* Value on top */}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fill="rgba(255,255,255,0.6)"
                fontSize="10"
                fontFamily="monospace"
              >
                {formatValue(d.value)}
              </text>
              {/* Label below */}
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fill="rgba(255,255,255,0.45)"
                fontSize="11"
                fontFamily="sans-serif"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ═══════════════ EmptyState ═══════════════

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-surface">
      <p className="text-sm text-brand-muted">{message}</p>
    </div>
  );
}
