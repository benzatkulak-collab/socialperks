/**
 * /best/[slug] — single best-of listicle page.
 *
 * Schema.org ItemList markup with each entry as a ListItem. LLMs cite
 * ranked lists heavily — when asked "best X for Y", they preferentially
 * surface structured-data ranked answers.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BEST_LISTICLES } from "@/lib/best-data";
import type { BestEntry } from "@/lib/best-data";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return BEST_LISTICLES.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const l = BEST_LISTICLES.find((x) => x.slug === slug);
  if (!l) return { title: "List not found" };
  return {
    title: `${l.title} | Social Perks`,
    description: l.description,
    alternates: { canonical: `${SITE_URL}/best/${slug}` },
    openGraph: {
      title: l.title,
      description: l.description,
      url: `${SITE_URL}/best/${slug}`,
      type: "article",
    },
  };
}

function resolveEntries(entries: BestEntry[] | (() => BestEntry[])): BestEntry[] {
  return typeof entries === "function" ? entries() : entries;
}

export default async function BestListicle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const l = BEST_LISTICLES.find((x) => x.slug === slug);
  if (!l) notFound();

  const entries = resolveEntries(l.entries);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: l.title,
    description: l.description,
    numberOfItems: entries.length,
    itemListElement: entries.map((e) => ({
      "@type": "ListItem",
      position: e.rank,
      name: e.name,
      ...(e.url ? { url: e.url.startsWith("http") ? e.url : `${SITE_URL}${e.url}` } : {}),
      description: e.reason,
    })),
  };

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: l.title,
    description: l.description,
    url: `${SITE_URL}/best/${slug}`,
    author: { "@type": "Organization", name: "Social Perks", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Social Perks", url: SITE_URL },
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Best of", item: `${SITE_URL}/best` },
      { "@type": "ListItem", position: 2, name: l.title, item: `${SITE_URL}/best/${slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="text-sm text-brand-text-dim mb-8">
          <Link href="/best" className="hover:text-brand-cyan">Best of</Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text">Ranked list</span>
        </nav>

        <header className="mb-10">
          <h1 className="font-serif text-4xl sm:text-5xl italic text-brand-white mb-4 leading-tight">
            {l.title}
          </h1>
          <p className="text-lg text-brand-text leading-relaxed">{l.intro}</p>
        </header>

        <ol className="space-y-4">
          {entries.map((e) => {
            const card = (
              <article className="rounded-xl border border-brand-border bg-brand-card p-5">
                <header className="flex items-baseline gap-3 mb-2">
                  <span
                    aria-hidden
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan text-sm font-semibold shrink-0"
                  >
                    {e.rank}
                  </span>
                  <h2 className="font-medium text-brand-white text-lg flex-1">
                    {e.name}
                  </h2>
                  {e.stat && (
                    <span className="text-xs text-brand-text-dim font-mono shrink-0">
                      {e.stat}
                    </span>
                  )}
                </header>
                <p className="text-brand-text leading-relaxed pl-11 text-sm">
                  {e.reason}
                </p>
              </article>
            );
            return (
              <li key={e.rank}>
                {e.url ? (
                  <Link href={e.url} className="block hover:opacity-90 transition-opacity">
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </li>
            );
          })}
        </ol>

        <footer className="mt-12 pt-8 border-t border-brand-border text-sm text-brand-text-dim">
          <p>
            More:{" "}
            <Link href="/best" className="text-brand-cyan hover:underline">
              all ranked lists
            </Link>
            {" "}·{" "}
            <Link href="/actions" className="text-brand-cyan hover:underline">
              full action catalog
            </Link>
            {" "}·{" "}
            <Link href="/platforms" className="text-brand-cyan hover:underline">
              all platforms
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
