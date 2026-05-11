import type { Metadata } from "next";
import { DemoShell } from "../_components/demo-chrome";
import {
  DEMO_PLATFORM_BREAKDOWN,
  DEMO_REACH_CUMULATIVE,
  DEMO_STATS,
  DEMO_SUBMISSIONS_PER_DAY,
} from "@/lib/demo/data";

export const metadata: Metadata = {
  title: "Analytics · Live Demo · Social Perks",
  description:
    "Demo analytics: submissions per day, platform breakdown, cumulative reach.",
  robots: { index: true, follow: true },
};

function MetricCard({
  label,
  value,
  delta,
  deltaPositive = true,
}: {
  label: string;
  value: string;
  delta: string;
  deltaPositive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface/60 p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-brand-muted">
        {label}
      </div>
      <div className="mt-2 font-mono text-3xl font-semibold text-brand-white">
        {value}
      </div>
      <div
        className={`mt-1 text-xs ${
          deltaPositive ? "text-brand-green" : "text-red-400"
        }`}
      >
        {delta}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: number[] }) {
  const w = 700;
  const h = 200;
  const max = Math.max(...data);
  const gap = 2;
  const barW = (w - gap * (data.length - 1)) / data.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-48 w-full"
      preserveAspectRatio="none"
      aria-label="Submissions per day for the last 30 days"
    >
      {data.map((v, i) => {
        const barH = (v / max) * (h - 8);
        const x = i * (barW + gap);
        const y = h - barH;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={barH}
            rx={2}
            fill="#22D3EE"
            opacity={0.4 + (v / max) * 0.6}
          />
        );
      })}
    </svg>
  );
}

function PieChart({
  data,
}: {
  data: { platform: string; count: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const radius = 80;
  const cx = 100;
  const cy = 100;
  let cumulative = 0;
  const slices = data.map((d) => {
    const startAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
    cumulative += d.count;
    const endAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { path, color: d.color, platform: d.platform, count: d.count };
  });
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <svg
        viewBox="0 0 200 200"
        className="h-48 w-48 flex-shrink-0"
        aria-label="Submissions by platform"
      >
        {slices.map((s) => (
          <path
            key={s.platform}
            d={s.path}
            fill={s.color}
            stroke="#0C0F1A"
            strokeWidth="2"
          />
        ))}
        <circle cx={cx} cy={cy} r="36" fill="#0C0F1A" />
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fill="#fff"
          fontSize="20"
          fontFamily="ui-monospace, monospace"
          fontWeight="600"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fill="#9CA3AF"
          fontSize="9"
        >
          TOTAL
        </text>
      </svg>
      <ul className="flex-1 space-y-2.5">
        {data.map((d) => {
          const pct = Math.round((d.count / total) * 100);
          return (
            <li
              key={d.platform}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: d.color }}
                  aria-hidden="true"
                />
                <span className="text-sm text-brand-text">{d.platform}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm text-brand-white">
                  {d.count}
                </span>
                <span className="ml-2 text-xs text-brand-muted">{pct}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LineChart({ data }: { data: number[] }) {
  const w = 700;
  const h = 200;
  const max = Math.max(...data);
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = h - (v / max) * (h - 10) - 5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `0,${h} ${points} ${w},${h}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-48 w-full"
      preserveAspectRatio="none"
      aria-label="Cumulative reach over time"
    >
      <defs>
        <linearGradient id="linefill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#linefill)" />
      <polyline
        points={points}
        fill="none"
        stroke="#34D399"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function DemoAnalyticsPage() {
  return (
    <DemoShell activeTab="analytics">
      <div className="mb-8">
        <h1 className="font-heading text-3xl italic text-brand-white sm:text-4xl">
          Analytics
        </h1>
        <p className="mt-2 text-brand-dim">
          Last 30 days · Bloom Café
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total submissions"
          value="214"
          delta="+34% vs prev"
        />
        <MetricCard
          label="Approval rate"
          value={`${DEMO_STATS.approvalRate}%`}
          delta="+2.1 pts"
        />
        <MetricCard
          label="Total reach"
          value={DEMO_STATS.totalReach.toLocaleString()}
          delta="+8,420 views"
        />
        <MetricCard
          label="Cost per submission"
          value="$10.93"
          delta="-$1.20"
          deltaPositive
        />
      </div>

      <section className="mt-8 rounded-xl border border-brand-border bg-brand-surface/40 p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-heading text-xl italic text-brand-white">
            Submissions per day
          </h2>
          <span className="font-mono text-xs uppercase tracking-wider text-brand-muted">
            Last 30 days
          </span>
        </div>
        <BarChart data={DEMO_SUBMISSIONS_PER_DAY} />
        <div className="mt-2 flex justify-between text-xs text-brand-muted">
          <span>Apr 12</span>
          <span>Apr 26</span>
          <span>May 11</span>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-brand-border bg-brand-surface/40 p-5">
          <h2 className="mb-5 font-heading text-xl italic text-brand-white">
            Submissions by platform
          </h2>
          <PieChart data={DEMO_PLATFORM_BREAKDOWN} />
        </section>

        <section className="rounded-xl border border-brand-border bg-brand-surface/40 p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-heading text-xl italic text-brand-white">
              Cumulative reach
            </h2>
            <span className="font-mono text-xs uppercase tracking-wider text-brand-green">
              {DEMO_STATS.totalReach.toLocaleString()}
            </span>
          </div>
          <LineChart data={DEMO_REACH_CUMULATIVE} />
          <div className="mt-2 flex justify-between text-xs text-brand-muted">
            <span>Apr 12</span>
            <span>Apr 26</span>
            <span>May 11</span>
          </div>
        </section>
      </div>
    </DemoShell>
  );
}
