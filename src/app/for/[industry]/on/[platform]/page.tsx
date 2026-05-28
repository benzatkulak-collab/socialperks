/**
 * /for/[industry]/on/[platform] — industry × platform combo page.
 *
 * One static page per (industry, platform) pair. Targets very specific
 * long-tail queries like "Instagram marketing for coffee shops" or
 * "Yelp reviews for hair salons" — the kind of question LLMs are
 * routinely asked.
 *
 * To keep build time reasonable and avoid thin pages for low-fit combos,
 * we generate combos for the top 5 platforms per industry as scored by
 * the benchmarks engine.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { INDUSTRIES } from "@/lib/industries";
import { PLATFORMS } from "@/lib/platforms";
import { getBenchmarks } from "@/lib/ai-engine";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 86400;

/**
 * Match a benchmark "topPlatform" string (e.g. "Instagram", "Google")
 * to a Platform.id (e.g. "ig", "go"). Case-insensitive name match.
 */
function platformIdByName(name: string): string | null {
  const found = PLATFORMS.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  return found?.id ?? null;
}

export async function generateStaticParams() {
  const params: { industry: string; platform: string }[] = [];
  for (const ind of INDUSTRIES) {
    const benchmarks = getBenchmarks(ind.name);
    // Use top platforms from the benchmark engine — already scored for
    // industry fit. Limit to 5 to cap build time.
    for (const platformName of benchmarks.topPlatforms.slice(0, 5)) {
      const platformId = platformIdByName(platformName);
      if (platformId) {
        params.push({ industry: ind.slug, platform: platformId });
      }
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ industry: string; platform: string }>;
}): Promise<Metadata> {
  const { industry, platform } = await params;
  const ind = INDUSTRIES.find((i) => i.slug === industry);
  const plt = PLATFORMS.find((p) => p.id === platform);
  if (!ind || !plt) return { title: "Not found" };
  return {
    title: `${plt.name} marketing for ${ind.name.toLowerCase()} — actions, pricing, FTC notes | Social Perks`,
    description: `Run ${plt.name} marketing campaigns at your ${ind.name.toLowerCase()}. ${plt.actions.length} ${plt.name} actions with market values tuned for ${ind.name.toLowerCase()}. Includes FTC compliance notes and recommended perk amounts.`,
    alternates: { canonical: `${SITE_URL}/for/${industry}/on/${platform}` },
  };
}

