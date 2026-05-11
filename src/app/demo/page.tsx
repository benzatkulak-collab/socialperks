import type { Metadata } from "next";
import Link from "next/link";
import { DemoShell } from "./_components/demo-chrome";
import {
  DEMO_CAMPAIGNS,
  DEMO_STATS,
  DEMO_SUBMISSIONS,
  DEMO_SUBMISSIONS_PER_DAY,
  formatRelative,
  platformColor,
} from "@/lib/demo/data";

export const metadata: Metadata = {
  title: "Live Demo · Social Perks",
  description:
    "Explore a fully-populated Social Perks dashboard with real-looking data. No signup required.",
  robots: { index: true, follow: true },
};

function StatCard({
  label,
  value,
  delta,
  accent,
}: {
  label: string;
  value: string;
  delta?: string;
  accent: "cyan" | "green" | "amber";
}) {
  const accentClass =
    accent === "cyan"
      ? "border-l-brand-cyan"
      : accent === "green"
        ? "border-l-brand-green"
        : "border-l-brand-amber";
  return (
    <div
      className={`rounded-xl border border-brand-border bg-brand-surface/60 border-l-4 p-5 ${accentClass}`}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-brand-muted">
        {label}
      </div>
      <div className="mt-2 font-mono text-3xl font-semibold text-brand-white">
        {value}
      </div>
      {delta ? (
        <div className="mt-1 text-xs text-brand-green">{delta}</div>
      ) : null}
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 600;
  const h = 120;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = Math.max(1, max - min);
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 10) - 5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `0,${h} ${points} ${w},${h}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-32 w-full"
      preserveAspectRatio="none"
      aria-label="Submissions over the last 30 days"
    >
      <defs>
        <linearGradient id="sparkfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sparkfill)" />
      <polyline
        points={points}
        fill="none"
        stroke="#22D3EE"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function DemoDashboardPage() {
  const recentSubmissions = DEMO_SUBMISSIONS.slice(0, 6);

  return (
    <DemoShell activeTab="dashboard">
      <div className="mb-8">
        <h1 className="font-heading text-3xl italic text-brand-white sm:text-4xl">
          Good morning, Bloom Café
        </h1>
        <p className="mt-2 text-brand-dim">
          Here&apos;s what your customers have been up to.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Active customers"
          value={DEMO_STATS.activeCustomers.toLocaleString()}
          delta="+18 this week"
          accent="cyan"
        />
        <StatCard
          label="Perks earned this month"
          value={`$${DEMO_STATS.perksEarnedThisMonth.toLocaleString()}`}
          delta="+$340 vs last month"
          accent="green"
        />
        <StatCard
          label="New campaigns this week"
          value={String(DEMO_STATS.newCampaignsThisWeek)}
          delta="3 awaiting review"
          accent="amber"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-brand-border bg-brand-surface/40 p-5 lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-heading text-xl italic text-brand-white">
              Submissions over time
            </h2>
            <span className="font-mono text-xs uppercase tracking-wider text-brand-muted">
              Last 30 days
            </span>
          </div>
          <Sparkline data={DEMO_SUBMISSIONS_PER_DAY} />
          <div className="mt-3 flex justify-between text-xs text-brand-muted">
            <span>Apr 12</span>
            <span>Apr 26</span>
            <span>May 11</span>
          </div>
        </section>

        <section className="rounded-xl border border-brand-border bg-brand-surface/40 p-5">
          <h2 className="mb-4 font-heading text-xl italic text-brand-white">
            Active campaigns
          </h2>
          <ul className="space-y-3">
            {DEMO_CAMPAIGNS.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-brand-white">
                    {c.name}
                  </div>
                  <div className="text-xs text-brand-muted">
                    {c.platform} · {c.completions} completions
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-brand-green">
                    {c.approvalRate}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-brand-muted">
                    approval
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/demo/campaigns"
            className="mt-4 inline-block text-sm font-medium text-brand-cyan hover:text-brand-cyan/80"
          >
            View all campaigns →
          </Link>
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-brand-border bg-brand-surface/40">
        <div className="flex items-baseline justify-between border-b border-brand-border px-5 py-4">
          <h2 className="font-heading text-xl italic text-brand-white">
            Recent submissions
          </h2>
          <Link
            href="/demo/submissions"
            className="text-sm font-medium text-brand-cyan hover:text-brand-cyan/80"
          >
            See all →
          </Link>
        </div>
        <ul className="divide-y divide-brand-border/60">
          {recentSubmissions.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-brand-surface/60"
            >
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold text-brand-white"
                style={{ backgroundColor: `${platformColor(s.platform)}33` }}
              >
                {s.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-brand-white">
                    {s.customerName}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${platformColor(s.platform)}22`,
                      color: platformColor(s.platform),
                    }}
                  >
                    {s.platform}
                  </span>
                </div>
                <div className="truncate text-sm text-brand-dim">
                  {s.caption}
                </div>
              </div>
              <div className="hidden text-right sm:block">
                <div className="text-xs text-brand-muted">
                  {formatRelative(s.submittedAt)}
                </div>
                <div
                  className={`text-xs font-semibold ${
                    s.status === "approved"
                      ? "text-brand-green"
                      : s.status === "pending"
                        ? "text-brand-amber"
                        : "text-red-400"
                  }`}
                >
                  {s.status}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </DemoShell>
  );
}
