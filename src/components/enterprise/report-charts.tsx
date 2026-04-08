"use client";

import { formatNumber, formatCurrency } from "@/lib/shared/formatters";
import type { CampaignPerformance } from "./report-types";

// ═══════════════ SortableHeader ═══════════════

export function SortableHeader({
  label,
  column,
  currentSort,
  direction,
  onSort,
  align,
}: {
  label: string;
  column: string;
  currentSort: string;
  direction: "asc" | "desc";
  onSort: (column: string) => void;
  align: "left" | "right";
}) {
  const isActive = currentSort === column;
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-medium uppercase tracking-wider ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 transition-colors ${
          isActive ? "text-brand-cyan" : "text-brand-muted hover:text-brand-text"
        }`}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {isActive && (
          <span aria-hidden="true" className="text-[10px]">
            {direction === "asc" ? "\u25B2" : "\u25BC"}
          </span>
        )}
      </button>
    </th>
  );
}

// ═══════════════ ReportBarChart ═══════════════

export function ReportBarChart({
  campaigns,
  reportType,
}: {
  campaigns: CampaignPerformance[];
  reportType: string;
}) {
  // Pick top 5 campaigns by marketing value
  const data = [...campaigns]
    .sort((a, b) => b.marketingValue - a.marketingValue)
    .slice(0, 5);

  if (data.length === 0) {
    return (
      <div
        className="flex h-52 items-center justify-center rounded-lg border border-dashed border-brand-border bg-brand-bg/50"
        role="img"
        aria-label="No data available"
      >
        <p className="text-sm text-brand-muted">No data for this period.</p>
      </div>
    );
  }

  const getValue = (c: CampaignPerformance) => {
    switch (reportType) {
      case "roi": return c.roi;
      case "locations": return c.completions;
      case "platforms": return c.impressions;
      default: return c.marketingValue;
    }
  };

  const formatVal = (v: number) => {
    switch (reportType) {
      case "roi": return `${v}%`;
      case "locations": return formatNumber(v);
      case "platforms": return formatNumber(v);
      default: return formatCurrency(v);
    }
  };

  const barColor = reportType === "roi" ? "#34D399" : "#22D3EE";
  const maxValue = Math.max(...data.map(getValue), 1);
  const height = 208;
  const padding = { top: 16, right: 10, bottom: 48, left: 55 };
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = Math.min(50, (100 / data.length) * 0.55);
  const gap = 100 / data.length;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round((maxValue / ticks) * i)
  );

  return (
    <div role="img" aria-label={`Top campaigns by ${reportType}`} className="w-full">
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
                {formatVal(tick)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const val = getValue(d);
          const barHeight = (val / maxValue) * chartHeight;
          const x = padding.left + gap * (i + 0.5) * ((500 - padding.left - padding.right) / 100) - barWidth / 2;
          const y = padding.top + chartHeight - barHeight;
          // Truncate campaign name for label
          const label = d.name.length > 12 ? d.name.slice(0, 11) + "..." : d.name;
          return (
            <g key={d.id}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={barColor}
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
                {formatVal(val)}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - 20}
                textAnchor="middle"
                fill="rgba(255,255,255,0.45)"
                fontSize="9"
                fontFamily="sans-serif"
              >
                {label}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - 6}
                textAnchor="middle"
                fill="rgba(255,255,255,0.3)"
                fontSize="8"
                fontFamily="sans-serif"
              >
                {d.platformIcon} {d.platform}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
