/**
 * /compare/[slug] — platform-vs-platform comparison page.
 *
 * Each is a static page hand-tuned for a specific high-volume search
 * query ("Instagram vs TikTok for marketing", "Google vs Yelp reviews").
 * The lede is written to be quotable; the action tables are generated
 * from real platform data so they stay accurate as the catalog evolves.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPARISONS, getPlatform } from "@/lib/comparison-data";
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
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = COMPARISONS.find((x) => x.slug === slug);
  if (!c) return { title: "Comparison not found — Social Perks" };
  return {
    title: c.title,
    description: c.description,
    alternates: { canonical: `${SITE_URL}/compare/${slug}` },
    openGraph: {
      title: c.title,
      description: c.description,
      url: `${SITE_URL}/compare/${slug}`,
    },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = COMPARISONS.find((x) => x.slug === slug);
  if (!c) notFound();
  const a = getPlatform(c.platformAId);
  const b = getPlatform(c.platformBId);
  if (!a || !b) notFound();

  const aValue = a.actions.reduce((s, x) => s + x.value, 0);
  const bValue = b.actions.reduce((s, x) => s + x.value, 0);
  const aMaxValue = Math.max(...a.actions.map((x) => x.value));
  const bMaxValue = Math.max(...b.actions.map((x) => x.value));

  // Schema.org Article — gives LLMs and rich-results indexers a clear
  // structure for the comparison content.
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.title,
    description: c.description,
    url: `${SITE_URL}/compare/${slug}`,
    author: { "@type": "Organization", name: "Social Perks", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "Social Perks",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` },
    },
    about: [
      { "@type": "Thing", name: a.name },
      { "@type": "Thing", name: b.name },
    ],
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Comparisons", item: `${SITE_URL}/compare` },
      { "@type": "ListItem", position: 2, name: `${a.name} vs ${b.name}`, item: `${SITE_URL}/compare/${slug}` },
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
          <Link href="/compare" className="hover:text-brand-cyan">Comparisons</Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text">{a.name} vs {b.name}</span>
        </nav>

        <header className="mb-10">
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            <span aria-hidden>{a.icon}</span> {a.name}
            <span className="text-brand-text-dim"> vs </span>
            <span aria-hidden>{b.icon}</span> {b.name}
          </h1>
          <p className="text-lg text-brand-text leading-relaxed">
            {c.summary}
          </p>
        </header>

        {/* Side-by-side stats */}
        <section className="grid grid-cols-2 gap-3 mb-10">
          <div className="rounded-xl border border-brand-border bg-brand-card p-5">
            <p className="text-2xl mb-2">{a.icon}</p>
            <h2 className="font-medium text-brand-white mb-3">{a.name}</h2>
            <dl className="text-sm space-y-1.5">
              <Row label="Actions" value={String(a.actions.length)} />
              <Row label="Combined value" value={`$${aValue.toFixed(0)}`} />
              <Row label="Highest action" value={`$${aMaxValue.toFixed(2)}`} />
            </dl>
          </div>
          <div className="rounded-xl border border-brand-border bg-brand-card p-5">
            <p className="text-2xl mb-2">{b.icon}</p>
            <h2 className="font-medium text-brand-white mb-3">{b.name}</h2>
            <dl className="text-sm space-y-1.5">
              <Row label="Actions" value={String(b.actions.length)} />
              <Row label="Combined value" value={`$${bValue.toFixed(0)}`} />
              <Row label="Highest action" value={`$${bMaxValue.toFixed(2)}`} />
            </dl>
          </div>
        </section>

        {/* Best for */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          <div className="rounded-xl border border-brand-border bg-brand-card p-5">
            <p className="font-medium text-brand-white mb-3">
              {a.name} is best for
            </p>
            <ul className="space-y-2 text-sm text-brand-text">
              {c.bestForA.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-brand-cyan shrink-0">
                    →
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-brand-border bg-brand-card p-5">
            <p className="font-medium text-brand-white mb-3">
              {b.name} is best for
            </p>
            <ul className="space-y-2 text-sm text-brand-text">
              {c.bestForB.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-brand-cyan shrink-0">
                    →
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Bottom line */}
        <section className="rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 p-5 mb-10">
          <p className="text-sm text-brand-text-dim font-medium mb-2">
            Bottom line
          </p>
          <p className="text-brand-white">{c.recommendation}</p>
        </section>

        {/* Cross-links to platform detail pages */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href={`/platforms/${a.id}`}
            className="rounded-xl border border-brand-border bg-brand-card p-4 hover:border-brand-cyan/40"
          >
            <p className="text-sm text-brand-cyan mb-1">→ All {a.name} actions</p>
            <p className="text-xs text-brand-text-dim">
              Full action list with values and effort levels
            </p>
          </Link>
          <Link
            href={`/platforms/${b.id}`}
            className="rounded-xl border border-brand-border bg-brand-card p-4 hover:border-brand-cyan/40"
          >
            <p className="text-sm text-brand-cyan mb-1">→ All {b.name} actions</p>
            <p className="text-xs text-brand-text-dim">
              Full action list with values and effort levels
            </p>
          </Link>
        </section>

        <footer className="mt-16 pt-8 border-t border-brand-border text-sm text-brand-text-dim">
          <p>
            More comparisons:{" "}
            <Link href="/compare" className="text-brand-cyan hover:underline">
              /compare
            </Link>{" "}
            · Catalog:{" "}
            <Link href="/actions" className="text-brand-cyan hover:underline">
              /actions
            </Link>{" "}
            ·{" "}
            <Link href="/platforms" className="text-brand-cyan hover:underline">
              /platforms
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-brand-text-dim">{label}</dt>
      <dd className="font-mono text-brand-white">{value}</dd>
    </div>
  );
}
