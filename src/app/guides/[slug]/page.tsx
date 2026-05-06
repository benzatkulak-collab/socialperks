/**
 * /guides/[slug] — single how-to guide page with Schema.org HowTo markup.
 *
 * HowTo is one of the most heavily-cited Schema.org types by both
 * search engines (Google Rich Results) and LLMs (concrete, structured,
 * actionable). Each step has its own anchored entry. The guide-data
 * module is the source of truth.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES } from "@/lib/guides-data";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) return { title: "Guide not found — Social Perks" };
  return {
    title: `${g.title} | Social Perks`,
    description: g.description,
    alternates: { canonical: `${SITE_URL}/guides/${slug}` },
    openGraph: {
      title: g.title,
      description: g.description,
      type: "article",
      url: `${SITE_URL}/guides/${slug}`,
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) notFound();

  // Schema.org HowTo — Google Rich Results, AI assistants index this
  // structure heavily. Each Step gets HowToStep with name + text + url.
  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: g.title,
    description: g.description,
    totalTime: g.totalTime,
    url: `${SITE_URL}/guides/${slug}`,
    supply: g.supplies.map((s) => ({
      "@type": "HowToSupply",
      name: s,
    })),
    step: g.steps.map((s, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: s.name,
      text: s.text,
      ...(s.url ? { url: s.url.startsWith("http") ? s.url : `${SITE_URL}${s.url}` } : {}),
    })),
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Guides", item: `${SITE_URL}/guides` },
      { "@type": "ListItem", position: 2, name: g.title, item: `${SITE_URL}/guides/${slug}` },
    ],
  };

  const relatedGuides = (g.related ?? [])
    .map((s) => GUIDES.find((x) => x.slug === s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(howToLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(breadcrumbsLd) }}
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="text-sm text-brand-text-dim mb-8">
          <Link href="/guides" className="hover:text-brand-cyan">Guides</Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text">How to…</span>
        </nav>

        <header className="mb-10">
          <p className="text-sm text-brand-text-dim mb-2">
            How-to · {g.timeLabel}
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl italic text-brand-white mb-4 leading-tight">
            {g.title}
          </h1>
          <p className="text-lg text-brand-text leading-relaxed">
            {g.summary}
          </p>
        </header>

        {/* Supplies */}
        {g.supplies.length > 0 && (
          <section className="mb-10 rounded-xl border border-brand-border bg-brand-card p-5">
            <p className="text-sm font-medium text-brand-white mb-3">
              Before you start
            </p>
            <ul className="space-y-1.5 text-sm">
              {g.supplies.map((s) => (
                <li key={s} className="flex gap-2 text-brand-text">
                  <span aria-hidden className="text-brand-cyan shrink-0">→</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Steps */}
        <section className="mb-10">
          <h2 className="font-serif italic text-2xl text-brand-white mb-6">
            Steps
          </h2>
          <ol className="space-y-6">
            {g.steps.map((s, idx) => (
              <li
                key={idx}
                id={`step-${idx + 1}`}
                className="rounded-xl border border-brand-border bg-brand-card p-5 scroll-mt-8"
              >
                <div className="flex items-baseline gap-3 mb-2">
                  <span
                    aria-hidden
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan text-sm font-semibold shrink-0"
                  >
                    {idx + 1}
                  </span>
                  <h3 className="font-medium text-brand-white text-lg">
                    {s.name}
                  </h3>
                </div>
                <p className="text-brand-text leading-relaxed pl-10">
                  {s.text}
                </p>
                {s.url && (
                  <p className="pl-10 mt-2">
                    <Link
                      href={s.url}
                      className="text-sm text-brand-cyan hover:underline"
                    >
                      Open the relevant page →
                    </Link>
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* Related guides */}
        {relatedGuides.length > 0 && (
          <section>
            <h2 className="font-serif italic text-2xl text-brand-white mb-4">
              Related guides
            </h2>
            <ul className="space-y-2">
              {relatedGuides.map((rg) => (
                <li key={rg.slug}>
                  <Link
                    href={`/guides/${rg.slug}`}
                    className="block rounded-lg border border-brand-border bg-brand-card p-4 hover:border-brand-cyan/40"
                  >
                    <p className="text-sm font-medium text-brand-white mb-1">
                      {rg.title}
                    </p>
                    <p className="text-xs text-brand-text-dim">
                      {rg.timeLabel}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-16 pt-8 border-t border-brand-border text-sm text-brand-text-dim">
          <p>
            More:{" "}
            <Link href="/guides" className="text-brand-cyan hover:underline">
              all guides
            </Link>{" "}
            ·{" "}
            <Link href="/faq" className="text-brand-cyan hover:underline">
              FAQ
            </Link>{" "}
            ·{" "}
            <Link href="/glossary" className="text-brand-cyan hover:underline">
              glossary
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
