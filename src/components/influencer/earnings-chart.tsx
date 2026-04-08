"use client";

import { formatCurrencyPrecise as formatCurrency } from "@/lib/shared/formatters";
import type { MonthlyEarning } from "./earnings";

// ═══════════════ Earnings Bar Chart ═══════════════

export function EarningsBarChart({ monthlyHistory }: { monthlyHistory: MonthlyEarning[] }) {
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
