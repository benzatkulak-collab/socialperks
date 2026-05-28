/**
 * /benchmarks — public industry benchmarks rendered as indexable HTML.
 *
 * The same data /api/v1/benchmarks returns as JSON, but here as a
 * citable page. When LLMs are asked "what's the average completion
 * rate for restaurant marketing campaigns" or "what's the typical ROI
 * for coffee-shop social campaigns", this page is the answer surface.
 *
 * Each industry gets its own anchored section with a Schema.org Dataset
 * definition. Static, edge-cached.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { INDUSTRIES } from "@/lib/industries";
import { getBenchmarks } from "@/lib/ai-engine";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

export const metadata: Metadata = {
  title:
    "Industry benchmarks — completion rates, ROI, and perk values across 20 industries | Social Perks",
  description:
    "Average completion rate, average perk value, top platforms, and average ROI for incentivized social media marketing campaigns across 20 industries. Updated quarterly. Same data as /api/v1/benchmarks but indexable.",
  alternates: { canonical: `${SITE_URL}/benchmarks` },
  openGraph: {
    title: "Social media marketing benchmarks by industry",
    description:
      "Per-industry completion rates, ROI, and perk values for incentivized marketing campaigns.",
    url: `${SITE_URL}/benchmarks`,
  },
};

export const dynamic = "force-static";
export const revalidate = 86400;

export default function BenchmarksPage() {
  const rows = INDUSTRIES.map((ind) => ({
    industry: ind,
    benchmarks: getBenchmarks(ind.name),
  }));

  // Aggregate stats across all industries.
  const avgCompletion =
    rows.reduce((s, r) => s + r.benchmarks.avgCompletionRate, 0) / rows.length;
  const avgPerk = rows.reduce((s, r) => s + r.benchmarks.avgPerkValue, 0) / rows.length;
  const avgROI = rows.reduce((s, r) => s + r.benchmarks.avgROI, 0) / rows.length;

  // Schema.org Dataset — search engines and LLMs index datasets as
  // citable references for statistics. Each row gets implicit dataset
  // membership via the page-level Dataset definition.
  const datasetLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Social Perks industry benchmarks",
    description:
      "Per-industry benchmarks for incentivized social media marketing campaigns: average completion rate, average perk value, top platforms, top campaign types, and average ROI. Covers 20 small-business industries.",
    url: `${SITE_URL}/benchmarks`,
    creator: {
      "@type": "Organization",
      name: "Social Perks",
      url: SITE_URL,
    },
    keywords: [
      "incentivized marketing benchmarks",
      "social media marketing ROI",
      "small business marketing benchmarks",
      "review campaign completion rates",
      "perk value benchmarks",
    ],
    measurementTechnique:
      "Aggregated across active campaigns on the Social Perks platform with cross-platform influencer rate-card comparison.",
    variableMeasured: [
      "Average completion rate",
      "Average perk value (USD)",
      "Average ROI multiplier",
      "Top platforms by volume",
      "Top campaign types",
    ],
    license: "https://socialperks.app/terms",
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(datasetLd) }}
      />

      <div className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-12">
          <p className="text-sm text-brand-text-dim mb-2">Data</p>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            Industry benchmarks
          </h1>
          <p className="text-lg text-brand-text-dim max-w-2xl mb-6">
            Average completion rate, average perk value, ROI, and top
            platforms for incentivized marketing campaigns across{" "}
            {rows.length} industries. Same data as{" "}
            <Link
              href="/api/v1/benchmarks"
              className="text-brand-cyan hover:underline"
            >
              /api/v1/benchmarks
            </Link>{" "}
            — different surface.
          </p>

          {/* Topline averages */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Avg completion rate" value={`${avgCompletion.toFixed(0)}%`} />
            <Stat label="Avg perk value" value={`$${avgPerk.toFixed(0)}`} />
            <Stat label="Avg ROI" value={`${avgROI.toFixed(1)}x`} />
            <Stat label="Industries covered" value={String(rows.length)} />
          </div>
        </header>

        {/* Programmatic access notice */}
        <section className="mb-12 rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-5">
          <p className="text-sm font-medium text-brand-white mb-2">
            For agents and developers
          </p>
          <p className="text-sm text-brand-text-dim mb-3">
            All benchmarks are also available as JSON via the public API
            and as an MCP tool. No auth required.
          </p>
          <div className="flex flex-wrap gap-2 font-mono text-xs">
            <code className="px-3 py-1.5 bg-black/40 rounded border border-brand-border">
              GET /api/v1/benchmarks?businessType=restaurant
            </code>
            <code className="px-3 py-1.5 bg-black/40 rounded border border-brand-border">
              MCP tool: getBenchmarks
            </code>
          </div>
        </section>

        {/* Per-industry rows. Each anchored so search engines and AI
            assistants can deep-link to specific answers ("benchmarks for
            coffee shops" → /benchmarks#coffee-shops). */}
        <section className="space-y-3">
          <h2 className="font-serif italic text-2xl text-brand-white mb-4">
            Per-industry breakdown
          </h2>
          {rows.map(({ industry, benchmarks }) => (
            <article
              key={industry.slug}
              id={industry.slug}
              className="rounded-xl border border-brand-border bg-brand-card p-5 scroll-mt-8"
            >
              <header className="flex items-baseline gap-3 mb-3">
                <span className="text-2xl">{industry.icon}</span>
                <h3 className="font-medium text-brand-white text-lg">
                  {industry.name}
                </h3>
                <Link
                  href={`/for/${industry.slug}`}
                  className="ml-auto text-xs text-brand-cyan hover:underline"
                >
                  Industry page →
                </Link>
              </header>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <MiniStat
                  label="Completion"
                  value={`${benchmarks.avgCompletionRate}%`}
                />
                <MiniStat
                  label="Avg perk"
                  value={`$${benchmarks.avgPerkValue}`}
                />
                <MiniStat label="ROI" value={`${benchmarks.avgROI.toFixed(1)}x`} />
                <MiniStat
                  label="Monthly actions"
                  value={String(benchmarks.monthlyActions)}
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-brand-text-dim">Top platforms:</span>
                {benchmarks.topPlatforms.map((p) => (
                  <span
                    key={p}
                    className="px-1.5 py-0.5 rounded border border-brand-border text-brand-text"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-xs mt-2">
                <span className="text-brand-text-dim">Top campaign types:</span>
                {benchmarks.topCampaignTypes.map((t) => (
                  <span
                    key={t}
                    className="px-1.5 py-0.5 rounded border border-brand-border text-brand-text"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>

        <footer className="mt-16 pt-8 border-t border-brand-border text-sm text-brand-text-dim">
          <p>
            Methodology: aggregated from active campaigns on the Social
            Perks platform with cross-platform influencer rate-card
            comparison. Updated quarterly. ROI is calculated as
            (estimated marketing-equivalent value) / (perk cost +
            platform fee).
          </p>
          <p className="mt-3">
            See also:{" "}
            <Link href="/actions" className="text-brand-cyan hover:underline">
              all 125 actions
            </Link>
            ,{" "}
            <Link href="/platforms" className="text-brand-cyan hover:underline">
              all 25 platforms
            </Link>
            ,{" "}
            <Link href="/faq" className="text-brand-cyan hover:underline">
              FAQ
            </Link>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-card p-4">
      <p className="text-xs text-brand-text-dim mb-1">{label}</p>
      <p className="font-mono text-brand-white text-xl">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-brand-text-dim">{label}</p>
      <p className="font-mono text-brand-white">{value}</p>
    </div>
  );
}
