import type { Metadata } from "next";
import { DemoShell } from "../_components/demo-chrome";
import { DEMO_CAMPAIGNS, platformColor } from "@/lib/demo/data";

export const metadata: Metadata = {
  title: "Campaigns · Live Demo · Social Perks",
  description:
    "Browse 4 active demo campaigns with completion counts, budget, and approval rates.",
  robots: { index: true, follow: true },
};

const TIER_COLORS: Record<string, string> = {
  essential: "#34D399",
  "high-impact": "#FB923C",
  growth: "#22D3EE",
  premium: "#F472B6",
  starter: "#9CA3AF",
};

export default function DemoCampaignsPage() {
  return (
    <DemoShell activeTab="campaigns">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl italic text-brand-white sm:text-4xl">
            Campaigns
          </h1>
          <p className="mt-2 text-brand-dim">
            4 active campaigns generating real social proof.
          </p>
        </div>
        <button
          type="button"
          disabled
          title="Sign up to create campaigns"
          className="cursor-not-allowed rounded-lg border border-brand-border bg-brand-surface/60 px-4 py-2 text-sm font-medium text-brand-muted"
        >
          + New campaign
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {DEMO_CAMPAIGNS.map((c) => {
          const tierColor = TIER_COLORS[c.tier] ?? "#9CA3AF";
          const platColor = platformColor(c.platform);
          const budgetPct = Math.round((c.budgetUsed / c.budgetTotal) * 100);
          return (
            <article
              key={c.id}
              id={c.id}
              className="rounded-xl border border-brand-border bg-brand-surface/50 border-l-4 p-5 transition-all hover:bg-brand-surface/70"
              style={{ borderLeftColor: tierColor }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${platColor}22`,
                        color: platColor,
                      }}
                    >
                      {c.platform}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${tierColor}22`,
                        color: tierColor,
                      }}
                    >
                      {c.tier}
                    </span>
                    <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-green">
                      ● {c.status}
                    </span>
                  </div>
                  <h2 className="mt-3 font-heading text-xl italic text-brand-white">
                    {c.name}
                  </h2>
                  <p className="mt-1 text-sm text-brand-dim">{c.perk}</p>
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-brand-border/60 pt-4">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-brand-muted">
                    Completions
                  </dt>
                  <dd className="mt-1 font-mono text-xl text-brand-white">
                    {c.completions}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-brand-muted">
                    Approval
                  </dt>
                  <dd className="mt-1 font-mono text-xl text-brand-green">
                    {c.approvalRate}%
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-brand-muted">
                    Budget
                  </dt>
                  <dd className="mt-1 font-mono text-xl text-brand-white">
                    ${c.budgetUsed}
                  </dd>
                </div>
              </dl>

              <div className="mt-4">
                <div className="flex justify-between text-xs text-brand-muted">
                  <span>Budget used</span>
                  <span>
                    ${c.budgetUsed} / ${c.budgetTotal}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-border/60">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${budgetPct}%`,
                      backgroundColor: tierColor,
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-xs text-brand-muted">
                  Started{" "}
                  {new Date(c.startedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <a
                  href={`#${c.id}`}
                  className="text-sm font-medium text-brand-cyan hover:text-brand-cyan/80"
                >
                  View detail →
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </DemoShell>
  );
}
