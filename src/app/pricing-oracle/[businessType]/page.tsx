/**
 * /pricing-oracle/[businessType] — public HTML version of the pricing
 * oracle, one page per business type. Shows the recommended actions,
 * their values, and the suggested perk amounts for that vertical.
 *
 * Same data the /api/v1/pricing endpoint returns, but rendered as an
 * indexable page with Schema.org Dataset + Service markup. LLMs can
 * cite exact numbers from these pages when asked questions like
 * "what should I pay for an Instagram post if I run a coffee shop".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { INDUSTRIES } from "@/lib/industries";
import { PLATFORMS } from "@/lib/platforms";
import { getBenchmarks, estimatePricing } from "@/lib/ai-engine";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ businessType: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessType: string }>;
}): Promise<Metadata> {
  const { businessType } = await params;
  const ind = INDUSTRIES.find((i) => i.slug === businessType);
  if (!ind) return { title: "Pricing oracle — business type not found" };
  return {
    title: `Pricing oracle for ${ind.name.toLowerCase()} — what to pay for each marketing action | Social Perks`,
    description: `Recommended perk amounts for incentivized marketing campaigns at ${ind.name.toLowerCase()}. Action-by-action market values and suggested rewards across all 25 platforms.`,
    alternates: { canonical: `${SITE_URL}/pricing-oracle/${businessType}` },
  };
}

export default async function PricingOraclePage({
  params,
}: {
  params: Promise<{ businessType: string }>;
}) {
  const { businessType } = await params;
  const ind = INDUSTRIES.find((i) => i.slug === businessType);
  if (!ind) notFound();

  const benchmarks = getBenchmarks(ind.name);

  // Compute pricing recommendations for the highest-value actions on
  // each top platform. Limit to 12 to keep the page focused.
  const recommendedActions = PLATFORMS.flatMap((p) =>
    p.actions.map((a) => ({ ...a, platform: p }))
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 24)
    .map((a) => {
      const estimate = estimatePricing(a.id, ind.name);
      return { ...a, estimate };
    });

  const datasetLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Pricing oracle for ${ind.name}`,
    description: `Per-action market values and recommended perk amounts for ${ind.name.toLowerCase()} running incentivized marketing campaigns.`,
    url: `${SITE_URL}/pricing-oracle/${businessType}`,
    creator: { "@type": "Organization", name: "Social Perks", url: SITE_URL },
    keywords: [
      `${ind.name} marketing pricing`,
      `${ind.name} review campaign cost`,
      "incentivized marketing benchmarks",
      "perk amount calculator",
    ],
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Pricing oracle", item: `${SITE_URL}/pricing-oracle` },
      { "@type": "ListItem", position: 2, name: ind.name, item: `${SITE_URL}/pricing-oracle/${businessType}` },
    ],
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(datasetLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(breadcrumbsLd) }}
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="text-sm text-brand-text-dim mb-8">
          <Link href="/pricing-oracle" className="hover:text-brand-cyan">
            Pricing oracle
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text">{ind.name}</span>
        </nav>

        <header className="mb-10">
          <p className="text-sm text-brand-text-dim mb-2">
            Pricing oracle · {ind.name}
          </p>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            <span aria-hidden>{ind.icon}</span> {ind.name} pricing oracle
          </h1>
          <p className="text-lg text-brand-text leading-relaxed">
            Recommended perk amounts for the highest-value marketing
            actions at {ind.name.toLowerCase()}. The recommendations
            target rough break-even on first-action customer acquisition
            — adjust higher to drive participation, lower to protect margin.
          </p>
        </header>

        {/* Industry benchmarks summary */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <Stat label="Avg completion" value={`${benchmarks.avgCompletionRate}%`} />
          <Stat label="Avg perk" value={`$${benchmarks.avgPerkValue}`} />
          <Stat label="Avg ROI" value={`${benchmarks.avgROI.toFixed(1)}x`} />
          <Stat label="Top platforms" value={benchmarks.topPlatforms.slice(0, 2).join(", ")} />
        </section>

        {/* Recommendations table */}
        <section className="mb-10">
          <h2 className="font-serif italic text-2xl text-brand-white mb-4">
            Top 24 actions for {ind.name.toLowerCase()}
          </h2>
          <ul className="space-y-2">
            {recommendedActions.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/actions/${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-card p-4 hover:border-brand-cyan/40 gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-brand-white">
                      {a.platform.icon} {a.platform.name} {a.label}
                    </p>
                    <p className="text-xs text-brand-text-dim mt-0.5">
                      Effort {a.effort}/5 · Market value ${a.value.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-brand-text-dim">Recommended perk</p>
                    <p className="font-mono text-brand-cyan">
                      {formatRecommendation(a.estimate)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Programmatic */}
        <section className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-5 mb-10">
          <p className="text-sm font-medium text-brand-white mb-3">
            Programmatic access
          </p>
          <code className="block px-3 py-2 bg-black/40 rounded border border-brand-border font-mono text-xs">
            GET /api/v1/pricing?businessType={businessType}&actionId=<i>id</i>
          </code>
        </section>

        <footer className="text-sm text-brand-text-dim">
          <p>
            All industries:{" "}
            <Link
              href="/pricing-oracle"
              className="text-brand-cyan hover:underline"
            >
              /pricing-oracle
            </Link>{" "}
            · Industry page:{" "}
            <Link
              href={`/for/${ind.slug}`}
              className="text-brand-cyan hover:underline"
            >
              /for/{ind.slug}
            </Link>{" "}
            · Benchmarks:{" "}
            <Link
              href={`/benchmarks#${ind.slug}`}
              className="text-brand-cyan hover:underline"
            >
              /benchmarks#{ind.slug}
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

interface PricingEstimate {
  actionId?: string;
  marketRate?: number;
  suggestedPerk?: { value?: number; type?: string };
}

function formatRecommendation(est: PricingEstimate | null | undefined): string {
  if (!est?.suggestedPerk) return "—";
  const { type, value } = est.suggestedPerk;
  const v = value ?? 0;
  if (type === "pct") return `${v}% off`;
  if (type === "dol" || type === "amount" || type === "dollar") return `$${v} off`;
  if (type === "free_item") return "Free item";
  return `${v}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-card p-4">
      <p className="text-xs text-brand-text-dim mb-1">{label}</p>
      <p className="font-mono text-brand-white text-sm">{value}</p>
    </div>
  );
}