export default async function IndustryPlatformPage({
  params,
}: {
  params: Promise<{ industry: string; platform: string }>;
}) {
  const { industry, platform } = await params;
  const ind = INDUSTRIES.find((i) => i.slug === industry);
  const plt = PLATFORMS.find((p) => p.id === platform);
  if (!ind || !plt) notFound();

  const benchmarks = getBenchmarks(ind.name);
  const totalValue = plt.actions.reduce((s, a) => s + a.value, 0);
  const topActions = [...plt.actions].sort((a, b) => b.value - a.value).slice(0, 8);
  const reviewActions = plt.actions.filter((a) => a.type === "review");
  const hasNonIncentivizable = plt.actions.some((a) => !a.incentivizable);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${plt.name} marketing for ${ind.name.toLowerCase()}`,
    description: `${plt.actions.length} ${plt.name} actions for ${ind.name.toLowerCase()} with market values and FTC notes.`,
    url: `${SITE_URL}/for/${industry}/on/${platform}`,
    author: { "@type": "Organization", name: "Social Perks", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Social Perks", url: SITE_URL },
    about: [
      { "@type": "Thing", name: ind.name },
      { "@type": "Thing", name: plt.name },
    ],
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: ind.name, item: `${SITE_URL}/for/${ind.slug}` },
      { "@type": "ListItem", position: 2, name: `${plt.name} marketing`, item: `${SITE_URL}/for/${industry}/on/${platform}` },
    ],
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(breadcrumbsLd) }}
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="text-sm text-brand-text-dim mb-8">
          <Link href={`/for/${ind.slug}`} className="hover:text-brand-cyan">
            {ind.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text">on {plt.name}</span>
        </nav>

        <header className="mb-10">
          <p className="text-sm text-brand-text-dim mb-2">
            Industry × platform
          </p>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            <span aria-hidden>{plt.icon}</span> {plt.name} marketing for{" "}
            {ind.name.toLowerCase()}
          </h1>
          <p className="text-lg text-brand-text leading-relaxed">
            {plt.actions.length} {plt.name} marketing actions tuned for{" "}
            {ind.name.toLowerCase()}, with market values, effort levels, and
            FTC compliance notes. Combined value: ${totalValue.toFixed(0)} per
            cycle.
          </p>
        </header>

        {/* Industry-on-platform stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <Stat label="Actions" value={String(plt.actions.length)} />
          <Stat label="Combined value" value={`$${totalValue.toFixed(0)}`} />
          <Stat
            label={`${ind.name} avg ROI`}
            value={`${benchmarks.avgROI.toFixed(1)}x`}
          />
          <Stat
            label={`${ind.name} avg perk`}
            value={`$${benchmarks.avgPerkValue}`}
          />
        </section>

        {/* Compliance note */}
        {reviewActions.length > 0 && hasNonIncentivizable && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 mb-10">
            <p className="text-sm font-medium text-amber-200 mb-2">
              {plt.name} review compliance for {ind.name.toLowerCase()}
            </p>
            <p className="text-sm text-amber-200/80">
              {plt.name} prohibits incentivized reviews. For{" "}
              {ind.name.toLowerCase()} that means: you can request a review but
              cannot tie a perk to whether one was left. The non-review actions
              on {plt.name} (engagement, content) can be incentivized normally.
            </p>
          </section>
        )}

        {/* Top actions for this industry on this platform */}
        <section className="mb-10">
          <h2 className="font-serif italic text-2xl text-brand-white mb-4">
            Top {plt.name} actions for {ind.name.toLowerCase()}
          </h2>
          <ul className="space-y-2">
            {topActions.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/actions/${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-card p-4 hover:border-brand-cyan/40 gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-brand-white">{a.label}</p>
                    <p className="text-xs text-brand-text-dim mt-0.5">
                      Effort {a.effort}/5 ·{" "}
                      {a.incentivizable ? "Incentivizable" : "Organic only"}
                    </p>
                  </div>
                  <span className="font-mono text-brand-cyan shrink-0">
                    ${a.value.toFixed(2)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Industry-relevant cross-links */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          <Link
            href={`/platforms/${plt.id}`}
            className="rounded-xl border border-brand-border bg-brand-card p-4 hover:border-brand-cyan/40"
          >
            <p className="text-sm text-brand-cyan mb-1">→ All {plt.name} actions</p>
            <p className="text-xs text-brand-text-dim">
              Including engagement, share, and referral actions
            </p>
          </Link>
          <Link
            href={`/pricing-oracle/${ind.slug}`}
            className="rounded-xl border border-brand-border bg-brand-card p-4 hover:border-brand-cyan/40"
          >
            <p className="text-sm text-brand-cyan mb-1">
              → {ind.name} pricing oracle
            </p>
            <p className="text-xs text-brand-text-dim">
              Recommended perk amounts for the top 24 actions
            </p>
          </Link>
        </section>

        {/* CTA */}
        <section className="text-center mb-10">
          <Link
            href={`/dashboard?intent=campaign&platformId=${plt.id}&industry=${ind.slug}`}
            className="inline-block px-6 py-3 bg-brand-cyan text-brand-bg font-medium rounded-lg hover:bg-brand-cyan/90"
          >
            Launch a {plt.name} campaign for your {ind.name.toLowerCase()}
          </Link>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-card p-4">
      <p className="text-xs text-brand-text-dim mb-1">{label}</p>
      <p className="font-mono text-brand-white text-sm">{value}</p>
    </div>
  );
}
